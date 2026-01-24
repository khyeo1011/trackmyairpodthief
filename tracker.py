import os
import time
import sqlite3
import logging
from enum import Enum
from datetime import datetime
from dotenv import load_dotenv
from findmy import (
    AppleAccount,
    LocalAnisetteProvider,
    LoginState,
    TrustedDeviceSecondFactorMethod,
    SmsSecondFactorMethod,
    FindMyAccessory,
)
import asyncio

# Configuration
load_dotenv()
DB_NAME = "locations.db"
POLL_INTERVAL = 300
ACC_STORE = "account.json"
ANI_LIBS = "ani_libs.bin"

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

trigger_event = asyncio.Event()


async def input_listener():
    while True:
        await asyncio.to_thread(input, "Press Enter to poll now...\n")
        trigger_event.set()


class PollStatus(Enum):
    SUCCESS = "SUCCESS"
    FAILED_API = "FAILED_API_ERROR"
    FAILED_MISSING = "NO_LOCATION_RETURNED"
    FAILED_AUTH = "AUTH_ERROR"


def interactive_login():
    """Triggers the full 2FA login flow and saves the session."""
    print("--- Session Expired or Missing: Starting Interactive Login ---")
    email = input("Apple ID Email: ")
    password = input("Password: ")

    ani_provider = LocalAnisetteProvider(libs_path=ANI_LIBS)
    account = AppleAccount(ani_provider)
    auth_state = account.login(email, password)

    if auth_state == LoginState.REQUIRE_2FA:
        methods = account.get_2fa_methods()
        for i, method in enumerate(methods):
            if isinstance(method, TrustedDeviceSecondFactorMethod):
                print(f"{i} - Trusted Device")
            elif isinstance(method, SmsSecondFactorMethod):
                print(f"{i} - SMS ({method.phone_number})")

        selection = int(input("Select method index > "))
        selected_method = methods[selection]
        selected_method.request()

        code = input("Enter 2FA Code > ")
        selected_method.submit(code)

    account.to_json(ACC_STORE)
    print(f"Login successful. Session saved to {ACC_STORE}.")
    return account


def get_session():
    """Attempts to restore session; falls back to login if it fails."""
    try:
        if not os.path.exists(ACC_STORE):
            return interactive_login()
        return AppleAccount.from_json(ACC_STORE, anisette_libs_path=ANI_LIBS)
    except Exception as e:
        logging.warning(f"Session restoration failed: {e}")
        return interactive_login()


def init_db():
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS poll_logs (
                part_name TEXT,
                timestamp DATETIME,
                latitude REAL,
                longitude REAL,
                battery_status TEXT,
                PRIMARY KEY (part_name, timestamp)
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME,
                part_name TEXT,
                status TEXT,
                error_message TEXT
            )
        """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_timestamp ON poll_logs (timestamp)
        """
        )
        conn.commit()


def log_success(part_name, timestamp, lat, lon, bat):
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute(
            """
            INSERT INTO poll_logs (part_name, timestamp, latitude, longitude, battery_status)
            VALUES (?, ?, ?, ?, ?)
        """,
            (part_name, timestamp.isoformat(), lat, lon, bat),
        )


def log_error(status: PollStatus, part_name=None, err=None):
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute(
            """
            INSERT INTO error_logs (timestamp, part_name, status, error_message)
            VALUES (?, ?, ?, ?)
        """,
            (datetime.now().isoformat(), part_name, status.value, err),
        )


async def poll_loop():
    init_db()
    paths = {
        "CASE": os.getenv("AIRPOD_CASE"),
        "LEFT": os.getenv("AIRPOD_LEFT"),
        "RIGHT": os.getenv("AIRPOD_RIGHT"),
    }

    account = await asyncio.to_thread(get_session)
    accessories = {
        name: FindMyAccessory.from_json(path) for name, path in paths.items() if path
    }
    acc_list = list(accessories.values())

    while True:
        try:
            logging.info("Polling FindMy API...")

            locations = await asyncio.to_thread(account.fetch_location, acc_list)

            for name, accessory in accessories.items():
                logging.info(f"Polling {name} : {paths[name]}")
                loc = locations.get(accessory)

                if loc:
                    log_success(
                        name,
                        loc.timestamp,
                        loc.latitude,
                        loc.longitude,
                        bin(loc.status),
                    )
                    logging.info(
                        f"Poll Success: {name}: {loc.latitude}, {loc.longitude}"
                    )
                else:
                    log_error(
                        PollStatus.FAILED_MISSING,
                        part_name=name,
                        err="No data returned",
                    )
                    logging.warning(f"Poll Failed: {name}")

            # Persist any updated tokens/cookies from the poll
            await asyncio.to_thread(account.to_json, ACC_STORE)
        except sqlite3.IntegrityError as e:
            logging.info("Got duplicate timestamp. Skipping.")
        except Exception as e:
            err_msg = str(e)
            logging.error(f"Poll error: {err_msg}")
            log_error(PollStatus.FAILED_API, err=err_msg)

        trigger_event.clear()
        try:
            await asyncio.wait_for(trigger_event.wait(), timeout=POLL_INTERVAL)
            logging.info("Manual poll triggered.")
        except asyncio.TimeoutError:
            logging.info("Interval reached. Starting scheduled poll")


async def main():
    await asyncio.gather(poll_loop(), input_listener())


if __name__ == "__main__":
    asyncio.run(main())

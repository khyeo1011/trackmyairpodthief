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
    FindMyAccessory
)

# Configuration
load_dotenv()
DB_NAME = "airpods_tracker.db"
POLL_INTERVAL = 300 
ACC_STORE = "account.json"
ANI_LIBS = "ani_libs.bin"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
        conn.execute('''
            CREATE TABLE IF NOT EXISTS poll_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                part_name TEXT,
                timestamp DATETIME,
                latitude REAL,
                longitude REAL,
                battery_status TEXT,
                poll_status TEXT,
                error_message TEXT
            )
        ''')

def log_event(part_name, status: PollStatus, lat=None, lon=None, bat=None, err=None):
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute('''
            INSERT INTO poll_logs (part_name, timestamp, latitude, longitude, battery_status, poll_status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (part_name, datetime.now().isoformat(), lat, lon, bat, status.value, err))
        conn.commit()

def poll_loop():
    init_db()
    paths = {
        "CASE": os.getenv("AIRPOD_CASE"),
        "LEFT": os.getenv("AIRPOD_LEFT"),
        "RIGHT": os.getenv("AIRPOD_RIGHT")
    }
    
    accessories = {name: FindMyAccessory.from_json(path) for name, path in paths.items() if path}
    acc_list = list(accessories.values())

    while True:
        try:
            account = get_session()
            logging.info("Polling FindMy API...")
            
            locations = account.fetch_location(acc_list)
            
            for name, accessory in accessories.items():
                loc = locations.get(accessory)
                if loc:
                    log_event(name, PollStatus.SUCCESS, loc.latitude, loc.longitude, bin(loc.status))
                else:
                    log_event(name, PollStatus.FAILED_MISSING, err="No data returned")
            
            # Persist any updated tokens/cookies from the poll
            account.to_json(ACC_STORE)
            
        except Exception as e:
            err_msg = str(e)
            logging.error(f"Poll loop error: {err_msg}")
            
            # If the error looks like an auth failure, force a re-login on next loop
            if "auth" in err_msg.lower() or "unauthorized" in err_msg.lower():
                for name in accessories:
                    log_event(name, PollStatus.FAILED_AUTH, err=err_msg)
                # Option: Delete file to force fresh login next iteration
                # os.remove(ACC_STORE) 
            else:
                for name in accessories:
                    log_event(name, PollStatus.FAILED_API, err=err_msg)
        
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    poll_loop()
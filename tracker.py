import sqlite3
from findmy import AppleAccount, LocalAnisetteProvider, LoginState, TrustedDeviceSecondFactorMethod, SmsSecondFactorMethod

def initialize_tracker(email, password):
    ani_provider = LocalAnisetteProvider(libs_path="ani_libs.bin")
    account = AppleAccount(ani_provider)

    auth_state = account.login(email, password)

    if auth_state == LoginState.REQUIRE_2FA:
        available_methods = account.get_2fa_methods()
        
        for i, method in enumerate(available_methods):
            if isinstance(method, TrustedDeviceSecondFactorMethod):
                print(f"{i} - Trusted Device")
            elif isinstance(method, SmsSecondFactorMethod):
                print(f"{i} - SMS ({method.phone_number})")

        selection = int(input("Select method index > "))
        selected_method = available_methods[selection]
        
        selected_method.request()
        verification_code = input("Enter 2FA Code > ")
        selected_method.submit(verification_code)

    account.to_json("account.json")

    database_conn = sqlite3.connect('airpods_tracker.db')
    db_cursor = database_conn.cursor()
    
    db_cursor.execute('''
        CREATE TABLE IF NOT EXISTS airpods_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_name TEXT,
            timestamp TEXT,
            latitude REAL,
            longitude REAL
        )
    ''')

    # Fetch latest reports for AirPods accessories
    for accessory in account.accessories:
        if "AirPods" in accessory.name:
            location_reports = accessory.fetch_reports()
            for report in location_reports:
                db_cursor.execute('''
                    INSERT INTO airpods_locations (device_name, timestamp, latitude, longitude)
                    VALUES (?, ?, ?, ?)
                ''', (accessory.name, str(report.timestamp), report.latitude, report.longitude))
    
    database_conn.commit()
    account.close()

if __name__ == "__main__":
    email_address = input("Apple ID Email: ")
    app_password = input("Password: ")
    initialize_tracker(email_address, app_password)
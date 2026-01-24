import os
from findmy import AppleAccount, LocalAnisetteProvider

def get_authenticated_account(store_path: str, libs_path: str = "ani_libs.bin") -> AppleAccount:
    """Restores the AppleAccount session from account.json."""
    if not os.path.exists(store_path):
        raise FileNotFoundError(f"Session file {store_path} not found. Run initial login first.")
    
    return AppleAccount.from_json(store_path, anisette_libs_path=libs_path)
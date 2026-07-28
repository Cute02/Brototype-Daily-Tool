"""User Authentication and Security Module for Brototype Daily Tool."""
import hashlib
import json
import os
import secrets
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

USERS_FILE = Path("users.json").resolve()


def generate_salt() -> str:
    return secrets.token_hex(16)


def hash_password(password: str, salt: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )
    return key.hex()


class AuthManager:
    def __init__(self, file_path: Path = USERS_FILE):
        self.file_path = file_path
        self.users: Dict[str, Dict[str, Any]] = self._load_users()
        self.active_sessions: Dict[str, str] = {}  # token -> username

    def _load_users(self) -> Dict[str, Dict[str, Any]]:
        if not self.file_path.exists():
            return {}
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_users(self) -> bool:
        temp_path = self.file_path.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(self.users, f, indent=2, ensure_ascii=False)
            os.replace(temp_path, self.file_path)
            return True
        except Exception as e:
            print(f"[Error] Failed to save users.json: {e}")
            return False

    def _find_user_key(self, identifier: str) -> Optional[str]:
        identifier = identifier.strip().lower()
        if not identifier:
            return None
        if identifier in self.users:
            return identifier
        for uname, udata in self.users.items():
            if udata.get("email") and udata.get("email").strip().lower() == identifier:
                return uname
        return None

    def register_user(self, username: str, password: str, email: str = "") -> Dict[str, Any]:
        username = username.strip().lower()
        email = email.strip().lower()
        if not username or len(username) < 3:
            raise ValueError("Username must be at least 3 characters long.")
        if len(password) < 4:
            raise ValueError("Password must be at least 4 characters long.")
        if username in self.users:
            raise ValueError(f"Username '{username}' is already registered.")

        if email:
            for uname, udata in self.users.items():
                if udata.get("email") and udata.get("email").strip().lower() == email:
                    raise ValueError(f"Email '{email}' is already registered.")

        salt = generate_salt()
        pwd_hash = hash_password(password, salt)

        user_data = {
            "username": username,
            "email": email,
            "salt": salt,
            "password_hash": pwd_hash,
            "created_at": secrets.token_hex(4)
        }
        self.users[username] = user_data
        self._save_users()
        return {"username": username, "email": email}

    def authenticate_user(self, identifier: str, password: str) -> Dict[str, Any]:
        username_key = self._find_user_key(identifier)
        if not username_key:
            raise ValueError("Invalid username/email or password.")

        user = self.users[username_key]
        calc_hash = hash_password(password, user["salt"])
        if not secrets.compare_digest(calc_hash, user["password_hash"]):
            raise ValueError("Invalid username/email or password.")

        return {"username": user["username"]}

    def generate_otp(self, identifier: str) -> Tuple[str, str]:
        username_key = self._find_user_key(identifier)
        if not username_key:
            raise ValueError("User with specified username or email not found.")

        user = self.users[username_key]
        otp_code = f"{secrets.randbelow(900000) + 100000}"
        user["otp"] = otp_code
        user["otp_expiry"] = time.time() + 600  # valid for 10 minutes
        self._save_users()
        return otp_code, user["username"]

    def verify_otp(self, identifier: str, otp_code: str) -> Dict[str, Any]:
        username_key = self._find_user_key(identifier)
        if not username_key:
            raise ValueError("User with specified username or email not found.")

        user = self.users[username_key]
        saved_otp = user.get("otp")
        expiry = user.get("otp_expiry", 0)

        if not saved_otp or saved_otp != str(otp_code).strip():
            raise ValueError("Invalid OTP code.")
        if time.time() > expiry:
            raise ValueError("OTP code has expired. Please request a new one.")

        # Clear OTP after verification
        user.pop("otp", None)
        user.pop("otp_expiry", None)
        self._save_users()

        return {"username": user["username"]}

    def create_session(self, username: str) -> str:
        username = username.strip().lower()
        token = secrets.token_hex(32)
        self.active_sessions[token] = username
        return token

    def verify_session(self, token: str) -> Optional[str]:
        if not token:
            return None
        return self.active_sessions.get(token)

    def revoke_session(self, token: str):
        if token in self.active_sessions:
            del self.active_sessions[token]

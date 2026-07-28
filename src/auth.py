"""User Authentication and Security Module for Brototype Daily Tool."""
import hashlib
import json
import os
import secrets
from pathlib import Path
from typing import Dict, Any, Optional

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

    def register_user(self, username: str, password: str) -> Dict[str, Any]:
        username = username.strip().lower()
        if not username or len(username) < 3:
            raise ValueError("Username must be at least 3 characters long.")
        if len(password) < 4:
            raise ValueError("Password must be at least 4 characters long.")
        if username in self.users:
            raise ValueError(f"Username '{username}' is already registered.")

        salt = generate_salt()
        pwd_hash = hash_password(password, salt)

        user_data = {
            "username": username,
            "salt": salt,
            "password_hash": pwd_hash,
            "created_at": secrets.token_hex(4)
        }
        self.users[username] = user_data
        self._save_users()
        return {"username": username}

    def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        username = username.strip().lower()
        if username not in self.users:
            raise ValueError("Invalid username or password.")

        user = self.users[username]
        calc_hash = hash_password(password, user["salt"])
        if not secrets.compare_digest(calc_hash, user["password_hash"]):
            raise ValueError("Invalid username or password.")

        return {"username": username}

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

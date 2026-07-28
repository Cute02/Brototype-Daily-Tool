"""Unit test suite for User Authentication module."""
import pytest
from pathlib import Path
from src.auth import AuthManager, hash_password, generate_salt


@pytest.fixture
def temp_users_file(tmp_path):
    return tmp_path / "test_users.json"


def test_password_hashing():
    salt = generate_salt()
    hash1 = hash_password("secret123", salt)
    hash2 = hash_password("secret123", salt)
    hash3 = hash_password("wrongpass", salt)

    assert len(salt) == 32
    assert hash1 == hash2
    assert hash1 != hash3


def test_user_registration_and_authentication(temp_users_file):
    auth = AuthManager(file_path=temp_users_file)

    # Register user
    user = auth.register_user("neha_dev", "securePass123")
    assert user["username"] == "neha_dev"

    # Duplicate registration should fail
    with pytest.raises(ValueError, match="already registered"):
        auth.register_user("neha_dev", "newpass")

    # Invalid login
    with pytest.raises(ValueError, match="Invalid username or password"):
        auth.authenticate_user("neha_dev", "wrongpass")

    # Valid login
    auth_result = auth.authenticate_user("neha_dev", "securePass123")
    assert auth_result["username"] == "neha_dev"


def test_session_management(temp_users_file):
    auth = AuthManager(file_path=temp_users_file)
    auth.register_user("testuser", "password123")

    token = auth.create_session("testuser")
    assert auth.verify_session(token) == "testuser"
    assert auth.verify_session("invalidtoken") is None

    auth.revoke_session(token)
    assert auth.verify_session(token) is None

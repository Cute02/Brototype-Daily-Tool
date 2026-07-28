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
    with pytest.raises(ValueError, match="Invalid username"):
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


def test_email_login_and_otp_auth(temp_users_file):
    auth = AuthManager(file_path=temp_users_file)
    auth.register_user("alex_dev", "pass1234", email="alex@brototype.com")

    # Login with email + password
    res = auth.authenticate_user("alex@brototype.com", "pass1234")
    assert res["username"] == "alex_dev"

    # Generate OTP via email
    otp, uname = auth.generate_otp("alex@brototype.com")
    assert len(otp) == 6
    assert uname == "alex_dev"

    # Verify invalid OTP
    with pytest.raises(ValueError, match="Invalid OTP"):
        auth.verify_otp("alex_dev", "000000")

    # Verify valid OTP
    res_otp = auth.verify_otp("alex_dev", otp)
    assert res_otp["username"] == "alex_dev"


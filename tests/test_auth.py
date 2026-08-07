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


def test_forgot_password_and_token_otp_reset(temp_users_file):
    auth = AuthManager(file_path=temp_users_file)
    auth.register_user("student_user", "oldPassword123", email="student@brototype.com")

    # Request password reset by email
    reset_data = auth.request_password_reset("student@brototype.com")
    assert reset_data["username"] == "student_user"
    assert reset_data["email"] == "student@brototype.com"
    assert len(reset_data["otp"]) == 6
    assert len(reset_data["reset_token"]) > 20
    assert "action=reset-password" in reset_data["verification_link"]

    # Verify reset token
    token_val = auth.verify_reset_token("student_user", reset_data["reset_token"])
    assert token_val["username"] == "student_user"

    # Invalid token fails
    with pytest.raises(ValueError, match="Invalid or expired"):
        auth.verify_reset_token("student_user", "invalid_token_123")

    # Reset password with token
    reset_res = auth.reset_password_with_token_or_otp(
        identifier="student@brototype.com",
        new_password="brandNewPassword456",
        reset_token=reset_data["reset_token"]
    )
    assert reset_res["username"] == "student_user"

    # Old password should no longer authenticate
    with pytest.raises(ValueError, match="Invalid username/email or password"):
        auth.authenticate_user("student_user", "oldPassword123")

    # New password authenticates cleanly
    auth_success = auth.authenticate_user("student_user", "brandNewPassword456")
    assert auth_success["username"] == "student_user"

    # Reset password with OTP test
    reset_data_2 = auth.request_password_reset("student_user")
    reset_res_2 = auth.reset_password_with_token_or_otp(
        identifier="student_user",
        new_password="anotherNewPassword789",
        otp_code=reset_data_2["otp"]
    )
    assert reset_res_2["username"] == "student_user"

    # Verify authentication with the second new password
    auth_success_2 = auth.authenticate_user("student_user", "anotherNewPassword789")
    assert auth_success_2["username"] == "student_user"



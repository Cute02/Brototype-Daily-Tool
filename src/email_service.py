"""Real Email Delivery Service using Python Standard Library smtplib & MIMEText."""
import os
import smtplib
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple


def load_env_file():
    """Load key-value pairs from .env into os.environ if present."""
    env_path = Path(".env").resolve()
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass


load_env_file()


def send_password_reset_email(to_email: str, username: str, otp_code: str, verification_link: str) -> Tuple[bool, str]:
    """
    Send real password reset email via SMTP (Gmail, Outlook, SendGrid, Mailtrap, etc.).
    Returns (success: bool, status_message: str).
    """
    load_env_file()

    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com").strip()
    smtp_port_raw = os.environ.get("SMTP_PORT", "587").strip()
    try:
        smtp_port = int(smtp_port_raw)
    except ValueError:
        smtp_port = 587

    sender_email = (
        os.environ.get("SMTP_USER") or
        os.environ.get("SMTP_EMAIL") or
        os.environ.get("SENDER_EMAIL", "")
    ).strip()

    sender_password = (
        os.environ.get("SMTP_PASSWORD") or
        os.environ.get("SMTP_APP_PASSWORD", "")
    ).strip()

    if not to_email or "@" not in to_email:
        return False, "Invalid destination email address."

    if not sender_email or not sender_password:
        msg = f"[Email Service] SMTP credentials not set in .env (SMTP_USER / SMTP_PASSWORD)."
        print(msg)
        return False, msg

    message = MIMEMultipart("alternative")
    message["Subject"] = "🔐 Brototype Password Reset & Verification Code"
    message["From"] = f"Brototype Daily Tool <{sender_email}>"
    message["To"] = to_email

    text_content = f"""Hi {username},

You requested a password reset for your Brototype Daily Tool account.

Your 6-Digit OTP Code: {otp_code}

Or click your direct verification link below:
{verification_link}

This link and code are valid for 15 minutes.

If you did not request this password reset, please ignore this email.

Best regards,
Brototype Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #6366f1; margin: 0; font-size: 24px;">🔐 Brototype Daily Tool</h1>
      <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">Password Reset & Account Security</p>
    </div>

    <p style="font-size: 15px; color: #e2e8f0;">Hi <strong>{username}</strong>,</p>
    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">You recently requested to reset your password. Use the 6-digit OTP code below or click the direct verification button to set a new password:</p>

    <div style="background-color: #0f172a; border: 1px dashed #6366f1; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">{otp_code}</span>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{verification_link}" style="background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
        🔗 Reset Your Password
      </a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px;">
      Direct link: <a href="{verification_link}" style="color: #818cf8;">{verification_link}</a>
    </p>

    <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;">

    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
      This code and link will expire in 15 minutes.<br>
      If you did not request a password reset, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
"""

    message.attach(MIMEText(text_content, "plain"))
    message.attach(MIMEText(html_content, "html"))

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=12) as server:
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, [to_email], message.as_string())
        else:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=12) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, [to_email], message.as_string())

        success_msg = f"Email sent successfully to {to_email}"
        print(f"[EMAIL SERVICE SUCCESS] {success_msg}")
        return True, success_msg
    except Exception as e:
        err_msg = f"Failed to send email to {to_email}: {e}"
        print(f"[EMAIL SERVICE ERROR] {err_msg}")
        return False, err_msg

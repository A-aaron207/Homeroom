import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_approval_email(user_data, approval_token, server_url, config):
    """Send an approval consent email to the admin with user signup details."""
    admin_email = config.get('ADMIN_EMAIL') or 'aaronsaha.22@gmail.com'
    gmail_user = config.get('GMAIL_USER')
    gmail_password = config.get('GMAIL_APP_PASSWORD')

    consent_page_url = f"{server_url}/approve.html?token={approval_token}"

    display_name = user_data.get('display_name', 'Unknown')
    username = user_data.get('username', '')
    email = user_data.get('email', '')
    roll_number = user_data.get('roll_number', '')
    bio = user_data.get('bio', '')
    avatar = user_data.get('avatar_emoji', '🎓')

    html_content = f"""
    <html>
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #0c0c22; margin: 0; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #1a1a3a, #13132e); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="font-size: 48px; margin-bottom: 10px;">🏠</div>
                <h1 style="color: #6366f1; margin: 0; font-size: 26px;">Homeroom Account Consent Request</h1>
                <p style="color: #9494b8; margin: 5px 0 0 0; font-size: 14px;">Profile creation permission requested</p>
            </div>

            <div style="background: rgba(22, 22, 55, 0.65); padding: 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 24px;">
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: inline-flex; align-items: center; justify-content: center; font-size: 32px;">{avatar}</div>
                </div>
                <table style="width: 100%; color: #eaeaf2; font-size: 14px;">
                    <tr><td style="padding: 8px 0; color: #9494b8;">Name</td><td style="padding: 8px 0; font-weight: 600;">{display_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #9494b8;">Username</td><td style="padding: 8px 0;">@{username}</td></tr>
                    <tr><td style="padding: 8px 0; color: #9494b8;">Email</td><td style="padding: 8px 0;">{email}</td></tr>
                    <tr><td style="padding: 8px 0; color: #9494b8;">Roll No.</td><td style="padding: 8px 0;">{roll_number}</td></tr>
                    <tr><td style="padding: 8px 0; color: #9494b8;">Bio</td><td style="padding: 8px 0;">{bio}</td></tr>
                </table>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <a href="{consent_page_url}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; display: inline-block;">
                    Open Consent Page (Accept / Reject Profile) →
                </a>
            </div>

            <p style="margin-top: 30px; font-size: 12px; color: #5a5a80; text-align: center;">
                Sent to {admin_email} for student verification.
            </p>
        </div>
    </body>
    </html>
    """

    # If Gmail not configured, print to console
    if not admin_email or not gmail_user or not gmail_password:
        print("\n" + "=" * 50)
        print("📧 APPROVAL EMAIL (Gmail not configured)")
        print("=" * 50)
        print(f"  To: {admin_email or 'Not configured'}")
        print(f"  Subject: Homeroom: New signup from {display_name}")
        print(f"  User: @{username} ({email})")
        print(f"  Review: {approve_link}")
        print("=" * 50 + "\n")
        return True

    # Send via Gmail SMTP
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Homeroom: New signup request from {display_name}"
    msg['From'] = gmail_user
    msg['To'] = admin_email
    msg.attach(MIMEText(html_content, 'html'))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, admin_email, msg.as_string())
        print(f"  ✅ Approval email sent to {admin_email}")
        return True
    except Exception as e:
        print(f"  ❌ Failed to send email: {str(e)}")
        return False

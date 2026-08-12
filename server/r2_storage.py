"""
File storage module — supports Cloudinary (primary), Backblaze B2 (secondary),
Cloudflare R2 (tertiary), or local disk fallback.

Priority:
  1. Cloudinary     (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME set) — 25 GB free, no card
  2. Backblaze B2   (B2_KEY_ID + B2_APPLICATION_KEY set)          — 10 GB free, $1 verify
  3. Cloudflare R2  (R2_ACCOUNT_ID + R2_ACCESS_KEY_ID set)        — 10 GB free, card needed
  4. Local uploads/ folder                                         — fallback, always works

Cloudinary setup (truly free, NO card needed):
  1. Sign up at https://cloudinary.com/users/register_free
  2. Go to Dashboard → copy your Cloud Name, API Key, API Secret
  3. Set these env vars on Render:
       CLOUDINARY_CLOUD_NAME = your_cloud_name
       CLOUDINARY_API_KEY    = your_api_key
       CLOUDINARY_API_SECRET = your_api_secret
"""

import os
import io
import uuid
from flask import current_app

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import boto3
    from botocore.client import Config
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_SDK_AVAILABLE = True
except ImportError:
    CLOUDINARY_SDK_AVAILABLE = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cfg(key, default=''):
    """Read from env first, then Flask app config, then default."""
    return os.environ.get(key) or current_app.config.get(key, default)


# ---------------------------------------------------------------------------
# Image compression
# ---------------------------------------------------------------------------

def compress_image(file_bytes, max_dim=1200, quality=82):
    """Compress and resize an image before upload to save storage space."""
    if not PIL_AVAILABLE:
        return file_bytes, None
    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format='JPEG', quality=quality, optimize=True)
        return out.getvalue(), 'image/jpeg'
    except Exception:
        return file_bytes, None


# ---------------------------------------------------------------------------
# Client builders
# ---------------------------------------------------------------------------

def _configure_cloudinary():
    """Configure the Cloudinary SDK from env vars. Returns True if ready."""
    if not CLOUDINARY_SDK_AVAILABLE:
        return False

    cloud_name = _cfg('CLOUDINARY_CLOUD_NAME')
    api_key    = _cfg('CLOUDINARY_API_KEY')
    api_secret = _cfg('CLOUDINARY_API_SECRET')

    # Also support the all-in-one CLOUDINARY_URL env var
    cloudinary_url = os.environ.get('CLOUDINARY_URL', '')

    if cloudinary_url:
        # SDK reads CLOUDINARY_URL automatically from env
        return True

    if not (cloud_name and api_key and api_secret):
        return False

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True
    )
    return True


def get_b2_client():
    """Returns a boto3 S3-compatible client for Backblaze B2."""
    key_id   = _cfg('B2_KEY_ID')
    app_key  = _cfg('B2_APPLICATION_KEY')
    endpoint = _cfg('B2_ENDPOINT')

    if not (BOTO3_AVAILABLE and key_id and app_key and endpoint):
        return None

    return boto3.client(
        's3',
        endpoint_url=f"https://{endpoint}",
        aws_access_key_id=key_id,
        aws_secret_access_key=app_key,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )


def get_r2_client():
    """Returns a boto3 S3 client for Cloudflare R2."""
    account_id = _cfg('R2_ACCOUNT_ID')
    access_key = _cfg('R2_ACCESS_KEY_ID')
    secret_key = _cfg('R2_SECRET_ACCESS_KEY')

    if not (BOTO3_AVAILABLE and account_id and access_key and secret_key):
        return None

    return boto3.client(
        's3',
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )


# ---------------------------------------------------------------------------
# Main upload function
# ---------------------------------------------------------------------------

def upload_to_r2_or_local(file_data, filename, folder='notes', content_type=None):
    """
    Upload a file to cloud storage or local disk.

    Priority order:
      1. Cloudinary  — 25 GB free, no card, best option
      2. Backblaze B2 — 10 GB free, needs $1 verify
      3. Cloudflare R2 — 10 GB free, needs card on file
      4. Local disk  — ephemeral on Render free tier, always works

    Returns a public URL or relative path.
    """
    # Compress images before upload
    if content_type and content_type.startswith('image/'):
        file_data, new_type = compress_image(file_data)
        if new_type:
            content_type = new_type

    key = f"{folder}/{filename}"

    # ── 1. Cloudinary ────────────────────────────────────────────────────────
    if _configure_cloudinary():
        try:
            # Detect resource type
            resource_type = 'image' if (content_type and content_type.startswith('image/')) else 'raw'

            result = cloudinary.uploader.upload(
                file_data,
                folder=folder,
                public_id=os.path.splitext(filename)[0],  # strip extension
                resource_type=resource_type,
                overwrite=True,
                use_filename=True,
                unique_filename=False
            )
            url = result.get('secure_url', '')
            if url:
                print(f"[storage] Cloudinary upload OK: {url}")
                return url
        except Exception as e:
            print(f"[storage] Cloudinary upload failed ({e}), trying B2...")

    # ── 2. Backblaze B2 ──────────────────────────────────────────────────────
    b2 = get_b2_client()
    if b2:
        bucket = _cfg('B2_BUCKET_NAME', 'homeroom')
        try:
            extra = {'ContentType': content_type} if content_type else {}
            b2.put_object(Bucket=bucket, Key=key, Body=file_data, **extra)
            public_domain = _cfg('B2_PUBLIC_DOMAIN', '').rstrip('/')
            if public_domain:
                return f"{public_domain}/{key}"
            endpoint = _cfg('B2_ENDPOINT', '')
            return f"https://{endpoint}/{bucket}/{key}"
        except Exception as e:
            print(f"[storage] B2 upload failed ({e}), trying R2...")

    # ── 3. Cloudflare R2 ─────────────────────────────────────────────────────
    r2 = get_r2_client()
    if r2:
        bucket = _cfg('R2_BUCKET_NAME', 'homeroom')
        try:
            extra = {'ContentType': content_type} if content_type else {}
            r2.put_object(Bucket=bucket, Key=key, Body=file_data, **extra)
            public_domain = _cfg('R2_PUBLIC_DOMAIN', '').rstrip('/')
            if public_domain:
                return f"{public_domain}/{key}"
            account_id = _cfg('R2_ACCOUNT_ID')
            return f"https://{bucket}.{account_id}.r2.cloudflarestorage.com/{key}"
        except Exception as e:
            print(f"[storage] R2 upload failed ({e}), falling back to local...")

    # ── 4. Local disk fallback ────────────────────────────────────────────────
    upload_dir = os.path.join(
        current_app.config.get('UPLOAD_FOLDER', 'uploads'), folder
    )
    os.makedirs(upload_dir, exist_ok=True)
    local_path = os.path.join(upload_dir, filename)
    with open(local_path, 'wb') as f:
        f.write(file_data)
    print(f"[storage] Saved locally (no cloud configured): {local_path}")
    return f"/uploads/{folder}/{filename}"

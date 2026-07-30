import os
import io
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


def get_r2_client():
    """Returns a boto3 S3 client configured for Cloudflare R2 if credentials exist."""
    account_id = os.environ.get('R2_ACCOUNT_ID') or current_app.config.get('R2_ACCOUNT_ID')
    access_key = os.environ.get('R2_ACCESS_KEY_ID') or current_app.config.get('R2_ACCESS_KEY_ID')
    secret_key = os.environ.get('R2_SECRET_ACCESS_KEY') or current_app.config.get('R2_SECRET_ACCESS_KEY')

    if not (BOTO3_AVAILABLE and account_id and access_key and secret_key):
        return None

    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        's3',
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )


def compress_image(file_bytes, max_dim=1000, quality=82):
    """Compress image using Pillow before upload."""
    if not PIL_AVAILABLE:
        return file_bytes, None
    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Resize if larger than max_dim
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        out = io.BytesIO()
        img.save(out, format='JPEG', quality=quality, optimize=True)
        return out.getvalue(), 'image/jpeg'
    except Exception as e:
        return file_bytes, None


def upload_to_r2_or_local(file_data, filename, folder='notes', content_type=None):
    """
    Uploads file to Cloudflare R2 if configured, otherwise saves locally in uploads/{folder}/.
    Returns the public URL or relative file path.
    """
    bucket_name = os.environ.get('R2_BUCKET_NAME') or current_app.config.get('R2_BUCKET_NAME', 'homeroom')
    public_domain = os.environ.get('R2_PUBLIC_DOMAIN') or current_app.config.get('R2_PUBLIC_DOMAIN', '')

    # Optional image compression for image files
    if content_type and content_type.startswith('image/'):
        file_data, new_type = compress_image(file_data)
        if new_type:
            content_type = new_type

    r2 = get_r2_client()
    key = f"{folder}/{filename}"

    if r2:
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type

            r2.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=file_data,
                **extra_args
            )

            if public_domain:
                domain = public_domain.rstrip('/')
                return f"{domain}/{key}"
            else:
                account_id = os.environ.get('R2_ACCOUNT_ID') or current_app.config.get('R2_ACCOUNT_ID')
                return f"https://{bucket_name}.{account_id}.r2.cloudflarestorage.com/{key}"
        except Exception as e:
            print(f"R2 upload failed ({e}), falling back to local storage...")

    # Local fallback
    upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), folder)
    os.makedirs(upload_dir, exist_ok=True)
    local_path = os.path.join(upload_dir, filename)

    with open(local_path, 'wb') as f:
        f.write(file_data)

    return f"/uploads/{folder}/{filename}"

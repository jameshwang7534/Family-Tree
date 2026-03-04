"""Supabase Storage helpers for profile assets."""
import uuid
from config import get_supabase, settings

BUCKET = "profile-assets"


def _public_url(path: str) -> str:
    """Build public URL for a file in the bucket. Assumes bucket is public."""
    base = settings.supabase_url.rstrip("/")
    # Supabase storage public URL: .../storage/v1/object/public/bucket/path
    return f"{base}/storage/v1/object/public/{BUCKET}/{path}"


def upload_media(tree_id: str, profile_id: str, file_data: bytes, content_type: str, extension: str) -> str:
    """Upload media (image/video) and return storage path."""
    name = f"{uuid.uuid4()}{extension}"
    path = f"{tree_id}/{profile_id}/media/{name}"
    supabase = get_supabase()
    supabase.storage.from_(BUCKET).upload(
        path,
        file_data,
        file_options={"content-type": content_type},
    )
    return path


def upload_voice(tree_id: str, profile_id: str, file_data: bytes, content_type: str, extension: str) -> str:
    """Upload audio and return storage path."""
    name = f"{uuid.uuid4()}{extension}"
    path = f"{tree_id}/{profile_id}/voice/{name}"
    supabase = get_supabase()
    supabase.storage.from_(BUCKET).upload(
        path,
        file_data,
        file_options={"content-type": content_type},
    )
    return path


def path_to_public_url(path: str) -> str:
    return _public_url(path)


def delete_file(path: str) -> None:
    """Remove file from storage. Raises on failure so callers can surface the error."""
    supabase = get_supabase()
    supabase.storage.from_(BUCKET).remove([path])

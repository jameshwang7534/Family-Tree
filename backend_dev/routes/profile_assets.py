"""CRUD for profile media, voice, and stories. All require tree ownership."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from routes.auth import get_current_user_id

try:
    from storage3.exceptions import StorageApiError
except ImportError:
    StorageApiError = Exception  # noqa: B904
try:
    from postgrest.exceptions import APIError as PostgrestAPIError
except ImportError:
    PostgrestAPIError = Exception  # noqa: B904

# Mount at /api/profile-assets so paths don't conflict with /api/trees/{tree_id}
router = APIRouter(prefix="/trees/{tree_id}/profiles/{profile_id}", tags=["profile-assets"])
from models import TreeModel, ProfileMediaModel, ProfileVoiceModel, ProfileStoryModel
from schemas import (
    ProfileMediaResponse,
    ProfileVoiceResponse,
    ProfileStoryResponse,
    ProfileStoryCreate,
    ProfileStoryUpdate,
)
from storage import upload_media, upload_voice, path_to_public_url, delete_file
from datetime import datetime

# Allowed MIME types
MEDIA_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MEDIA_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
VOICE_TYPES = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4"}


def _ensure_tree_owner(tree_id: str, user_id: str) -> None:
    tid = str(tree_id).strip() if tree_id else ""
    uid = str(user_id).strip() if user_id else ""
    if not tid:
        raise HTTPException(status_code=400, detail="Tree ID is required")
    tree = TreeModel.find_by_id(tid)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    if str(tree.user_id).strip() != uid:
        raise HTTPException(status_code=403, detail="You do not have access to this tree")


def _media_to_response(m) -> ProfileMediaResponse:
    return ProfileMediaResponse(
        id=m.id,
        treeId=m.tree_id,
        profileId=m.profile_id,
        fileUrl=path_to_public_url(m.file_path),
        fileType=m.file_type,
        caption=m.caption,
        createdAt=m.created_at.isoformat(),
    )


def _voice_to_response(v) -> ProfileVoiceResponse:
    return ProfileVoiceResponse(
        id=v.id,
        treeId=v.tree_id,
        profileId=v.profile_id,
        fileUrl=path_to_public_url(v.file_path),
        durationSeconds=v.duration_seconds,
        createdAt=v.created_at.isoformat(),
    )


def _story_to_response(s) -> ProfileStoryResponse:
    date_created = s.date_created.strftime("%Y-%m-%d") if hasattr(s.date_created, "strftime") else str(s.date_created).split("T")[0]
    return ProfileStoryResponse(
        id=s.id,
        treeId=s.tree_id,
        profileId=s.profile_id,
        title=s.title,
        dateCreated=date_created,
        mainText=s.main_text,
        createdAt=s.created_at.isoformat(),
        updatedAt=s.updated_at.isoformat(),
    )


@router.delete("")
async def delete_all_profile_assets(
    tree_id: str,
    profile_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Delete all media, voice, and stories for a profile (e.g. when profile card is removed)."""
    _ensure_tree_owner(tree_id, user_id)
    # Delete all files from storage first, then DB rows (so we don't leave orphaned files if storage fails)
    media_list = ProfileMediaModel.list_by_profile(tree_id, profile_id)
    voice_list = ProfileVoiceModel.list_by_profile(tree_id, profile_id)
    try:
        for media in media_list:
            delete_file(media.file_path)
        for voice in voice_list:
            delete_file(voice.file_path)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Storage delete failed: {e!s}. Ensure Storage RLS allows DELETE on bucket 'profile-assets' (see PROFILE_ASSETS_SETUP.md).",
        )
    for media in media_list:
        ProfileMediaModel.delete(media.id)
    for voice in voice_list:
        ProfileVoiceModel.delete(voice.id)
    for story in ProfileStoryModel.list_by_profile(tree_id, profile_id):
        ProfileStoryModel.delete(story.id)
    return {"ok": True}


# --- Media ---

@router.get("/media", response_model=list[ProfileMediaResponse])
async def list_media(
    tree_id: str,
    profile_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """List all media for a profile."""
    _ensure_tree_owner(tree_id, user_id)
    try:
        items = ProfileMediaModel.list_by_profile(tree_id, profile_id)
    except PostgrestAPIError as e:
        msg = str(e.args[0]) if e.args else "Database error"
        if "schema cache" in msg.lower() or "PGRST205" in msg:
            raise HTTPException(status_code=503, detail="Profile media tables not ready. Run the migration in Supabase SQL Editor and reload schema cache.")
        raise HTTPException(status_code=502, detail=msg)
    return [_media_to_response(m) for m in items]


@router.post("/media", response_model=ProfileMediaResponse)
async def create_media(
    tree_id: str,
    profile_id: str,
    file: UploadFile = File(...),
    caption: str | None = Form(None),
    user_id: str = Depends(get_current_user_id),
):
    """Upload a photo or video for the profile."""
    _ensure_tree_owner(tree_id, user_id)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file")
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type in MEDIA_IMAGE_TYPES:
        file_type = "image"
    elif content_type in MEDIA_VIDEO_TYPES:
        file_type = "video"
    else:
        raise HTTPException(status_code=400, detail="File must be image or video")
    ext = "." + (file.filename.split(".")[-1] if "." in file.filename else "bin")
    data = await file.read()
    try:
        path = upload_media(tree_id, profile_id, data, content_type, ext)
    except StorageApiError as e:
        msg = str(e).lower()
        if "bucket" in msg and "not found" in msg:
            raise HTTPException(status_code=503, detail="Storage bucket 'profile-assets' not found. Create it in Supabase Dashboard → Storage (see backend_dev/PROFILE_ASSETS_SETUP.md).")
        raise HTTPException(status_code=502, detail=str(e))
    try:
        media = ProfileMediaModel.create(tree_id, profile_id, path, file_type, caption)
    except PostgrestAPIError as e:
        msg = str(e.args[0]) if e.args else "Database error"
        if "schema cache" in msg.lower() or "PGRST205" in msg:
            raise HTTPException(status_code=503, detail="Profile media tables not ready. Run the migration in Supabase SQL Editor and reload schema cache.")
        raise HTTPException(status_code=502, detail=msg)
    return _media_to_response(media)


@router.delete("/media/{media_id}")
async def delete_media(
    tree_id: str,
    profile_id: str,
    media_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Delete a profile media item."""
    _ensure_tree_owner(tree_id, user_id)
    media = ProfileMediaModel.get_by_id(media_id)
    if not media or media.tree_id != tree_id or media.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Media not found")
    delete_file(media.file_path)
    ProfileMediaModel.delete(media_id)
    return {"ok": True}


# --- Voice ---

@router.get("/voice", response_model=list[ProfileVoiceResponse])
async def list_voice(
    tree_id: str,
    profile_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """List all voice recordings for a profile."""
    _ensure_tree_owner(tree_id, user_id)
    try:
        items = ProfileVoiceModel.list_by_profile(tree_id, profile_id)
    except PostgrestAPIError as e:
        msg = str(e.args[0]) if e.args else "Database error"
        if "schema cache" in msg.lower() or "PGRST205" in msg:
            raise HTTPException(status_code=503, detail="Profile voice tables not ready. Run the migration in Supabase SQL Editor and reload schema cache.")
        raise HTTPException(status_code=502, detail=msg)
    return [_voice_to_response(v) for v in items]


@router.post("/voice", response_model=ProfileVoiceResponse)
async def create_voice(
    tree_id: str,
    profile_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """Upload an audio file for the profile."""
    _ensure_tree_owner(tree_id, user_id)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file")
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type not in VOICE_TYPES and not file.filename.lower().endswith((".mp3", ".wav", ".ogg", ".webm", ".m4a")):
        raise HTTPException(status_code=400, detail="File must be audio (mp3, wav, ogg, webm, m4a)")
    ext = "." + (file.filename.split(".")[-1] if "." in file.filename else "bin")
    data = await file.read()
    path = upload_voice(tree_id, profile_id, data, content_type or "audio/mpeg", ext)
    voice = ProfileVoiceModel.create(tree_id, profile_id, path, None)
    return _voice_to_response(voice)


@router.delete("/voice/{voice_id}")
async def delete_voice(
    tree_id: str,
    profile_id: str,
    voice_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Delete a profile voice recording."""
    _ensure_tree_owner(tree_id, user_id)
    voice = ProfileVoiceModel.get_by_id(voice_id)
    if not voice or voice.tree_id != tree_id or voice.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Voice not found")
    delete_file(voice.file_path)
    ProfileVoiceModel.delete(voice_id)
    return {"ok": True}


# --- Stories ---

@router.get("/stories", response_model=list[ProfileStoryResponse])
async def list_stories(
    tree_id: str,
    profile_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """List all stories for a profile."""
    _ensure_tree_owner(tree_id, user_id)
    try:
        items = ProfileStoryModel.list_by_profile(tree_id, profile_id)
    except PostgrestAPIError as e:
        msg = str(e.args[0]) if e.args else "Database error"
        if "schema cache" in msg.lower() or "PGRST205" in msg:
            raise HTTPException(status_code=503, detail="Profile stories tables not ready. Run the migration in Supabase SQL Editor and reload schema cache.")
        raise HTTPException(status_code=502, detail=msg)
    return [_story_to_response(s) for s in items]


@router.post("/stories", response_model=ProfileStoryResponse)
async def create_story(
    tree_id: str,
    profile_id: str,
    payload: ProfileStoryCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new story for the profile."""
    _ensure_tree_owner(tree_id, user_id)
    if not (payload.title and payload.title.strip()):
        raise HTTPException(status_code=400, detail="Title is required")
    if not (payload.mainText and payload.mainText.strip()):
        raise HTTPException(status_code=400, detail="Main text is required")
    date_created = None
    if payload.dateCreated and payload.dateCreated.strip():
        try:
            date_created = datetime.fromisoformat(payload.dateCreated.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_created format (use YYYY-MM-DD)")
    story = ProfileStoryModel.create(
        tree_id, profile_id,
        payload.title.strip(),
        payload.mainText.strip(),
        date_created,
    )
    return _story_to_response(story)


@router.patch("/stories/{story_id}", response_model=ProfileStoryResponse)
async def update_story(
    tree_id: str,
    profile_id: str,
    story_id: str,
    payload: ProfileStoryUpdate,
    user_id: str = Depends(get_current_user_id),
):
    _ensure_tree_owner(tree_id, user_id)
    story = ProfileStoryModel.get_by_id(story_id)
    if not story or story.tree_id != tree_id or story.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Story not found")
    if payload.title is not None and not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    if payload.mainText is not None and not payload.mainText.strip():
        raise HTTPException(status_code=400, detail="Main text cannot be empty")
    date_created = payload.dateCreated
    if date_created and date_created.strip():
        try:
            datetime.fromisoformat(date_created.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_created format")
    updated = ProfileStoryModel.update(
        story_id,
        title=payload.title.strip() if payload.title else None,
        main_text=payload.mainText.strip() if payload.mainText else None,
        date_created=date_created.strip() if date_created else None,
    )
    if not updated:
        raise HTTPException(status_code=500, detail="Update failed")
    return _story_to_response(updated)


@router.delete("/stories/{story_id}")
async def delete_story(
    tree_id: str,
    profile_id: str,
    story_id: str,
    user_id: str = Depends(get_current_user_id),
):
    _ensure_tree_owner(tree_id, user_id)
    story = ProfileStoryModel.get_by_id(story_id)
    if not story or story.tree_id != tree_id or story.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Story not found")
    ProfileStoryModel.delete(story_id)
    return {"ok": True}

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import uuid
import bcrypt

from config import get_supabase


@dataclass
class User:
    id: str
    email: str
    password: str
    firstName: str
    lastName: str
    createdAt: datetime

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "firstName": self.firstName,
            "lastName": self.lastName,
            "createdAt": self.createdAt,
        }


def _user_from_row(row: dict) -> User:
    created_at = row["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return User(
        id=str(row["id"]),
        email=row["email"],
        password=row["password"],
        firstName=row["first_name"],
        lastName=row["last_name"],
        createdAt=created_at,
    )


class UserModel:
    @staticmethod
    def find_by_email(email: str) -> Optional[User]:
        supabase = get_supabase()
        r = supabase.table("users").select("*").eq("email", email).execute()
        if not r.data or len(r.data) == 0:
            return None
        return _user_from_row(r.data[0])

    @staticmethod
    def find_by_id(user_id: str) -> Optional[User]:
        supabase = get_supabase()
        r = supabase.table("users").select("*").eq("id", user_id).execute()
        if not r.data or len(r.data) == 0:
            return None
        return _user_from_row(r.data[0])

    @staticmethod
    def create(email: str, password: str, firstName: str, lastName: str) -> User:
        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        supabase = get_supabase()
        row = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password": hashed_password,
            "first_name": firstName,
            "last_name": lastName,
        }
        r = supabase.table("users").insert(row).execute()
        if not r.data or len(r.data) == 0:
            raise RuntimeError("Failed to insert user")
        return _user_from_row(r.data[0])

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(password.encode(), hashed_password.encode())


@dataclass
class Tree:
    id: str
    user_id: str
    name: str
    description: Optional[str]
    icon_url: str
    created_at: datetime
    updated_at: datetime

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "name": self.name,
            "description": self.description,
            "iconUrl": self.icon_url,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }


def _parse_ts(value) -> datetime:
    if value is None:
        return datetime.now()
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value


def _tree_from_row(row: dict) -> Tree:
    return Tree(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        name=row["name"],
        description=row.get("description"),
        icon_url=row.get("icon_url") or "",
        created_at=_parse_ts(row.get("created_at")),
        updated_at=_parse_ts(row.get("updated_at")),
    )


class TreeModel:
    @staticmethod
    def find_by_id(tree_id: str) -> Optional[Tree]:
        supabase = get_supabase()
        r = supabase.table("trees").select("*").eq("id", tree_id).execute()
        if not r.data or len(r.data) == 0:
            return None
        return _tree_from_row(r.data[0])

    @staticmethod
    def find_by_user_id(user_id: str) -> list[Tree]:
        supabase = get_supabase()
        r = supabase.table("trees").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        if not r.data:
            return []
        return [_tree_from_row(row) for row in r.data]

    @staticmethod
    def create(user_id: str, name: str, description: Optional[str], icon_url: str) -> Tree:
        supabase = get_supabase()
        row = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": name,
            "description": description or None,
            "icon_url": icon_url or "",
        }
        r = supabase.table("trees").insert(row).execute()
        if not r.data or len(r.data) == 0:
            raise RuntimeError("Failed to insert tree")
        return _tree_from_row(r.data[0])


# --- Profile Media ---

@dataclass
class ProfileMedia:
    id: str
    tree_id: str
    profile_id: str
    file_path: str
    file_type: str  # 'image' | 'video'
    caption: Optional[str]
    created_at: datetime


def _profile_media_from_row(row: dict) -> ProfileMedia:
    return ProfileMedia(
        id=str(row["id"]),
        tree_id=str(row["tree_id"]),
        profile_id=row["profile_id"],
        file_path=row["file_path"],
        file_type=row["file_type"],
        caption=row.get("caption"),
        created_at=_parse_ts(row.get("created_at")),
    )


class ProfileMediaModel:
    @staticmethod
    def list_by_profile(tree_id: str, profile_id: str) -> list[ProfileMedia]:
        supabase = get_supabase()
        r = supabase.table("profile_media").select("*").eq("tree_id", tree_id).eq("profile_id", profile_id).order("created_at", desc=True).execute()
        if not r.data:
            return []
        return [_profile_media_from_row(row) for row in r.data]

    @staticmethod
    def get_by_id(media_id: str) -> Optional[ProfileMedia]:
        supabase = get_supabase()
        r = supabase.table("profile_media").select("*").eq("id", media_id).execute()
        if not r.data or len(r.data) == 0:
            return None
        return _profile_media_from_row(r.data[0])

    @staticmethod
    def create(tree_id: str, profile_id: str, file_path: str, file_type: str, caption: Optional[str] = None) -> ProfileMedia:
        supabase = get_supabase()
        row = {
            "id": str(uuid.uuid4()),
            "tree_id": tree_id,
            "profile_id": profile_id,
            "file_path": file_path,
            "file_type": file_type,
            "caption": caption,
        }
        r = supabase.table("profile_media").insert(row).execute()
        if not r.data or len(r.data) == 0:
            raise RuntimeError("Failed to insert profile_media")
        return _profile_media_from_row(r.data[0])

    @staticmethod
    def delete(media_id: str) -> bool:
        supabase = get_supabase()
        r = supabase.table("profile_media").delete().eq("id", media_id).execute()
        return True


# --- Profile Voice ---

@dataclass
class ProfileVoice:
    id: str
    tree_id: str
    profile_id: str
    file_path: str
    duration_seconds: Optional[float]
    created_at: datetime


def _profile_voice_from_row(row: dict) -> ProfileVoice:
    return ProfileVoice(
        id=str(row["id"]),
        tree_id=str(row["tree_id"]),
        profile_id=row["profile_id"],
        file_path=row["file_path"],
        duration_seconds=float(row["duration_seconds"]) if row.get("duration_seconds") is not None else None,
        created_at=_parse_ts(row.get("created_at")),
    )


class ProfileVoiceModel:
    @staticmethod
    def list_by_profile(tree_id: str, profile_id: str) -> list[ProfileVoice]:
        supabase = get_supabase()
        r = supabase.table("profile_voice").select("*").eq("tree_id", tree_id).eq("profile_id", profile_id).order("created_at", desc=True).execute()
        if not r.data:
            return []
        return [_profile_voice_from_row(row) for row in r.data]

    @staticmethod
    def get_by_id(voice_id: str) -> Optional[ProfileVoice]:
        supabase = get_supabase()
        r = supabase.table("profile_voice").select("*").eq("id", voice_id).execute()
        if not r.data or len(r.data) == 0:
            return None
        return _profile_voice_from_row(r.data[0])

    @staticmethod
    def create(tree_id: str, profile_id: str, file_path: str, duration_seconds: Optional[float] = None) -> ProfileVoice:
        supabase = get_supabase()
        row = {
            "id": str(uuid.uuid4()),
            "tree_id": tree_id,
            "profile_id": profile_id,
            "file_path": file_path,
            "duration_seconds": duration_seconds,
        }
        r = supabase.table("profile_voice").insert(row).execute()
        if not r.data or len(r.data) == 0:
            raise RuntimeError("Failed to insert profile_voice")
        return _profile_voice_from_row(r.data[0])

    @staticmethod
    def delete(voice_id: str) -> bool:
        supabase = get_supabase()
        supabase.table("profile_voice").delete().eq("id", voice_id).execute()
        return True


# --- Profile Stories ---

@dataclass
class ProfileStory:
    id: str
    tree_id: str
    profile_id: str
    title: str
    date_created: datetime  # date only in DB; we use datetime for consistency
    main_text: str
    created_at: datetime
    updated_at: datetime


def _parse_date(value) -> datetime:
    if value is None:
        return datetime.now()
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00").split("T")[0])
        except Exception:
            return datetime.now()
    return value


def _profile_story_from_row(row: dict) -> ProfileStory:
    return ProfileStory(
        id=str(row["id"]),
        tree_id=str(row["tree_id"]),
        profile_id=row["profile_id"],
        title=row["title"],
        date_created=_parse_date(row.get("date_created")),
        main_text=row["main_text"],
        created_at=_parse_ts(row.get("created_at")),
        updated_at=_parse_ts(row.get("updated_at")),
    )


class ProfileStoryModel:
    @staticmethod
    def list_by_profile(tree_id: str, profile_id: str) -> list[ProfileStory]:
        supabase = get_supabase()
        r = supabase.table("profile_stories").select("*").eq("tree_id", tree_id).eq("profile_id", profile_id).order("date_created", desc=True).execute()
        if not r.data:
            return []
        return [_profile_story_from_row(row) for row in r.data]

    @staticmethod
    def get_by_id(story_id: str) -> Optional[ProfileStory]:
        supabase = get_supabase()
        r = supabase.table("profile_stories").select("*").eq("id", story_id).execute()
        if not r.data or len(r.data) == 0:
            return None
        return _profile_story_from_row(r.data[0])

    @staticmethod
    def create(tree_id: str, profile_id: str, title: str, main_text: str, date_created: Optional[datetime] = None) -> ProfileStory:
        supabase = get_supabase()
        d = date_created or datetime.now()
        date_str = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d).split("T")[0]
        row = {
            "id": str(uuid.uuid4()),
            "tree_id": tree_id,
            "profile_id": profile_id,
            "title": title,
            "main_text": main_text,
            "date_created": date_str,
        }
        r = supabase.table("profile_stories").insert(row).execute()
        if not r.data or len(r.data) == 0:
            raise RuntimeError("Failed to insert profile_story")
        return _profile_story_from_row(r.data[0])

    @staticmethod
    def update(story_id: str, title: Optional[str] = None, main_text: Optional[str] = None, date_created: Optional[str] = None) -> Optional[ProfileStory]:
        supabase = get_supabase()
        updates: dict = {"updated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")}
        if title is not None:
            updates["title"] = title
        if main_text is not None:
            updates["main_text"] = main_text
        if date_created is not None:
            updates["date_created"] = date_created
        r = supabase.table("profile_stories").update(updates).eq("id", story_id).execute()
        if not r.data or len(r.data) == 0:
            return None
        return _profile_story_from_row(r.data[0])

    @staticmethod
    def delete(story_id: str) -> bool:
        supabase = get_supabase()
        supabase.table("profile_stories").delete().eq("id", story_id).execute()
        return True

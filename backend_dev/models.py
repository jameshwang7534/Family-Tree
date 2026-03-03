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

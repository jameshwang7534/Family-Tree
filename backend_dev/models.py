from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import uuid
import bcrypt

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

# Temporary in-memory storage (replace with Supabase later)
users: list[User] = []

class UserModel:
    @staticmethod
    def find_by_email(email: str) -> Optional[User]:
        for user in users:
            if user.email == email:
                return user
        return None

    @staticmethod
    def find_by_id(user_id: str) -> Optional[User]:
        for user in users:
            if user.id == user_id:
                return user
        return None

    @staticmethod
    def create(email: str, password: str, firstName: str, lastName: str) -> User:
        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        
        new_user = User(
            id=str(uuid.uuid4()),
            email=email,
            password=hashed_password,
            firstName=firstName,
            lastName=lastName,
            createdAt=datetime.now(),
        )
        
        users.append(new_user)
        return new_user

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


trees: list[Tree] = []


class TreeModel:
    @staticmethod
    def find_by_id(tree_id: str) -> Optional[Tree]:
        for t in trees:
            if t.id == tree_id:
                return t
        return None

    @staticmethod
    def find_by_user_id(user_id: str) -> list[Tree]:
        return [t for t in trees if t.user_id == user_id]

    @staticmethod
    def create(user_id: str, name: str, description: Optional[str], icon_url: str) -> Tree:
        now = datetime.now()
        new_tree = Tree(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=name,
            description=description or None,
            icon_url=icon_url or "",
            created_at=now,
            updated_at=now,
        )
        trees.append(new_tree)
        return new_tree

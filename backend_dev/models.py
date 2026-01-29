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

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.user import UserRole

class UserCreate(BaseModel):
    email: EmailStr | None = None
    phone_number: str | None = None
    password: str = Field(min_length=8)
    full_name: str
    
    @model_validator(mode="after")
    def check_email_or_phone(self):
        if not self.email and not self.phone_number:
            raise ValueError("Either email or phone number is required")
        return self

class UserResponse(BaseModel):
    id: int
    email: str | None = None
    phone_number : str | None = None
    full_name: str
    role: UserRole

    class Config:
        from_attributes = True

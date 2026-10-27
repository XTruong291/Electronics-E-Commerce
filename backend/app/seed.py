"""Database seed script for Module 3 (Accounts, SSO & RBAC).
Seeds 1 ADMIN, 1 STAFF, and 1 CUSTOMER.
"""
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User, UserRole


def seed_users(db: Session) -> None:
    seed_data = [
        {
            "email": "admin@example.com",
            "password": "Admin@123456",
            "full_name": "System Admin",
            "phone": "0901234567",
            "role": UserRole.ADMIN,
            "is_active": True,
        },
        {
            "email": "staff@example.com",
            "password": "Staff@123456",
            "full_name": "Store Staff",
            "phone": "0902345678",
            "role": UserRole.STAFF,
            "is_active": True,
        },
        {
            "email": "customer@example.com",
            "password": "Customer@123456",
            "full_name": "Nguyen Van A",
            "phone": "0903456789",
            "role": UserRole.CUSTOMER,
            "is_active": True,
        },
    ]

    for item in seed_data:
        existing = db.query(User).filter(User.email == item["email"]).first()
        if existing:
            print(f"User {item['email']} already exists. Updating role and status.")
            existing.role = item["role"]
            existing.is_active = item["is_active"]
            existing.password_hash = hash_password(item["password"])
            existing.full_name = item["full_name"]
            existing.phone = item["phone"]
        else:
            print(f"Creating user {item['email']} ({item['role']})...")
            new_user = User(
                email=item["email"],
                password_hash=hash_password(item["password"]),
                full_name=item["full_name"],
                phone=item["phone"],
                role=item["role"],
                is_active=item["is_active"],
            )
            db.add(new_user)

    db.commit()
    print("Seed completed successfully!")


def main() -> None:
    db = SessionLocal()
    try:
        seed_users(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()

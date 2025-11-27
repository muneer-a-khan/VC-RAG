"""
Database initialization script for Prisma
Creates tables and optionally seeds with sample data
"""
import sys
import os
import asyncio

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.database import prisma
from app.core.auth import get_password_hash


async def init_db():
    """Initialize database - Prisma handles table creation via migrations"""
    print("Connecting to database...")
    await prisma.connect()
    print("✅ Database connection successful!")
    print("\nNote: Run 'prisma db push' or 'prisma migrate deploy' to create tables.")


async def seed_sample_data():
    """Seed database with sample data (optional)"""
    print("\nSeeding sample data...")
    
    await prisma.connect()
    
    # Create sample user
    sample_user = await prisma.user.create(
        data={
            "email": "demo@vccopilot.com",
            "hashedPassword": get_password_hash("demo123"),
            "fullName": "Demo User",
            "organization": "Demo VC Firm"
        }
    )
    
    # Create sample project
    sample_project = await prisma.project.create(
        data={
            "name": "Sample Portfolio Company",
            "description": "A promising SaaS startup in the fintech space",
            "type": "portfolio_company",
            "userId": sample_user.id
        }
    )
    
    await prisma.disconnect()
    
    print("✅ Sample data seeded successfully!")
    print(f"\nDemo credentials:")
    print(f"Email: demo@vccopilot.com")
    print(f"Password: demo123")


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Initialize VC Copilot database")
    parser.add_argument("--seed", action="store_true", help="Seed with sample data")
    args = parser.parse_args()
    
    await init_db()
    
    if args.seed:
        await seed_sample_data()
    else:
        await prisma.disconnect()
    
    print("\n✅ Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())

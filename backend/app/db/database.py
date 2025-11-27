"""
Database connection using Prisma
"""
from prisma import Prisma

# Global Prisma client instance
prisma = Prisma()


async def connect_db():
    """Connect to database"""
    await prisma.connect()


async def disconnect_db():
    """Disconnect from database"""
    await prisma.disconnect()


async def get_db():
    """Get database session (for dependency injection)"""
    return prisma

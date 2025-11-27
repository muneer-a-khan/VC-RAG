"""
Application configuration settings
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Project metadata
    PROJECT_NAME: str = "VC Copilot API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS - Allow frontend origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://vc-rag.vercel.app",
        "https://vc-rag-git-auth-muneer-a-khans-projects.vercel.app",
        "https://*.vercel.app",
    ]
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/vccopilot"
    DIRECT_URL: Optional[str] = None  # For Prisma migrations with Supabase
    
    # Supabase (for pgvector)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    # Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # OpenAI / LLM
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_LLM_MODEL: str = "gpt-4-turbo-preview"
    
    # Embeddings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    
    # RAG Configuration
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 5
    
    # Redis (for caching and task queue)
    REDIS_URL: Optional[str] = "redis://localhost:6379"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    # HubSpot
    HUBSPOT_API_KEY: Optional[str] = None
    
    # AngelList
    ANGELLIST_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()


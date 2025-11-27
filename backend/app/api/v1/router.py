"""
Main API router - aggregates all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1.endpoints import chat, projects, integrations, auth

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat & RAG"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])


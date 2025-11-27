"""
Project management endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.auth import get_current_user
from app.models.user import User
from app.db.database import get_db

router = APIRouter()


class ProjectCreate(BaseModel):
    """Project creation request"""
    name: str
    description: Optional[str] = None
    type: Optional[str] = "portfolio_company"  # or "prospect", "research"


class ProjectResponse(BaseModel):
    """Project response"""
    id: str
    name: str
    description: Optional[str] = None
    type: str
    createdAt: datetime
    updatedAt: datetime


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """List all user projects"""
    projects = await db.project.find_many(
        where={"userId": current_user.id},
        order={"createdAt": "desc"}
    )
    return projects


@router.post("", response_model=ProjectResponse)
async def create_project(
    request: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new project workspace"""
    project = await db.project.create(
        data={
            "name": request.name,
            "description": request.description,
            "type": request.type,
            "userId": current_user.id
        }
    )
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get project details"""
    project = await db.project.find_first(
        where={
            "id": project_id,
            "userId": current_user.id
        }
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project


@router.post("/{project_id}/files")
async def upload_files(
    project_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Upload files to project - triggers embedding pipeline
    
    - Accepts PDF, DOCX, TXT, CSV, etc.
    - Extracts text content
    - Chunks and embeds content
    - Stores in vector database
    """
    # Verify project ownership
    project = await db.project.find_first(
        where={
            "id": project_id,
            "userId": current_user.id
        }
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # TODO: Implement file upload and embedding pipeline
    # For now, just acknowledge the upload
    uploaded_files = []
    for file in files:
        document = await db.document.create(
            data={
                "projectId": project_id,
                "filename": file.filename,
                "fileType": file.content_type or "unknown",
                "fileSize": 0,  # TODO: Get actual file size
                "storagePath": f"/uploads/{file.filename}",
                "status": "processing"
            }
        )
        uploaded_files.append(document)
    
    return {
        "project_id": project_id,
        "files_uploaded": len(files),
        "status": "processing",
        "documents": uploaded_files
    }


@router.get("/{project_id}/intelligence")
async def get_project_intelligence(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Retrieve knowledge graph and memory for project"""
    # Verify project ownership
    project = await db.project.find_first(
        where={
            "id": project_id,
            "userId": current_user.id
        },
        include={
            "documents": True,
            "vectorDocuments": True
        }
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "project_id": project_id,
        "documents": project.documents or [],
        "vector_chunks": len(project.vectorDocuments or []),
        "insights": []
    }


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete a project"""
    # Verify project ownership
    project = await db.project.find_first(
        where={
            "id": project_id,
            "userId": current_user.id
        }
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.project.delete(where={"id": project_id})
    
    return {"status": "deleted", "project_id": project_id}

"""
Chat & RAG endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.auth import get_current_user
from app.models.user import User
from app.db.database import get_db

router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message request"""
    message: str
    chat_id: Optional[str] = None
    project_id: Optional[str] = None
    stream: bool = True


class ChatResponse(BaseModel):
    """Chat response"""
    chat_id: str
    message: str
    sources: List[dict] = []
    timestamp: str


class NewChatRequest(BaseModel):
    """New chat session request"""
    title: Optional[str] = None
    project_id: Optional[str] = None


class SearchRequest(BaseModel):
    """Search request"""
    query: str
    project_id: Optional[str] = None
    limit: int = 10


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatMessage,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Core RAG endpoint: send a message and get AI response
    
    - Retrieves relevant context from vector database
    - Constructs prompt with context
    - Generates response using LLM
    - Returns response with source citations
    """
    # Get or create chat
    if request.chat_id:
        chat = await db.chat.find_first(
            where={
                "id": request.chat_id,
                "userId": current_user.id
            }
        )
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
    else:
        # Create new chat
        chat = await db.chat.create(
            data={
                "userId": current_user.id,
                "projectId": request.project_id,
                "title": "New Chat"
            }
        )
    
    # Save user message
    await db.message.create(
        data={
            "chatId": chat.id,
            "role": "user",
            "content": request.message
        }
    )
    
    # TODO: Implement RAG pipeline
    # 1. Convert message to embedding
    # 2. Similarity search in vector DB
    # 3. Construct context from retrieved chunks
    # 4. Generate response with LLM
    # 5. Return with source citations
    
    response_text = "This is a placeholder response. RAG pipeline to be implemented."
    
    # Save assistant message
    await db.message.create(
        data={
            "chatId": chat.id,
            "role": "assistant",
            "content": response_text
        }
    )
    
    return ChatResponse(
        chat_id=chat.id,
        message=response_text,
        sources=[],
        timestamp=datetime.utcnow().isoformat()
    )


@router.post("/new")
async def create_new_chat(
    request: NewChatRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Start a new AI chat session"""
    chat = await db.chat.create(
        data={
            "userId": current_user.id,
            "projectId": request.project_id,
            "title": request.title or "New Chat"
        }
    )
    
    return {
        "chat_id": chat.id,
        "title": chat.title,
        "project_id": chat.projectId,
        "created_at": chat.createdAt.isoformat()
    }


@router.get("/history/{chat_id}")
async def get_chat_history(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Retrieve conversation history for a chat"""
    chat = await db.chat.find_first(
        where={
            "id": chat_id,
            "userId": current_user.id
        },
        include={
            "messages": {
                "order_by": {"createdAt": "asc"}
            }
        }
    )
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    return {
        "chat_id": chat.id,
        "messages": chat.messages or [],
        "created_at": chat.createdAt.isoformat()
    }


@router.get("/search")
async def search(
    query: str,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Search conversations, documents, and integrated data"""
    # TODO: Implement semantic search across all data sources
    where_clause = {"userId": current_user.id}
    if project_id:
        where_clause["projectId"] = project_id
    
    # Search in messages
    messages = await db.message.find_many(
        where={
            "chat": {
                "is": where_clause
            },
            "content": {
                "contains": query,
                "mode": "insensitive"
            }
        },
        take=10
    )
    
    return {
        "results": messages,
        "total": len(messages)
    }

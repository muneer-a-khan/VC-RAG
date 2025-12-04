"""
Chat & RAG endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json

from app.core.auth import get_current_user
from app.models.user import User
from app.db.database import get_db
from app.services.rag_service import rag_service

router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message request"""
    message: str
    chat_id: Optional[str] = None
    project_id: Optional[str] = None
    stream: bool = False  # Streaming not yet implemented


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


class RAGQueryRequest(BaseModel):
    """Direct RAG query without chat persistence"""
    query: str
    project_id: Optional[str] = None
    top_k: int = 5


class RAGQueryResponse(BaseModel):
    """RAG query response"""
    answer: str
    sources: List[dict]
    context_used: int


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
                "title": request.message[:50] + "..." if len(request.message) > 50 else request.message
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
    
    # Get chat history for context
    history_messages = await db.message.find_many(
        where={"chatId": chat.id},
        order={"createdAt": "asc"},
        take=10
    )
    
    chat_history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_messages[:-1]  # Exclude the message we just added
    ]
    
    # RAG Pipeline
    # 1. Similarity search in vector DB
    context = await rag_service.similarity_search(
        query=request.message,
        project_id=request.project_id,
        top_k=5
    )
    
    # 2. Generate response with LLM
    result = await rag_service.generate_response(
        query=request.message,
        context=context,
        chat_history=chat_history if chat_history else None
    )
    
    response_text = result["response"]
    sources = result["sources"]
    
    # Save assistant message with sources
    await db.message.create(
        data={
            "chatId": chat.id,
            "role": "assistant",
            "content": response_text,
            "sources": json.dumps(sources)
        }
    )
    
    return ChatResponse(
        chat_id=chat.id,
        message=response_text,
        sources=sources,
        timestamp=datetime.utcnow().isoformat()
    )


@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(
    request: RAGQueryRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Direct RAG query endpoint - no chat persistence
    
    Useful for quick queries and testing the RAG pipeline
    """
    # Similarity search
    context = await rag_service.similarity_search(
        query=request.query,
        project_id=request.project_id,
        top_k=request.top_k
    )
    
    # Generate response
    result = await rag_service.generate_response(
        query=request.query,
        context=context
    )
    
    return RAGQueryResponse(
        answer=result["response"],
        sources=result["sources"],
        context_used=len(context)
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
                "order": {"createdAt": "asc"}
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


@router.get("/list")
async def list_chats(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """List all chats for current user"""
    where_clause = {"userId": current_user.id}
    if project_id:
        where_clause["projectId"] = project_id
    
    chats = await db.chat.find_many(
        where=where_clause,
        order={"updatedAt": "desc"},
        include={
            "messages": {
                "take": 1,
                "order": {"createdAt": "desc"}
            }
        }
    )
    
    return {
        "chats": [
            {
                "id": chat.id,
                "title": chat.title,
                "project_id": chat.projectId,
                "last_message": chat.messages[0].content[:100] if chat.messages else None,
                "updated_at": chat.updatedAt.isoformat()
            }
            for chat in chats
        ]
    }


@router.get("/search")
async def search(
    query: str,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Search conversations, documents, and integrated data"""
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
    
    # Also do semantic search
    semantic_results = await rag_service.similarity_search(
        query=query,
        project_id=project_id,
        top_k=5
    )
    
    return {
        "message_results": messages,
        "semantic_results": [
            {
                "content": r["content"][:200] + "...",
                "source": r["metadata"].get("source", "Unknown"),
                "similarity": round(r["similarity"], 3)
            }
            for r in semantic_results
        ],
        "total": len(messages) + len(semantic_results)
    }


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete a chat and all its messages"""
    chat = await db.chat.find_first(
        where={
            "id": chat_id,
            "userId": current_user.id
        }
    )
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Delete messages first
    await db.message.delete_many(where={"chatId": chat_id})
    
    # Delete chat
    await db.chat.delete(where={"id": chat_id})
    
    return {"status": "deleted", "chat_id": chat_id}

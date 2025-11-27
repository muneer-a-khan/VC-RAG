"""
RAG (Retrieval Augmented Generation) Service
"""
from typing import List, Dict, Optional
import openai
from app.core.config import settings


class RAGService:
    """Service for RAG operations"""
    
    def __init__(self):
        """Initialize RAG service"""
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.embedding_model = settings.EMBEDDING_MODEL
        self.llm_model = settings.DEFAULT_LLM_MODEL
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        response = self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        return response.data[0].embedding
    
    async def similarity_search(
        self,
        query_embedding: List[float],
        project_id: str,
        top_k: int = None
    ) -> List[Dict]:
        """
        Perform similarity search in vector database
        
        Args:
            query_embedding: Query vector
            project_id: Filter by project
            top_k: Number of results to return
            
        Returns:
            List of matching documents with metadata
        """
        if top_k is None:
            top_k = settings.TOP_K_RESULTS
        
        # TODO: Implement vector similarity search using pgvector
        # Example SQL query:
        # SELECT * FROM vector_documents
        # WHERE project_id = ?
        # ORDER BY embedding <-> ?
        # LIMIT ?
        
        return []
    
    async def generate_response(
        self,
        query: str,
        context: List[Dict],
        chat_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Generate response using LLM with context
        
        Args:
            query: User query
            context: Retrieved context from vector search
            chat_history: Previous conversation messages
            
        Returns:
            Generated response
        """
        # Construct prompt with context
        system_prompt = self._build_system_prompt()
        context_text = self._format_context(context)
        
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        
        # Add chat history if available
        if chat_history:
            messages.extend(chat_history[-10:])  # Last 10 messages
        
        # Add context and user query
        user_message = f"""Context:
{context_text}

User Query: {query}

Please provide a detailed, accurate response based on the context provided. If you reference specific information, cite the source."""
        
        messages.append({"role": "user", "content": user_message})
        
        # Generate response
        response = self.openai_client.chat.completions.create(
            model=self.llm_model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for VC-specific reasoning"""
        return """You are an AI assistant for venture capital professionals. Your role is to:

1. Provide accurate, data-driven insights for due diligence and portfolio analysis
2. Reference specific sources when citing information
3. Understand VC-specific terminology and frameworks
4. Be concise but thorough in your analysis
5. Highlight key metrics, risks, and opportunities
6. Maintain confidentiality and professionalism

Always base your responses on the provided context. If you don't have enough information to answer confidently, say so."""
    
    def _format_context(self, context: List[Dict]) -> str:
        """Format retrieved context for prompt"""
        if not context:
            return "No relevant context found."
        
        formatted = []
        for i, doc in enumerate(context, 1):
            source = doc.get("metadata", {}).get("source", "Unknown")
            content = doc.get("content", "")
            formatted.append(f"[Source {i}: {source}]\n{content}\n")
        
        return "\n---\n".join(formatted)
    
    async def chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks for embedding
        
        Args:
            text: Input text to chunk
            
        Returns:
            List of text chunks
        """
        # Simple chunking by character count with overlap
        chunk_size = settings.CHUNK_SIZE
        overlap = settings.CHUNK_OVERLAP
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
        
        return chunks


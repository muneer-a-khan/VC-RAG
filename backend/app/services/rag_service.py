"""
RAG (Retrieval Augmented Generation) Service
Using sentence-transformers for embeddings and DeepSeek for chat completions
"""
from typing import List, Dict, Optional, Any
import json
import httpx
from app.core.config import settings
from app.db.database import prisma

# Initialize sentence-transformers model for embeddings
from sentence_transformers import SentenceTransformer

# Use a high-quality model that produces 1024-dim embeddings (we'll pad to 1536)
# all-MiniLM-L6-v2 is fast and produces 384-dim embeddings
# all-mpnet-base-v2 is more accurate and produces 768-dim embeddings
EMBEDDING_MODEL_NAME = "all-mpnet-base-v2"
print(f"🔄 Loading embedding model: {EMBEDDING_MODEL_NAME}...")
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
print(f"✅ Embedding model loaded successfully!")


class RAGService:
    """Service for RAG operations using local embeddings and DeepSeek API"""
    
    def __init__(self):
        """Initialize RAG service"""
        self.api_key = settings.DEEPSEEK_API_KEY
        self.base_url = settings.DEEPSEEK_BASE_URL
        self.chat_model = settings.DEEPSEEK_CHAT_MODEL
        self.embedding_model = embedding_model
        
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY is required. Please set it in your .env file.")
        
        print(f"✅ RAG Service initialized with DeepSeek API and local embeddings")
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text using sentence-transformers
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        # Generate embedding using local model
        embedding = self.embedding_model.encode(text, convert_to_numpy=True)
        embedding_list = embedding.tolist()
        
        # Pad to 1536 dimensions for compatibility (if needed)
        if len(embedding_list) < 1536:
            embedding_list.extend([0.0] * (1536 - len(embedding_list)))
        
        return embedding_list[:1536]
    
    async def similarity_search(
        self,
        query: str,
        project_id: str = None,
        top_k: int = None
    ) -> List[Dict]:
        """
        Perform similarity search in vector database
        
        Args:
            query: Query text
            project_id: Optional filter by project
            top_k: Number of results to return
            
        Returns:
            List of matching documents with metadata
        """
        if top_k is None:
            top_k = settings.TOP_K_RESULTS
        
        # Generate embedding for query
        query_embedding = await self.generate_embedding(query)
        
        # Build the query
        where_clause = {}
        if project_id:
            where_clause["projectId"] = project_id
        
        # Get all vector documents
        vector_docs = await prisma.vectordocument.find_many(
            where=where_clause if where_clause else None,
            take=100  # Limit for performance
        )
        
        # Calculate similarity scores using cosine similarity
        results = []
        for doc in vector_docs:
            try:
                metadata = json.loads(doc.metadata) if isinstance(doc.metadata, str) else doc.metadata
                doc_embedding = metadata.get("embedding", [])
                
                if doc_embedding:
                    # Calculate cosine similarity
                    similarity = self._cosine_similarity(query_embedding, doc_embedding)
                    
                    results.append({
                        "id": doc.id,
                        "content": doc.content,
                        "metadata": metadata,
                        "source_type": doc.sourceType,
                        "chunk_index": doc.chunkIndex,
                        "project_id": doc.projectId,
                        "similarity": similarity
                    })
            except Exception as e:
                continue
        
        # Sort by similarity and return top k
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        # Ensure same length
        min_len = min(len(vec1), len(vec2))
        vec1 = vec1[:min_len]
        vec2 = vec2[:min_len]
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    async def generate_response(
        self,
        query: str,
        context: List[Dict],
        chat_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Generate response using DeepSeek LLM with context
        
        Args:
            query: User query
            context: Retrieved context from vector search
            chat_history: Previous conversation messages
            
        Returns:
            Dict with response text and sources
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
        
        # Generate response using DeepSeek API
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.chat_model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1500,
                        "stream": False
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    response_text = data["choices"][0]["message"]["content"]
                elif response.status_code == 402:
                    # Insufficient balance - provide context summary as fallback
                    print("⚠️  DeepSeek API: Insufficient balance - using context summary")
                    response_text = self._generate_context_summary(query, context)
                else:
                    error_detail = response.text
                    print(f"⚠️  DeepSeek API error: {response.status_code} - using context summary")
                    response_text = self._generate_context_summary(query, context)
        except Exception as e:
            print(f"⚠️  DeepSeek API exception: {e} - using context summary")
            response_text = self._generate_context_summary(query, context)
        
        return {
            "response": response_text,
            "sources": self._extract_sources(context)
        }
    
    def _extract_sources(self, context: List[Dict]) -> List[Dict]:
        """Extract source information from context"""
        sources = []
        seen_sources = set()
        
        for doc in context:
            metadata = doc.get("metadata", {})
            source = metadata.get("source", "Unknown")
            
            if source not in seen_sources:
                seen_sources.add(source)
                sources.append({
                    "title": metadata.get("title", source),
                    "source": source,
                    "similarity": round(doc.get("similarity", 0), 3)
                })
        
        return sources
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for VC-specific reasoning"""
        return """You are an AI assistant for venture capital professionals. Your role is to:

1. Provide accurate, data-driven insights for due diligence and portfolio analysis
2. Reference specific sources when citing information
3. Understand VC-specific terminology and frameworks
4. Be concise but thorough in your analysis
5. Highlight key metrics, risks, and opportunities
6. Maintain confidentiality and professionalism

Always base your responses on the provided context. If you don't have enough information to answer confidently, say so. When citing specific data points (numbers, dates, metrics), mention which source they come from."""
    
    def _format_context(self, context: List[Dict]) -> str:
        """Format retrieved context for prompt"""
        if not context:
            return "No relevant context found."
        
        formatted = []
        for i, doc in enumerate(context, 1):
            metadata = doc.get("metadata", {})
            source = metadata.get("source", "Unknown")
            title = metadata.get("title", "Untitled")
            content = doc.get("content", "")
            similarity = doc.get("similarity", 0)
            
            formatted.append(f"[Source {i}: {source} | Title: {title} | Relevance: {similarity:.2f}]\n{content}\n")
        
        return "\n---\n".join(formatted)
    
    async def chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks for embedding
        
        Args:
            text: Input text to chunk
            
        Returns:
            List of text chunks
        """
        chunk_size = settings.CHUNK_SIZE
        overlap = settings.CHUNK_OVERLAP
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
            if start + overlap >= len(text):
                break
        
        return chunks
    
    async def index_document(
        self,
        project_id: str,
        content: str,
        title: str,
        source_type: str = "manual",
        document_id: str = None
    ) -> int:
        """
        Index a document by chunking and storing embeddings
        
        Args:
            project_id: Project to associate with
            content: Document content
            title: Document title
            source_type: Type of source
            document_id: Optional document ID reference
            
        Returns:
            Number of chunks created
        """
        chunks = await self.chunk_text(content)
        
        for i, chunk in enumerate(chunks):
            embedding = await self.generate_embedding(chunk)
            
            await prisma.vectordocument.create(
                data={
                    "projectId": project_id,
                    "documentId": document_id,
                    "content": chunk,
                    "sourceType": source_type,
                    "chunkIndex": i,
                    "metadata": json.dumps({
                        "title": title,
                        "source": title,
                        "embedding": embedding
                    })
                }
            )
        
        return len(chunks)


# Global RAG service instance
rag_service = RAGService()

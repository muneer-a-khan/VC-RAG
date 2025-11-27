# 🏛️ VC Copilot: Full System Design and Architecture

This document outlines the architecture, technology choices, development phases, and API structure for the VC Copilot, using a **Next.js + FastAPI stack** with **Supabase Vector/pgvector** for RAG.

---

## 1. Project Overview and Core Functions

The primary goal is to create a centralized, AI-augmented environment for VCs.  
The system reduces tool-switching and manual work by consolidating operational data.

### Core Functions

| Function | Description |
|---------|-------------|
| **Data Aggregation** | Pull and unify data from platforms like HubSpot, AngelList, and Google Workspace |
| **VC-Specific Reasoning** | Use structured prompting + RAG for due diligence and portfolio analysis |
| **Unified Interface** | Single workspace to query, analyze, and visualize information |
| **Action Execution (Later Stage)** | Automate tasks such as generating investment memos and saving them to Google Drive |

---

## 2. Technical Stack (Technology Choices)

| Layer | Component | Technology | Rationale |
|-------|-----------|------------|-----------|
| **Frontend** | User Interface | Next.js / React, TypeScript | Fast, modern web UI |
| **Styling** | Design | Tailwind CSS, shadcn/ui | Utility-first, modern component set |
| **Backend** | API Gateway, Logic | FastAPI (Python) or Node.js | REST endpoints + AI processing |
| **Structured DB** | Users, Projects, Metadata | PostgreSQL / Supabase | Strong structured storage |
| **Vector DB** | Embeddings for RAG | Supabase Vector (pgvector) | Ideal for retrieval pipelines |
| **Hosting** | Deployment | Vercel (Frontend), AWS/GCP (Backend) | Scalable + reliable |

---

## 3. Development Phases

The system prioritizes **RAG stability first** before automation.

### Phase Breakdown

| Phase | Focus Area | Key Deliverables |
|-------|-------------|------------------|
| **Phase 1 — Core Infrastructure** | Basic integrations & auth | Connect 1–2 APIs (Google Workspace, HubSpot); Deploy initial RAG chatbot |
| **Phase 2 — Expanded Reasoning** | More integrations & templates | Add PitchBook + AngelList; Improve RAG logic, history tracking, and caching |
| **Phase 3 — Action Execution** | Write-back operations | Securely create docs, update CRM; UI for workflow confirmations |
| **Phase 4 — UI/UX Polish** | Visual & performance upgrades | Refine chat + dashboard; Speed + context accuracy improvements |

---

## 4. Backend API Routes (FastAPI Structure)

All routes require secure user authentication.

### A. Chat & Reasoning Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/chat/message` | POST | Core RAG endpoint: prompt in → streamed answer out |
| `/api/v1/chat/new` | POST | Start a new AI session (optionally linked to project) |
| `/api/v1/chat/history/[chat_id]` | GET | Retrieve conversation history |
| `/api/v1/chat/search` | GET | Search conversations, documents, and integrated data |

### B. Project Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects` | GET | List all user projects |
| `/api/v1/projects` | POST | Create a new project workspace |
| `/api/v1/projects/[id]/files` | POST | Upload files → triggers embedding pipeline |
| `/api/v1/projects/[id]/intelligence` | GET | Retrieve knowledge graph + memory |

### C. Integrations & Data Sync Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations` | GET | List connected and available tools |
| `/api/v1/integrations/[tool_name]/auth-url` | GET | Start OAuth flow |
| `/api/v1/integrations/[tool_name]/callback` | POST | Complete OAuth connection |
| `/api/v1/sync/[integration_id]` | POST | Manually trigger data sync |

---

## 5. Reasoning Layer Design: RAG Pipeline

The RAG architecture combines live and stored data with LLM reasoning.

---

### **Step 1: Data Ingestion & Indexing**

1. **Read/Ingest**  
   Pull data from APIs (Google Drive, HubSpot) or uploaded files.
2. **Normalize**  
   Transform into consistent schema.
3. **Chunk & Embed**  
   Split into chunks → generate vector embeddings.
4. **Store**  
   Save vectors + metadata (source, project ID) in Supabase Vector/pgvector.

---

### **Step 2: Retrieval & Generation**

1. **Query**  
   User sends natural language prompt.
2. **Retrieve**  
   Convert prompt → vector → similarity search for top-k chunks (scoped per project).
3. **Context Construction**  
   Combine retrieved chunks + chat history + project intelligence.
4. **Prompting**  
   Insert context into a structured **VC-specific template**.
5. **Generate**  
   Send prompt to LLM (OpenAI, Anthropic, etc.).
6. **Respond**  
   Stream answer with clickable source references.

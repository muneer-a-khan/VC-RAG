# 📂 Project Structure

Complete overview of the VC Copilot codebase.

```
VC-RAG/
│
├── 📄 README.md                     # Main documentation
├── 📄 DESIGN.md                     # System design document
├── 📄 QUICKSTART.md                 # Quick start guide
├── 📄 PROJECT_STRUCTURE.md          # This file
├── 📄 LICENSE                       # License file
├── 📄 .gitignore                    # Git ignore rules
├── 🔧 setup.sh                      # Automated setup script
│
├── 🔙 backend/                      # FastAPI Backend
│   ├── 📄 main.py                   # Application entry point
│   ├── 📄 requirements.txt          # Python dependencies
│   ├── 📄 env.template              # Environment variables template
│   ├── 📄 alembic.ini              # Alembic configuration
│   ├── 📄 README.md                 # Backend documentation
│   │
│   ├── 📁 app/                      # Main application code
│   │   ├── __init__.py
│   │   │
│   │   ├── 📁 api/                  # API layer
│   │   │   ├── __init__.py
│   │   │   └── 📁 v1/               # API version 1
│   │   │       ├── __init__.py
│   │   │       ├── router.py        # Main API router
│   │   │       └── 📁 endpoints/    # Route handlers
│   │   │           ├── __init__.py
│   │   │           ├── auth.py      # Authentication endpoints
│   │   │           ├── chat.py      # Chat & RAG endpoints
│   │   │           ├── projects.py  # Project management
│   │   │           └── integrations.py  # Third-party integrations
│   │   │
│   │   ├── 📁 core/                 # Core utilities
│   │   │   ├── __init__.py
│   │   │   ├── config.py            # Configuration settings
│   │   │   └── auth.py              # Authentication utilities
│   │   │
│   │   ├── 📁 db/                   # Database layer
│   │   │   ├── __init__.py
│   │   │   └── database.py          # Prisma connection
│   │   │
│   │   ├── 📁 models/               # Pydantic models
│   │   │   ├── __init__.py
│   │   │   └── user.py              # User model
│   │   │
│   │   └── 📁 services/             # Business logic
│   │       ├── __init__.py
│   │       ├── rag_service.py       # RAG pipeline
│   │       └── integration_service.py  # Integration logic
│   │
│   ├── 📁 prisma/                   # Prisma ORM
│   │   ├── schema.prisma            # Database schema definition
│   │   └── migrations/              # Migration history
│   │
│   └── 📁 scripts/                  # Utility scripts
│       ├── init_db.py               # Database initialization
│       └── test_api.py              # API testing script
│
└── 🎨 frontend/                     # Next.js Frontend
    ├── 📄 package.json              # Node dependencies
    ├── 📄 tsconfig.json             # TypeScript configuration
    ├── 📄 tailwind.config.ts        # Tailwind CSS config
    ├── 📄 postcss.config.js         # PostCSS config
    ├── 📄 next.config.js            # Next.js config
    ├── 📄 .eslintrc.json           # ESLint config
    ├── 📄 env.local.template        # Environment variables template
    ├── 📄 README.md                 # Frontend documentation
    │
    └── 📁 src/                      # Source code
        ├── 📁 app/                  # Next.js App Router
        │   ├── layout.tsx           # Root layout
        │   ├── page.tsx             # Landing page
        │   ├── globals.css          # Global styles
        │   ├── 📁 chat/             # Chat page
        │   │   └── page.tsx
        │   ├── 📁 projects/         # Projects page
        │   │   └── page.tsx
        │   └── 📁 integrations/     # Integrations page
        │       └── page.tsx
        │
        ├── 📁 components/           # React components
        │   └── 📁 ui/               # UI component library
        │       ├── button.tsx
        │       ├── input.tsx
        │       ├── card.tsx
        │       └── badge.tsx
        │
        └── 📁 lib/                  # Utilities
            ├── utils.ts             # Helper functions
            ├── api.ts               # API client
            └── store.ts             # State management (Zustand)
```

## Key Files Overview

### Backend

| File | Purpose |
|------|---------|
| `main.py` | FastAPI application entry point, CORS, lifespan events |
| `app/core/config.py` | Centralized configuration using Pydantic Settings |
| `app/core/auth.py` | JWT authentication, password hashing |
| `prisma/schema.prisma` | Prisma database schema (Users, Projects, Chats, etc.) |
| `app/db/database.py` | Prisma client connection and utilities |
| `app/services/rag_service.py` | RAG pipeline: embeddings, search, LLM generation |
| `app/api/v1/endpoints/*.py` | API route handlers for different domains |

### Frontend

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with metadata and fonts |
| `src/app/page.tsx` | Landing page with features and CTAs |
| `src/app/chat/page.tsx` | Chat interface with AI assistant |
| `src/lib/api.ts` | Axios-based API client with authentication |
| `src/lib/store.ts` | Zustand store for global state |
| `src/components/ui/*.tsx` | Reusable UI components (shadcn/ui) |

## Architecture Layers

```
┌─────────────────────────────────────────┐
│          Frontend (Next.js)             │
│  - React Components                     │
│  - State Management (Zustand)           │
│  - API Client (Axios)                   │
└─────────────────┬───────────────────────┘
                  │ HTTP/REST
┌─────────────────▼───────────────────────┐
│          Backend (FastAPI)              │
│  ┌─────────────────────────────────┐   │
│  │      API Layer (Endpoints)      │   │
│  └──────────────┬──────────────────┘   │
│  ┌──────────────▼──────────────────┐   │
│  │    Services (Business Logic)    │   │
│  │  - RAG Service                   │   │
│  │  - Integration Service           │   │
│  └──────────────┬──────────────────┘   │
│  ┌──────────────▼──────────────────┐   │
│  │      Database Layer (ORM)       │   │
│  └──────────────┬──────────────────┘   │
└─────────────────┼───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│    PostgreSQL + pgvector                │
│  - Structured Data (Users, Projects)    │
│  - Vector Embeddings (RAG)              │
└─────────────────────────────────────────┘
```

## Data Flow

### Chat Request Flow
```
1. User sends message in frontend
2. Frontend calls POST /api/v1/chat/message
3. Backend receives request, authenticates user
4. RAG Service:
   a. Generates embedding for user query
   b. Performs similarity search in vector DB
   c. Constructs context from results
   d. Generates response using LLM
5. Response streamed back to frontend
6. Frontend displays message with sources
```

### File Upload Flow
```
1. User uploads files in project
2. Frontend calls POST /api/v1/projects/{id}/files
3. Backend saves file and triggers background job
4. Background job:
   a. Extracts text from file
   b. Chunks text into segments
   c. Generates embeddings
   d. Stores in vector database
5. File marked as processed
6. Content now searchable via RAG
```

## Development Workflow

1. **Backend Development**
   - Edit Python files in `backend/app/`
   - Run `python main.py` for hot reload
   - Test at `http://localhost:8000/docs`

2. **Frontend Development**
   - Edit TypeScript/React files in `frontend/src/`
   - Run `npm run dev` for hot reload
   - View at `http://localhost:3000`

3. **Database Changes**
   - Modify schema in `backend/prisma/schema.prisma`
   - Run `prisma generate` to update client
   - Run `prisma db push` to apply changes (dev)
   - Or create migration: `prisma migrate dev --name message`

## Next Implementation Steps

1. **Complete RAG Pipeline** (`backend/app/services/rag_service.py`)
   - Implement vector similarity search with pgvector
   - Add document chunking and embedding
   - Optimize context construction

2. **Implement Integrations** (`backend/app/services/integration_service.py`)
   - Google OAuth flow
   - HubSpot API sync
   - AngelList data import

3. **Add Authentication UI** (`frontend/src/app/`)
   - Login/Register pages
   - Protected routes
   - Session management

4. **Enhance Chat Interface** (`frontend/src/app/chat/page.tsx`)
   - Message streaming
   - Source citations
   - File attachments

5. **Project Management** (`frontend/src/app/projects/`)
   - CRUD operations
   - File upload UI
   - Project intelligence view

## Testing

- **Backend**: Run `python backend/scripts/test_api.py`
- **Frontend**: Run `npm run lint` in frontend/
- **Integration**: Manual testing through UI and API docs

---

**Ready to start development!** 🚀


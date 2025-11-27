# 🏛️ VC Copilot

An AI-powered copilot platform for venture capital professionals. VC Copilot aggregates data from multiple sources (HubSpot, AngelList, Google Workspace) and uses RAG (Retrieval Augmented Generation) to provide intelligent insights for due diligence and portfolio analysis.

## 📋 Features

- **Data Aggregation**: Unify data from platforms like HubSpot, AngelList, and Google Workspace
- **AI-Powered Insights**: RAG-based reasoning for due diligence and portfolio analysis
- **Unified Workspace**: Single interface to query, analyze, and visualize information
- **Project Management**: Organize portfolio companies and research projects
- **Smart Chat**: Natural language interface with context-aware responses
- **Integrations**: Connect with your existing tools and workflows

## 🏗️ Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **PostgreSQL** - Relational database with pgvector extension
- **Prisma** - Modern ORM with type safety and great DX
- **OpenAI / Anthropic** - LLM providers for AI reasoning

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern component library
- **Zustand** - State management

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key (or Anthropic)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env.template .env
   # Edit .env with your configuration
   ```

5. **Set up database:**
   ```bash
   # Create PostgreSQL database
   createdb vccopilot
   
   # Enable pgvector extension
   psql vccopilot -c "CREATE EXTENSION vector;"
   
   # Generate Prisma client and push schema
   prisma generate
   prisma db push
   ```

6. **Run development server:**
   ```bash
   python main.py
   # or
   uvicorn main:app --reload
   ```

   The API will be available at `http://localhost:8000`
   API docs at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.local.template .env.local
   # Edit .env.local if needed
   ```

4. **Run development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
VC-RAG/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/    # API route handlers
│   │   │       └── router.py     # Main router
│   │   ├── core/                 # Config, auth, utilities
│   │   ├── db/                   # Database connection
│   │   ├── models/               # Pydantic models
│   │   └── services/             # Business logic (RAG, integrations)
│   ├── prisma/                   # Prisma schema & migrations
│   │   └── schema.prisma         # Database schema
│   ├── main.py                   # FastAPI app entry point
│   ├── requirements.txt          # Python dependencies
│   └── env.template              # Environment variables template
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js pages (App Router)
│   │   ├── components/           # React components
│   │   └── lib/                  # Utilities, API client, store
│   ├── package.json              # Node dependencies
│   └── env.local.template        # Environment variables template
│
├── DESIGN.md                     # System design document
└── README.md                     # This file
```

## 🔧 Configuration

### Backend Environment Variables

Key environment variables in `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vccopilot

# Authentication
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# OpenAI
OPENAI_API_KEY=sk-...

# RAG Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K_RESULTS=5
```

See `backend/env.template` for all available options.

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API Documentation

The API documentation is automatically generated and available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

- **Authentication**: `/api/v1/auth/*`
- **Chat & RAG**: `/api/v1/chat/*`
- **Projects**: `/api/v1/projects/*`
- **Integrations**: `/api/v1/integrations/*`

## 🗃️ Database Schema

The database schema is defined in `backend/prisma/schema.prisma`:

- `User` - User accounts
- `Project` - Portfolio companies / research projects
- `Chat` - Chat sessions
- `Message` - Chat messages with AI
- `Document` - Uploaded files
- `VectorDocument` - Embeddings for RAG (pgvector)
- `Integration` - Third-party tool connections

Prisma provides type-safe database access and an intuitive schema definition language.

## 🧪 Development Workflow

### Database Migrations (Prisma)

```bash
cd backend

# Generate Prisma client after schema changes
prisma generate

# Push schema changes to database (dev)
prisma db push

# Create a migration (production)
prisma migrate dev --name description

# Apply migrations
prisma migrate deploy

# Open Prisma Studio (database GUI)
prisma studio
```

### Code Quality

Backend:
```bash
# Format code
black app/

# Type checking
mypy app/
```

Frontend:
```bash
# Lint
npm run lint

# Type checking
npx tsc --noEmit
```

## 🚢 Deployment

### Backend Deployment

Recommended platforms:
- **AWS EC2** or **GCP Compute Engine**
- **Railway**, **Render**, or **Fly.io**

Requirements:
- PostgreSQL database with pgvector
- Python 3.11+ runtime
- Environment variables configured

### Frontend Deployment

Recommended: **Vercel** (optimal for Next.js)

```bash
cd frontend
vercel deploy
```

Or use: **Netlify**, **AWS Amplify**, **Cloudflare Pages**

## 📖 Next Steps

1. **Phase 1**: Core infrastructure ✅ (This template)
2. **Phase 2**: Implement RAG pipeline
3. **Phase 3**: Add integrations (Google, HubSpot, AngelList)
4. **Phase 4**: Action execution (write-back operations)
5. **Phase 5**: UI/UX polish and optimization

## 🤝 Contributing

This is a private project. For questions or support, please contact the development team.

## 📄 License

See LICENSE file for details.

## 🔗 Resources

- [Design Document](./DESIGN.md) - Comprehensive system architecture
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

**Built with ❤️ for venture capital professionals**

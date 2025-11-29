# 🏛️ VC Copilot

An AI-powered copilot platform for venture capital professionals. VC Copilot aggregates data from multiple sources and uses RAG (Retrieval Augmented Generation) to provide intelligent insights for due diligence and portfolio analysis.

## 📋 Features

- **Data Aggregation**: Unify data from platforms like HubSpot, AngelList, and Google Workspace
- **AI-Powered Insights**: RAG-based reasoning for due diligence and portfolio analysis
- **Unified Workspace**: Single interface to query, analyze, and visualize information
- **Project Management**: Organize portfolio companies and research projects
- **Smart Chat**: Natural language interface with context-aware responses
- **Integrations**: Connect with your existing tools and workflows

## 🏗️ Tech Stack

- **Next.js 14** - Full-stack React framework with App Router & API Routes
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern component library
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Database with pgvector extension
- **NextAuth.js** - Authentication
- **OpenAI** - Embeddings and LLM for RAG

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key

### Setup

1. **Clone and navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp env.local.template .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up database:**
   ```bash
   # Create PostgreSQL database
   createdb vccopilot
   
   # Enable pgvector extension
   psql vccopilot -c "CREATE EXTENSION vector;"
   
   # Generate Prisma client and push schema
   npx prisma generate
   npx prisma db push
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## 🔧 Configuration

### Required Environment Variables

```env
# Database (Supabase or local PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI (for RAG)
OPENAI_API_KEY="sk-..."
```

### Optional Environment Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# HubSpot Integration
HUBSPOT_CLIENT_ID=""
HUBSPOT_CLIENT_SECRET=""

# RAG Configuration
EMBEDDING_MODEL="text-embedding-3-small"
DEFAULT_LLM_MODEL="gpt-4-turbo-preview"
CHUNK_SIZE="1000"
CHUNK_OVERLAP="200"
TOP_K_RESULTS="5"
```

See `frontend/env.local.template` for all options.

## 📁 Project Structure

```
VC-RAG/
├── frontend/                    # Next.js Application
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/            # API Routes
│   │   │   │   ├── auth/       # Authentication
│   │   │   │   ├── chat/       # Chat & RAG
│   │   │   │   ├── projects/   # Project management
│   │   │   │   └── integrations/ # Third-party integrations
│   │   │   ├── chat/           # Chat page
│   │   │   ├── projects/       # Projects page
│   │   │   └── integrations/   # Integrations page
│   │   ├── components/         # React components
│   │   └── lib/
│   │       ├── services/       # RAG & Integration services
│   │       ├── api.ts          # API client
│   │       ├── auth.ts         # NextAuth config
│   │       └── prisma.ts       # Database client
│   └── package.json
├── docs/                        # Reference documents
├── MIGRATION_COMPLETE.md        # Migration notes
└── README.md                    # This file
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

### Chat & RAG
- `POST /api/chat` - Send message (RAG-enabled)
- `GET /api/chats` - List user's chats
- `GET /api/chat/[chatId]` - Get chat details
- `DELETE /api/chat/[chatId]` - Delete chat
- `GET /api/chat/history/[chatId]` - Get chat history
- `GET /api/chat/search` - Search messages

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `GET /api/projects/[id]/files` - List files
- `POST /api/projects/[id]/files` - Upload files
- `GET /api/projects/[id]/intelligence` - Get insights

### Integrations
- `GET /api/integrations` - List integrations
- `GET /api/integrations/[tool]/auth-url` - Get OAuth URL
- `POST /api/integrations/[tool]/callback` - OAuth callback
- `POST /api/integrations/[tool]/sync` - Trigger sync
- `DELETE /api/integrations/[tool]` - Disconnect

## 🗃️ Database Schema

Defined in `frontend/prisma/schema.prisma`:

- **User** - User accounts with authentication
- **Project** - Portfolio companies / research projects  
- **Chat** - Chat sessions
- **Message** - Chat messages with sources
- **Document** - Uploaded files
- **VectorDocument** - Embeddings for RAG
- **Integration** - Third-party tool connections

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Set these in your Vercel dashboard:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production URL)
- `OPENAI_API_KEY`
- Google OAuth credentials (optional)

## 🧪 Development

### Prisma Commands

```bash
# View database with GUI
npx prisma studio

# Generate client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create migration (for production)
npx prisma migrate dev --name description
```

### Code Quality

```bash
# Lint
npm run lint

# Build
npm run build
```

## 📖 Documentation

- `MIGRATION_COMPLETE.md` - Details on the Next.js API routes architecture
- `docs/` - Reference PDF documents

## 📄 License

See LICENSE file for details.

---

**Built with ❤️ for venture capital professionals**


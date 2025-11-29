# Migration Complete: FastAPI → Next.js API Routes

This document summarizes the migration from Python FastAPI backend to Next.js API routes.

## What Changed

### Backend Removed (No Longer Needed)
The entire `backend/` folder is now deprecated. All API functionality has been moved to Next.js API routes in `frontend/src/app/api/`.

### New API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth authentication |
| `/api/user` | GET | Get current user |
| `/api/chat` | POST | Send message (RAG-enabled) |
| `/api/chat` | GET | List user's chats |
| `/api/chat/new` | POST | Create new chat |
| `/api/chat/[chatId]` | GET | Get chat details |
| `/api/chat/[chatId]` | DELETE | Delete chat |
| `/api/chat/history/[chatId]` | GET | Get chat history |
| `/api/chat/search` | GET | Search messages |
| `/api/chats` | GET | List all chats |
| `/api/projects` | GET | List projects |
| `/api/projects` | POST | Create project |
| `/api/projects/[projectId]` | GET | Get project |
| `/api/projects/[projectId]` | PATCH | Update project |
| `/api/projects/[projectId]` | DELETE | Delete project |
| `/api/projects/[projectId]/files` | GET | List files |
| `/api/projects/[projectId]/files` | POST | Upload files |
| `/api/projects/[projectId]/intelligence` | GET | Get project insights |
| `/api/integrations` | GET | List integrations |
| `/api/integrations/[toolName]` | GET | Get integration status |
| `/api/integrations/[toolName]` | DELETE | Disconnect integration |
| `/api/integrations/[toolName]/auth-url` | GET | Get OAuth URL |
| `/api/integrations/[toolName]/callback` | POST/GET | OAuth callback |
| `/api/integrations/[toolName]/sync` | POST | Trigger sync |

### New Services

- `frontend/src/lib/services/rag-service.ts` - RAG (Retrieval Augmented Generation) service
- `frontend/src/lib/services/integration-service.ts` - Third-party integration service

### Updated Files

- `frontend/prisma/schema.prisma` - Added VectorDocument model
- `frontend/src/lib/api.ts` - Updated to use Next.js API routes
- `frontend/src/app/chat/page.tsx` - Enhanced with chat history
- `frontend/src/app/projects/page.tsx` - Full CRUD functionality
- `frontend/src/app/integrations/page.tsx` - Dynamic integration management
- `frontend/package.json` - Added OpenAI dependency

## Environment Variables

Add these to your `.env.local`:

```bash
# Required for RAG
OPENAI_API_KEY=sk-your-key-here

# Optional tuning
EMBEDDING_MODEL=text-embedding-3-small
DEFAULT_LLM_MODEL=gpt-4-turbo-preview
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K_RESULTS=5

# For integrations
NEXT_PUBLIC_APP_URL=http://localhost:3000
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
```

## Running the Application

```bash
cd frontend

# Install dependencies (includes new OpenAI package)
npm install

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

The app is now available at `http://localhost:3000`.

## Deploying to Vercel

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

No separate backend deployment needed.

## Migration Notes

- All authentication uses NextAuth.js (already configured)
- RAG functionality is enabled when `OPENAI_API_KEY` is set
- Vector search requires pgvector extension (TODO: implement)
- File uploads are recorded but actual storage needs implementation
- Integration OAuth flows are configured but require API credentials


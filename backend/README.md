# VC Copilot Backend

FastAPI backend with Prisma ORM for VC Copilot platform.

## Quick Start

1. **Setup environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure:**
   ```bash
   cp env.template .env
   # Edit .env with your settings
   ```

3. **Database setup:**
   ```bash
   # Create PostgreSQL database
   createdb vccopilot
   
   # Enable pgvector extension
   psql vccopilot -c "CREATE EXTENSION vector;"
   
   # Generate Prisma client
   prisma generate
   
   # Run migrations
   prisma db push
   ```

4. **Run:**
   ```bash
   python main.py
   ```

## Prisma Commands

### Generate Client
```bash
prisma generate
```

### Push Schema to Database
```bash
prisma db push
```

### Create Migration
```bash
prisma migrate dev --name description
```

### Apply Migrations
```bash
prisma migrate deploy
```

### Prisma Studio (Database GUI)
```bash
prisma studio
```

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - Login and get JWT token
- `GET /me` - Get current user info
- `POST /logout` - Logout

### Chat & RAG (`/api/v1/chat`)
- `POST /message` - Send message and get AI response
- `POST /new` - Create new chat session
- `GET /history/{chat_id}` - Get chat history
- `GET /search` - Search across data

### Projects (`/api/v1/projects`)
- `GET /` - List projects
- `POST /` - Create project
- `GET /{id}` - Get project details
- `POST /{id}/files` - Upload files
- `GET /{id}/intelligence` - Get project intelligence
- `DELETE /{id}` - Delete project

### Integrations (`/api/v1/integrations`)
- `GET /` - List integrations
- `GET /{tool_name}/auth-url` - Get OAuth URL
- `POST /{tool_name}/callback` - OAuth callback
- `POST /sync/{integration_id}` - Trigger sync
- `DELETE /{integration_id}` - Disconnect

## Database Schema

The database schema is defined in `prisma/schema.prisma`:

- `User` - User accounts
- `Project` - Portfolio companies / research projects
- `Chat` - Chat sessions
- `Message` - Chat messages with AI
- `Document` - Uploaded files
- `VectorDocument` - Embeddings for RAG
- `Integration` - Third-party tool connections

## Development

API documentation available at:
- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Making Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `prisma generate` to update client
3. Run `prisma db push` to update database
4. Or create migration: `prisma migrate dev --name change_description`

## Prisma vs SQLAlchemy

This project uses **Prisma** for several advantages:
- Type-safe database client
- Intuitive schema definition
- Built-in migration system
- Excellent developer experience
- Auto-completion in IDE
- Prisma Studio for data visualization

# 🚀 Quick Start Guide

Get VC Copilot up and running in 5 minutes!

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key

## Automated Setup (Recommended)

```bash
# Run the setup script
chmod +x setup.sh
./setup.sh
```

## Manual Setup

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp env.template .env
# Edit .env with your settings (DATABASE_URL, OPENAI_API_KEY, etc.)
```

### 2. Database Setup

```bash
# Create database
createdb vccopilot

# Enable pgvector extension
psql vccopilot -c "CREATE EXTENSION vector;"

# Generate Prisma client
cd backend
source venv/bin/activate
prisma generate

# Push schema to database (creates tables)
prisma db push
```

### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment (optional)
cp env.local.template .env.local
```

## Running the Application

### Start Backend

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

Backend will be available at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### Start Frontend (in a new terminal)

```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## Testing the Setup

1. Open `http://localhost:3000` in your browser
2. You should see the VC Copilot landing page
3. Navigate to `/chat` to test the chat interface
4. Check API docs at `http://localhost:8000/docs`

## Prisma Commands

### View Database with Prisma Studio
```bash
cd backend
prisma studio
```
Opens a GUI at `http://localhost:5555` to view/edit data

### Generate Client After Schema Changes
```bash
prisma generate
```

### Push Schema Changes to Database
```bash
prisma db push
```

### Create Migration (for production)
```bash
prisma migrate dev --name description
```

## Common Issues

### Database Connection Error
- Make sure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Verify database exists: `psql -l | grep vccopilot`

### Prisma Client Not Generated
```bash
cd backend
prisma generate
```

### pgvector Extension Not Found
```bash
# Install pgvector (on Mac with Homebrew)
brew install pgvector

# Or follow: https://github.com/pgvector/pgvector#installation
```

### Port Already in Use
- Backend (8000): Change in `backend/main.py`
- Frontend (3000): Use `npm run dev -- -p 3001`

## Seeding Sample Data

```bash
cd backend
source venv/bin/activate
python scripts/init_db.py --seed
```

This creates a demo user:
- Email: `demo@vccopilot.com`
- Password: `demo123`

## Next Steps

1. Configure integrations in backend/.env
2. Implement RAG pipeline (see DESIGN.md)
3. Add authentication UI
4. Connect to external data sources

## Need Help?

- See full documentation in [README.md](./README.md)
- Check system design in [DESIGN.md](./DESIGN.md)
- Review backend API docs at `/docs` endpoint
- Explore database with `prisma studio`

Happy building! 🎉

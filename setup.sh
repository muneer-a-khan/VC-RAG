#!/bin/bash

# VC Copilot Setup Script
# This script helps set up the development environment

echo "🏛️  VC Copilot Setup Script"
echo "=============================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi
echo "✅ Python 3 found: $(python3 --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL command not found. Make sure PostgreSQL is installed."
else
    echo "✅ PostgreSQL found"
fi

echo ""
echo "🔧 Setting up backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Create .env file
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp env.template .env
    echo "⚠️  Please edit backend/.env with your configuration (database, API keys, etc.)"
else
    echo "✅ .env file already exists"
fi

# Generate Prisma client
echo "Generating Prisma client..."
prisma generate

cd ..

echo ""
echo "🎨 Setting up frontend..."
cd frontend

# Install Node dependencies
echo "Installing Node dependencies..."
npm install

# Create .env.local file
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file from template..."
    cp env.local.template .env.local
else
    echo "✅ .env.local file already exists"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure backend/.env with your database and API keys"
echo "2. Create PostgreSQL database: createdb vccopilot"
echo "3. Enable pgvector extension: psql vccopilot -c 'CREATE EXTENSION vector;'"
echo "4. Push database schema: cd backend && source venv/bin/activate && prisma db push"
echo "5. (Optional) Seed sample data: python scripts/init_db.py --seed"
echo "6. Start backend: cd backend && source venv/bin/activate && python main.py"
echo "7. Start frontend (in new terminal): cd frontend && npm run dev"
echo ""
echo "💡 Tip: Use 'prisma studio' to view and edit database with a GUI"
echo ""
echo "🚀 Happy coding!"

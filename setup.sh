#!/bin/bash

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies (if needed)
if [ -f "requirements.txt" ]; then
    echo "🐍 Installing Python dependencies..."
    python -m pip install -r requirements.txt
fi

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual credentials"
fi

echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "To deploy to Netlify:"
echo "  npm run deploy"

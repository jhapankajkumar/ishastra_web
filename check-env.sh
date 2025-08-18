#!/bin/bash

# Environment Configuration Verification Script
echo "==================================="
echo "Environment Configuration Check"
echo "==================================="

echo "📁 Checking environment files..."

if [ -f ".env.development" ]; then
    echo "✅ .env.development file exists"
else
    echo "❌ .env.development file missing"
fi

if [ -f ".env.production" ]; then
    echo "✅ .env.production file exists"
else
    echo "❌ .env.production file missing"
fi

echo ""
echo "📋 Development Environment Variables:"
if [ -f ".env.development" ]; then
    cat .env.development
else
    echo "No .env.development file found"
fi

echo ""
echo "📋 Production Environment Variables:"
if [ -f ".env.production" ]; then
    cat .env.production
else
    echo "No .env.production file found"
fi

echo ""
echo "🚀 Available npm scripts:"
echo "  npm start        - Start development server (uses .env.development)"
echo "  npm run start:prod - Start development server with production config"
echo "  npm run build    - Build for production (uses .env.production)"
echo "  npm run serve    - Build and serve production app locally"
echo "  npm run serve:prod - Build and serve production app on port 3000"

echo ""
echo "📝 How it works:"
echo "  • Development: npm start → uses .env.development → localhost:8000"
echo "  • Dev with Prod Config: npm run start:prod → uses .env.production → 192.168.10.100:8000"
echo "  • Production Build: npm run build → uses .env.production → 192.168.10.100:8000"
echo "  • Serve Production: npm run serve → builds and serves on random port"
echo "  • Serve Production on 3000: npm run serve:prod → builds and serves on port 3000"

echo ""
echo "==================================="
echo "Configuration Complete! ✨"
echo "==================================="

#!/bin/bash
# AgriEasy.com - Quick Deployment Setup

echo "🚀 AgriEasy.com - Vercel Deployment Setup"
echo "=========================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI not found. Install from: https://cli.github.com"
    echo ""
    echo "📋 Manual Steps:"
    echo "1. Go to https://github.com/new"
    echo "2. Create repository 'agrieasy'"
    echo "3. Run these commands:"
    echo ""
    echo "   git remote add origin https://github.com/YOUR_USERNAME/agrieasy.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    exit 1
fi

echo "✅ GitHub CLI found. Proceeding with auto-setup..."
echo ""

# Create GitHub repository
echo "📦 Creating GitHub repository..."
gh repo create agrieasy --public --source=. --remote=origin --push || {
    echo "❌ Failed to create repository. You may need to:"
    echo "   1. Authenticate with: gh auth login"
    echo "   2. Create manually at: https://github.com/new"
    exit 1
}

echo "✅ Repository created and pushed to GitHub!"
echo ""
echo "🌐 Next Steps:"
echo "1. Go to https://vercel.com/new"
echo "2. Import the 'agrieasy' repository"
echo "3. Add these environment variables:"
echo "   - MONGODB_URI: Your MongoDB Atlas connection string"
echo "   - JWT_SECRET: A secure random string"
echo "   - RAZORPAY_KEY_ID: Your Razorpay test Key ID"
echo "   - RAZORPAY_KEY_SECRET: Your Razorpay test Secret"
echo "   - NEXT_PUBLIC_RAZORPAY_KEY_ID: Your Razorpay Key ID"
echo ""
echo "4. Click Deploy!"
echo ""
echo "📖 Full guide: See DEPLOYMENT.md"

# AgriEasy.com - Vercel Deployment Setup (Windows)
# Run this script in PowerShell to deploy to Vercel

Write-Host "🚀 AgriEasy.com - Vercel Deployment Setup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 VERCEL DEPLOYMENT QUICK START" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Create GitHub Repository" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option A: Using GitHub CLI (Fastest)"
Write-Host "  1. Install from: https://cli.github.com"
Write-Host "  2. Run: gh auth login"
Write-Host "  3. Run: gh repo create agrieasy --public --source=. --remote=origin --push"
Write-Host ""
Write-Host "Option B: Manual (GitHub Website)"
Write-Host "  1. Go to: https://github.com/new"
Write-Host "  2. Create repository named 'agrieasy'"
Write-Host "  3. Run these commands:"
Write-Host ""
Write-Host "     git remote add origin https://github.com/YOUR_USERNAME/agrieasy.git"
Write-Host "     git branch -M main" 
Write-Host "     git push -u origin main"
Write-Host ""
Write-Host "  4. Replace YOUR_USERNAME with your GitHub username"
Write-Host ""

Write-Host "Step 2: Prepare Environment Variables" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "You will need:"
Write-Host "  1. MongoDB URI: https://cloud.mongodb.com"
Write-Host "  2. Razorpay Keys: https://razorpay.com (Test Mode)"
Write-Host "  3. JWT Secret: Any secure random string"
Write-Host ""

Write-Host "Step 3: Deploy to Vercel" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Go to: https://vercel.com/new"
Write-Host "  2. Click Continue with GitHub"
Write-Host "  3. Select agrieasy repository"
Write-Host "  4. Click Import"
Write-Host "  5. Add Environment Variables:"
Write-Host ""
Write-Host "     MONGODB_URI = (your MongoDB connection string)"
Write-Host "     JWT_SECRET = (your secure random string)"
Write-Host "     RAZORPAY_KEY_ID = (your Razorpay Key ID - test mode)"
Write-Host "     RAZORPAY_KEY_SECRET = (your Razorpay Secret - test mode)"
Write-Host "     NEXT_PUBLIC_RAZORPAY_KEY_ID = (same as RAZORPAY_KEY_ID)"
Write-Host ""
Write-Host "  6. Click Deploy"
Write-Host "  7. Wait 2-3 minutes for deployment"
Write-Host ""

Write-Host "Step 4: Test Your Deployment" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ✅ Visit: https://agrieasy.vercel.app"
Write-Host "  ✅ Register as Farmer: ?role=farmer"
Write-Host "  ✅ Register as Buyer: ?role=buyer"
Write-Host "  ✅ Test payments with Razorpay test cards"
Write-Host ""

Write-Host "📖 For detailed guide, see: DEPLOYMENT.md" -ForegroundColor Green
Write-Host ""
Write-Host "✨ Your AgriEasy platform will be live on Vercel!" -ForegroundColor Green

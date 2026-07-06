# 🚀 AgriEasy.com - Vercel Deployment Guide

## ✅ Project Status
- **Build**: ✓ All 23 routes compiled successfully
- **Tests**: ✓ All ESLint checks passed
- **TypeScript**: ✓ All type errors fixed
- **Ready for Production**: YES

---

## 📋 Pre-Deployment Checklist

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `agrieasy` (or your preferred name)
3. Description: "AgriEasy.com - Agricultural Trading Platform"
4. Choose **Public** or **Private**
5. Click **Create repository**

### Step 2: Push Code to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/agrieasy.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 🔑 Environment Variables Setup

Before deploying to Vercel, you need:

### 1️⃣ MongoDB Atlas Setup (Free)
1. Go to https://cloud.mongodb.com
2. Sign up or log in
3. Create a new project
4. Create a free M0 cluster
5. Add your IP to IP Whitelist (Allow access from anywhere: 0.0.0.0/0)
6. Create database user with password
7. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/agrieasy?retryWrites=true&w=majority`

**Environment Variable:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agrieasy?retryWrites=true&w=majority
```

### 2️⃣ Razorpay API Keys (Free Test Mode)
1. Go to https://razorpay.com
2. Sign up or log in
3. Go to Settings → API Keys
4. Copy **Key ID** (Test mode)
5. Copy **Key Secret** (Test mode)

**Environment Variables:**
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
```

### 3️⃣ JWT Secret
Generate a random secure string:
```bash
# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object { [char][byte]::new((0..255 | Get-Random)) } | Join-String))) | Out-String
```

Or use: `your-super-secret-jwt-key-change-this-in-production`

**Environment Variable:**
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

---

## 🚀 Deploy to Vercel

### Step 1: Import Repository to Vercel
1. Go to https://vercel.com/new
2. Click **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. Select **agrieasy** repository
5. Click **Import**

### Step 2: Configure Environment Variables
In Vercel dashboard, under "Environment Variables", add:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Your secure random string |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Your Razorpay Key ID |

### Step 3: Deploy
1. Click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. ✅ Your site is live!

**Deployment URL Format:**
```
https://agrieasy.vercel.app
```

---

## 🧪 Testing After Deployment

1. **Test Farmer Registration**: `/auth/register?role=farmer`
2. **Test Buyer Registration**: `/auth/register?role=buyer`
3. **Test Transporter Registration**: `/auth/register?role=transporter`
4. **Test Listing Creation**: Buyer dashboard → Create Listing
5. **Test Vehicle Booking**: Farmer dashboard → Search Buyers → Book Vehicle
6. **Test Payment**: Buyer dashboard → Billing → Pay (Razorpay Test Mode)

---

## 💰 Razorpay Test Cards (for testing payments)

**Credit Card:**
- Number: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits

**Debit Card:**
- Number: `5555 5555 5555 4444`
- Expiry: Any future date
- CVV: Any 3 digits

---

## ⚡ Post-Deployment

### Custom Domain (Optional)
1. In Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS settings at your domain provider

### Monitoring
- **Vercel Analytics**: Dashboard shows deployment status
- **Database Logs**: MongoDB Atlas Atlas → Collections
- **Payment Logs**: Razorpay Dashboard → Payments

### Production Razorpay Keys (When Ready)
1. In Razorpay dashboard, switch from **Test Mode** to **Live Mode**
2. Get production Key ID and Secret
3. Update environment variables in Vercel
4. Redeploy

---

## 🛠️ Troubleshooting

**Build fails on Vercel:**
- Check environment variables are set
- Ensure MONGODB_URI is correct
- Check MongoDB IP whitelist includes Vercel's IPs

**Payment not working:**
- Ensure NEXT_PUBLIC_RAZORPAY_KEY_ID is set (must be public)
- Test with Razorpay test cards
- Check browser console for errors

**Database connection errors:**
- Verify MONGODB_URI format
- Check MongoDB Atlas allows connections from Vercel
- Ensure cluster is running

---

## 📞 Support

For issues:
1. Check Vercel deployment logs: Dashboard → Deployments
2. Check browser console: F12 → Console tab
3. Check MongoDB Atlas logs
4. Verify environment variables are correctly set

---

## ✨ Congratulations!

Your AgriEasy.com platform is now live! 🎉

Features deployed:
- ✅ 3 User roles (Farmer, Buyer, Transporter)
- ✅ Complete authentication system
- ✅ Commodity listing creation
- ✅ Vehicle booking system
- ✅ Real-time tracking support
- ✅ Billing management
- ✅ Razorpay payments

Next steps:
- Invite testers
- Gather feedback
- Plan Phase 2 features (chat, ratings, weather API)

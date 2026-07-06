# AgriEasy.com - Farmer to Buyer Direct Trading Platform

A full-featured web application connecting farmers directly with agricultural buyers, featuring real-time vehicle booking, tracking, billing, and integrated UPI payments.

## Features

### 🌾 Farmer Portal
- User authentication (email/phone)
- Profile management with Aadhar verification
- Browse available buyer listings with commodity filtering
- Filter buyers by price, distance, quality, and payment conditions
- Select preferred buyers for selling produce
- Book transportation vehicles with real-time tracking
- Track vehicle location and arrival status
- Receive payment through UPI integration

### 🏢 Buyer Portal
- User authentication (email/phone)
- Complete business profile with GSTIN
- Create commodity listings (Wheat, Rice, Maize, Barley, Paddy, Oilseeds, etc.)
- Manage buy listings and update prices dynamically
- View farmer details and locations
- Manage incoming orders
- Create billing and invoices
- Send payments to farmers via UPI

### 🚚 Transporter Portal
- Register vehicles (mini-trucks, pickup vans, big trucks)
- List vehicles with capacity and pricing
- Manage vehicle availability
- Track active bookings
- Real-time location updates

### 💳 Payment Integration
- Razorpay integration for UPI payments
- Secure payment processing
- Payment verification
- Transaction history

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - UI styling
- **React Hook Form** - Form management

### Backend
- **Next.js API Routes** - Serverless backend
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Razorpay** - Payment processing

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- Razorpay account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Configure .env.local with your credentials**

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

## Project Structure

```
agrieasy/
├── app/
│   ├── auth/                 # Authentication pages
│   ├── farmer/               # Farmer portal
│   ├── buyer/                # Buyer portal
│   ├── transporter/          # Transporter portal
│   └── api/                  # API routes
├── lib/
│   ├── models/               # MongoDB schemas
│   └── mongodb.ts
├── public/                   # Static assets
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Listings
- `GET /api/listings` - Get all listings with filters
- `POST /api/listings` - Create new listing

### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking

### Vehicles
- `GET /api/vehicles` - Get available vehicles
- `POST /api/vehicles` - Add new vehicle

### Billing
- `GET /api/billing` - Get billing records
- `POST /api/billing` - Create billing

### Payment
- `POST /api/payment` - Initialize payment
- `POST /api/payment/verify` - Verify payment

## Deployment

The project is ready to deploy to Vercel:

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

## License

MIT License - see LICENSE file for details.

---

**AgriEasy.com** - Empowering farmers and buyers through direct digital commerce.

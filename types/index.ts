
import { Types } from 'mongoose'

// ── Auth ──────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string
  email: string
  role: 'farmer' | 'buyer' | 'transporter' | 'admin'
}

// ── User ──────────────────────────────────────────────────────────

export interface IUser {
  _id: Types.ObjectId
  name: string
  email?: string
  phone: string
  password: string
  role: 'farmer' | 'buyer' | 'transporter' | 'admin'
  profileImage?: string
  isVerified: boolean
  aadhaarNumber?: string
  drivingLicense?: string
  firmName?: string
  gstin?: string
  address?: {
    state: string
    district: string
    pinCode: string
    fullAddress: string
  }
  bio?: string
  location?: string
  socialLinks?: {
    instagram?: string
    youtube?: string
    twitter?: string
  }
  createdAt: Date
  updatedAt: Date
}

// ── Listing ───────────────────────────────────────────────────────

export interface IListing {
  _id: Types.ObjectId
  buyerId: Types.ObjectId
  commodity: string
  variety?: string
  quantity: number
  unit: string
  pricePerUnit: number
  description?: string
  location: string
  images: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ── Booking ───────────────────────────────────────────────────────

export interface IBooking {
  _id: Types.ObjectId
  listingId: Types.ObjectId
  farmerId: Types.ObjectId
  buyerId: Types.ObjectId
  quantity: number
  totalPrice: number
  status: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled' | 'returned'
  deliveryAddress: string
  deliveryDate?: Date
  vehicleId?: Types.ObjectId
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ── Vehicle ───────────────────────────────────────────────────────

export interface IVehicle {
  _id: Types.ObjectId
  transporterId: Types.ObjectId
  vehicleType: string
  registrationNumber: string
  capacity: number
  capacityUnit: string
  baseRatePerKm: number
  availability: 'available' | 'unavailable' | 'on_trip'
  currentLocation?: string
  createdAt: Date
  updatedAt: Date
}

// ── Wallet ────────────────────────────────────────────────────────

export interface IWallet {
  _id: Types.ObjectId
  userId: Types.ObjectId
  balance: number
  agripayId?: string
  isKYC: boolean
  dailyLimit: number
  monthlyLimit: number
  paylaterLimit: number
  paylaterUsed: number
  paylaterEligible: boolean
  paylaterCreditScore: number
  createdAt: Date
  updatedAt: Date
}

// ── Transaction ───────────────────────────────────────────────────

export type TransactionType =
  | 'topup' | 'transfer' | 'withdraw' | 'payment'
  | 'paylater_borrow' | 'paylater_repay'
  | 'refund' | 'bill_payment'

export interface ITransaction {
  _id: Types.ObjectId
  fromUserId?: Types.ObjectId
  toUserId?: Types.ObjectId
  amount: number
  type: TransactionType
  status: 'success' | 'failed' | 'pending'
  description: string
  category?: string
  paymentMethod?: string
  referenceId?: string
  razorpayPaymentId?: string
  razorpayOrderId?: string
  paylaterId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// ── Post ──────────────────────────────────────────────────────────

export interface IPost {
  _id: Types.ObjectId
  userId: Types.ObjectId
  content?: string
  mediaUrls: string[]
  type: 'post' | 'clip'
  category: string
  hashtags: string[]
  cropTags: string[]
  location?: string
  likesCount: number
  commentsCount: number
  sharesCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ── PayLater ──────────────────────────────────────────────────────

export interface IPayLater {
  _id: Types.ObjectId
  userId: Types.ObjectId
  loanAmount: number
  amountDue: number
  interestRate: number
  interestRateDefault: number
  borrowedAt: Date
  dueDate: Date
  status: 'active' | 'partially_repaid' | 'closed' | 'defaulted'
  totalRepaid: number
  lastInterestCalc: Date
  createdAt: Date
  updatedAt: Date
}
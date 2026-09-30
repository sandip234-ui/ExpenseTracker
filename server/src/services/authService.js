import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import prisma from '../lib/prisma.js'
import { config } from '../config/index.js'
import {
  EmailAlreadyExistsError,
  UnauthorizedError,
} from '../errors/domainErrors.js'
import { normalizeAccountName } from '../utils/accountUtils.js'

/**
 * Generates a signed JWT token for the user.
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  )
}

/**
 * Registers a new user with secure password hashing and default starter accounts.
 */
export async function registerUser({ email, password, name }) {
  const normalizedEmail = email.trim().toLowerCase()

  // 1. Check uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existing) {
    throw new EmailAlreadyExistsError('An account with this email already exists.')
  }

  // 2. Hash password
  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const userId = `usr_${randomUUID().replace(/-/g, '').slice(0, 16)}`

  // 3. Create user and starter accounts in atomic transaction
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        id: userId,
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Seed default starter accounts for the new user
    await tx.account.createMany({
      data: [
        {
          id: `acc_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          userId: createdUser.id,
          name: 'Cash',
          normalizedName: normalizeAccountName('Cash'),
          type: 'cash',
          openingBalance: 0,
          currency: 'INR',
          icon: '💵',
          color: '#10B981',
        },
        {
          id: `acc_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          userId: createdUser.id,
          name: 'Bank Account',
          normalizedName: normalizeAccountName('Bank Account'),
          type: 'bank',
          openingBalance: 0,
          currency: 'INR',
          icon: '🏦',
          color: '#3B82F6',
        },
        {
          id: `acc_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          userId: createdUser.id,
          name: 'UPI / Wallet',
          normalizedName: normalizeAccountName('UPI / Wallet'),
          type: 'upi',
          openingBalance: 0,
          currency: 'INR',
          icon: '📱',
          color: '#8B5CF6',
        },
      ],
    })

    return createdUser
  })

  const token = generateToken(user)
  return { user, token }
}

/**
 * Authenticates user credentials and generates a secure token.
 */
export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.')
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash)
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.')
  }

  const token = generateToken(user)
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }

  return { user: safeUser, token }
}

/**
 * Retrieves the authenticated user profile without sensitive fields.
 */
export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) {
    throw new UnauthorizedError('User account not found.')
  }
  return user
}

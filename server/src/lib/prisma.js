import { PrismaClient } from '@prisma/client'
import { config } from '../config/index.js'

// Centralized PrismaClient instance (singleton pattern)
const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: config.isProduction ? ['error', 'warn'] : ['query', 'error', 'warn'],
  })

if (!config.isProduction) {
  globalForPrisma.prisma = prisma
}

export default prisma

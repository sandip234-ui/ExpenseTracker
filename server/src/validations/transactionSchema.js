import { z } from 'zod'

export const getTransactionsSchema = {
  query: z.object({
    accountId: z.string().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    categoryId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    transferType: z.enum(['goal_deposit', 'goal_withdrawal']).optional(),
  }),
}

export const createTransactionSchema = {
  body: z.object({
    amount: z.coerce.number({ required_error: 'Amount is required' }),
    type: z.enum(['income', 'expense', 'transfer'], {
      errorMap: () => ({ message: 'Invalid transaction type. Must be income, expense, or transfer' }),
    }),
    accountId: z.string().min(1, 'Account ID is required'),
    categoryId: z.string().nullable().optional(),
    description: z.string().optional().default(''),
    date: z.string().or(z.date()).optional(),
    notes: z.string().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
    transferType: z.enum(['goal_deposit', 'goal_withdrawal']).nullable().optional(),
    goalId: z.string().nullable().optional(),
    recurringId: z.string().nullable().optional(),
  }),
}

export const updateTransactionSchema = {
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
  }),
  body: z.object({
    amount: z.coerce.number().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    accountId: z.string().min(1).optional(),
    categoryId: z.string().nullable().optional(),
    description: z.string().optional(),
    date: z.string().or(z.date()).optional(),
    notes: z.string().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
    transferType: z.enum(['goal_deposit', 'goal_withdrawal']).nullable().optional(),
    goalId: z.string().nullable().optional(),
    recurringId: z.string().nullable().optional(),
  }),
}

export const transactionIdParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
  }),
}

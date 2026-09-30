import { z } from 'zod'

export const getRecurringSchema = {
  query: z.object({
    active: z.enum(['true', 'false']).optional(),
  }),
}

export const createRecurringSchema = {
  body: z.object({
    description: z.string().min(1, 'Description is required').trim(),
    amount: z.coerce.number({ required_error: 'Amount is required' }),
    type: z.enum(['income', 'expense'], {
      errorMap: () => ({ message: 'Recurring transaction type must be income or expense' }),
    }),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
      errorMap: () => ({ message: 'Frequency must be daily, weekly, monthly, or yearly' }),
    }),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()).nullable().optional(),
    accountId: z.string().min(1, 'Account ID is required'),
    categoryId: z.string().min(1, 'Category ID is required'),
    paymentMethod: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    active: z.boolean().optional().default(true),
  }),
}

export const updateRecurringSchema = {
  params: z.object({
    id: z.string().min(1, 'Recurring rule ID is required'),
  }),
  body: z.object({
    description: z.string().min(1).trim().optional(),
    amount: z.coerce.number().optional(),
    type: z.enum(['income', 'expense']).optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).nullable().optional(),
    accountId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    paymentMethod: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    active: z.boolean().optional(),
  }),
}

export const recurringIdParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Recurring rule ID is required'),
  }),
}

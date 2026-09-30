import { z } from 'zod'

export const getBudgetsSchema = {
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
  }),
}

export const createBudgetSchema = {
  body: z.object({
    categoryId: z.string().min(1, 'Category ID is required'),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    amount: z.coerce.number({ required_error: 'Amount is required' }),
  }),
}

export const updateBudgetSchema = {
  params: z.object({
    id: z.string().min(1, 'Budget ID is required'),
  }),
  body: z.object({
    amount: z.coerce.number().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
    categoryId: z.string().optional(),
  }),
}

export const budgetIdParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Budget ID is required'),
  }),
}

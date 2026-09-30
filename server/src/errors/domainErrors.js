/**
 * FinTrack Domain Error Hierarchy
 * Standardized domain errors with semantic error codes and HTTP status codes.
 */

export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR', statusCode = 400, details = null) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export class InsufficientBalanceError extends DomainError {
  constructor(message = 'Insufficient balance in account.', details = null) {
    super(message, 'INSUFFICIENT_BALANCE', 400, details)
  }
}

export class InvalidAmountError extends DomainError {
  constructor(message = 'Amount must be greater than zero.', details = null) {
    super(message, 'INVALID_AMOUNT', 400, details)
  }
}

export class AccountNotFoundError extends DomainError {
  constructor(message = 'Account not found.', details = null) {
    super(message, 'ACCOUNT_NOT_FOUND', 404, details)
  }
}

export class AccountNameExistsError extends DomainError {
  constructor(message = 'An account with this name already exists.', details = null) {
    super(message, 'ACCOUNT_NAME_EXISTS', 409, details)
  }
}

export class CategoryNotFoundError extends DomainError {
  constructor(message = 'Category not found.', details = null) {
    super(message, 'CATEGORY_NOT_FOUND', 404, details)
  }
}

export class InvalidCategoryTypeError extends DomainError {
  constructor(message = 'Category is not compatible with transaction type.', details = null) {
    super(message, 'INVALID_CATEGORY_TYPE', 400, details)
  }
}

export class GoalNotFoundError extends DomainError {
  constructor(message = 'Savings goal not found.', details = null) {
    super(message, 'GOAL_NOT_FOUND', 404, details)
  }
}

export class GoalInsufficientFundsError extends DomainError {
  constructor(message = 'Insufficient funds in this savings goal.', details = null) {
    super(message, 'GOAL_INSUFFICIENT_FUNDS', 400, details)
  }
}

export class GoalOverfundingError extends DomainError {
  constructor(message = 'Deposit exceeds remaining target for this goal.', details = null) {
    super(message, 'GOAL_OVERFUNDING', 400, details)
  }
}

export class TransactionNotFoundError extends DomainError {
  constructor(message = 'Transaction not found.', details = null) {
    super(message, 'TRANSACTION_NOT_FOUND', 404, details)
  }
}

export class InvalidTransactionTypeError extends DomainError {
  constructor(message = 'Invalid transaction type.', details = null) {
    super(message, 'INVALID_TRANSACTION_TYPE', 400, details)
  }
}

export class DuplicateBudgetError extends DomainError {
  constructor(message = 'A budget for this category and month already exists.', details = null) {
    super(message, 'DUPLICATE_BUDGET', 409, details)
  }
}

export class BudgetNotFoundError extends DomainError {
  constructor(message = 'Budget not found.', details = null) {
    super(message, 'BUDGET_NOT_FOUND', 404, details)
  }
}

export class RecurringNotFoundError extends DomainError {
  constructor(message = 'Recurring transaction rule not found.', details = null) {
    super(message, 'RECURRING_NOT_FOUND', 404, details)
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Validation failed.', details = null) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Authentication required.', details = null) {
    super(message, 'UNAUTHORIZED', 401, details)
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Access denied. You do not have permission to access this resource.', details = null) {
    super(message, 'FORBIDDEN', 403, details)
  }
}

export class EmailAlreadyExistsError extends DomainError {
  constructor(message = 'An account with this email already exists.', details = null) {
    super(message, 'EMAIL_EXISTS', 409, details)
  }
}

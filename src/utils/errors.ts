import type { ApiErrorCode } from '../types/shared';

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(details?: Record<string, string>, message = 'The request is invalid') {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super('INTERNAL_ERROR', message, 500);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'You need to log in') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to do this') {
    super('FORBIDDEN', message, 403);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Email or password is incorrect') {
    super('INVALID_CREDENTIALS', message, 401);
  }
}

export class EmailTakenError extends AppError {
  constructor(message = 'That email already has an account') {
    super('EMAIL_TAKEN', message, 409);
  }
}

export class InvalidResetTokenError extends AppError {
  constructor(message = 'This reset link is invalid or has expired') {
    super('INVALID_RESET_TOKEN', message, 400);
  }
}

export class SessionNotFoundError extends AppError {
  constructor(message = 'Class not found') {
    super('SESSION_NOT_FOUND', message, 404);
  }
}

export class SessionFullError extends AppError {
  constructor(message = 'This class is full') {
    super('SESSION_FULL', message, 409);
  }
}

export class SessionPastError extends AppError {
  constructor(message = 'This class has already started') {
    super('SESSION_PAST', message, 409);
  }
}

export class SessionNotFullError extends AppError {
  constructor(message = 'This class still has places, so you can book it') {
    super('SESSION_NOT_FULL', message, 409);
  }
}

export class AlreadyBookedError extends AppError {
  constructor(message = 'You are already booked into this class') {
    super('ALREADY_BOOKED', message, 409);
  }
}

export class AlreadyWaitlistedError extends AppError {
  constructor(message = 'You are already on the waitlist for this class') {
    super('ALREADY_WAITLISTED', message, 409);
  }
}

export class BookingNotFoundError extends AppError {
  constructor(message = 'Booking not found') {
    super('BOOKING_NOT_FOUND', message, 404);
  }
}

export class BookingAlreadyCancelledError extends AppError {
  constructor(message = 'This booking is already cancelled') {
    super('BOOKING_ALREADY_CANCELLED', message, 409);
  }
}

export class WaitlistEntryNotFoundError extends AppError {
  constructor(message = 'Waitlist entry not found') {
    super('WAITLIST_ENTRY_NOT_FOUND', message, 404);
  }
}

export class CapacityBelowBookingsError extends AppError {
  constructor(message = 'Capacity cannot be lower than the current number of bookings') {
    super('CAPACITY_BELOW_BOOKINGS', message, 409);
  }
}

export class SessionHasBookingsError extends AppError {
  constructor(message = 'This class has bookings or waitlist entries, so it cannot be deleted') {
    super('SESSION_HAS_BOOKINGS', message, 409);
  }
}

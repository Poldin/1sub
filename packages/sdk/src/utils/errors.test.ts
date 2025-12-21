import { describe, it, expect } from 'vitest';
import {
  OneSubSDKError,
  AuthenticationError,
  NotFoundError,
  RateLimitExceededError,
  InsufficientCreditsSDKError,
  ValidationError,
  parseApiError,
} from './errors.js';

describe('OneSubSDKError', () => {
  it('creates error with correct properties', () => {
    const error = new OneSubSDKError('Test error', 'TEST_ERROR', 500);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('OneSubSDKError');
  });

  it('converts to JSON', () => {
    const error = new OneSubSDKError('Test error', 'TEST_ERROR', 500, { extra: 'data' });
    const json = error.toJSON();
    expect(json.error).toBe('TEST_ERROR');
    expect(json.message).toBe('Test error');
    expect(json.statusCode).toBe(500);
    expect(json.details).toEqual({ extra: 'data' });
  });
});

describe('AuthenticationError', () => {
  it('creates with default message', () => {
    const error = new AuthenticationError();
    expect(error.message).toBe('Invalid or missing API key');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthenticationError');
  });

  it('creates with custom message', () => {
    const error = new AuthenticationError('Custom auth error');
    expect(error.message).toBe('Custom auth error');
  });
});

describe('NotFoundError', () => {
  it('creates with default message', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource not found');
    expect(error.statusCode).toBe(404);
  });
});

describe('RateLimitExceededError', () => {
  it('creates with rate limit details', () => {
    const error = new RateLimitExceededError(60, 100, 0);
    expect(error.retryAfter).toBe(60);
    expect(error.limit).toBe(100);
    expect(error.remaining).toBe(0);
    expect(error.statusCode).toBe(429);
  });

  it('converts to JSON with rate limit details', () => {
    const error = new RateLimitExceededError(60, 100, 0);
    const json = error.toJSON();
    expect(json.retryAfter).toBe(60);
    expect(json.limit).toBe(100);
    expect(json.remaining).toBe(0);
  });
});

describe('InsufficientCreditsSDKError', () => {
  it('creates with credit details', () => {
    const error = new InsufficientCreditsSDKError(5, 10);
    expect(error.currentBalance).toBe(5);
    expect(error.required).toBe(10);
    expect(error.shortfall).toBe(5);
    expect(error.statusCode).toBe(400);
  });

  it('converts to JSON with credit details', () => {
    const error = new InsufficientCreditsSDKError(5, 10);
    const json = error.toJSON();
    expect(json.currentBalance).toBe(5);
    expect(json.required).toBe(10);
    expect(json.shortfall).toBe(5);
  });
});

describe('ValidationError', () => {
  it('creates with message and details', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual({ field: 'email' });
    expect(error.statusCode).toBe(400);
  });
});

describe('parseApiError', () => {
  it('throws AuthenticationError for 401', () => {
    expect(() => parseApiError(401, { message: 'Unauthorized' }))
      .toThrow(AuthenticationError);
  });

  it('throws NotFoundError for 404', () => {
    expect(() => parseApiError(404, { message: 'Not found' }))
      .toThrow(NotFoundError);
  });

  it('throws RateLimitExceededError for 429', () => {
    expect(() => parseApiError(429, { retryAfter: 60, limit: 100, remaining: 0 }))
      .toThrow(RateLimitExceededError);
  });

  it('throws InsufficientCreditsSDKError for insufficient credits', () => {
    expect(() => parseApiError(400, {
      error: 'INSUFFICIENT_CREDITS',
      current_balance: 5,
      required: 10,
    })).toThrow(InsufficientCreditsSDKError);
  });

  it('throws ValidationError for other 400 errors', () => {
    expect(() => parseApiError(400, { message: 'Bad request' }))
      .toThrow(ValidationError);
  });

  it('throws OneSubSDKError for other status codes', () => {
    expect(() => parseApiError(500, { message: 'Server error' }))
      .toThrow(OneSubSDKError);
  });
});

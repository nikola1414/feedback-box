import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FailedLoginLimiter } from '../src/rateLimit.js';

describe('FailedLoginLimiter', () => {
  const make = () => {
    const clock = { t: 1_000_000 };
    const limiter = new FailedLoginLimiter({ max: 3, windowMs: 60_000, now: () => clock.t });
    return { clock, limiter };
  };

  it('blocks a key after max failures inside the window', () => {
    const { limiter } = make();
    limiter.recordFailure('a');
    limiter.recordFailure('a');
    assert.equal(limiter.isBlocked('a'), false);
    limiter.recordFailure('a');
    assert.equal(limiter.isBlocked('a'), true);
    assert.equal(limiter.isBlocked('b'), false);
  });

  it('forgets failures once they leave the window', () => {
    const { clock, limiter } = make();
    for (let i = 0; i < 3; i++) limiter.recordFailure('a');
    assert.equal(limiter.retryAfterSeconds('a'), 60);
    clock.t += 59_000;
    assert.equal(limiter.isBlocked('a'), true);
    assert.equal(limiter.retryAfterSeconds('a'), 1);
    clock.t += 1_001;
    assert.equal(limiter.isBlocked('a'), false);
    assert.equal(limiter.retryAfterSeconds('a'), 0);
  });

  it('can be reset after a successful sign-in', () => {
    const { limiter } = make();
    for (let i = 0; i < 3; i++) limiter.recordFailure('a');
    limiter.reset('a');
    assert.equal(limiter.isBlocked('a'), false);
  });
});

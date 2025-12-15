import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests within limit', () => {
    const result1 = rateLimit('test-user', 5, 60000);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = rateLimit('test-user', 5, 60000);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it('blocks requests over limit', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit('test-user-2', 5, 60000);
    }

    const result = rateLimit('test-user-2', 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    rateLimit('test-user-3', 2, 1000);

    jest.advanceTimersByTime(1001);

    const result = rateLimit('test-user-3', 2, 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});


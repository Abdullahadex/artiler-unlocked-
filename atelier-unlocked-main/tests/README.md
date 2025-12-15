# Testing Guide

## Test Suite Overview

This project includes comprehensive testing at multiple levels:

### 1. Unit Tests (Jest)
- Component testing
- Hook testing
- Utility function testing
- Location: `src/__tests__/`

### 2. Integration Tests (Jest)
- API route testing
- Database interaction testing
- Location: `src/__tests__/`

### 3. End-to-End Tests (Playwright)
- User flow testing
- Cross-browser testing
- Location: `tests/e2e/`

### 4. Load Tests (k6)
- Performance testing
- Stress testing
- Location: `tests/load/`

## Running Tests

### Unit & Integration Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npx playwright test tests/e2e/auction-flow.spec.ts
```

### Load Tests
```bash
# Install k6 first: https://k6.io/docs/getting-started/installation/
npm run test:load

# With custom URL
BASE_URL=https://yourdomain.com npm run test:load
```

## Test Coverage Goals

- Unit Tests: >80% coverage
- Integration Tests: Critical paths covered
- E2E Tests: Main user flows covered
- Load Tests: Performance benchmarks met

## Writing Tests

### Unit Test Example
```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('user can place bid', async ({ page }) => {
  await page.goto('/piece/123');
  await page.click('button:has-text("Place Bid")');
  await expect(page.locator('.success')).toBeVisible();
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to main
- Before deployments


import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },  // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.1'], // Error rate should be less than 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test homepage
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads in <500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test floor page
  res = http.get(`${BASE_URL}/floor`);
  check(res, {
    'floor page status is 200': (r) => r.status === 200,
    'floor page contains auctions': (r) => r.body.includes('The Floor'),
  }) || errorRate.add(1);

  sleep(1);

  // Test health endpoint
  res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check returns healthy': (r) => JSON.parse(r.body).status === 'healthy',
  }) || errorRate.add(1);

  sleep(1);
}


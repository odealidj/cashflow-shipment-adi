import http from 'k6/http';
import { check, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses(200, 201, 400, 401, 409));

const targetURL = __ENV.TARGET_URL || 'http://localhost:8080';
const authToken = __ENV.AUTH_TOKEN || '';

export const options = {
  vus: parseInt(__ENV.VUS || '5'),
  duration: __ENV.DURATION || '5s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
  },
};

export default function () {
  const headers = { 'Accept': 'application/json' };
  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  // 1. Health Check
  const healthRes = http.get(`${targetURL}/api/v1/health`, { headers });
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // 2. Read Cashflow Sample
  const cashflowRes = http.get(`${targetURL}/api/v1/cashflow?page=1&limit=5`, { headers });
  check(cashflowRes, {
    'cashflow read status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response duration < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(0.2);
}

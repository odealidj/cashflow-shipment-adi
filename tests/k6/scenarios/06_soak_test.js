import http from 'k6/http';
import { check, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses(200, 201, 400, 401, 409));

const targetURL = __ENV.TARGET_URL || 'http://localhost:8080';
const authToken = __ENV.AUTH_TOKEN || '';

export const options = {
  vus: parseInt(__ENV.VUS || '15'),
  duration: __ENV.DURATION || '60s',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<350'],
  },
};

export default function () {
  const headers = { 'Accept': 'application/json' };
  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  // 1. Read Cashflow
  const resCashflow = http.get(`${targetURL}/api/v1/cashflow?page=1&limit=15`, { headers });
  check(resCashflow, {
    'cashflow endurance status ok': (r) => [200, 401].includes(r.status),
  });

  // 2. Ping Health
  const resHealth = http.get(`${targetURL}/api/v1/health`, { headers });
  check(resHealth, {
    'health endurance ok': (r) => r.status === 200,
  });

  sleep(0.5);
}

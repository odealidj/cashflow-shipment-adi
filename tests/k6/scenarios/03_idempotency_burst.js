import http from 'k6/http';
import { check, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses(200, 201, 400, 401, 409));

const targetURL = __ENV.TARGET_URL || 'http://localhost:8080';
const authToken = __ENV.AUTH_TOKEN || '';

export const options = {
  vus: parseInt(__ENV.VUS || '30'),
  duration: __ENV.DURATION || '3s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Idempotency-Key': 'k6-burst-shared-test-key-2026',
  };
  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  const payload = JSON.stringify({
    date_of_entry: '2026-09-04',
    entry_type: 'CREDIT',
    amount: 150000,
    description: 'k6 Idempotency Concurrency Test',
  });

  const res = http.post(`${targetURL}/api/v1/transactions`, payload, { headers });
  
  check(res, {
    'not 500 internal server error': (r) => r.status !== 500,
    'handled by idempotency or auth guard': (r) => [200, 201, 400, 401, 409].includes(r.status),
  });

  sleep(0.1);
}

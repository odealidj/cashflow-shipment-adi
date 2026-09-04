import http from 'k6/http';
import { check, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses(200, 201, 400, 401, 409));

const targetURL = __ENV.TARGET_URL || 'http://localhost:8080';
const authToken = __ENV.AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '3s', target: parseInt(__ENV.VUS || '20') },
    { duration: '9s', target: parseInt(__ENV.VUS || '20') },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<400'],
  },
};

export default function () {
  const headers = { 'Accept': 'application/json' };
  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  const res = http.get(`${targetURL}/api/v1/cashflow?page=1&limit=25`, { headers });
  check(res, {
    'cashflow status 200 or 401': (r) => [200, 401].includes(r.status),
    'load latency < 400ms': (r) => r.timings.duration < 400,
  });

  sleep(0.3);
}

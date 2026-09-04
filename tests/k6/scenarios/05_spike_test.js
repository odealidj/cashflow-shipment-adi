import http from 'k6/http';
import { check, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses(200, 201, 400, 401, 409));

const targetURL = __ENV.TARGET_URL || 'http://localhost:8080';
const authToken = __ENV.AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '2s', target: 80 },
    { duration: '5s', target: 80 },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],
  },
};

export default function () {
  const headers = { 'Accept': 'application/json' };
  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  const res = http.get(`${targetURL}/api/v1/health`, { headers });
  check(res, {
    'spike response received': (r) => [200, 401].includes(r.status),
    'no 502 bad gateway': (r) => r.status !== 502,
  });

  sleep(0.1);
}

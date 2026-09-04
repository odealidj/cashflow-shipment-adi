import http from 'k6/http';
import { check, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses(200, 201, 400, 401, 409));

const targetURL = __ENV.TARGET_URL || 'http://localhost:8080';
const authToken = __ENV.AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '5s', target: 50 },
    { duration: '10s', target: 120 },
    { duration: '15s', target: 200 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(90)<1200'],
  },
};

export default function () {
  const headers = { 'Accept': 'application/json' };
  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  const resCashflow = http.get(`${targetURL}/api/v1/cashflow?page=1&limit=20`, { headers });
  check(resCashflow, {
    'cashflow stress status ok': (r) => [200, 401].includes(r.status),
  });

  const resInvoices = http.get(`${targetURL}/api/v1/invoices/summary`, { headers });
  check(resInvoices, {
    'invoices stress status ok': (r) => [200, 401].includes(r.status),
  });

  sleep(0.2);
}

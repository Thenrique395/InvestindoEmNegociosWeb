import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000']
  }
};

const baseUrl = __ENV.APP_BASE_URL || 'http://127.0.0.1:4300';

export default function () {
  const response = http.get(baseUrl);

  check(response, {
    'status is 200': (res) => res.status === 200,
    'body is not empty': (res) => Boolean(res.body && res.body.length > 0)
  });

  sleep(1);
}

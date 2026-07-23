import { GET } from '@/app/api/cron/remind/route';

// These cases fail the auth gate before any DB access, so no DATABASE_URL is
// needed (see src/db/client.ts: the prod client is a lazy Proxy).

afterEach(() => {
  vi.unstubAllEnvs();
});

test('CRON_SECRET unset: a request with "Bearer undefined" is rejected, not authenticated', async () => {
  vi.stubEnv('CRON_SECRET', '');
  const request = new Request('http://localhost/api/cron/remind', {
    headers: { authorization: 'Bearer undefined' },
  });

  const response = await GET(request);

  expect(response.status).toBe(401);
});

test('CRON_SECRET set: a request with the wrong Authorization header is rejected', async () => {
  vi.stubEnv('CRON_SECRET', 'the-real-secret');
  const request = new Request('http://localhost/api/cron/remind', {
    headers: { authorization: 'Bearer wrong-value' },
  });

  const response = await GET(request);

  expect(response.status).toBe(401);
});

test('CRON_SECRET set: a request with no Authorization header is rejected', async () => {
  vi.stubEnv('CRON_SECRET', 'the-real-secret');
  const request = new Request('http://localhost/api/cron/remind', {});

  const response = await GET(request);

  expect(response.status).toBe(401);
});

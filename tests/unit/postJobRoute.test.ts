import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.ENABLE_POST_JOB = 'true';
delete process.env.RESEND_API_KEY;

const valid = {
  companyName: 'Acme',
  contactName: 'Ann',
  contactEmail: 'ann@example.com',
  jobTitle: 'Engineer',
  employmentType: 'Full-time',
  applicationUrl: 'https://example.com/apply',
};

function req(body: unknown, headers: Record<string, string> = {}, ip = '198.51.100.1') {
  return new NextRequest('https://globalcv.test/api/post-job', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', origin: 'https://globalcv.test', host: 'globalcv.test', 'x-forwarded-for': ip, ...headers },
  });
}

describe('POST /api/post-job hardening', async () => {
  const { POST } = await import('@/app/api/post-job/route');

  it('rejects non-JSON content types (blocks cross-site text/plain form posts)', async () => {
    const res = await POST(req(valid, { 'content-type': 'text/plain' }, '198.51.100.2'));
    assert.equal(res.status, 415);
  });

  it('rejects cross-origin and origin-less requests', async () => {
    assert.equal((await POST(req(valid, { origin: 'https://evil.example' }, '198.51.100.3'))).status, 403);
    const noOrigin = new NextRequest('https://globalcv.test/api/post-job', {
      method: 'POST', body: JSON.stringify(valid), headers: { 'content-type': 'application/json', host: 'globalcv.test' },
    });
    assert.equal((await POST(noOrigin)).status, 403);
  });

  it('validates input and rejects javascript: application URLs', async () => {
    assert.equal((await POST(req({ ...valid, contactEmail: 'nope' }, {}, '198.51.100.4'))).status, 400);
    assert.equal((await POST(req({ ...valid, applicationUrl: 'javascript:alert(1)' }, {}, '198.51.100.5'))).status, 400);
    assert.equal((await POST(req('{bad json', {}, '198.51.100.6'))).status, 400);
  });

  it('silently accepts honeypot submissions without sending email', async () => {
    const res = await POST(req({ ...valid, website2: 'bot' }, {}, '198.51.100.7'));
    assert.equal(res.status, 200);
  });

  it('fails closed with a generic message when email is not configured', async () => {
    const res = await POST(req(valid, {}, '198.51.100.8'));
    assert.equal(res.status, 500);
    const body = await res.json() as { error: string };
    assert.ok(!/key|resend/i.test(body.error) || body.error === 'Email service not configured.');
  });

  it('rate limits repeated submissions from one client', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) statuses.push((await POST(req(valid, {}, '198.51.100.99'))).status);
    assert.ok(statuses.includes(429));
  });
});

describe('GET /api/health', async () => {
  const { GET } = await import('@/app/api/health/route');
  it('returns ok without caching', async () => {
    const res = GET();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(((await res.json()) as { status: string }).status, 'ok');
  });
});

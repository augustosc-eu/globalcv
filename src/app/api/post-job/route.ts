import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { CONTACT_EMAIL } from '@/lib/site';
import { clientKey, createRateLimiter } from '@/lib/jobs/rateLimit';

const ENABLE_POST_JOB = process.env.ENABLE_POST_JOB === 'true';
const MAX_BODY_BYTES = 20_000;
// Per-instance limit (see rateLimit.ts). Submissions are rare; keep it tight.
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

/** Reject cross-site submissions: browsers always send Origin on POST. */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const postJobSchema = z.object({
  companyName: z.string().min(2).max(120),
  companyWebsite: z.string().max(300).optional().default(''),
  contactName: z.string().min(2).max(120),
  contactEmail: z.email().max(200),
  jobTitle: z.string().min(2).max(160),
  location: z.string().max(120).optional().default(''),
  employmentType: z.string().min(2).max(60),
  applicationUrl: z.url({ protocol: /^https?$/ }).max(400),
  salary: z.string().max(120).optional().default(''),
  regionFocus: z.string().max(80).optional().default('Global'),
  description: z.string().max(5000).optional().default(''),
});

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function POST(request: NextRequest) {
  if (!ENABLE_POST_JOB) {
    return NextResponse.json({ error: 'Job submissions are disabled.' }, { status: 404 });
  }

  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'Unsupported content type.' }, { status: 415 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin submissions are not allowed.' }, { status: 403 });
  }
  const decision = limiter(clientKey(request.headers));
  if (!decision.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds) } },
    );
  }

  try {
    const bodyText = await request.text();
    if (bodyText.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Submission too large.' }, { status: 413 });
    }
    let raw: Record<string, unknown> | null;
    try {
      raw = JSON.parse(bodyText) as Record<string, unknown> | null;
    } catch {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
    }
    // Honeypot: humans never see or fill this field.
    if (typeof raw?.website2 === 'string' && raw.website2.trim()) {
      return NextResponse.json({ ok: true });
    }

    const candidate = {
      ...raw,
      website2: undefined,
      companyWebsite: normalizeUrl(String(raw?.companyWebsite ?? '')),
      applicationUrl: normalizeUrl(String(raw?.applicationUrl ?? '')),
    };

    const parsed = postJobSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured.' }, { status: 500 });
    }

    const from = process.env.RESEND_FROM ?? `GlobalCV Jobs <${CONTACT_EMAIL}>`;
    const data = parsed.data;
    const resend = new Resend(apiKey);

    const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();
    const subject = oneLine(`Job Posting Request — ${data.companyName} — ${data.jobTitle}`);
    const text = [
      'New job posting request submitted on GlobalCV.',
      '',
      `Company: ${data.companyName}`,
      'Plan: Free Standard',
      `Company website: ${data.companyWebsite || 'N/A'}`,
      `Contact name: ${data.contactName}`,
      `Contact email: ${data.contactEmail}`,
      `Job title: ${data.jobTitle}`,
      `Location: ${data.location || 'Remote'}`,
      `Employment type: ${data.employmentType}`,
      `Application URL: ${data.applicationUrl}`,
      `Salary: ${data.salary || 'N/A'}`,
      `Region focus: ${data.regionFocus || 'Global'}`,
      '',
      'Job description / notes:',
      data.description || 'N/A',
    ].join('\n');

    await resend.emails.send({
      from,
      to: [CONTACT_EMAIL],
      replyTo: data.contactEmail,
      subject,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not submit your request.' }, { status: 500 });
  }
}

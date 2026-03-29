import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { CONTACT_EMAIL } from '@/lib/site';

const ENABLE_POST_JOB = process.env.ENABLE_POST_JOB === 'true';

const postJobSchema = z.object({
  companyName: z.string().min(2).max(120),
  companyWebsite: z.string().max(300).optional().default(''),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email().max(200),
  jobTitle: z.string().min(2).max(160),
  location: z.string().max(120).optional().default(''),
  employmentType: z.string().min(2).max(60),
  applicationUrl: z.string().url().max(400),
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

  try {
    const raw = await request.json();

    const candidate = {
      ...raw,
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

    const subject = `Job Posting Request — ${data.companyName} — ${data.jobTitle}`;
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

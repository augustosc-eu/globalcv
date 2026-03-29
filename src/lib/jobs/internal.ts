import { Job } from './types';

/**
 * Internal jobs managed directly in-code.
 *
 * Add new entries to this array and they will appear in `/jobs`
 * through the `globalcv` source.
 */
export const INTERNAL_JOBS: Job[] = [
  {
    id: 'globalcv-example-1',
    title: 'Senior Full-Stack Engineer',
    company: 'Example Labs',
    companyLogo: undefined,
    location: 'Remote (Europe)',
    region: 'eu',
    category: 'software-dev',
    jobType: 'full-time',
    tags: ['TypeScript', 'Next.js', 'Node.js', 'Remote'],
    salary: '€70k–€90k/yr',
    url: 'https://example.com/careers/senior-fullstack-engineer',
    postedAt: '2026-03-29T00:00:00.000Z',
    source: 'globalcv',
    description: 'Build product features end-to-end with TypeScript, Next.js, and Node.js in a remote-first environment.',
  },
];


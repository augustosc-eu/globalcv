export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  region: string;        // normalized: us | eu | uk | ca | au | latam | apac | worldwide
  category: string;
  jobType: string;       // full-time | part-time | contract | freelance | internship | other
  tags: string[];
  salary?: string;
  url: string;
  postedAt: string;      // ISO string
  source: 'remotive' | 'arbeitnow' | 'jobicy' | 'remoteok';
  description?: string;  // plaintext excerpt, max ~500 chars
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export const JOB_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'software-dev', label: 'Software Dev' },
  { id: 'devops', label: 'DevOps & SRE' },
  { id: 'design', label: 'Design' },
  { id: 'product', label: 'Product' },
  { id: 'data', label: 'Data & AI' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'customer-support', label: 'Customer Support' },
  { id: 'sales', label: 'Sales' },
  { id: 'writing', label: 'Writing & Content' },
  { id: 'finance', label: 'Finance' },
  { id: 'hr', label: 'HR & People' },
  { id: 'other', label: 'Other' },
] as const;

export const JOB_REGIONS = [
  { id: 'all', label: 'All Regions' },
  { id: 'worldwide', label: 'Worldwide' },
  { id: 'us', label: 'United States' },
  { id: 'eu', label: 'Europe' },
  { id: 'uk', label: 'United Kingdom' },
  { id: 'ca', label: 'Canada' },
  { id: 'au', label: 'Australia' },
  { id: 'latam', label: 'Latin America' },
  { id: 'apac', label: 'Asia Pacific' },
] as const;

export const JOB_TYPES = [
  { id: 'all', label: 'All Types' },
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'internship', label: 'Internship' },
] as const;

export const JOB_SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'remotive', label: 'Remotive' },
  { id: 'arbeitnow', label: 'Arbeitnow' },
  { id: 'jobicy', label: 'Jobicy' },
  { id: 'remoteok', label: 'RemoteOK' },
] as const;

/** Category → accent colors for UI */
export const CATEGORY_STYLE: Record<string, { border: string; badge: string; dot: string }> = {
  'software-dev':     { border: 'border-l-blue-500',    badge: 'bg-blue-50 text-blue-700',    dot: 'bg-blue-500' },
  'devops':           { border: 'border-l-cyan-500',    badge: 'bg-cyan-50 text-cyan-700',    dot: 'bg-cyan-500' },
  'design':           { border: 'border-l-purple-500',  badge: 'bg-purple-50 text-purple-700',dot: 'bg-purple-500' },
  'product':          { border: 'border-l-indigo-500',  badge: 'bg-indigo-50 text-indigo-700',dot: 'bg-indigo-500' },
  'data':             { border: 'border-l-amber-500',   badge: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-500' },
  'marketing':        { border: 'border-l-pink-500',    badge: 'bg-pink-50 text-pink-700',    dot: 'bg-pink-500' },
  'customer-support': { border: 'border-l-green-500',   badge: 'bg-green-50 text-green-700',  dot: 'bg-green-500' },
  'sales':            { border: 'border-l-orange-500',  badge: 'bg-orange-50 text-orange-700',dot: 'bg-orange-500' },
  'writing':          { border: 'border-l-teal-500',    badge: 'bg-teal-50 text-teal-700',    dot: 'bg-teal-500' },
  'finance':          { border: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700',dot:'bg-emerald-500'},
  'hr':               { border: 'border-l-rose-500',    badge: 'bg-rose-50 text-rose-700',    dot: 'bg-rose-500' },
  'other':            { border: 'border-l-gray-300',    badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
};

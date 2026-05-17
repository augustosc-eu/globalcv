'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Briefcase, Trash2, ExternalLink, FileText, ChevronDown,
  Inbox, ChevronRight,
} from 'lucide-react';
import TopNav from '@/components/shared/TopNav';
import { ApplicationEntry, ApplicationStatus } from '@/types/cv.types';
import {
  listApplications,
  updateApplicationStatus,
  updateApplicationNotes,
  deleteApplication,
} from '@/lib/storage/localStorage';
import { SITE_OWNER_NAME, SITE_OWNER_URL } from '@/lib/site';

const COLUMNS: Array<{ id: ApplicationStatus; label: string; color: string; dot: string }> = [
  { id: 'saved',     label: 'Saved',     color: 'bg-gray-100 border-gray-300',   dot: 'bg-gray-400' },
  { id: 'applied',   label: 'Applied',   color: 'bg-blue-50 border-blue-200',    dot: 'bg-blue-500' },
  { id: 'interview', label: 'Interview', color: 'bg-amber-50 border-amber-200',  dot: 'bg-amber-500' },
  { id: 'offer',     label: 'Offer',     color: 'bg-green-50 border-green-200',  dot: 'bg-green-500' },
  { id: 'rejected',  label: 'Rejected',  color: 'bg-red-50 border-red-200',      dot: 'bg-red-400' },
];

export default function ApplicationsPage() {
  const [entries, setEntries] = useState<ApplicationEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(listApplications());
  }, []);

  const refresh = useCallback(() => setEntries(listApplications()), []);

  const handleStatusChange = (id: string, status: ApplicationStatus) => {
    updateApplicationStatus(id, status);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteApplication(id);
    refresh();
  };

  const handleNotes = (id: string, notes: string) => {
    updateApplicationNotes(id, notes);
    refresh();
  };

  const total = entries.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav current="applications" />

      <main className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total === 0 ? 'No saved applications yet.' : `${total} application${total !== 1 ? 's' : ''} tracked`}
            </p>
          </div>
          <Link
            href="/jobs"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Briefcase size={14} />
            Browse jobs
          </Link>
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Inbox size={28} className="text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">No applications tracked yet</p>
              <p className="text-sm text-gray-500 mt-1">Save a job from the jobs board to start tracking.</p>
            </div>
            <Link
              href="/jobs"
              className="mt-2 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Go to jobs board <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {COLUMNS.map((col) => {
              const colEntries = entries.filter((e) => e.status === col.id);
              return (
                <div key={col.id} className="flex flex-col gap-3">
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${col.color}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                    <span className="text-xs font-bold text-gray-700 flex-1">{col.label}</span>
                    <span className="text-xs font-semibold text-gray-400">{colEntries.length}</span>
                  </div>

                  {/* Cards */}
                  {colEntries.map((entry) => (
                    <ApplicationCard
                      key={entry.id}
                      entry={entry}
                      expanded={expandedId === entry.id}
                      onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      onStatusChange={(s) => handleStatusChange(entry.id, s)}
                      onDelete={() => handleDelete(entry.id)}
                      onNotes={(n) => handleNotes(entry.id, n)}
                    />
                  ))}

                  {colEntries.length === 0 && (
                    <div className="flex items-center justify-center py-8 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400">
                      Empty
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mt-16 pb-8 text-center text-xs text-gray-400">
        <a href={SITE_OWNER_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">{SITE_OWNER_NAME}</a>
        {' · '}
        <Link href="/jobs" className="hover:underline">Jobs board</Link>
      </footer>
    </div>
  );
}

interface CardProps {
  entry: ApplicationEntry;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: ApplicationStatus) => void;
  onDelete: () => void;
  onNotes: (notes: string) => void;
}

function ApplicationCard({ entry, expanded, onToggle, onStatusChange, onDelete, onNotes }: CardProps) {
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [logoFailed, setLogoFailed] = useState(false);

  const timeSaved = new Date(entry.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {/* Logo */}
        <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
          {entry.companyLogo && !logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.companyLogo}
              alt={entry.company}
              className="w-full h-full object-contain p-1"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="text-xs font-bold text-gray-500">
              {entry.company.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{entry.jobTitle}</p>
          <p className="text-xs text-gray-500 truncate">{entry.company}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{timeSaved}</p>
        </div>
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-3 space-y-3">
          {/* Status picker */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
            <select
              value={entry.status}
              onChange={(e) => onStatusChange(e.target.value as ApplicationStatus)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onNotes(notes)}
              rows={2}
              placeholder="Recruiter name, interview date…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex gap-2">
              {entry.jobUrl && (
                <a
                  href={entry.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={11} />
                  Listing
                </a>
              )}
              {entry.cvDraftId && entry.market && (
                <Link
                  href={`/${entry.market}`}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
                >
                  <FileText size={11} />
                  CV draft
                </Link>
              )}
            </div>
            <button
              onClick={onDelete}
              className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

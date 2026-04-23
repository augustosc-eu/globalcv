'use client';

import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { useCVStore } from '@/store/cvStore';

import USClassicRenderer from './renderers/USClassicRenderer';
import USModernRenderer from './renderers/USModernRenderer';
import EUEuropassRenderer from './renderers/EUEuropassRenderer';
import EUModernRenderer from './renderers/EUModernRenderer';
import LatamTraditionalRenderer from './renderers/LatamTraditionalRenderer';
import LatamModernRenderer from './renderers/LatamModernRenderer';
import JapanRirekishoRenderer from './renderers/JapanRirekishoRenderer';
import JapanShokumuRenderer from './renderers/JapanShokumuRenderer';

// Rough content-length heuristic: sum weighted units and compare to page budget.
function estimatePages(cv: CVData, config: MarketConfig): number {
  const UNITS_PER_PAGE = config.pageSize === 'A4' ? 52 : 46;
  let units = 6; // header
  if (cv.objective) units += Math.ceil(cv.objective.length / 90) + 1;
  for (const e of cv.workExperience) {
    units += 2 + (e.description ? Math.ceil(e.description.length / 80) : 0);
  }
  units += cv.education.length * 1.5;
  units += Math.ceil(cv.skills.length / 6);
  units += Math.ceil(cv.languages.length / 3);
  units += cv.certifications.length;
  units += cv.references.length * 1.5;
  return Math.max(1, Math.ceil(units / UNITS_PER_PAGE));
}

interface Props {
  cv: CVData;
  config: MarketConfig;
}

const renderers: Record<string, React.ComponentType<{ cv: CVData; config: MarketConfig }>> = {
  'us-classic': USClassicRenderer,
  'us-modern': USModernRenderer,
  'eu-europass': EUEuropassRenderer,
  'eu-modern': EUModernRenderer,
  'latam-traditional': LatamTraditionalRenderer,
  'latam-modern': LatamModernRenderer,
  'jp-rirekisho': JapanRirekishoRenderer,
  'jp-shokumu': JapanShokumuRenderer,
  // GB — no photo, clean two-column layout
  'gb-classic': USClassicRenderer,
  'gb-modern': USModernRenderer,
  // AU — same clean layout as US/GB
  'au-classic': USClassicRenderer,
  'au-modern': USModernRenderer,
  // IN — photo-optional, uses LATAM renderers which support photo in sidebar
  'in-classic': LatamTraditionalRenderer,
  'in-modern': LatamModernRenderer,
  // BR — photo-optional, LATAM-style renderers
  'br-classic': LatamTraditionalRenderer,
  'br-modern': LatamModernRenderer,
};

const DEFAULT_ZOOM = 0.85;
const STEP = 0.1;
const MIN = 0.4;
const MAX = 1.5;
const DEFAULT_PAGE_WIDTH = 360;
const MIN_PAGE_WIDTH = 280;
const MAX_PAGE_WIDTH = 560;
const PREVIEW_PADDING = 32;

export default function PreviewPane({ cv, config }: Props) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_WIDTH);
  const { setTemplate } = useCVStore();
  const previewBodyRef = useRef<HTMLDivElement>(null);
  const Renderer = renderers[cv.templateId] ?? USClassicRenderer;

  const estimatedPages = estimatePages(cv, config);
  const pageLimit = config.pageLimitSuggestion;
  const overLimit = pageLimit != null && estimatedPages > pageLimit;

  useEffect(() => {
    const node = previewBodyRef.current;
    if (!node) return;

    const updateWidth = () => {
      const nextWidth = node.clientWidth - PREVIEW_PADDING;
      setPageWidth(Math.max(MIN_PAGE_WIDTH, Math.min(MAX_PAGE_WIDTH, nextWidth)));
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</span>
            <select
              value={cv.templateId}
              onChange={(event) => setTemplate(event.target.value)}
              className="min-w-0 max-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Select preview template"
            >
              {config.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          {overLimit && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700 font-medium">
              <AlertTriangle size={11} />
              ~{estimatedPages}p · limit {pageLimit}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400 min-w-0 truncate">
            {config.pageSize} · {config.templates.find((t) => t.id === cv.templateId)?.name}
          </span>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(MIN, +(z - STEP).toFixed(2)))}
                disabled={zoom <= MIN}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={14} className="text-gray-500" />
              </button>
              <button
                onClick={() => setZoom(DEFAULT_ZOOM)}
                className="text-xs text-gray-400 hover:text-gray-700 w-10 text-center tabular-nums transition-colors"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(MAX, +(z + STEP).toFixed(2)))}
                disabled={zoom >= MAX}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={14} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={previewBodyRef} className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="min-h-full flex justify-center">
          <div
            className="bg-white shadow-lg origin-top"
            style={{
              width: `${pageWidth}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              marginBottom: `${Math.max(0, zoom - 1) * pageWidth * 1.4}px`,
            }}
          >
            <Renderer cv={cv} config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}

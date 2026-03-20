'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import USClassicRenderer from './renderers/USClassicRenderer';
import USModernRenderer from './renderers/USModernRenderer';
import EUEuropassRenderer from './renderers/EUEuropassRenderer';
import EUModernRenderer from './renderers/EUModernRenderer';
import LatamTraditionalRenderer from './renderers/LatamTraditionalRenderer';
import LatamModernRenderer from './renderers/LatamModernRenderer';
import JapanRirekishoRenderer from './renderers/JapanRirekishoRenderer';

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
  'jp-shokumu': JapanRirekishoRenderer,
};

const DEFAULT_ZOOM = 0.85;
const STEP = 0.1;
const MIN = 0.4;
const MAX = 1.5;

export default function PreviewPane({ cv, config }: Props) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const Renderer = renderers[cv.templateId] ?? USClassicRenderer;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</span>

        <div className="flex items-center gap-2">
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
          <span className="text-xs text-gray-300">|</span>
          <span className="text-xs text-gray-400">
            {config.pageSize} · {config.templates.find((t) => t.id === cv.templateId)?.name}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div
          className="bg-white shadow-lg mx-auto origin-top"
          style={{
            width: '360px',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            marginBottom: `${(zoom - 1) * 360 * 1.4}px`,
          }}
        >
          <Renderer cv={cv} config={config} />
        </div>
      </div>
    </div>
  );
}

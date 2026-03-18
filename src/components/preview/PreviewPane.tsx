'use client';

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

export default function PreviewPane({ cv, config }: Props) {
  const Renderer = renderers[cv.templateId] ?? USClassicRenderer;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</span>
        <span className="text-xs text-gray-400">
          {config.pageSize} · {config.templates.find((t) => t.id === cv.templateId)?.name}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
        <div
          className="bg-white shadow-lg mx-auto origin-top"
          style={{
            width: '100%',
            maxWidth: '360px',
            transform: 'scale(0.85)',
            transformOrigin: 'top center',
          }}
        >
          <Renderer cv={cv} config={config} />
        </div>
      </div>
    </div>
  );
}

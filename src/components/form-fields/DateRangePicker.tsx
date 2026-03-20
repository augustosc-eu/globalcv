'use client';

interface Props {
  startDate: string;
  endDate?: string;
  isPresent: boolean;
  onChange: (start: string, end: string | undefined, isPresent: boolean) => void;
  startLabel?: string;
  endLabel?: string;
  presentLabel?: string;
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';
const inputErr = 'w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition';

export default function DateRangePicker({
  startDate,
  endDate,
  isPresent,
  onChange,
  startLabel = 'Start Date',
  endLabel = 'End Date',
  presentLabel = 'Currently working here',
}: Props) {
  const dateError =
    !isPresent && startDate && endDate && endDate < startDate
      ? 'End date must be after start date'
      : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{startLabel}</label>
          <input
            type="month"
            value={startDate}
            onChange={(e) => onChange(e.target.value, endDate, isPresent)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{endLabel}</label>
          <input
            type="month"
            value={isPresent ? '' : (endDate ?? '')}
            onChange={(e) => onChange(startDate, e.target.value, false)}
            disabled={isPresent}
            className={`${dateError ? inputErr : inputCls} disabled:bg-gray-50 disabled:text-gray-400`}
          />
        </div>
      </div>

      {dateError && <p className="text-xs text-red-500">{dateError}</p>}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPresent}
          onChange={(e) => onChange(startDate, undefined, e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-600">{presentLabel}</span>
      </label>
    </div>
  );
}

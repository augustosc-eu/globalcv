interface Props {
  title: string;
  description?: string;
}

export default function StepHeader({ title, description }: Props) {
  return (
    <div className="mb-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
        Wizard Step
      </div>
      <h2 className="text-2xl md:text-[28px] font-bold tracking-tight text-slate-900">{title}</h2>
      {description && <p className="text-slate-600 mt-2 text-sm md:text-[15px]">{description}</p>}
    </div>
  );
}

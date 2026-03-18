interface Props {
  title: string;
  description?: string;
}

export default function StepHeader({ title, description }: Props) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {description && <p className="text-gray-500 mt-1 text-sm">{description}</p>}
    </div>
  );
}

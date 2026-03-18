'use client';

import { useRef } from 'react';
import { Camera, X } from 'lucide-react';

interface Props {
  value?: string;
  onChange: (base64: string | undefined) => void;
  aspectRatio?: number; // width/height, e.g. 0.75 for 3x4
}

export default function PhotoUpload({ value, onChange, aspectRatio = 1 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const width = 96;
  const height = Math.round(width / aspectRatio);

  return (
    <div className="flex items-start gap-4">
      <div
        className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
        style={{ width, height }}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <Camera size={24} className="text-gray-400" />
        )}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {value ? 'Change photo' : 'Upload photo'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
          >
            <X size={12} /> Remove
          </button>
        )}
        <p className="text-xs text-gray-400">
          JPG or PNG · Max 5MB
          {aspectRatio !== 1 && ` · ${Math.round(aspectRatio * 40)}×40mm`}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

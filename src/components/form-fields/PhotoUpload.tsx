'use client';

import { useRef, useState } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';

interface Props {
  value?: string;
  onChange: (base64: string | undefined) => void;
  aspectRatio?: number; // width/height, e.g. 0.75 for 3x4
}

const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8MB — reject before even trying
const TARGET_MAX_PX = 800;             // longest side after resize
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > TARGET_MAX_PX || height > TARGET_MAX_PX) {
        if (width >= height) {
          height = Math.round((height * TARGET_MAX_PX) / width);
          width = TARGET_MAX_PX;
        } else {
          width = Math.round((width * TARGET_MAX_PX) / height);
          height = TARGET_MAX_PX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export default function PhotoUpload({ value, onChange, aspectRatio = 1 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPG or PNG file.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('Image is too large. Please use a file under 8MB.');
      return;
    }
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch {
      setError('Could not process image. Please try a different file.');
    }
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
            onClick={() => { onChange(undefined); setError(null); }}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
          >
            <X size={12} /> Remove
          </button>
        )}
        {error ? (
          <p className="flex items-start gap-1 text-xs text-red-500">
            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />{error}
          </p>
        ) : (
          <p className="text-xs text-gray-400">
            JPG or PNG · max 8MB · auto-compressed
            {aspectRatio !== 1 && ` · ${Math.round(aspectRatio * 40)}×40mm`}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

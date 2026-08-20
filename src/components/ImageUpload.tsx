import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { imageService } from '@/services';

interface ImageUploadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  shape?: 'circle' | 'square';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export function ImageUpload({ value, onChange, label, shape = 'square', size = 'md' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await imageService.upload(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen.');
    } finally {
      setLoading(false);
    }
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-4">
        <div
          className={`${sizeClasses[size]} ${shapeClass} relative flex items-center justify-center overflow-hidden border-2 border-neutral-200 bg-neutral-50`}
        >
          {value ? (
            <>
              <img src={value} alt="preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute right-0 top-0 rounded-bl-lg bg-neutral-900/60 p-1 text-white hover:bg-neutral-900"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <ImageIcon size={24} className="text-neutral-300" />
          )}
        </div>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            <Upload size={14} />
            {loading ? 'Subiendo...' : value ? 'Reemplazar' : 'Subir imagen'}
          </button>
          {error && <p className="text-xs text-error-600">{error}</p>}
          <p className="text-xs text-neutral-400">JPG, PNG, WebP. Máx 2MB.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

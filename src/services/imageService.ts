import { supabase } from '@/lib/supabaseClient';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato no soportado. Usa JPG, PNG, WebP o GIF.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'La imagen supera los 2MB.',
    };
  }

  return { valid: true };
}

async function dataUrlToFile(
  dataUrl: string,
  fileName = 'image',
): Promise<File> {
  const response = await fetch(dataUrl);

  if (!response.ok) {
    throw new Error('No se pudo preparar la imagen para subirla.');
  }

  const blob = await response.blob();
  const type = blob.type || 'image/png';
  const extension =
    type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';

  return new File(
    [blob],
    `${fileName}.${extension}`,
    { type },
  );
}

function createStoragePath(
  prefix: string,
  file: File,
): string {
  const extension =
    file.name.split('.').pop()?.toLowerCase() || 'png';
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}/${randomPart}.${extension}`;
}

async function uploadFile(
  file: File,
  bucket: 'avatars' | 'team-logos',
  prefix: string,
): Promise<string> {
  const validation = validateFile(file);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const path = createStoragePath(prefix, file);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

async function upload(file: File): Promise<string> {
  return uploadFile(file, 'avatars', 'profiles');
}

async function uploadDataUrl(
  dataUrl: string,
  bucket: 'avatars' | 'team-logos',
  prefix: string,
  fileName = 'image',
): Promise<string> {
  if (!dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  const file = await dataUrlToFile(dataUrl, fileName);
  return uploadFile(file, bucket, prefix);
}

export const imageService = {
  upload,
  uploadDataUrl,
  validateFile,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
};

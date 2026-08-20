const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato no soportado. Usa JPG, PNG, WebP o GIF.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'La imagen supera los 2MB.' };
  }
  return { valid: true };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

async function upload(file: File): Promise<string> {
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);
  return fileToDataUrl(file);
}

export const imageService = {
  upload,
  validateFile,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
};

import { SupabaseClient } from '@supabase/supabase-js';
import type { GeoLocation } from '../types';

// ============== CONFIG ==============
export const PHOTO_CONFIG = {
  MAX_WIDTH: 1600,
  MAX_HEIGHT: 1200,
  QUALITY: 0.75,
  MAX_FILE_SIZE: 500000, // 500KB
  WATERMARK_ENABLED: true,
  SUPABASE_BUCKET: 'rapport-photos',
  UPLOAD_RETRIES: 3,
  RETRY_DELAYS: [1000, 2000, 4000]
};

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  addWatermark?: boolean;
  watermarkText?: string | null;
}

// ============== SLEEP UTILITY ==============
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// ============== COMPRESSION ==============
export const compressImage = async (file: File, options: CompressionOptions = {}): Promise<CompressedImage> => {
  const config = PHOTO_CONFIG;
  const {
    maxWidth = config.MAX_WIDTH,
    maxHeight = config.MAX_HEIGHT,
    quality = config.QUALITY,
    addWatermark = config.WATERMARK_ENABLED,
    watermarkText = null
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context failed'));
            return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        if (addWatermark && watermarkText) {
          const barHeight = 28;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.fillRect(0, height - barHeight, width, barHeight);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 13px Inter, Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(watermarkText, 8, height - barHeight / 2);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }

            if (blob.size > config.MAX_FILE_SIZE && quality > 0.5) {
              canvas.toBlob(
                (smallerBlob) => {
                  resolve({
                    blob: smallerBlob || blob,
                    width,
                    height,
                    originalSize: file.size,
                    compressedSize: (smallerBlob || blob).size,
                    compressionRatio: Number(((1 - (smallerBlob || blob).size / file.size) * 100).toFixed(1))
                  });
                },
                'image/jpeg',
                quality - 0.2
              );
            } else {
              resolve({
                blob,
                width,
                height,
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: Number(((1 - blob.size / file.size) * 100).toFixed(1))
              });
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
};

// ============== SUPABASE UPLOAD WITH RETRY ==============
export const uploadPhotoToStorage = async (
    supabase: SupabaseClient,
    blob: Blob,
    filename: string,
    category: string,
    projectId: string
): Promise<{ path?: string; url?: string; success: boolean; error?: string }> => {
  const config = PHOTO_CONFIG;
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${projectId}/${category}/${timestamp}_${safeName}.jpg`;

  let lastError = '';

  for (let attempt = 0; attempt < config.UPLOAD_RETRIES; attempt++) {
    try {
      const { error } = await supabase.storage
        .from(config.SUPABASE_BUCKET)
        .upload(path, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(config.SUPABASE_BUCKET)
        .getPublicUrl(path);

      console.log(`[Photo] Upload reussi (tentative ${attempt + 1}):`, path);
      return { path, url: urlData.publicUrl, success: true };

    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[Photo] Upload tentative ${attempt + 1}/${config.UPLOAD_RETRIES} echouee:`, lastError);

      if (attempt < config.UPLOAD_RETRIES - 1) {
        await sleep(config.RETRY_DELAYS[attempt]);
      }
    }
  }

  console.error('[Photo] Storage upload echoue apres', config.UPLOAD_RETRIES, 'tentatives:', lastError);
  return { success: false, error: lastError };
};

// ============== BLOB TO BASE64 ==============
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ============== PROCESS PHOTO (Main function) ==============
export const processPhoto = async (
    file: File,
    geo: GeoLocation | null,
    category: string,
    projectId: string,
    supabase: SupabaseClient
) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-CA');
  const timeStr = now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  let watermarkText = `DR Electrique | ${dateStr} ${timeStr}`;

  if (geo && geo.enabled && geo.latitude && geo.longitude) {
    watermarkText += ` | GPS ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`;
  }

  const compressed = await compressImage(file, {
    addWatermark: true,
    watermarkText
  });

  console.log(`[Photo] Compresse: ${(compressed.originalSize/1024).toFixed(0)}KB -> ${(compressed.compressedSize/1024).toFixed(0)}KB (-${compressed.compressionRatio}%)`);

  const base64Preview = await blobToBase64(compressed.blob);

  let storageUrl: string | null = null;
  let storagePath: string | null = null;

  if (supabase && projectId) {
    try {
      const uploadResult = await uploadPhotoToStorage(
        supabase,
        compressed.blob,
        file.name,
        category,
        projectId
      );

      if (uploadResult.success && uploadResult.url) {
        storageUrl = uploadResult.url;
        storagePath = uploadResult.path || null;
        console.log('[Photo] Uploaded to storage:', storagePath);
      } else {
        console.warn('[Photo] Storage upload failed, keeping local preview:', uploadResult.error);
      }
    } catch (err: unknown) {
      console.warn('[Photo] Storage upload error, keeping local preview:', err instanceof Error ? err.message : err);
    }
  }

  return {
    data: base64Preview,
    preview: base64Preview,
    blob: compressed.blob,
    storagePath,
    storageUrl,
    metadata: {
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      compressionRatio: compressed.compressionRatio,
      width: compressed.width,
      height: compressed.height
    }
  };
};

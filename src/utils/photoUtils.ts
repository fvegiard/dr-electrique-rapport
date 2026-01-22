import { SupabaseClient } from '@supabase/supabase-js';

// ============== CONFIG ==============
export const PHOTO_CONFIG = {
  MAX_WIDTH: 1600,
  MAX_HEIGHT: 1200,
  QUALITY: 0.75,
  MAX_FILE_SIZE: 500000, // 500KB
  WATERMARK_ENABLED: true,
  SUPABASE_BUCKET: 'rapport-photos'
};

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  addWatermark?: boolean;
  watermarkText?: string | null;
}

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
        // Calculate dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            reject(new Error('Canvas context failed'));
            return;
        }

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Add watermark
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
        
        // Compress
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            
            // If still too big, compress more
            if (blob.size > config.MAX_FILE_SIZE && quality > 0.5) {
              canvas.toBlob(
                (smallerBlob) => {
                  resolve({
                    blob: smallerBlob || blob,
                    width,
                    height,
                    originalSize: file.size,
                    compressedSize: (smallerBlob || blob).size,
                    compressionRatio: Number(((1 - (smallerBlob || blob).size / file.size) * 100).toFixed(1)
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
                compressionRatio: Number(((1 - blob.size / file.size) * 100).toFixed(1)
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

// ============== SUPABASE UPLOAD ==============
export const uploadPhotoToStorage = async (
    supabase: SupabaseClient, 
    blob: Blob, 
    filename: string, 
    category: string, 
    projectId: string
) => {
  const config = PHOTO_CONFIG;
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${projectId}/${category}/${timestamp}_${safeName}.jpg`;
  
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
    
    return { path, url: urlData.publicUrl, success: true };
  } catch (err: any) {
    console.error('[Photo] Storage upload failed:', err);
    return { success: false, error: err.message };
  }
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
    geo: any, 
    category: string, 
    projectId: string, 
    supabase: SupabaseClient
) => {
  // Build watermark text
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-CA');
  const timeStr = now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  let watermarkText = `DR Électrique | ${dateStr} ${timeStr}`;
  
  if (geo && geo.enabled && geo.latitude) {
    watermarkText += ` | 📍 ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`;
  }
  
  // Compress
  const compressed = await compressImage(file, {
    addWatermark: true,
    watermarkText
  });
  
  console.log(`[Photo] Compressé: ${(compressed.originalSize/1024).toFixed(0)}KB → ${(compressed.compressedSize/1024).toFixed(0)}KB (-${compressed.compressionRatio}%)`);
  
  // Try upload to storage
  let storageUrl = null;
  let storagePath = null;
  
  if (supabase && projectId) {
    const uploadResult = await uploadPhotoToStorage(
      supabase,
      compressed.blob,
      file.name,
      category,
      projectId
    );
    
    if (uploadResult.success) {
      storageUrl = uploadResult.url;
      storagePath = uploadResult.path;
      console.log('[Photo] Uploaded to storage:', storagePath);
    }
  }
  
  // Get base64 for preview
  const base64Preview = await blobToBase64(compressed.blob);
  
  return {
    data: storageUrl || base64Preview,
    preview: base64Preview,
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

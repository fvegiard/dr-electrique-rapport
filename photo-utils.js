/**
 * photo-utils.js - Utilitaires photo pour DR Électrique Rapport
 * CORRECTIONS APPLIQUÉES:
 * 1. Compression avant upload (1600x1200 max, quality 0.75)
 * 2. Watermark automatique avec date/heure/GPS
 * 3. Upload vers Supabase Storage
 * 4. Fallback base64 compressé si storage échoue
 */

// ============== CONFIG ==============
window.PHOTO_CONFIG = {
  MAX_WIDTH: 1600,
  MAX_HEIGHT: 1200,
  QUALITY: 0.75,
  MAX_FILE_SIZE: 500000, // 500KB
  WATERMARK_ENABLED: true,
  SUPABASE_BUCKET: 'rapport-photos'
};

// ============== COMPRESSION ==============
window.compressImage = async function(file, options = {}) {
  const config = window.PHOTO_CONFIG;
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
                    compressionRatio: ((1 - (smallerBlob || blob).size / file.size) * 100).toFixed(1)
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
                compressionRatio: ((1 - blob.size / file.size) * 100).toFixed(1)
              });
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = event.target.result;
    };
    
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
};

// ============== SUPABASE UPLOAD ==============
window.uploadPhotoToStorage = async function(supabase, blob, filename, category, projectId) {
  const config = window.PHOTO_CONFIG;
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${projectId}/${category}/${timestamp}_${safeName}.jpg`;
  
  try {
    const { data, error } = await supabase.storage
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
  } catch (err) {
    console.error('[Photo] Storage upload failed:', err);
    return { success: false, error: err.message };
  }
};

// ============== BLOB TO BASE64 ==============
window.blobToBase64 = function(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ============== PROCESS PHOTO (Main function) ==============
window.processPhoto = async function(file, geo, category, projectId, supabase) {
  const config = window.PHOTO_CONFIG;
  
  // Build watermark text
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-CA');
  const timeStr = now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  let watermarkText = `DR Électrique | ${dateStr} ${timeStr}`;
  
  if (geo && geo.enabled && geo.latitude) {
    watermarkText += ` | 📍 ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`;
  }
  
  // Compress
  const compressed = await window.compressImage(file, {
    addWatermark: true,
    watermarkText
  });
  
  console.log(`[Photo] Compressé: ${(compressed.originalSize/1024).toFixed(0)}KB → ${(compressed.compressedSize/1024).toFixed(0)}KB (-${compressed.compressionRatio}%)`);
  
  // Try upload to storage
  let storageUrl = null;
  let storagePath = null;
  
  if (supabase && projectId) {
    const uploadResult = await window.uploadPhotoToStorage(
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
  const base64Preview = await window.blobToBase64(compressed.blob);
  
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

console.log('[Photo Utils] Loaded - Compression enabled');

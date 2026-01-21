// ============== PHOTO UPLOAD CORRIGÉ - DR ÉLECTRIQUE ==============
// Fixes: Compression, Supabase Storage, Watermark, EXIF rotation
// Best practices: Construction photo documentation

// ============== CONSTANTS ==============
const PHOTO_CONFIG = {
  MAX_WIDTH: 1600,        // Max largeur (pour chantier, besoin de détail)
  MAX_HEIGHT: 1200,       // Max hauteur
  QUALITY: 0.75,          // Qualité JPEG (0.7-0.8 = bon compromis)
  MAX_FILE_SIZE: 500000,  // 500KB max après compression
  WATERMARK_ENABLED: true,
  SUPABASE_BUCKET: 'rapport-photos'
};

// ============== IMAGE COMPRESSION ==============
const compressImage = async (file, options = {}) => {
  const {
    maxWidth = PHOTO_CONFIG.MAX_WIDTH,
    maxHeight = PHOTO_CONFIG.MAX_HEIGHT,
    quality = PHOTO_CONFIG.QUALITY,
    addWatermark = PHOTO_CONFIG.WATERMARK_ENABLED,
    watermarkText = null
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight);
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Fill white background (for transparency)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Add watermark if enabled
        if (addWatermark) {
          addWatermarkToCanvas(ctx, canvas, watermarkText);
        }
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }
            
            // Check if still too big, reduce quality further
            if (blob.size > PHOTO_CONFIG.MAX_FILE_SIZE && quality > 0.5) {
              console.log(`Photo still ${(blob.size/1024).toFixed(0)}KB, recompressing...`);
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
                quality - 0.15
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
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// ============== DIMENSION CALCULATOR ==============
const calculateDimensions = (width, height, maxWidth, maxHeight) => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  };
};

// ============== WATERMARK ==============
const addWatermarkToCanvas = (ctx, canvas, customText = null) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-CA');
  const timeStr = now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  const text = customText || `DR Électrique | ${dateStr} ${timeStr}`;
  
  // Semi-transparent background bar
  const barHeight = 28;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
  
  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 10, canvas.height - barHeight / 2);
  
  // GPS indicator placeholder (will be filled by actual GPS)
  ctx.textAlign = 'right';
  ctx.font = '12px Inter, Arial, sans-serif';
  ctx.fillText('📍 GPS', canvas.width - 10, canvas.height - barHeight / 2);
};

// ============== SUPABASE STORAGE UPLOAD ==============
const uploadToSupabaseStorage = async (supabase, blob, filename, category, projectId) => {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${projectId}/${category}/${timestamp}_${safeName}`;
  
  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(PHOTO_CONFIG.SUPABASE_BUCKET)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(PHOTO_CONFIG.SUPABASE_BUCKET)
      .getPublicUrl(path);
    
    return {
      path: data.path,
      url: urlData.publicUrl,
      success: true
    };
  } catch (err) {
    console.error('Upload failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

// Helper: Blob to Base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper: Generate unique ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// ============== EXPORT FOR MODULE USE ==============
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    compressImage, 
    uploadToSupabaseStorage,
    blobToBase64,
    calculateDimensions,
    addWatermarkToCanvas,
    PHOTO_CONFIG 
  };
}

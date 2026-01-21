/**
 * DR Électrique - Photo Upload Fix
 *
 * This file contains the complete implementation for uploading photos
 * to Supabase Storage. Copy these functions into index.html to enable
 * photo persistence.
 *
 * Integration Instructions:
 * 1. Add these functions before submitRapport() in index.html
 * 2. Modify submitRapport() to call uploadAllPhotos() after insert
 * 3. Create the 'photos' table and storage bucket in Supabase
 *
 * @author Claude Code
 * @date 2026-01-20
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert base64 data URL to Uint8Array for Supabase upload
 * @param {string} base64 - Data URL (data:image/jpeg;base64,...)
 * @returns {Uint8Array} - Binary data
 */
function base64ToUint8Array(base64) {
    // Extract the base64 data after the comma
    const base64Data = base64.split(',')[1];
    if (!base64Data) {
        throw new Error('Invalid base64 data URL');
    }

    // Decode base64 to binary string
    const binaryString = atob(base64Data);

    // Convert to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
}

/**
 * Get MIME type from base64 data URL
 * @param {string} base64 - Data URL
 * @returns {string} - MIME type (e.g., 'image/jpeg')
 */
function getMimeType(base64) {
    const match = base64.match(/data:([^;]+);/);
    return match ? match[1] : 'image/jpeg';
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} - File extension
 */
function getExtension(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/heic': 'heic',
        'image/heif': 'heif'
    };
    return extensions[mimeType] || 'jpg';
}

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Upload a single photo to Supabase Storage
 * @param {Object} photo - Photo object with data, geolocation, timestamp
 * @param {string} rapportId - UUID of the rapport
 * @param {string} category - Photo category (GENERAL, AVANT, APRES, PROBLEMES)
 * @param {Object} supabase - Supabase client instance
 * @returns {Object|null} - Photo metadata for database, or null on failure
 */
async function uploadPhotoToStorage(photo, rapportId, category, supabase) {
    try {
        // Validate photo data
        if (!photo?.data || !photo.data.startsWith('data:')) {
            console.warn('Invalid photo data, skipping:', photo?.id);
            return null;
        }

        // Convert base64 to binary
        const bytes = base64ToUint8Array(photo.data);
        const mimeType = getMimeType(photo.data);
        const extension = getExtension(mimeType);

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${rapportId}/${category}/${photo.id || `photo_${timestamp}`}.${extension}`;

        console.log(`Uploading: ${fileName} (${(bytes.length / 1024).toFixed(1)} KB)`);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('photos')
            .upload(fileName, bytes, {
                contentType: mimeType,
                cacheControl: '31536000', // 1 year cache
                upsert: false // Don't overwrite existing
            });

        if (error) {
            // If file exists, try with a unique suffix
            if (error.message?.includes('already exists')) {
                const uniqueFileName = `${rapportId}/${category}/${photo.id}_${timestamp}.${extension}`;
                const { data: retryData, error: retryError } = await supabase.storage
                    .from('photos')
                    .upload(uniqueFileName, bytes, {
                        contentType: mimeType,
                        cacheControl: '31536000'
                    });

                if (retryError) {
                    console.error(`Upload retry failed for ${uniqueFileName}:`, retryError);
                    return null;
                }
            } else {
                console.error(`Upload failed for ${fileName}:`, error);
                return null;
            }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName);

        // Return metadata for database insert
        return {
            rapport_id: rapportId,
            category: category,
            url: urlData.publicUrl,
            geolocation: photo.geolocation || null,
            timestamp: photo.timestamp || new Date().toISOString()
        };

    } catch (err) {
        console.error('Photo upload error:', err);
        return null;
    }
}

/**
 * Upload multiple photos for a category
 * @param {Array} photos - Array of photo objects
 * @param {string} rapportId - UUID of the rapport
 * @param {string} category - Photo category
 * @param {Object} supabase - Supabase client instance
 * @returns {Array} - Array of successfully uploaded photo metadata
 */
async function uploadPhotosForCategory(photos, rapportId, category, supabase) {
    const uploaded = [];

    // Handle null/undefined photos array
    const photoArray = photos || [];

    for (const photo of photoArray) {
        const result = await uploadPhotoToStorage(photo, rapportId, category, supabase);
        if (result) {
            uploaded.push(result);
        }
    }

    return uploaded;
}

/**
 * Upload all photos from a rapport to Supabase Storage
 * Call this after the rapport is inserted into the database
 *
 * @param {Object} rapport - The rapport object with photo arrays
 * @param {string} rapportId - UUID of the inserted rapport
 * @param {Object} supabase - Supabase client instance
 * @returns {Object} - { success: boolean, uploaded: number, failed: number }
 */
async function uploadAllPhotos(rapport, rapportId, supabase) {
    console.log('Starting photo upload for rapport:', rapportId);

    const categories = [
        { key: 'photosGenerales', name: 'GENERAL' },
        { key: 'photosAvant', name: 'AVANT' },
        { key: 'photosApres', name: 'APRES' },
        { key: 'photosProblemes', name: 'PROBLEMES' }
    ];

    let allUploaded = [];
    let totalAttempted = 0;

    // Upload each category
    for (const cat of categories) {
        const photos = rapport[cat.key] || [];
        totalAttempted += photos.length;

        if (photos.length > 0) {
            console.log(`Uploading ${photos.length} ${cat.name} photos...`);
            const uploaded = await uploadPhotosForCategory(photos, rapportId, cat.name, supabase);
            allUploaded = [...allUploaded, ...uploaded];
        }
    }

    // Insert photo metadata into database
    if (allUploaded.length > 0) {
        const { error: photoError } = await supabase
            .from('photos')
            .insert(allUploaded);

        if (photoError) {
            console.error('Failed to save photo records to database:', photoError);
            return {
                success: false,
                uploaded: 0,
                failed: totalAttempted,
                error: photoError.message
            };
        }

        console.log(`✅ Successfully uploaded ${allUploaded.length}/${totalAttempted} photos`);
    }

    return {
        success: true,
        uploaded: allUploaded.length,
        failed: totalAttempted - allUploaded.length
    };
}

// ============================================
// INTEGRATION CODE FOR submitRapport()
// ============================================

/**
 * Add this code INSIDE submitRapport() after the rapport is inserted:
 *
 * // After: const { data, error } = await supabase.from('rapports').insert([rapportData]).select();
 *
 * if (data && data[0]) {
 *     const rapportId = data[0].id;
 *
 *     // Upload photos to storage
 *     const photoResult = await uploadAllPhotos(rapport, rapportId, supabase);
 *
 *     if (!photoResult.success) {
 *         console.warn('Some photos failed to upload:', photoResult.error);
 *         // Continue anyway - rapport was saved, photos are a bonus
 *     }
 *
 *     if (photoResult.uploaded > 0) {
 *         setStatusMessage(`Rapport soumis avec ${photoResult.uploaded} photos`);
 *     }
 * }
 */

// ============================================
// PHOTO DELETION FUNCTIONS
// ============================================

/**
 * Delete a photo from Supabase Storage
 * @param {string} photoUrl - Public URL of the photo
 * @param {Object} supabase - Supabase client instance
 * @returns {boolean} - Success status
 */
async function deletePhotoFromStorage(photoUrl, supabase) {
    try {
        // Extract file path from URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/photos/path/to/file.jpg
        const urlParts = photoUrl.split('/storage/v1/object/public/photos/');
        if (urlParts.length !== 2) {
            console.error('Invalid photo URL format:', photoUrl);
            return false;
        }

        const filePath = urlParts[1];

        const { error } = await supabase.storage
            .from('photos')
            .remove([filePath]);

        if (error) {
            console.error('Failed to delete photo from storage:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Photo deletion error:', err);
        return false;
    }
}

/**
 * Delete a photo record and its storage file
 * @param {string} photoId - UUID of the photo record
 * @param {Object} supabase - Supabase client instance
 * @returns {boolean} - Success status
 */
async function deletePhoto(photoId, supabase) {
    try {
        // Get photo record to find URL
        const { data: photo, error: fetchError } = await supabase
            .from('photos')
            .select('url')
            .eq('id', photoId)
            .single();

        if (fetchError || !photo) {
            console.error('Photo not found:', photoId);
            return false;
        }

        // Delete from storage
        await deletePhotoFromStorage(photo.url, supabase);

        // Delete database record
        const { error: deleteError } = await supabase
            .from('photos')
            .delete()
            .eq('id', photoId);

        if (deleteError) {
            console.error('Failed to delete photo record:', deleteError);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Photo deletion error:', err);
        return false;
    }
}

// ============================================
// PHOTO RETRIEVAL FUNCTIONS (for Dashboard)
// ============================================

/**
 * Fetch all photos for a rapport
 * @param {string} rapportId - UUID of the rapport
 * @param {Object} supabase - Supabase client instance
 * @returns {Array} - Array of photo objects grouped by category
 */
async function getPhotosForRapport(rapportId, supabase) {
    const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('rapport_id', rapportId)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error('Failed to fetch photos:', error);
        return { GENERAL: [], AVANT: [], APRES: [], PROBLEMES: [] };
    }

    // Group by category
    const grouped = {
        GENERAL: [],
        AVANT: [],
        APRES: [],
        PROBLEMES: []
    };

    (data || []).forEach(photo => {
        if (grouped[photo.category]) {
            grouped[photo.category].push(photo);
        }
    });

    return grouped;
}

// ============================================
// EXPORTS (for testing/module usage)
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        base64ToUint8Array,
        getMimeType,
        getExtension,
        uploadPhotoToStorage,
        uploadPhotosForCategory,
        uploadAllPhotos,
        deletePhotoFromStorage,
        deletePhoto,
        getPhotosForRapport
    };
}

// ============================================
// BROWSER GLOBAL (for debugging)
// ============================================

if (typeof window !== 'undefined') {
    window.photoUtils = {
        uploadAllPhotos,
        deletePhoto,
        getPhotosForRapport
    };
    console.log('Photo utils loaded. Access via window.photoUtils');
}

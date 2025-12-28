/**
 * Storage and Image Upload Validation Utilities
 *
 * Provides server-side validation for file uploads including:
 * - File type validation (MIME type and extension)
 * - File size validation
 * - Image dimension validation
 * - Secure file naming
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Allowed file extensions
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// File size limits (in bytes)
const MAX_HERO_IMAGE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024; // 10MB default
const MAX_LOGO_SIZE = parseInt(process.env.MAX_LOGO_SIZE_MB || '2') * 1024 * 1024; // 2MB default

// Storage bucket name from environment
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'allfile';

// Image dimension constraints
const HERO_IMAGE_MIN_WIDTH = 800;
const HERO_IMAGE_MIN_HEIGHT = 600;
const LOGO_MIN_WIDTH = 100;
const LOGO_MIN_HEIGHT = 100;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ImageMetadata {
  size: number;
  type: string;
  width?: number;
  height?: number;
}

/**
 * Validates file type by checking MIME type and extension
 */
export function validateFileType(
  filename: string,
  mimeType: string
): ValidationResult {
  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Check file extension
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates file size based on image type
 */
export function validateFileSize(
  size: number,
  imageType: 'hero' | 'logo'
): ValidationResult {
  const maxSize = imageType === 'hero' ? MAX_HERO_IMAGE_SIZE : MAX_LOGO_SIZE;
  const maxSizeMB = maxSize / 1024 / 1024;

  if (size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  if (size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return { valid: true };
}

/**
 * Validates image dimensions
 */
export function validateImageDimensions(
  width: number,
  height: number,
  imageType: 'hero' | 'logo'
): ValidationResult {
  const minWidth = imageType === 'hero' ? HERO_IMAGE_MIN_WIDTH : LOGO_MIN_WIDTH;
  const minHeight = imageType === 'hero' ? HERO_IMAGE_MIN_HEIGHT : LOGO_MIN_HEIGHT;

  if (width < minWidth || height < minHeight) {
    return {
      valid: false,
      error: `Image dimensions too small. Minimum: ${minWidth}x${minHeight}px`,
    };
  }

  return { valid: true };
}

/**
 * Generates a secure, random filename
 */
export function generateSecureFilename(
  userId: string,
  originalExtension: string
): string {
  // Generate a cryptographically secure random string
  const randomString = randomBytes(16).toString('hex');

  // Use only the extension from the original file, not the name
  const extension = originalExtension.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Combine user ID, timestamp, and random string for uniqueness
  return `${userId}-${Date.now()}-${randomString}.${extension}`;
}

/**
 * Gets the storage path for a file
 */
export function getStoragePath(
  fileType: 'hero' | 'logo',
  filename: string
): string {
  const directory = fileType === 'hero' ? 'tool-images' : 'tool-logos';
  return `${directory}/${filename}`;
}

/**
 * Comprehensive validation for image uploads
 */
export async function validateImageUpload(
  file: {
    name: string;
    size: number;
    type: string;
  },
  imageType: 'hero' | 'logo'
): Promise<ValidationResult> {
  // Validate file type
  const typeValidation = validateFileType(file.name, file.type);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  // Validate file size
  const sizeValidation = validateFileSize(file.size, imageType);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  return { valid: true };
}

/**
 * Upload file to Supabase storage with validation and error handling
 */
export async function uploadImageToStorage(
  supabase: ReturnType<typeof createClient>,
  file: Buffer,
  metadata: {
    filename: string;
    contentType: string;
    userId: string;
    imageType: 'hero' | 'logo';
  }
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Generate secure filename
    const extension = metadata.filename.substring(
      metadata.filename.lastIndexOf('.')
    );
    const secureFilename = generateSecureFilename(metadata.userId, extension);
    const filePath = getStoragePath(metadata.imageType, secureFilename);

    // Upload to Supabase with longer cache duration (1 year)
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: metadata.contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);

      // Provide user-friendly error messages
      if (uploadError.message.includes('already exists')) {
        return {
          success: false,
          error: 'A file with this name already exists. Please try again.',
        };
      }

      if (uploadError.message.includes('quota')) {
        return {
          success: false,
          error: 'Storage quota exceeded. Please contact support.',
        };
      }

      return {
        success: false,
        error: 'Failed to upload file. Please try again.',
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during upload.',
    };
  }
}

/**
 * Delete file from storage (for cleanup on errors)
 */
export async function deleteFileFromStorage(
  supabase: ReturnType<typeof createClient>,
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error deleting file:', error);
    return false;
  }
}

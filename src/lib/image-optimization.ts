/**
 * Image Optimization Utility
 * 
 * Provides client-side image compression and resizing using Canvas API
 * Canvas API is free and runs in the browser (no server costs)
 */

export interface ImageOptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number; // 0-1, defaults to 0.85
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface OptimizationResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  reductionPercentage: number;
}

/**
 * Optimize an image by resizing and compressing it
 * Uses Canvas API (free, client-side, no dependencies)
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions
): Promise<OptimizationResult> {
  const { maxWidth, maxHeight, quality = 0.85, outputFormat = 'image/jpeg' } = options;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = () => {
        try {
          // Calculate new dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            
            if (width > height) {
              width = Math.min(width, maxWidth);
              height = width / aspectRatio;
            } else {
              height = Math.min(height, maxHeight);
              width = height * aspectRatio;
            }
          }
          
          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Use better image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }
              
              // Create optimized file
              const optimizedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + getExtension(outputFormat),
                { type: outputFormat }
              );
              
              const originalSize = file.size;
              const optimizedSize = optimizedFile.size;
              const reductionPercentage = Math.round(
                ((originalSize - optimizedSize) / originalSize) * 100
              );
              
              resolve({
                file: optimizedFile,
                originalSize,
                optimizedSize,
                reductionPercentage: Math.max(0, reductionPercentage)
              });
            },
            outputFormat,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Get file extension for output format
 */
function getExtension(format: string): string {
  switch (format) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    case 'image/png':
      return '.png';
    default:
      return '.jpg';
  }
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<{ width: number; height: number; valid: boolean; message?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onerror = () => resolve({ 
      width: 0, 
      height: 0, 
      valid: false, 
      message: 'Failed to read file' 
    });
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => resolve({ 
        width: 0, 
        height: 0, 
        valid: false, 
        message: 'Invalid image file' 
      });
      
      img.onload = () => {
        const valid = img.width <= maxWidth && img.height <= maxHeight;
        const message = valid 
          ? undefined 
          : `Image dimensions ${img.width}x${img.height} exceed maximum ${maxWidth}x${maxHeight}`;
        
        resolve({
          width: img.width,
          height: img.height,
          valid,
          message
        });
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Optimize hero image (max 1920x1080)
 */
export async function optimizeHeroImage(file: File): Promise<OptimizationResult> {
  return optimizeImage(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    outputFormat: 'image/jpeg'
  });
}

/**
 * Optimize logo image (max 512x512)
 */
export async function optimizeLogoImage(file: File): Promise<OptimizationResult> {
  return optimizeImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.90, // Higher quality for logos
    outputFormat: 'image/png' // PNG better for logos
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}



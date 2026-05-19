/**
 * Compresses an image and resizes it to fit within a maximum width/height.
 * Returns a base64 string (JPEG).
 */
export async function compressImage(
  base64Str: string, 
  maxWidth = 1200, 
  maxHeight = 1200, 
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Keep aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // We use image/jpeg for better compression than PNG
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };

    img.onerror = (err) => {
      console.error('Image load error during compression:', err);
      reject(new Error('Failed to load image for compression'));
    };
  });
}

/**
 * Checks the approximate size of a base64 string in bytes.
 */
export function getBase64Size(base64String: string): number {
  const stringLength = base64String.length - (base64String.indexOf(',') + 1);
  return Math.ceil(stringLength * (3 / 4));
}

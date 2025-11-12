import html2canvas from 'html2canvas';

export interface ImageExportOptions {
  scale?: number;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

export async function exportElementAsImage(
  element: HTMLElement,
  options: ImageExportOptions = {}
): Promise<{ success: boolean; blob?: Blob; dataUrl?: string; error?: string }> {
  try {
    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      backgroundColor: options.backgroundColor || '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Resize if dimensions specified
    let finalCanvas = canvas;
    if (options.width || options.height) {
      finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      finalCanvas.width = options.width || canvas.width;
      finalCanvas.height = options.height || canvas.height;
      ctx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);
    }

    return new Promise((resolve) => {
      finalCanvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ success: false, error: 'Failed to create image blob' });
            return;
          }
          const dataUrl = finalCanvas.toDataURL('image/png');
          resolve({ success: true, blob, dataUrl });
        },
        'image/png',
        0.95
      );
    });
  } catch (error) {
    console.error('Error exporting image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export image',
    };
  }
}

export function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function blobToFile(blob: Blob, filename: string): Promise<File> {
  return new File([blob], filename, { type: blob.type });
}

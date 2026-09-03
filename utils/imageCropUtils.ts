// Fast in-browser canvas utilities for Backpack stamps, auto-trim, color keying and transforms

export const autoTrimTransparentCanvas = async (dataUrl: string): Promise<{ dataUrl: string; width: number; height: number; trimmed: boolean }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve({ dataUrl, width: img.width, height: img.height, trimmed: false });
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imgData;

      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 5) { // non-transparent
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // If entirely transparent or already tight
      if (maxX < minX || maxY < minY) {
        resolve({ dataUrl, width: img.width, height: img.height, trimmed: false });
        return;
      }

      // Add a 2px padding for clean antialiasing
      const pad = 2;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
      const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);

      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = cropW;
      trimmedCanvas.height = cropH;
      const trimmedCtx = trimmedCanvas.getContext('2d');
      if (!trimmedCtx) {
        resolve({ dataUrl, width: img.width, height: img.height, trimmed: false });
        return;
      }

      trimmedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      resolve({
        dataUrl: trimmedCanvas.toDataURL('image/png'),
        width: cropW,
        height: cropH,
        trimmed: true
      });
    };
    img.onerror = () => resolve({ dataUrl, width: 100, height: 100, trimmed: false });
    img.src = dataUrl;
  });
};

export const flipImageDataUrl = async (dataUrl: string, horizontal: boolean, vertical: boolean): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      ctx.save();
      ctx.translate(horizontal ? img.width : 0, vertical ? img.height : 0);
      ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const rotateImageDataUrl = async (dataUrl: string, degrees: 90 | 180 | 270): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const is90or270 = degrees === 90 || degrees === 270;
      canvas.width = is90or270 ? img.height : img.width;
      canvas.height = is90or270 ? img.width : img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const invertImageDataUrl = async (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(dataUrl);

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imgData;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { // Keep alpha
          data[i] = 255 - data[i];       // R
          data[i + 1] = 255 - data[i + 1]; // G
          data[i + 2] = 255 - data[i + 2]; // B
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const removeColorKeyBackground = async (
  dataUrl: string,
  targetHex: string = '#ffffff',
  tolerance: number = 30
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(dataUrl);

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imgData;

      // Parse target hex
      const cleanHex = targetHex.replace('#', '');
      const tr = parseInt(cleanHex.substring(0, 2), 16) || 255;
      const tg = parseInt(cleanHex.substring(2, 4), 16) || 255;
      const tb = parseInt(cleanHex.substring(4, 6), 16) || 255;

      const tolSq = tolerance * tolerance * 3;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 0) {
          const diffSq = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2;
          if (diffSq <= tolSq) {
            data[i + 3] = 0; // Make transparent
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

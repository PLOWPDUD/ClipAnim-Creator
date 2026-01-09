
import { Frame, Layer, SelectionState } from "../types";

export const hexToRgba = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b, a: 255 };
};

export const compositeLayers = async (
  frame: Frame, 
  layers: Layer[], 
  width: number = 800, 
  height: number = 600,
  backgroundColor: string = '#ffffff',
  backgroundImage?: string | null
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Draw Background Image (if exists) or Color
  if (backgroundImage) {
     // If we have a background image, draw it to fill the canvas
     await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
             ctx.drawImage(img, 0, 0, width, height);
             resolve();
        };
        img.onerror = () => resolve();
        img.src = backgroundImage;
     });
  } else {
      // Fallback to background color
      if (backgroundColor === 'transparent') {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }
  }

  // Draw layers in order
  for (const layer of layers) {
    if (layer.isVisible && frame.layers[layer.id]) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = layer.blendMode;
          ctx.drawImage(img, 0, 0); // Layers are drawn at 0,0 relative to canvas size
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve(); // Skip if fail
        img.src = frame.layers[layer.id];
      });
    }
  }

  return canvas.toDataURL('image/png');
};

export const drawSelectionOntoCanvas = async (
  ctx: CanvasRenderingContext2D,
  selection: SelectionState
) => {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      
      // Move to center of selection
      const cx = selection.x + selection.width / 2;
      const cy = selection.y + selection.height / 2;
      
      ctx.translate(cx, cy);
      ctx.rotate((selection.rotation * Math.PI) / 180);
      ctx.scale(selection.scaleX, selection.scaleY);
      
      // Draw centered
      ctx.drawImage(
        img, 
        -selection.width / 2, 
        -selection.height / 2, 
        selection.width, 
        selection.height
      );
      
      ctx.restore();
      resolve();
    };
    img.src = selection.dataUrl;
  });
};

export const floodFill = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string
) => {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const targetColor = getPixel(data, startX, startY, width);
  const fillColor = hexToRgba(fillColorHex);

  // If colors are the same, return
  if (colorsMatch(targetColor, fillColor)) return;

  const queue: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();
  
  // Simple optimization to prevent infinite loops or huge memory usage in complex cases
  let iterations = 0;
  const maxIterations = width * height;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;

    let currentX = x;
    let currentY = y;
    
    // Find left bound
    while (currentX >= 0 && colorsMatch(getPixel(data, currentX, currentY, width), targetColor)) {
      currentX--;
    }
    currentX++; // Step back to valid pixel

    let spanAbove = false;
    let spanBelow = false;

    // Scan right
    while (currentX < width && colorsMatch(getPixel(data, currentX, currentY, width), targetColor)) {
      setPixel(data, currentX, currentY, width, fillColor);
      
      if (currentY > 0) {
        const checkAbove = colorsMatch(getPixel(data, currentX, currentY - 1, width), targetColor);
        if (!spanAbove && checkAbove) {
          queue.push([currentX, currentY - 1]);
          spanAbove = true;
        } else if (spanAbove && !checkAbove) {
          spanAbove = false;
        }
      }

      if (currentY < height - 1) {
        const checkBelow = colorsMatch(getPixel(data, currentX, currentY + 1, width), targetColor);
        if (!spanBelow && checkBelow) {
          queue.push([currentX, currentY + 1]);
          spanBelow = true;
        } else if (spanBelow && !checkBelow) {
          spanBelow = false;
        }
      }
      currentX++;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

function getPixel(data: Uint8ClampedArray, x: number, y: number, width: number) {
  const index = (y * width + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

function setPixel(data: Uint8ClampedArray, x: number, y: number, width: number, color: { r: number, g: number, b: number, a: number }) {
  const index = (y * width + x) * 4;
  data[index] = color.r;
  data[index + 1] = color.g;
  data[index + 2] = color.b;
  data[index + 3] = color.a;
}

function colorsMatch(c1: { r: number, g: number, b: number, a: number }, c2: { r: number, g: number, b: number, a: number }) {
  return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
}

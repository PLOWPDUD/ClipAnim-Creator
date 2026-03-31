
import { Frame, Layer, SelectionState, BackgroundSettings } from "../types";

export const hexToRgba = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b, a: 255 };
};

export const hexToHsv = (hex: string) => {
    let {r, g, b} = hexToRgba(hex);
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

export const hsvToHex = (h: number, s: number, v: number) => {
    s /= 100;
    v /= 100;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const compositeLayers = async (
  frame: Frame, 
  layers: Layer[], 
  width: number = 800, 
  height: number = 600,
  background: BackgroundSettings = { type: 'color', color: '#ffffff' },
  backgroundImage?: string | null,
  includeBackground: boolean = true
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const effectiveBackground = frame.background || background;
  const effectiveBackgroundImage = frame.backgroundImage !== undefined ? frame.backgroundImage : backgroundImage;

  // 1. Draw Background Image (if exists) or Color/Gradient
  if (includeBackground) {
    if (effectiveBackgroundImage) {
       // If we have a background image, draw it to fill the canvas
       await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
               ctx.drawImage(img, 0, 0, width, height);
               resolve();
          };
          img.onerror = () => resolve();
          img.src = effectiveBackgroundImage;
       });
    } else {
        // Fallback to background color/gradient
        if (effectiveBackground.type === 'gradient3' && effectiveBackground.gradientColors) {
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, effectiveBackground.gradientColors[0]);
            gradient.addColorStop(0.5, effectiveBackground.gradientColors[1]);
            gradient.addColorStop(1, effectiveBackground.gradientColors[2]);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        } else if (effectiveBackground.color === 'transparent') {
          ctx.clearRect(0, 0, width, height);
        } else {
          ctx.fillStyle = effectiveBackground.color;
          ctx.fillRect(0, 0, width, height);
        }
    }
  } else {
    ctx.clearRect(0, 0, width, height);
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
      
      const anchorX = selection.anchorX ?? selection.width / 2;
      const anchorY = selection.anchorY ?? selection.height / 2;
      
      // Move to anchor point in canvas space
      const ax = selection.x + anchorX;
      const ay = selection.y + anchorY;
      
      ctx.translate(ax, ay);
      ctx.rotate((selection.rotation * Math.PI) / 180);
      ctx.scale(selection.scaleX, selection.scaleY);
      
      // Draw relative to anchor
      ctx.drawImage(
        img, 
        -anchorX, 
        -anchorY, 
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
  fillColorHex: string,
  opacity: number = 1,
  tolerance: number = 0
) => {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return;

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const targetColor = getPixel(data, startX, startY, width);
  const fillColor = hexToRgba(fillColorHex);
  fillColor.a = Math.round(opacity * 255);

  // If colors are the same and opacity is 1, return
  if (opacity === 1 && colorsMatch(targetColor, fillColor, tolerance)) return;

  const queue: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  
  // Simple optimization to prevent infinite loops or huge memory usage in complex cases
  let iterations = 0;
  const maxIterations = width * height;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const [x, y] = queue.pop()!;
    const idx = y * width + x;
    if (visited[idx]) continue;

    let currentX = x;
    let currentY = y;
    
    // Find left bound
    while (currentX >= 0 && colorsMatch(getPixel(data, currentX, currentY, width), targetColor, tolerance)) {
      currentX--;
    }
    currentX++; // Step back to valid pixel

    let spanAbove = false;
    let spanBelow = false;

    // Scan right
    while (currentX < width && colorsMatch(getPixel(data, currentX, currentY, width), targetColor, tolerance)) {
      setPixel(data, currentX, currentY, width, fillColor);
      visited[currentY * width + currentX] = 1;
      
      if (currentY > 0) {
        const checkAbove = colorsMatch(getPixel(data, currentX, currentY - 1, width), targetColor, tolerance);
        if (!spanAbove && checkAbove && !visited[(currentY - 1) * width + currentX]) {
          queue.push([currentX, currentY - 1]);
          spanAbove = true;
        } else if (spanAbove && !checkAbove) {
          spanAbove = false;
        }
      }

      if (currentY < height - 1) {
        const checkBelow = colorsMatch(getPixel(data, currentX, currentY + 1, width), targetColor, tolerance);
        if (!spanBelow && checkBelow && !visited[(currentY + 1) * width + currentX]) {
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

export const magicWandSelect = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number
): SelectionState | null => {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return null;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const targetColor = getPixel(data, startX, startY, width);

  const queue: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  const selectedPixels: [number, number][] = [];
  
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let touchesEdge = false;

  visited[startY * width + startX] = 1;

  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    selectedPixels.push([x, y]);
    
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
      touchesEdge = true;
    }

    // Check neighbors
    const neighbors = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * width + nx;
        if (!visited[idx]) {
          visited[idx] = 1;
          const neighborColor = getPixel(data, nx, ny, width);
          if (colorsMatch(neighborColor, targetColor)) {
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  // If selecting transparent/empty space and it touches the canvas edge, 
  // it means it's not fully enclosed by an outline.
  if (targetColor.a === 0 && touchesEdge) {
    return null;
  }

  if (selectedPixels.length === 0) return null;

  const selWidth = maxX - minX + 1;
  const selHeight = maxY - minY + 1;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = selWidth;
  tempCanvas.height = selHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return null;

  const selImageData = tempCtx.createImageData(selWidth, selHeight);
  const selData = selImageData.data;

  // Move pixels from original to selection
  for (const [x, y] of selectedPixels) {
    const origIdx = (y * width + x) * 4;
    const selIdx = ((y - minY) * selWidth + (x - minX)) * 4;
    
    // Copy to selection
    selData[selIdx] = data[origIdx];
    selData[selIdx + 1] = data[origIdx + 1];
    selData[selIdx + 2] = data[origIdx + 2];
    selData[selIdx + 3] = data[origIdx + 3];

    // Clear from original
    data[origIdx] = 0;
    data[origIdx + 1] = 0;
    data[origIdx + 2] = 0;
    data[origIdx + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
  tempCtx.putImageData(selImageData, 0, 0);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = selWidth;
  maskCanvas.height = selHeight;
  const maskCtx = maskCanvas.getContext('2d');
  if (maskCtx) {
    maskCtx.fillStyle = '#000';
    for (const [x, y] of selectedPixels) {
      maskCtx.fillRect(x - minX, y - minY, 1, 1);
    }
  }

  return {
    x: minX,
    y: minY,
    width: selWidth,
    height: selHeight,
    dataUrl: tempCanvas.toDataURL(),
    maskUrl: maskCanvas.toDataURL(),
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: selWidth / 2,
    anchorY: selHeight / 2,
    selectionType: 'wand'
  };
};

export const lassoSelect = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[]
): SelectionState | null => {
  if (points.length < 3) return null;

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);

  if (width <= 0 || height <= 0) return null;

  const selectionCanvas = document.createElement('canvas');
  selectionCanvas.width = width;
  selectionCanvas.height = height;
  const sCtx = selectionCanvas.getContext('2d');
  if (!sCtx) return null;

  sCtx.beginPath();
  sCtx.moveTo(points[0].x - minX, points[0].y - minY);
  for (let i = 1; i < points.length; i++) {
    sCtx.lineTo(points[i].x - minX, points[i].y - minY);
  }
  sCtx.closePath();
  sCtx.clip();

  sCtx.drawImage(ctx.canvas, minX, minY, width, height, 0, 0, width, height);

  const dataUrl = selectionCanvas.toDataURL();

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  if (maskCtx) {
    maskCtx.beginPath();
    maskCtx.moveTo(points[0].x - minX, points[0].y - minY);
    for (let i = 1; i < points.length; i++) {
      maskCtx.lineTo(points[i].x - minX, points[i].y - minY);
    }
    maskCtx.closePath();
    maskCtx.fillStyle = '#000';
    maskCtx.fill();
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill();
  ctx.restore();

  return {
    x: minX,
    y: minY,
    width,
    height,
    dataUrl,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: width / 2,
    anchorY: height / 2,
    selectionType: 'lasso',
    maskUrl: maskCanvas.toDataURL(),
  };
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
  
  if (color.a === 255) {
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = 255;
    return;
  }
  
  const bgR = data[index];
  const bgG = data[index + 1];
  const bgB = data[index + 2];
  const bgA = data[index + 3] / 255;

  const alpha = color.a / 255;
  const invAlpha = 1 - alpha;
  const outA = alpha + bgA * invAlpha;

  if (outA === 0) {
    data[index] = 0;
    data[index + 1] = 0;
    data[index + 2] = 0;
    data[index + 3] = 0;
    return;
  }

  data[index] = (color.r * alpha + bgR * bgA * invAlpha) / outA;
  data[index + 1] = (color.g * alpha + bgG * bgA * invAlpha) / outA;
  data[index + 2] = (color.b * alpha + bgB * bgA * invAlpha) / outA;
  data[index + 3] = outA * 255;
}

function colorsMatch(c1: { r: number, g: number, b: number, a: number }, c2: { r: number, g: number, b: number, a: number }, tolerance: number = 0) {
  if (c1.a === 0 && c2.a === 0) return true;

  if (tolerance === 0) {
    return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
  }
  
  const rDiff = Math.abs(c1.r - c2.r);
  const gDiff = Math.abs(c1.g - c2.g);
  const bDiff = Math.abs(c1.b - c2.b);
  const aDiff = Math.abs(c1.a - c2.a);
  
  // Convert tolerance from 0-100 to 0-255
  const t = (tolerance / 100) * 255;
  
  return rDiff <= t && gDiff <= t && bDiff <= t && aDiff <= t;
}

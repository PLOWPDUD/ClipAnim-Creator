
import { Frame, Layer, LayerFolder, SelectionState, BackgroundSettings } from "../types";

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
  includeBackground: boolean = true,
  layerFolders?: LayerFolder[]
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

  const folderMap = new Map((layerFolders || []).map(f => [f.id, f]));

  // Draw layers in order
  for (const layer of layers) {
    const folder = layer.folderId ? folderMap.get(layer.folderId) : undefined;
    const isFolderVisible = folder ? folder.isVisible : true;
    if (layer.isVisible && isFolderVisible && frame.layers[layer.id]) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = layer.blendMode;
          ctx.drawImage(img, 0, 0, width, height); // Layers are drawn scaled to target canvas size
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

export interface MagicWandResult extends SelectionState {
  tempCanvas?: HTMLCanvasElement;
  maskCanvas?: HTMLCanvasElement;
}

/**
 * Optimized Magic Wand Selection tool using scanline-like approach or efficient BFS/DFS
 * with TypedArrays to avoid memory overhead and object allocation.
 */
export const magicWandSelect = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  tolerance: number = 0
): MagicWandResult | null => {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return null;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  // Use a 32-bit view for much faster pixel comparisons (RGBA as a single integer)
  const data32 = new Uint32Array(data.buffer);
  
  const targetColor32 = data32[startY * width + startX];
  const targetAlpha = (targetColor32 >> 24) & 0xFF;

  // Faster queue using TypedArray to avoid object creation
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  queue[tail++] = startY * width + startX;

  const visited = new Uint8Array(width * height);
  visited[startY * width + startX] = 1;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  let pixelCount = 0;

  // Comparison function that respects original transparency matching logic and tolerance
  const isMatch = (pixel32: number) => {
    if (targetAlpha === 0) return (pixel32 & 0xFF000000) === 0;
    if (tolerance === 0) return pixel32 === targetColor32;

    const r1 = targetColor32 & 0xFF;
    const g1 = (targetColor32 >> 8) & 0xFF;
    const b1 = (targetColor32 >> 16) & 0xFF;
    const a1 = (targetColor32 >> 24) & 0xFF;

    const r2 = pixel32 & 0xFF;
    const g2 = (pixel32 >> 8) & 0xFF;
    const b2 = (pixel32 >> 16) & 0xFF;
    const a2 = (pixel32 >> 24) & 0xFF;

    const t = (tolerance / 100) * 255;
    return Math.abs(r1 - r2) <= t && Math.abs(g1 - g2) <= t && Math.abs(b1 - b2) <= t && Math.abs(a1 - a2) <= t;
  };

  // Perform the selection flood fill
  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    const y = (idx / width) | 0; // Much faster than Math.floor for positive integers
    
    pixelCount++;
    
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    // Neighbors (4-connectivity)
    // Up
    if (y > 0) {
      const upIdx = idx - width;
      if (!visited[upIdx] && isMatch(data32[upIdx])) {
        visited[upIdx] = 1;
        queue[tail++] = upIdx;
      }
    }
    // Down
    if (y < height - 1) {
      const downIdx = idx + width;
      if (!visited[downIdx] && isMatch(data32[downIdx])) {
        visited[downIdx] = 1;
        queue[tail++] = downIdx;
      }
    }
    // Left
    if (x > 0) {
      const leftIdx = idx - 1;
      if (!visited[leftIdx] && isMatch(data32[leftIdx])) {
        visited[leftIdx] = 1;
        queue[tail++] = leftIdx;
      }
    }
    // Right
    if (x < width - 1) {
      const rightIdx = idx + 1;
      if (!visited[rightIdx] && isMatch(data32[rightIdx])) {
        visited[rightIdx] = 1;
        queue[tail++] = rightIdx;
      }
    }
  }

  if (pixelCount === 0) return null;

  const selWidth = (maxX - minX + 1);
  const selHeight = (maxY - minY + 1);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = selWidth;
  tempCanvas.height = selHeight;
  const tempCtx = tempCanvas.getContext('2d', { alpha: true });
  if (!tempCtx) return null;

  const selImageData = tempCtx.createImageData(selWidth, selHeight);
  const selData32 = new Uint32Array(selImageData.data.buffer);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = selWidth;
  maskCanvas.height = selHeight;
  const maskCtx = maskCanvas.getContext('2d', { alpha: true });
  if (!maskCtx) return null;
  
  const maskImageData = maskCtx.createImageData(selWidth, selHeight);
  const maskData32 = new Uint32Array(maskImageData.data.buffer);

  // Transfer pixels to the new canvas and clear from original in one loop
  // We use the queue as our list of selected pixel indices
  for (let i = 0; i < tail; i++) {
    const idx = queue[i];
    const x = idx % width;
    const y = (idx / width) | 0;
    
    const selIdx = (y - minY) * selWidth + (x - minX);
    
    // Copy to selection
    selData32[selIdx] = data32[idx];
    
    // Set mask (black #000000, alpha 255)
    // Little-endian RGBA is 0xFF000000 (A=255, B=0, G=0, R=0)
    maskData32[selIdx] = 0xFF000000;

    // Clear from original
    data32[idx] = 0;
  }

  // Finalize canvases
  ctx.putImageData(imageData, 0, 0);
  tempCtx.putImageData(selImageData, 0, 0);
  maskCtx.putImageData(maskImageData, 0, 0);

  return {
    x: minX,
    y: minY,
    originX: minX,
    originY: minY,
    width: selWidth,
    height: selHeight,
    dataUrl: tempCanvas.toDataURL(),
    maskUrl: maskCanvas.toDataURL(),
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: selWidth / 2,
    anchorY: selHeight / 2,
    selectionType: 'wand',
    gapCount: 1,
    tempCanvas,
    maskCanvas
  };
};

/**
 * Merges a newly selected wand gap into an existing wand selection,
 * expanding the bounding box and combining image data and masks.
 */
export const mergeWandSelections = (
  currentSel: SelectionState,
  newSel: MagicWandResult,
  currentCanvas?: HTMLCanvasElement | null,
  currentMaskCanvas?: HTMLCanvasElement | null,
  currentMaskImage?: HTMLImageElement | null
): MagicWandResult => {
  const minX = Math.min(currentSel.x, newSel.x);
  const minY = Math.min(currentSel.y, newSel.y);
  const maxX = Math.max(currentSel.x + currentSel.width, newSel.x + newSel.width);
  const maxY = Math.max(currentSel.y + currentSel.height, newSel.y + newSel.height);
  const combinedWidth = maxX - minX;
  const combinedHeight = maxY - minY;

  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = combinedWidth;
  combinedCanvas.height = combinedHeight;
  const combCtx = combinedCanvas.getContext('2d');

  const combinedMaskCanvas = document.createElement('canvas');
  combinedMaskCanvas.width = combinedWidth;
  combinedMaskCanvas.height = combinedHeight;
  const combMaskCtx = combinedMaskCanvas.getContext('2d');

  if (combCtx && combMaskCtx) {
    // 1. Draw existing selection content
    const curOffsetX = currentSel.x - minX;
    const curOffsetY = currentSel.y - minY;

    if (currentCanvas) {
      combCtx.drawImage(currentCanvas, curOffsetX, curOffsetY);
    }
    if (currentMaskCanvas) {
      combMaskCtx.drawImage(currentMaskCanvas, curOffsetX, curOffsetY);
    } else if (currentMaskImage) {
      combMaskCtx.drawImage(currentMaskImage, curOffsetX, curOffsetY);
    }

    // 2. Draw new selection content
    const newOffsetX = newSel.x - minX;
    const newOffsetY = newSel.y - minY;

    if (newSel.tempCanvas) {
      combCtx.drawImage(newSel.tempCanvas, newOffsetX, newOffsetY);
    }
    if (newSel.maskCanvas) {
      combMaskCtx.drawImage(newSel.maskCanvas, newOffsetX, newOffsetY);
    }
  }

  const dataUrl = combinedCanvas.toDataURL();
  const maskUrl = combinedMaskCanvas.toDataURL();

  return {
    x: minX,
    y: minY,
    originX: minX,
    originY: minY,
    width: combinedWidth,
    height: combinedHeight,
    dataUrl,
    maskUrl,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: combinedWidth / 2,
    anchorY: combinedHeight / 2,
    selectionType: 'wand',
    gapCount: (currentSel.gapCount || 1) + 1,
    tempCanvas: combinedCanvas,
    maskCanvas: combinedMaskCanvas
  };
};

/**
 * Deselects a specific gap from an active multi-gap wand selection,
 * restoring its pixels back to the canvas, and updating the remaining selection.
 * Returns null if no selected pixels remain.
 */
export const deselectWandGap = (
  targetCtx: CanvasRenderingContext2D,
  currentSel: SelectionState,
  clickLocalX: number,
  clickLocalY: number,
  currentCanvas?: HTMLCanvasElement | null,
  currentMaskCanvas?: HTMLCanvasElement | null
): MagicWandResult | null => {
  if (!currentCanvas && !currentMaskCanvas) return null;

  const w = currentSel.width;
  const h = currentSel.height;
  if (clickLocalX < 0 || clickLocalX >= w || clickLocalY < 0 || clickLocalY >= h) {
    return { ...currentSel };
  }

  // Work with canvas data
  const sCtx = currentCanvas?.getContext('2d');
  const sImgData = sCtx ? sCtx.getImageData(0, 0, w, h) : null;
  const sData32 = sImgData ? new Uint32Array(sImgData.data.buffer) : null;

  const mCtx = currentMaskCanvas?.getContext('2d');
  const mImgData = mCtx ? mCtx.getImageData(0, 0, w, h) : null;
  const mData32 = mImgData ? new Uint32Array(mImgData.data.buffer) : null;

  let startIdx = clickLocalY * w + clickLocalX;
  let hasPixel = (sData32 && (sData32[startIdx] >> 24) !== 0) || (mData32 && (mData32[startIdx] >> 24) !== 0);

  // If not hit directly, search within 4px radius in case user clicked near an edge/boundary
  if (!hasPixel) {
    let found = false;
    for (let r = 1; r <= 4 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          const nx = clickLocalX + dx;
          const ny = clickLocalY + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const idx = ny * w + nx;
            if ((sData32 && (sData32[idx] >> 24) !== 0) || (mData32 && (mData32[idx] >> 24) !== 0)) {
              startIdx = idx;
              hasPixel = true;
              found = true;
            }
          }
        }
      }
    }
  }

  if (!hasPixel) {
    return { ...currentSel };
  }

  // Flood fill all connected selected pixels of this clicked gap
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;

  const visited = new Uint8Array(w * h);
  visited[startIdx] = 1;

  const isGapPixel = (idx: number) => {
    const sAlpha = sData32 ? ((sData32[idx] >> 24) & 0xFF) : 0;
    const mAlpha = mData32 ? ((mData32[idx] >> 24) & 0xFF) : 0;
    return sAlpha > 0 || mAlpha > 0;
  };

  // Get target canvas image data to restore the gap's colored pixels
  const tCanvas = targetCtx.canvas;
  const tW = tCanvas.width;
  const tH = tCanvas.height;
  const tImgData = targetCtx.getImageData(0, 0, tW, tH);
  const tData32 = new Uint32Array(tImgData.data.buffer);

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx / w) | 0;

    // Restore pixel back to target canvas if it had color
    const canvasX = currentSel.x + x;
    const canvasY = currentSel.y + y;
    if (canvasX >= 0 && canvasX < tW && canvasY >= 0 && canvasY < tH) {
      if (sData32 && (sData32[idx] >> 24) !== 0) {
        tData32[canvasY * tW + canvasX] = sData32[idx];
      }
    }

    // Clear pixel from selection
    if (sData32) sData32[idx] = 0;
    if (mData32) mData32[idx] = 0;

    // Neighbors 4-connectivity
    if (y > 0) {
      const up = idx - w;
      if (!visited[up] && isGapPixel(up)) {
        visited[up] = 1;
        queue[tail++] = up;
      }
    }
    if (y < h - 1) {
      const down = idx + w;
      if (!visited[down] && isGapPixel(down)) {
        visited[down] = 1;
        queue[tail++] = down;
      }
    }
    if (x > 0) {
      const left = idx - 1;
      if (!visited[left] && isGapPixel(left)) {
        visited[left] = 1;
        queue[tail++] = left;
      }
    }
    if (x < w - 1) {
      const right = idx + 1;
      if (!visited[right] && isGapPixel(right)) {
        visited[right] = 1;
        queue[tail++] = right;
      }
    }
  }

  // Put updated pixels back to target canvas
  targetCtx.putImageData(tImgData, 0, 0);

  // Sync in-place modifications to current source canvases
  if (sCtx && sImgData) sCtx.putImageData(sImgData, 0, 0);
  if (mCtx && mImgData) mCtx.putImageData(mImgData, 0, 0);

  // Check remaining pixels in selection
  let remMinX = w, remMinY = h, remMaxX = -1, remMaxY = -1;
  let remainingCount = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const sAlpha = sData32 ? ((sData32[idx] >> 24) & 0xFF) : 0;
      const mAlpha = mData32 ? ((mData32[idx] >> 24) & 0xFF) : 0;
      if (sAlpha > 0 || mAlpha > 0) {
        remainingCount++;
        if (x < remMinX) remMinX = x;
        if (x > remMaxX) remMaxX = x;
        if (y < remMinY) remMinY = y;
        if (y > remMaxY) remMaxY = y;
      }
    }
  }

  // If no remaining pixels, the selection is completely gone
  if (remainingCount === 0) {
    return null;
  }

  // Trim to remaining pixels
  const remW = remMaxX - remMinX + 1;
  const remH = remMaxY - remMinY + 1;

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = remW;
  trimmedCanvas.height = remH;
  const trCtx = trimmedCanvas.getContext('2d');
  const trImgData = trCtx?.createImageData(remW, remH);
  const trData32 = trImgData ? new Uint32Array(trImgData.data.buffer) : null;

  const trimmedMask = document.createElement('canvas');
  trimmedMask.width = remW;
  trimmedMask.height = remH;
  const trMCtx = trimmedMask.getContext('2d');
  const trMImgData = trMCtx?.createImageData(remW, remH);
  const trMData32 = trMImgData ? new Uint32Array(trMImgData.data.buffer) : null;

  if (trData32 && trMData32) {
    for (let y = remMinY; y <= remMaxY; y++) {
      for (let x = remMinX; x <= remMaxX; x++) {
        const srcIdx = y * w + x;
        const dstIdx = (y - remMinY) * remW + (x - remMinX);
        if (sData32) trData32[dstIdx] = sData32[srcIdx];
        if (mData32) trMData32[dstIdx] = mData32[srcIdx];
      }
    }
    trCtx?.putImageData(trImgData!, 0, 0);
    trMCtx?.putImageData(trMImgData!, 0, 0);
  }

  return {
    x: currentSel.x + remMinX,
    y: currentSel.y + remMinY,
    originX: currentSel.x + remMinX,
    originY: currentSel.y + remMinY,
    width: remW,
    height: remH,
    dataUrl: trimmedCanvas.toDataURL(),
    maskUrl: trimmedMask.toDataURL(),
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: remW / 2,
    anchorY: remH / 2,
    selectionType: 'wand',
    gapCount: Math.max(1, (currentSel.gapCount || 2) - 1),
    tempCanvas: trimmedCanvas,
    maskCanvas: trimmedMask
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

import { Point, SelectionState } from '../types';

export interface LayerStats {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
  angle: number;
}

export interface MotionBlurSettings {
  enabled: boolean;
  strength: number; // 0.1 to 1.5 (default 0.7)
  shutterAngle?: number; // degrees, e.g. 180 (default)
  samples?: number; // 3 to 11 (default 7)
}

export const getEasingProgress = (t: number, type: string = 'linear'): number => {
  switch (type) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t; // linear
  }
};

/**
 * Calculates principal moments and bounding box of a layer for rotation/scale/position tweening
 */
export const getLayerStats = (img: HTMLImageElement, width: number, height: number): LayerStats | null => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return null;
  
  tempCtx.drawImage(img, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let m00 = 0;
  let m10 = 0;
  let m01 = 0;
  let m11 = 0;
  let m20 = 0;
  let m02 = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        const weight = alpha / 255;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        m00 += weight;
        m10 += x * weight;
        m01 += y * weight;
        m11 += x * y * weight;
        m20 += x * x * weight;
        m02 += y * y * weight;
      }
    }
  }

  if (m00 < 0.1) return null;

  const centerX = m10 / m00;
  const centerY = m01 / m00;
  const mu20 = m20 / m00 - centerX * centerX;
  const mu02 = m02 / m00 - centerY * centerY;
  const mu11 = m11 / m00 - centerX * centerY;

  // Orientation angle in radians (principal axis)
  const angle = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);

  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX + 1),
    h: Math.max(1, maxY - minY + 1),
    centerX,
    centerY,
    angle,
  };
};

/**
 * Calculates the shortest angular difference (-PI/2 to PI/2 for principal axes)
 */
export const getShortestAngleDiff = (angleA: number, angleB: number): number => {
  let diff = angleB - angleA;
  while (diff > Math.PI / 2) diff -= Math.PI;
  while (diff < -Math.PI / 2) diff += Math.PI;
  return diff;
};

/**
 * Renders an in-between frame layer with high-quality multi-pass sub-frame motion blur
 */
export const renderTweenLayer = (
  ctx: CanvasRenderingContext2D,
  imgA: HTMLImageElement | null,
  imgB: HTMLImageElement | null,
  statsA: LayerStats | null,
  statsB: LayerStats | null,
  t: number,
  deltaT: number,
  easing: string,
  interpolatePosition: boolean,
  interpolateScale: boolean,
  interpolateRotation: boolean,
  motionBlur: boolean,
  motionBlurStrength: number = 0.7,
  motionBlurSamples: number = 7,
  motionBlurShutterAngle: number = 180
) => {
  // If either image or stats is missing, handle fallback single image rendering or return
  if (!imgA || !imgB || !statsA || !statsB) {
    if (!imgA && !imgB) return;
    const targetImg = imgA || imgB;
    if (!targetImg) return;

    const progress = getEasingProgress(t, easing);

    if (!motionBlur || motionBlurStrength <= 0) {
      ctx.globalAlpha = imgA ? (1 - progress) : progress;
      ctx.drawImage(targetImg, 0, 0);
      ctx.globalAlpha = 1.0;
      return;
    }

    // Motion blur on single image fade/subtle movement
    const shutterDuration = deltaT * (motionBlurShutterAngle / 360) * motionBlurStrength;
    const numSamples = Math.max(3, motionBlurSamples);
    
    // Compute normalized cosine weights
    const weights: number[] = [];
    let sumWeight = 0;
    for (let s = 0; s < numSamples; s++) {
      const u = (s + 0.5) / numSamples;
      const w = Math.cos((u - 0.5) * Math.PI);
      weights.push(w);
      sumWeight += w;
    }

    for (let s = 0; s < numSamples; s++) {
      const u = (s + 0.5) / numSamples;
      const tau = Math.max(0, Math.min(1, t + (u - 0.5) * shutterDuration));
      const subProgress = getEasingProgress(tau, easing);
      const sampleAlpha = (weights[s] / sumWeight) * (imgA ? (1 - subProgress) : subProgress);
      
      ctx.globalAlpha = sampleAlpha;
      ctx.drawImage(targetImg, 0, 0);
    }
    ctx.globalAlpha = 1.0;
    return;
  }

  // Both imgA and imgB with stats exist!
  const diffAngle = interpolateRotation ? getShortestAngleDiff(statsA.angle, statsB.angle) : 0;

  // Check if standard sharp tween (no motion blur)
  if (!motionBlur || motionBlurStrength <= 0) {
    const progress = getEasingProgress(t, easing);
    const centerX = interpolatePosition ? statsA.centerX + (statsB.centerX - statsA.centerX) * progress : statsA.centerX;
    const centerY = interpolatePosition ? statsA.centerY + (statsB.centerY - statsA.centerY) * progress : statsA.centerY;
    const width = interpolateScale ? statsA.w + (statsB.w - statsA.w) * progress : statsA.w;
    const height = interpolateScale ? statsA.h + (statsB.h - statsA.h) * progress : statsA.h;
    const angle = statsA.angle + diffAngle * progress;

    // Draw imgA
    ctx.globalAlpha = 1 - progress;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle - statsA.angle);
    ctx.scale(width / statsA.w, height / statsA.h);
    ctx.translate(-statsA.centerX, -statsA.centerY);
    ctx.drawImage(imgA, 0, 0);
    ctx.restore();

    // Draw imgB
    ctx.globalAlpha = progress;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle - statsB.angle);
    ctx.scale(width / statsB.w, height / statsB.h);
    ctx.translate(-statsB.centerX, -statsB.centerY);
    ctx.drawImage(imgB, 0, 0);
    ctx.restore();

    ctx.globalAlpha = 1.0;
    return;
  }

  // High-Quality Motion Blur Multi-Sampling
  const shutterDuration = deltaT * (motionBlurShutterAngle / 360) * motionBlurStrength;
  const numSamples = Math.max(3, motionBlurSamples);

  // Compute normalized weights using Gaussian/cosine window
  const weights: number[] = [];
  let sumWeight = 0;
  for (let s = 0; s < numSamples; s++) {
    const u = (s + 0.5) / numSamples;
    const w = Math.cos((u - 0.5) * Math.PI);
    weights.push(w);
    sumWeight += w;
  }

  // Calculate motion magnitude for dynamic micro-filter
  const startT = Math.max(0, t - shutterDuration / 2);
  const endT = Math.min(1, t + shutterDuration / 2);
  const pStart = getEasingProgress(startT, easing);
  const pEnd = getEasingProgress(endT, easing);
  
  const dispX = (statsB.centerX - statsA.centerX) * (pEnd - pStart);
  const dispY = (statsB.centerY - statsA.centerY) * (pEnd - pStart);
  const linearMotion = Math.sqrt(dispX * dispX + dispY * dispY);
  const rotMotion = Math.abs(diffAngle * (pEnd - pStart)) * Math.sqrt(statsA.w * statsA.h) * 0.5;
  const totalMotion = linearMotion + rotMotion;

  // Apply subtle micro-blur filter if moving fast to soften intermediate raster steps
  const microBlurPx = totalMotion > 2.0 ? Math.min(3.5, (totalMotion / numSamples) * 0.35 * motionBlurStrength) : 0;
  if (microBlurPx > 0.3 && typeof ctx.filter === 'string') {
    try {
      ctx.filter = `blur(${microBlurPx.toFixed(2)}px)`;
    } catch {
      ctx.filter = 'none';
    }
  } else {
    ctx.filter = 'none';
  }

  for (let s = 0; s < numSamples; s++) {
    const u = (s + 0.5) / numSamples;
    const tau = Math.max(0, Math.min(1, t + (u - 0.5) * shutterDuration));
    const subProgress = getEasingProgress(tau, easing);
    const normWeight = weights[s] / sumWeight;

    const centerX = interpolatePosition ? statsA.centerX + (statsB.centerX - statsA.centerX) * subProgress : statsA.centerX;
    const centerY = interpolatePosition ? statsA.centerY + (statsB.centerY - statsA.centerY) * subProgress : statsA.centerY;
    const width = interpolateScale ? statsA.w + (statsB.w - statsA.w) * subProgress : statsA.w;
    const height = interpolateScale ? statsA.h + (statsB.h - statsA.h) * subProgress : statsA.h;
    const angle = statsA.angle + diffAngle * subProgress;

    // Draw sub-sample imgA
    const alphaA = normWeight * (1 - subProgress);
    if (alphaA > 0.005) {
      ctx.globalAlpha = alphaA;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle - statsA.angle);
      ctx.scale(width / statsA.w, height / statsA.h);
      ctx.translate(-statsA.centerX, -statsA.centerY);
      ctx.drawImage(imgA, 0, 0);
      ctx.restore();
    }

    // Draw sub-sample imgB
    const alphaB = normWeight * subProgress;
    if (alphaB > 0.005) {
      ctx.globalAlpha = alphaB;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle - statsB.angle);
      ctx.scale(width / statsB.w, height / statsB.h);
      ctx.translate(-statsB.centerX, -statsB.centerY);
      ctx.drawImage(imgB, 0, 0);
      ctx.restore();
    }
  }

  ctx.filter = 'none';
  ctx.globalAlpha = 1.0;
};

/**
 * Samples a continuous smooth point along a polyline path
 */
export const samplePathAtProgress = (path: Point[], progress: number): Point => {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1) return path[0];

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const rawIndex = clampedProgress * (path.length - 1);
  const low = Math.floor(rawIndex);
  const high = Math.ceil(rawIndex);
  const frac = rawIndex - low;

  if (low === high || high >= path.length) {
    return path[Math.min(low, path.length - 1)];
  }

  return {
    x: path[low].x * (1 - frac) + path[high].x * frac,
    y: path[low].y * (1 - frac) + path[high].y * frac,
  };
};

/**
 * Renders a moved selection along a motion path with optional multi-sample motion blur
 */
export const renderMotionPathStep = async (
  ctx: CanvasRenderingContext2D,
  path: Point[],
  selection: SelectionState,
  drawSelectionFn: (ctx: CanvasRenderingContext2D, sel: SelectionState) => Promise<void>,
  stepIndex: number,
  totalSteps: number,
  easing: string,
  motionBlur: boolean,
  motionBlurStrength: number = 0.7,
  motionBlurSamples: number = 7,
  motionBlurShutterAngle: number = 180
) => {
  if (!motionBlur || motionBlurStrength <= 0 || totalSteps <= 1) {
    const t = stepIndex / (totalSteps - 1);
    const progress = getEasingProgress(t, easing);
    const point = samplePathAtProgress(path, progress);
    
    const movedSelection: SelectionState = {
      ...selection,
      x: point.x - (selection.anchorX ?? selection.width / 2),
      y: point.y - (selection.anchorY ?? selection.height / 2),
    };
    await drawSelectionFn(ctx, movedSelection);
    return;
  }

  // Motion blur along path
  const t = stepIndex / (totalSteps - 1);
  const deltaT = 1 / (totalSteps - 1);
  const shutterDuration = deltaT * (motionBlurShutterAngle / 360) * motionBlurStrength;
  const numSamples = Math.max(3, motionBlurSamples);

  const weights: number[] = [];
  let sumWeight = 0;
  for (let s = 0; s < numSamples; s++) {
    const u = (s + 0.5) / numSamples;
    const w = Math.cos((u - 0.5) * Math.PI);
    weights.push(w);
    sumWeight += w;
  }

  // Check path speed for micro-filter
  const p0 = getEasingProgress(Math.max(0, t - shutterDuration / 2), easing);
  const p1 = getEasingProgress(Math.min(1, t + shutterDuration / 2), easing);
  const pt0 = samplePathAtProgress(path, p0);
  const pt1 = samplePathAtProgress(path, p1);
  const pathSpeed = Math.sqrt((pt1.x - pt0.x) ** 2 + (pt1.y - pt0.y) ** 2);

  const microBlurPx = pathSpeed > 2.0 ? Math.min(3.5, (pathSpeed / numSamples) * 0.35 * motionBlurStrength) : 0;
  if (microBlurPx > 0.3 && typeof ctx.filter === 'string') {
    try {
      ctx.filter = `blur(${microBlurPx.toFixed(2)}px)`;
    } catch {
      ctx.filter = 'none';
    }
  } else {
    ctx.filter = 'none';
  }

  for (let s = 0; s < numSamples; s++) {
    const u = (s + 0.5) / numSamples;
    const tau = Math.max(0, Math.min(1, t + (u - 0.5) * shutterDuration));
    const subProgress = getEasingProgress(tau, easing);
    const subPoint = samplePathAtProgress(path, subProgress);
    const normWeight = weights[s] / sumWeight;

    ctx.save();
    ctx.globalAlpha = normWeight;
    const subSelection: SelectionState = {
      ...selection,
      x: subPoint.x - (selection.anchorX ?? selection.width / 2),
      y: subPoint.y - (selection.anchorY ?? selection.height / 2),
    };
    await drawSelectionFn(ctx, subSelection);
    ctx.restore();
  }

  ctx.filter = 'none';
  ctx.globalAlpha = 1.0;
};

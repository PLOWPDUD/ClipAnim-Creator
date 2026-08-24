import { Frame, Layer, Actor, SavedSymbol } from '../types';
import { compositeLayers } from './drawingUtils';

export interface SpriteFrameInput {
  symbolId: string;
  symbolName: string;
  animationName: string;
  frameIndex: number;
  canvas: HTMLCanvasElement;
  originalWidth: number;
  originalHeight: number;
  trimmedWidth: number;
  trimmedHeight: number;
  frameX: number; // offset X in negative px (e.g. -10)
  frameY: number; // offset Y in negative px (e.g. -15)
}

export interface PackedSubTexture {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  symbolId: string;
  animationName: string;
  frameIndex: number;
}

export interface SpritesheetResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  xml: string;
  subTextures: PackedSubTexture[];
  width: number;
  height: number;
  imageFileName: string;
}

export interface PackingOptions {
  padding?: number;
  trim?: boolean;
  powerOfTwo?: boolean;
  maxTextureSize?: number;
  imageFileName?: string;
  prefixMap?: Record<string, string>; // symbolId -> custom animation prefix
}

/**
 * Computes the non-transparent bounding box of a canvas
 */
export function getTrimmedBounds(ctx: CanvasRenderingContext2D, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasPixel = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 0) {
        hasPixel = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixel) {
    return { x: 0, y: 0, w: Math.max(1, width), h: Math.max(1, height) };
  }

  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX + 1),
    h: Math.max(1, maxY - minY + 1),
  };
}

/**
 * Prepares all frames from selected animated symbols / actors as raster canvases
 */
export async function prepareSymbolFrames(
  symbols: (Actor | SavedSymbol)[],
  options: { trim?: boolean; prefixMap?: Record<string, string> } = {}
): Promise<SpriteFrameInput[]> {
  const framesList: SpriteFrameInput[] = [];

  for (const sym of symbols) {
    const symbolId = sym.id;
    const rawName = sym.name || 'Symbol';
    const animPrefix = options.prefixMap?.[symbolId] || rawName;

    // Check if symbol has multiple frames
    const hasSymbolFrames = sym.isAnimated && sym.symbolFrames && sym.symbolFrames.length > 0;
    const symbolFrames: Frame[] = hasSymbolFrames ? (sym.symbolFrames as Frame[]) : [];
    const symbolLayers: Layer[] = sym.symbolLayers || [{ id: '1', name: 'Layer 1', isVisible: true, isLocked: false, opacity: 1, blendMode: 'source-over' }];

    // Default dimensions
    const width = ('width' in sym && typeof sym.width === 'number' && sym.width > 0) ? sym.width : 200;
    const height = ('height' in sym && typeof sym.height === 'number' && sym.height > 0) ? sym.height : 200;

    if (symbolFrames.length > 0) {
      for (let fIdx = 0; fIdx < symbolFrames.length; fIdx++) {
        const frame = symbolFrames[fIdx];
        // Render frame layers transparently
        const frameDataUrl = await compositeLayers(
          frame,
          symbolLayers,
          width,
          height,
          { type: 'color', color: 'transparent' },
          null,
          false
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, width, height);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = frameDataUrl;
          });

          if (options.trim) {
            const bounds = getTrimmedBounds(ctx, width, height);
            const trimmedCanvas = document.createElement('canvas');
            trimmedCanvas.width = bounds.w;
            trimmedCanvas.height = bounds.h;
            const tCtx = trimmedCanvas.getContext('2d');
            if (tCtx) {
              tCtx.drawImage(canvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);
            }

            framesList.push({
              symbolId,
              symbolName: rawName,
              animationName: animPrefix,
              frameIndex: fIdx,
              canvas: trimmedCanvas,
              originalWidth: width,
              originalHeight: height,
              trimmedWidth: bounds.w,
              trimmedHeight: bounds.h,
              frameX: -bounds.x,
              frameY: -bounds.y,
            });
          } else {
            framesList.push({
              symbolId,
              symbolName: rawName,
              animationName: animPrefix,
              frameIndex: fIdx,
              canvas,
              originalWidth: width,
              originalHeight: height,
              trimmedWidth: width,
              trimmedHeight: height,
              frameX: 0,
              frameY: 0,
            });
          }
        }
      }
    } else if (sym.dataUrl) {
      // Single frame symbol fallback
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = sym.dataUrl;
        });

        if (options.trim) {
          const bounds = getTrimmedBounds(ctx, width, height);
          const trimmedCanvas = document.createElement('canvas');
          trimmedCanvas.width = bounds.w;
          trimmedCanvas.height = bounds.h;
          const tCtx = trimmedCanvas.getContext('2d');
          if (tCtx) {
            tCtx.drawImage(canvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);
          }

          framesList.push({
            symbolId,
            symbolName: rawName,
            animationName: animPrefix,
            frameIndex: 0,
            canvas: trimmedCanvas,
            originalWidth: width,
            originalHeight: height,
            trimmedWidth: bounds.w,
            trimmedHeight: bounds.h,
            frameX: -bounds.x,
            frameY: -bounds.y,
          });
        } else {
          framesList.push({
            symbolId,
            symbolName: rawName,
            animationName: animPrefix,
            frameIndex: 0,
            canvas,
            originalWidth: width,
            originalHeight: height,
            trimmedWidth: width,
            trimmedHeight: height,
            frameX: 0,
            frameY: 0,
          });
        }
      }
    }
  }

  return framesList;
}

/**
 * Next Power of Two helper
 */
function nextPowerOfTwo(n: number): number {
  let v = 1;
  while (v < n) v *= 2;
  return v;
}

/**
 * Packs prepared frames into a Spritesheet texture and generates Adobe Animate / Sparrow XML
 */
export async function packSpritesheetAndGenerateXml(
  preparedFrames: SpriteFrameInput[],
  options: PackingOptions = {}
): Promise<SpritesheetResult> {
  const padding = options.padding ?? 2;
  const imageFileName = options.imageFileName || 'spritesheet.png';
  const powerOfTwo = options.powerOfTwo ?? false;
  const maxTextureSize = options.maxTextureSize || 4096;

  if (preparedFrames.length === 0) {
    const emptyCanvas = document.createElement('canvas');
    emptyCanvas.width = 64;
    emptyCanvas.height = 64;
    return {
      canvas: emptyCanvas,
      dataUrl: emptyCanvas.toDataURL(),
      xml: `<?xml version="1.0" encoding="utf-8"?>\n<TextureAtlas imagePath="${imageFileName}">\n</TextureAtlas>`,
      subTextures: [],
      width: 64,
      height: 64,
      imageFileName,
    };
  }

  // Shelf-packing / row algorithm with height sorting or preservation
  // Let's sort by height descending for optimal packing density
  const indexedFrames = preparedFrames.map((f, i) => ({ ...f, origOrder: i }));
  // Keep original sequence grouped per animation for cleaner reading, but pack smartly
  // Sort by height descending
  const sorted = [...indexedFrames].sort((a, b) => b.trimmedHeight - a.trimmedHeight);

  // Estimate total area needed
  const totalArea = sorted.reduce((acc, f) => acc + (f.trimmedWidth + padding) * (f.trimmedHeight + padding), 0);
  let estWidth = Math.max(256, Math.min(maxTextureSize, Math.ceil(Math.sqrt(totalArea * 1.3))));
  if (powerOfTwo) {
    estWidth = nextPowerOfTwo(estWidth);
  }

  // Pack items onto shelves
  let currentX = padding;
  let currentY = padding;
  let shelfHeight = 0;
  let maxAtlasWidth = estWidth;
  let finalAtlasWidth = 0;
  let finalAtlasHeight = 0;

  const placements: { frame: typeof indexedFrames[0]; x: number; y: number }[] = [];

  for (const item of sorted) {
    const itemW = item.trimmedWidth;
    const itemH = item.trimmedHeight;

    // Check if item fits in current shelf
    if (currentX + itemW + padding > maxAtlasWidth) {
      // Start a new shelf
      currentX = padding;
      currentY += shelfHeight + padding;
      shelfHeight = 0;
    }

    placements.push({
      frame: item,
      x: currentX,
      y: currentY,
    });

    currentX += itemW + padding;
    if (itemH > shelfHeight) {
      shelfHeight = itemH;
    }

    if (currentX > finalAtlasWidth) finalAtlasWidth = currentX;
    if (currentY + shelfHeight + padding > finalAtlasHeight) {
      finalAtlasHeight = currentY + shelfHeight + padding;
    }
  }

  let finalW = Math.max(32, finalAtlasWidth);
  let finalH = Math.max(32, finalAtlasHeight);

  if (powerOfTwo) {
    finalW = nextPowerOfTwo(finalW);
    finalH = nextPowerOfTwo(finalH);
  }

  // Clamp to max texture size
  finalW = Math.min(maxTextureSize, finalW);
  finalH = Math.min(maxTextureSize, finalH);

  // Create atlas canvas
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = finalW;
  atlasCanvas.height = finalH;
  const atlasCtx = atlasCanvas.getContext('2d');

  if (atlasCtx) {
    atlasCtx.clearRect(0, 0, finalW, finalH);
  }

  const subTextures: PackedSubTexture[] = [];

  // Sort placements back to animation sequence order so XML is clean and organized!
  placements.sort((a, b) => a.frame.origOrder - b.frame.origOrder);

  for (const placement of placements) {
    const { frame, x, y } = placement;

    if (atlasCtx) {
      atlasCtx.drawImage(frame.canvas, x, y);
    }

    // 4-digit zero padding: 0000, 0001, etc. (standard for Adobe Animate / Sparrow / FNF)
    const paddedIndex = String(frame.frameIndex).padStart(4, '0');
    const subTextureName = `${frame.animationName}${paddedIndex}`;

    subTextures.push({
      name: subTextureName,
      x,
      y,
      width: frame.trimmedWidth,
      height: frame.trimmedHeight,
      frameX: frame.frameX,
      frameY: frame.frameY,
      frameWidth: frame.originalWidth,
      frameHeight: frame.originalHeight,
      symbolId: frame.symbolId,
      animationName: frame.animationName,
      frameIndex: frame.frameIndex,
    });
  }

  // Generate Adobe Animate / Sparrow XML (TextureAtlas)
  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<TextureAtlas imagePath="${imageFileName}">\n`;
  xml += `\t<!-- Created with ClipAnim (Adobe Animate / Sparrow / FNF Compatible) -->\n`;

  for (const st of subTextures) {
    // If trimming was applied or offset exists, include frameX, frameY, frameWidth, frameHeight
    if (st.frameX !== 0 || st.frameY !== 0 || st.width !== st.frameWidth || st.height !== st.frameHeight) {
      xml += `\t<SubTexture name="${escapeXml(st.name)}" x="${st.x}" y="${st.y}" width="${st.width}" height="${st.height}" frameX="${st.frameX}" frameY="${st.frameY}" frameWidth="${st.frameWidth}" frameHeight="${st.frameHeight}"/>\n`;
    } else {
      xml += `\t<SubTexture name="${escapeXml(st.name)}" x="${st.x}" y="${st.y}" width="${st.width}" height="${st.height}" frameX="0" frameY="0" frameWidth="${st.frameWidth}" frameHeight="${st.frameHeight}"/>\n`;
    }
  }

  xml += `</TextureAtlas>`;

  const dataUrl = atlasCanvas.toDataURL('image/png');

  return {
    canvas: atlasCanvas,
    dataUrl,
    xml,
    subTextures,
    width: finalW,
    height: finalH,
    imageFileName,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

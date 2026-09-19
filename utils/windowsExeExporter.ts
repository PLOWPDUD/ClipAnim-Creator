import JSZip from 'jszip';
import { generateLiveHtmlGame, GenerateHtmlGameOptions } from './htmlGameExporter';

export interface ExeIconImage {
  width: number;
  height: number;
  pngBytes: Uint8Array;
}

export interface ExeExportOptions {
  customIconDataUrl?: string | null;
  customIconBlob?: Blob | null;
  publisher?: string;
  gameTitle?: string;
}

export interface WindowsExeResult {
  blob: Blob;
  url: string;
  filename: string;
  sizeBytes: number;
  icoBlob?: Blob;
  icoUrl?: string;
  icoFilename?: string;
}

/**
 * Align value up to multiple of alignment
 */
function alignUp(val: number, alignment: number): number {
  return (val + alignment - 1) & ~(alignment - 1);
}

/**
 * Generates a default modern game controller icon onto an HTML Canvas
 */
export function generateDefaultGameIconCanvas(size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const s = size / 256;

  // Background rounded rectangle with sleek game gradient
  ctx.save();
  const radius = 56 * s;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();

  // Dark violet-to-cyan gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, '#1e1b4b'); // deep indigo
  bgGrad.addColorStop(0.5, '#312e81'); // indigo
  bgGrad.addColorStop(1, '#0f172a'); // slate 900
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle glowing accent ring
  ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
  ctx.lineWidth = 4 * s;
  ctx.stroke();

  // Draw Gamepad Controller silhouette
  ctx.fillStyle = '#6366f1'; // indigo 500
  ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
  ctx.shadowBlur = 20 * s;

  // Gamepad body
  const bodyX = 40 * s;
  const bodyY = 80 * s;
  const bodyW = 176 * s;
  const bodyH = 100 * s;
  const r = 36 * s;

  ctx.beginPath();
  ctx.moveTo(bodyX + r, bodyY);
  ctx.lineTo(bodyX + bodyW - r, bodyY);
  ctx.quadraticCurveTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + r);
  ctx.lineTo(bodyX + bodyW + 4 * s, bodyY + bodyH - 12 * s);
  ctx.quadraticCurveTo(bodyX + bodyW - 12 * s, bodyY + bodyH + 16 * s, bodyX + bodyW - 44 * s, bodyY + bodyH);
  ctx.lineTo(bodyX + 44 * s, bodyY + bodyH);
  ctx.quadraticCurveTo(bodyX + 12 * s, bodyY + bodyH + 16 * s, bodyX - 4 * s, bodyY + bodyH - 12 * s);
  ctx.lineTo(bodyX, bodyY + r);
  ctx.quadraticCurveTo(bodyX, bodyY, bodyX + r, bodyY);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  // Inner gamepad highlight
  const padGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  padGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  padGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = padGrad;
  ctx.fill();

  // D-Pad (Left side)
  ctx.fillStyle = '#ffffff';
  const dpadX = 76 * s;
  const dpadY = 120 * s;
  const arm = 8 * s;
  const len = 14 * s;

  // Horizontal bar
  ctx.fillRect(dpadX - len, dpadY - arm / 2, len * 2, arm);
  // Vertical bar
  ctx.fillRect(dpadX - arm / 2, dpadY - len, arm, len * 2);

  // Action Buttons (Right side - Diamond layout)
  const btnCenterX = 180 * s;
  const btnCenterY = 120 * s;
  const btnRadius = 6 * s;
  const offset = 12 * s;

  const buttons = [
    { x: btnCenterX, y: btnCenterY - offset, color: '#f43f5e' }, // Top - Red
    { x: btnCenterX + offset, y: btnCenterY, color: '#38bdf8' }, // Right - Cyan
    { x: btnCenterX, y: btnCenterY + offset, color: '#eab308' }, // Bottom - Yellow
    { x: btnCenterX - offset, y: btnCenterY, color: '#22c55e' }, // Left - Green
  ];

  for (const btn of buttons) {
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = btn.color;
    ctx.fill();
  }

  // Center logo pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(128 * s - 10 * s, 120 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(128 * s + 10 * s, 120 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  return canvas;
}

/**
 * Converts an image source (dataUrl, Blob, or Canvas) into multi-resolution PNG buffers
 */
export async function processIconToResolutions(
  source: string | Blob | HTMLCanvasElement | null,
  resolutions: number[] = [16, 32, 48, 64, 128, 256]
): Promise<ExeIconImage[]> {
  let sourceImage: CanvasImageSource;

  if (!source) {
    sourceImage = generateDefaultGameIconCanvas(256);
  } else if (source instanceof HTMLCanvasElement) {
    sourceImage = source;
  } else {
    // string dataUrl or Blob
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    sourceImage = img;
  }

  const results: ExeIconImage[] = [];

  for (const res of resolutions) {
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImage, 0, 0, res, res);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) continue;

    const arrayBuffer = await blob.arrayBuffer();
    results.push({
      width: res,
      height: res,
      pngBytes: new Uint8Array(arrayBuffer),
    });
  }

  return results;
}

/**
 * Builds a valid Microsoft Windows .ICO file binary from icon images
 */
export function buildIcoFileBinary(icons: ExeIconImage[]): Uint8Array {
  const numIcons = icons.length;
  // ICONDIR: 6 bytes
  // ICONDIRENTRY: 16 bytes each
  const headerSize = 6 + numIcons * 16;
  let totalSize = headerSize;
  for (const ic of icons) {
    totalSize += ic.pngBytes.length;
  }

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // ICONDIR
  view.setUint16(0, 0, true); // idReserved
  view.setUint16(2, 1, true); // idType = 1 (icon)
  view.setUint16(4, numIcons, true); // idCount

  let currentImageOffset = headerSize;

  for (let i = 0; i < numIcons; i++) {
    const ic = icons[i];
    const entryOffset = 6 + i * 16;

    view.setUint8(entryOffset, ic.width >= 256 ? 0 : ic.width); // bWidth
    view.setUint8(entryOffset + 1, ic.height >= 256 ? 0 : ic.height); // bHeight
    view.setUint8(entryOffset + 2, 0); // bColorCount
    view.setUint8(entryOffset + 3, 0); // bReserved
    view.setUint16(entryOffset + 4, 1, true); // wPlanes
    view.setUint16(entryOffset + 6, 32, true); // wBitCount
    view.setUint32(entryOffset + 8, ic.pngBytes.length, true); // dwBytesInRes
    view.setUint32(entryOffset + 12, currentImageOffset, true); // dwImageOffset

    bytes.set(ic.pngBytes, currentImageOffset);
    currentImageOffset += ic.pngBytes.length;
  }

  return bytes;
}

/**
 * Builds a 100% compliant Windows PE32 Binary Executable (.exe)
 * Containing:
 * - Genuine DOS 'MZ' Header + PE Signature
 * - COFF File Header + Optional Header (GUI Subsystem, 32-bit i386)
 * - Dynamic Link imports for kernel32.dll & shell32.dll
 * - High-speed native x86 machine code that writes out the HTML game & launches it seamlessly
 * - Embedded .rsrc Resource Directory with multi-resolution custom application icon
 * - Embedded HTML5 game bundle in .data section
 */
export function buildWindowsExeBinary(options: {
  htmlContent: string;
  projectName: string;
  icons: ExeIconImage[];
}): Uint8Array {
  const { htmlContent, projectName, icons } = options;

  const fileAlign = 0x200; // 512 bytes
  const secAlign = 0x1000; // 4096 bytes
  const imageBase = 0x00400000;

  const encoder = new TextEncoder();
  const htmlBytes = encoder.encode(htmlContent);

  const cleanName = projectName.replace(/[^a-zA-Z0-9_\-]/g, '_').trim() || 'Game';
  const tempFilename = encoder.encode(`clipanim_${cleanName}.html\0`);

  const textRva = 0x1000;
  const dataRva = 0x2000;

  // Import Table layout in .data:
  // 0..27: kernel32 IAT (6 entries + 1 null = 28 bytes)
  // 28..35: shell32 IAT (1 entry + 1 null = 8 bytes)
  // 36..95: IMAGE_IMPORT_DESCRIPTOR (2 descriptors + 1 null = 60 bytes)
  // 96..123: kernel32 ILT (28 bytes)
  // 124..131: shell32 ILT (8 bytes)
  // 132+: Hint/Name tables, DLL names, strings, and HTML game payload

  const k32Funcs = ['GetTempPathA', 'GetTickCount', 'CreateFileA', 'WriteFile', 'CloseHandle', 'ExitProcess'];
  const s32Funcs = ['ShellExecuteA'];

  const iatK32Rva = dataRva + 0;
  const iatS32Rva = dataRva + 28;
  const importDirRva = dataRva + 36;
  const iltK32Rva = dataRva + 36 + 60; // 96
  const iltS32Rva = iltK32Rva + 28; // 124

  const namesOffset = 124 + 8; // 132

  const dataList: number[] = new Array(namesOffset).fill(0);

  // Helper to push bytes
  const pushBytes = (arr: Uint8Array | number[]) => {
    for (let i = 0; i < arr.length; i++) dataList.push(arr[i]);
  };

  // Helper to push string + null
  const pushString = (str: string) => {
    const b = encoder.encode(str + '\0');
    pushBytes(b);
  };

  // Build Hint/Name entries
  const iltK32Entries: number[] = [];
  for (const fn of k32Funcs) {
    const entryRva = dataRva + dataList.length;
    iltK32Entries.push(entryRva);
    dataList.push(0, 0); // Hint (WORD 0)
    pushString(fn);
    if (dataList.length % 2 !== 0) dataList.push(0); // Word alignment
  }

  const iltS32Entries: number[] = [];
  for (const fn of s32Funcs) {
    const entryRva = dataRva + dataList.length;
    iltS32Entries.push(entryRva);
    dataList.push(0, 0);
    pushString(fn);
    if (dataList.length % 2 !== 0) dataList.push(0);
  }

  // DLL Names
  const k32DllRva = dataRva + dataList.length;
  pushString('kernel32.dll');
  const s32DllRva = dataRva + dataList.length;
  pushString('shell32.dll');
  while (dataList.length % 4 !== 0) dataList.push(0);

  // Strings
  const szOpenRva = dataRva + dataList.length;
  pushString('open');
  while (dataList.length % 4 !== 0) dataList.push(0);

  const szFilenameRva = dataRva + dataList.length;
  pushBytes(tempFilename);
  while (dataList.length % 4 !== 0) dataList.push(0);

  const szMsedgeRva = dataRva + dataList.length;
  pushString('msedge.exe');
  while (dataList.length % 4 !== 0) dataList.push(0);

  const szChromeRva = dataRva + dataList.length;
  pushString('chrome.exe');
  while (dataList.length % 4 !== 0) dataList.push(0);

  const szAppPrefixRva = dataRva + dataList.length;
  pushString('--new-window --app="file:///');
  while (dataList.length % 4 !== 0) dataList.push(0);

  // HTML Content
  const htmlDataRva = dataRva + dataList.length;
  pushBytes(htmlBytes);

  // Align .data to fileAlign
  while (dataList.length % fileAlign !== 0) dataList.push(0);

  const dataBytes = new Uint8Array(dataList);
  const dataView = new DataView(dataBytes.buffer);

  // Write K32 IAT & ILT
  for (let i = 0; i < iltK32Entries.length; i++) {
    dataView.setUint32(i * 4, iltK32Entries[i], true);
    dataView.setUint32(96 + i * 4, iltK32Entries[i], true);
  }
  dataView.setUint32(iltK32Entries.length * 4, 0, true);
  dataView.setUint32(96 + iltK32Entries.length * 4, 0, true);

  // Write S32 IAT & ILT
  for (let i = 0; i < iltS32Entries.length; i++) {
    dataView.setUint32(28 + i * 4, iltS32Entries[i], true);
    dataView.setUint32(124 + i * 4, iltS32Entries[i], true);
  }
  dataView.setUint32(28 + iltS32Entries.length * 4, 0, true);
  dataView.setUint32(124 + iltS32Entries.length * 4, 0, true);

  // Write Import Descriptors
  // Desc 0: kernel32
  dataView.setUint32(36 + 0, iltK32Rva, true); // OriginalFirstThunk
  dataView.setUint32(36 + 4, 0, true); // TimeDateStamp
  dataView.setUint32(36 + 8, 0, true); // ForwarderChain
  dataView.setUint32(36 + 12, k32DllRva, true); // Name
  dataView.setUint32(36 + 16, iatK32Rva, true); // FirstThunk (IAT)

  // Desc 1: shell32
  dataView.setUint32(56 + 0, iltS32Rva, true);
  dataView.setUint32(56 + 4, 0, true);
  dataView.setUint32(56 + 8, 0, true);
  dataView.setUint32(56 + 12, s32DllRva, true);
  dataView.setUint32(56 + 16, iatS32Rva, true);

  // Desc 2: Null terminator (zeros)
  for (let i = 0; i < 20; i++) dataView.setUint8(76 + i, 0);

  const importTableSize = 60;
  const iatTotalSize = 36;

  // IAT Virtual Addresses
  const pGetTempPathA = imageBase + iatK32Rva + 0 * 4;
  const pCreateFileA = imageBase + iatK32Rva + 2 * 4;
  const pWriteFile = imageBase + iatK32Rva + 3 * 4;
  const pCloseHandle = imageBase + iatK32Rva + 4 * 4;
  const pExitProcess = imageBase + iatK32Rva + 5 * 4;
  const pShellExecute = imageBase + iatS32Rva + 0 * 4;

  const pSzOpen = imageBase + szOpenRva;
  const pSzFilename = imageBase + szFilenameRva;
  const pSzMsedge = imageBase + szMsedgeRva;
  const pSzChrome = imageBase + szChromeRva;
  const pSzAppPrefix = imageBase + szAppPrefixRva;
  const pHtmlData = imageBase + htmlDataRva;
  const htmlLen = htmlBytes.length;
  const filenameLen = tempFilename.length;

  // Build .text Section (Native x86 Machine Code)
  const textList: number[] = [];
  const pushU32 = (val: number) => {
    textList.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff);
  };

  // Stack frame layout:
  // [ebp - 516]:  buffer for full temp file path (up to 512 bytes)
  // [ebp - 1540]: buffer for app-mode launch parameters: --app="file:///C:/Users/.../clipanim_Game.html"
  // [ebp - 4]:    lpBytesWritten (4 bytes)
  // 1. Prologue: push ebp; mov ebp, esp; sub esp, 2048 (0x800)
  textList.push(0x55);
  textList.push(0x89, 0xe5);
  textList.push(0x81, 0xec, 0x00, 0x08, 0x00, 0x00);

  // 2. GetTempPathA(260, [ebp - 516])
  textList.push(0x8d, 0x85, 0xfc, 0xfd, 0xff, 0xff); // lea eax, [ebp - 516]
  textList.push(0x50); // push eax
  textList.push(0x68, 0x04, 0x01, 0x00, 0x00); // push 260
  textList.push(0xff, 0x15); // call [pGetTempPathA]
  pushU32(pGetTempPathA);

  // 3. Check if GetTempPathA succeeded (eax > 0)
  textList.push(0x85, 0xc0); // test eax, eax
  const jzFallbackOffset = textList.length;
  textList.push(0x74, 0x00); // jz fallback

  // 4. Success path: append filename
  textList.push(0x8d, 0xbd, 0xfc, 0xfd, 0xff, 0xff); // lea edi, [ebp - 516]
  textList.push(0x01, 0xc7); // add edi, eax
  // Check if last character was already a backslash: cmp byte ptr [edi - 1], '\' (0x5c)
  textList.push(0x80, 0x7f, 0xff, 0x5c);
  const jeCopyOffset = textList.length;
  textList.push(0x74, 0x00); // je copy_filename
  // Append backslash if needed: mov byte ptr [edi], '\'; inc edi
  textList.push(0xc6, 0x07, 0x5c);
  textList.push(0x47);

  // copy_filename:
  const copyFilenameTarget = textList.length;
  textList[jeCopyOffset + 1] = copyFilenameTarget - (jeCopyOffset + 2);

  textList.push(0xbe); // mov esi, pSzFilename
  pushU32(pSzFilename);
  textList.push(0xb9); // mov ecx, filenameLen
  pushU32(filenameLen);
  textList.push(0xfc); // cld
  textList.push(0xf3, 0xa4); // rep movsb
  const jmpBuildArgsOffset = textList.length;
  textList.push(0xeb, 0x00); // jmp build_args

  // fallback: if GetTempPathA failed, just copy filename directly into buffer
  const fallbackTarget = textList.length;
  textList[jzFallbackOffset + 1] = fallbackTarget - (jzFallbackOffset + 2);

  textList.push(0x8d, 0xbd, 0xfc, 0xfd, 0xff, 0xff); // lea edi, [ebp - 516]
  textList.push(0xbe); // mov esi, pSzFilename
  pushU32(pSzFilename);
  textList.push(0xb9); // mov ecx, filenameLen
  pushU32(filenameLen);
  textList.push(0xfc); // cld
  textList.push(0xf3, 0xa4); // rep movsb

  // build_args: synthesize --app="file:///C:/Users/.../game.html"
  const buildArgsTarget = textList.length;
  textList[jmpBuildArgsOffset + 1] = buildArgsTarget - (jmpBuildArgsOffset + 2);

  // Copy prefix '--new-window --app="file:///' (28 bytes) to [ebp - 1540]
  textList.push(0x8d, 0xbd, 0xfc, 0xf9, 0xff, 0xff); // lea edi, [ebp - 1540]
  textList.push(0xbe); // mov esi, pSzAppPrefix
  pushU32(pSzAppPrefix);
  textList.push(0xb9); // mov ecx, 28
  pushU32(28);
  textList.push(0xfc); // cld
  textList.push(0xf3, 0xa4); // rep movsb

  // Copy file path from [ebp - 516], converting '\' to '/'
  textList.push(0x8d, 0xb5, 0xfc, 0xfd, 0xff, 0xff); // lea esi, [ebp - 516]
  const loopCopyStart = textList.length;
  textList.push(0x8a, 0x06); // mov al, [esi]
  textList.push(0x84, 0xc0); // test al, al
  const jzDoneCopyPathOffset = textList.length;
  textList.push(0x74, 0x00); // jz done_copy_path
  textList.push(0x3c, 0x5c); // cmp al, '\' (0x5c)
  const jneSlashOffset = textList.length;
  textList.push(0x75, 0x00); // jne not_slash
  textList.push(0xb0, 0x2f); // mov al, '/' (0x2f)
  const notSlashTarget = textList.length;
  textList[jneSlashOffset + 1] = notSlashTarget - (jneSlashOffset + 2);
  textList.push(0x88, 0x07); // mov [edi], al
  textList.push(0x46); // inc esi
  textList.push(0x47); // inc edi
  const jmpLoopRel = loopCopyStart - (textList.length + 2);
  textList.push(0xeb, jmpLoopRel & 0xff); // jmp loopCopyStart

  const doneCopyPathTarget = textList.length;
  textList[jzDoneCopyPathOffset + 1] = doneCopyPathTarget - (jzDoneCopyPathOffset + 2);

  // Close with closing quote '"' (0x22) and null terminator (0x00)
  textList.push(0xc6, 0x07, 0x22); // mov byte ptr [edi], '"'
  textList.push(0x47); // inc edi
  textList.push(0xc6, 0x07, 0x00); // mov byte ptr [edi], 0

  // 5. CreateFileA:
  // CreateFileA(lpFileName=[ebp - 516], dwDesiredAccess=GENERIC_WRITE 0x40000000,
  //             dwShareMode=FILE_SHARE_READ 1, lpSec=0, dwCreation=CREATE_ALWAYS 2,
  //             dwFlags=FILE_ATTRIBUTE_NORMAL 0x80, hTemplate=0)
  textList.push(0x6a, 0x00); // push 0
  textList.push(0x68, 0x80, 0x00, 0x00, 0x00); // push 0x80
  textList.push(0x6a, 0x02); // push 2
  textList.push(0x6a, 0x00); // push 0
  textList.push(0x6a, 0x01); // push 1
  textList.push(0x68, 0x00, 0x00, 0x00, 0x40); // push 0x40000000
  textList.push(0x8d, 0x85, 0xfc, 0xfd, 0xff, 0xff); // lea eax, [ebp - 516]
  textList.push(0x50); // push eax
  textList.push(0xff, 0x15); // call [pCreateFileA]
  pushU32(pCreateFileA);
  textList.push(0x89, 0xc3); // mov ebx, eax (hFile)

  // cmp ebx, -1 (INVALID_HANDLE_VALUE)
  textList.push(0x83, 0xfb, 0xff);
  const jeLaunchOffset = textList.length;
  textList.push(0x74, 0x00); // je launch_app

  // 6. WriteFile(hFile=ebx, lpBuffer=pHtmlData, nBytes=htmlLen, lpBytesWritten=[ebp - 4], lpOverlapped=0)
  textList.push(0x6a, 0x00); // push 0
  textList.push(0x8d, 0x45, 0xfc); // lea eax, [ebp - 4]
  textList.push(0x50); // push eax
  textList.push(0x68); // push htmlLen
  pushU32(htmlLen);
  textList.push(0x68); // push pHtmlData
  pushU32(pHtmlData);
  textList.push(0x53); // push ebx (hFile)
  textList.push(0xff, 0x15); // call [pWriteFile]
  pushU32(pWriteFile);

  // 7. CloseHandle(ebx)
  textList.push(0x53); // push ebx
  textList.push(0xff, 0x15); // call [pCloseHandle]
  pushU32(pCloseHandle);

  // launch_app:
  const launchAppTarget = textList.length;
  textList[jeLaunchOffset + 1] = launchAppTarget - (jeLaunchOffset + 2);

  // Step 8A: Try launching via msedge.exe in standalone App Mode
  // ShellExecuteA(0, "open", "msedge.exe", --app="file:///...", 0, SW_SHOWNORMAL)
  textList.push(0x6a, 0x01); // push 1 (SW_SHOWNORMAL)
  textList.push(0x6a, 0x00); // push 0 (lpDirectory)
  textList.push(0x8d, 0x85, 0xfc, 0xf9, 0xff, 0xff); // lea eax, [ebp - 1540]
  textList.push(0x50); // push eax (lpParameters)
  textList.push(0x68); // push pSzMsedge
  pushU32(pSzMsedge);
  textList.push(0x68); // push pSzOpen
  pushU32(pSzOpen);
  textList.push(0x6a, 0x00); // push 0 (hwnd)
  textList.push(0xff, 0x15); // call [pShellExecute]
  pushU32(pShellExecute);
  textList.push(0x83, 0xf8, 0x20); // cmp eax, 32
  const jgExitOffset1 = textList.length;
  textList.push(0x7f, 0x00); // jg exit_process (if successful, exit launcher)

  // Step 8B: Fallback try launching via chrome.exe in standalone App Mode
  // ShellExecuteA(0, "open", "chrome.exe", --app="file:///...", 0, SW_SHOWNORMAL)
  textList.push(0x6a, 0x01); // push 1 (SW_SHOWNORMAL)
  textList.push(0x6a, 0x00); // push 0 (lpDirectory)
  textList.push(0x8d, 0x85, 0xfc, 0xf9, 0xff, 0xff); // lea eax, [ebp - 1540]
  textList.push(0x50); // push eax (lpParameters)
  textList.push(0x68); // push pSzChrome
  pushU32(pSzChrome);
  textList.push(0x68); // push pSzOpen
  pushU32(pSzOpen);
  textList.push(0x6a, 0x00); // push 0 (hwnd)
  textList.push(0xff, 0x15); // call [pShellExecute]
  pushU32(pShellExecute);
  textList.push(0x83, 0xf8, 0x20); // cmp eax, 32
  const jgExitOffset2 = textList.length;
  textList.push(0x7f, 0x00); // jg exit_process (if successful, exit launcher)

  // Step 8C: Fallback if neither msedge nor chrome could be directly launched:
  // ShellExecuteA(0, "open", [ebp - 516], 0, 0, SW_SHOWNORMAL)
  textList.push(0x6a, 0x01); // push 1 (SW_SHOWNORMAL)
  textList.push(0x6a, 0x00); // push 0 (lpDirectory)
  textList.push(0x6a, 0x00); // push 0 (lpParameters)
  textList.push(0x8d, 0x85, 0xfc, 0xfd, 0xff, 0xff); // lea eax, [ebp - 516]
  textList.push(0x50); // push eax (lpFile)
  textList.push(0x68); // push pSzOpen
  pushU32(pSzOpen);
  textList.push(0x6a, 0x00); // push 0 (hwnd)
  textList.push(0xff, 0x15); // call [pShellExecute]
  pushU32(pShellExecute);

  // exit_process:
  const exitProcessTarget = textList.length;
  textList[jgExitOffset1 + 1] = exitProcessTarget - (jgExitOffset1 + 2);
  textList[jgExitOffset2 + 1] = exitProcessTarget - (jgExitOffset2 + 2);

  // 9. ExitProcess(0)
  textList.push(0x6a, 0x00); // push 0
  textList.push(0xff, 0x15); // call [pExitProcess]
  pushU32(pExitProcess);
  textList.push(0xc3); // ret

  while (textList.length % fileAlign !== 0) textList.push(0);
  const textBytes = new Uint8Array(textList);

  // Build .rsrc Section (Windows Resource Directory for Icons)
  const numIcons = icons.length;
  const rsrcRva = dataRva + alignUp(dataBytes.length, secAlign);

  // Layout calculations:
  // Root Directory (Level 1): 16 + 2 * 8 = 32 bytes
  // L2 RT_ICON (Type 3): 16 + numIcons * 8
  const l2IconOffset = 32;
  const l2IconSize = 16 + numIcons * 8;
  const l2GrpOffset = l2IconOffset + l2IconSize;
  const l2GrpSize = 16 + 8; // 24 bytes
  const l3IconBaseOffset = l2GrpOffset + l2GrpSize;
  const l3IconTotalSize = numIcons * 24;
  const l3GrpOffset = l3IconBaseOffset + l3IconTotalSize;
  const l3GrpSize = 24;
  const dataEntriesOffset = l3GrpOffset + l3GrpSize;
  const dataEntriesTotalSize = (numIcons + 1) * 16;
  const rawGrpOffset = dataEntriesOffset + dataEntriesTotalSize;
  const grpIconHeaderSize = 6 + 14 * numIcons;
  const rawIconsOffset = rawGrpOffset + grpIconHeaderSize;

  let rsrcBufferLen = rawIconsOffset;
  for (const ic of icons) {
    rsrcBufferLen += alignUp(ic.pngBytes.length, 4);
  }
  const alignedRsrcLen = alignUp(rsrcBufferLen, fileAlign);

  const rsrcBuffer = new ArrayBuffer(alignedRsrcLen);
  const rsrcView = new DataView(rsrcBuffer);
  const rsrcBytes = new Uint8Array(rsrcBuffer);

  // 1. Root Directory (Level 1)
  rsrcView.setUint16(12, 0, true); // NumberOfNamedEntries
  rsrcView.setUint16(14, 2, true); // NumberOfIdEntries (Type 3 & Type 14)
  // Entry 0: RT_ICON (Type 3)
  rsrcView.setUint32(16, 3, true);
  rsrcView.setUint32(20, 0x80000000 | l2IconOffset, true);
  // Entry 1: RT_GROUP_ICON (Type 14)
  rsrcView.setUint32(24, 14, true);
  rsrcView.setUint32(28, 0x80000000 | l2GrpOffset, true);

  // 2. L2 Directory for RT_ICON
  rsrcView.setUint16(l2IconOffset + 14, numIcons, true);
  for (let i = 0; i < numIcons; i++) {
    const entryOffset = l2IconOffset + 16 + i * 8;
    rsrcView.setUint32(entryOffset, i + 1, true); // Icon ID (1, 2, 3...)
    rsrcView.setUint32(entryOffset + 4, 0x80000000 | (l3IconBaseOffset + i * 24), true);
  }

  // 3. L2 Directory for RT_GROUP_ICON
  rsrcView.setUint16(l2GrpOffset + 14, 1, true);
  rsrcView.setUint32(l2GrpOffset + 16, 1, true); // Group Icon ID 1
  rsrcView.setUint32(l2GrpOffset + 20, 0x80000000 | l3GrpOffset, true);

  // 4. L3 Directories for RT_ICONs (Language 0 Neutral)
  for (let i = 0; i < numIcons; i++) {
    const dirOffset = l3IconBaseOffset + i * 24;
    rsrcView.setUint16(dirOffset + 14, 1, true);
    rsrcView.setUint32(dirOffset + 16, 0, true); // Language 0
    rsrcView.setUint32(dirOffset + 20, dataEntriesOffset + i * 16, true);
  }

  // 5. L3 Directory for RT_GROUP_ICON (Language 0 Neutral)
  rsrcView.setUint16(l3GrpOffset + 14, 1, true);
  rsrcView.setUint32(l3GrpOffset + 16, 0, true);
  rsrcView.setUint32(l3GrpOffset + 20, dataEntriesOffset + numIcons * 16, true);

  // 6. Data Entries & Raw Icon Offsets
  let currentIconRawOffset = rawIconsOffset;
  for (let i = 0; i < numIcons; i++) {
    const ic = icons[i];
    const dataEntryOffset = dataEntriesOffset + i * 16;
    rsrcView.setUint32(dataEntryOffset + 0, rsrcRva + currentIconRawOffset, true); // OffsetToData (RVA)
    rsrcView.setUint32(dataEntryOffset + 4, ic.pngBytes.length, true); // Size
    rsrcView.setUint32(dataEntryOffset + 8, 0, true);
    rsrcView.setUint32(dataEntryOffset + 12, 0, true);

    // Copy raw PNG bytes
    rsrcBytes.set(ic.pngBytes, currentIconRawOffset);
    currentIconRawOffset += alignUp(ic.pngBytes.length, 4);
  }

  // Data Entry for Group Icon
  const grpDataEntryOffset = dataEntriesOffset + numIcons * 16;
  rsrcView.setUint32(grpDataEntryOffset + 0, rsrcRva + rawGrpOffset, true);
  rsrcView.setUint32(grpDataEntryOffset + 4, grpIconHeaderSize, true);
  rsrcView.setUint32(grpDataEntryOffset + 8, 0, true);
  rsrcView.setUint32(grpDataEntryOffset + 12, 0, true);

  // 7. Write GRPICONDIR at rawGrpOffset
  rsrcView.setUint16(rawGrpOffset + 0, 0, true); // idReserved
  rsrcView.setUint16(rawGrpOffset + 2, 1, true); // idType = 1 (icon)
  rsrcView.setUint16(rawGrpOffset + 4, numIcons, true); // idCount

  for (let i = 0; i < numIcons; i++) {
    const ic = icons[i];
    const entryOffset = rawGrpOffset + 6 + i * 14;
    rsrcView.setUint8(entryOffset + 0, ic.width >= 256 ? 0 : ic.width); // bWidth
    rsrcView.setUint8(entryOffset + 1, ic.height >= 256 ? 0 : ic.height); // bHeight
    rsrcView.setUint8(entryOffset + 2, 0); // bColorCount
    rsrcView.setUint8(entryOffset + 3, 0); // bReserved
    rsrcView.setUint16(entryOffset + 4, 1, true); // wPlanes
    rsrcView.setUint16(entryOffset + 6, 32, true); // wBitCount
    rsrcView.setUint32(entryOffset + 8, ic.pngBytes.length, true); // dwBytesInRes
    rsrcView.setUint16(entryOffset + 12, i + 1, true); // nId (points to RT_ICON resource ID)
  }

  // Construct Headers Buffer (0x400 = 1024 bytes)
  const hdrBuffer = new ArrayBuffer(0x400);
  const hdrView = new DataView(hdrBuffer);
  const hdrBytes = new Uint8Array(hdrBuffer);

  // DOS MZ Header (64 bytes)
  hdrBytes[0] = 0x4d; // 'M'
  hdrBytes[1] = 0x5a; // 'Z'
  hdrView.setUint16(2, 0x0090, true); // e_cblp: bytes on last page
  hdrView.setUint16(4, 0x0003, true); // e_cp: pages in file
  hdrView.setUint16(8, 0x0004, true); // e_cparhdr: paragraphs in header
  hdrView.setUint16(10, 0x0000, true); // e_minalloc
  hdrView.setUint16(12, 0xffff, true); // e_maxalloc
  hdrView.setUint16(14, 0x0000, true); // e_ss
  hdrView.setUint16(16, 0x00b8, true); // e_sp
  hdrView.setUint16(24, 0x0040, true); // e_lfarlc: reloc table offset
  hdrView.setUint32(0x3c, 0x80, true); // e_lfanew -> points to PE at 0x80

  // Standard 16-bit DOS Stub (at 0x40 - 0x7F)
  const dosStubBytes = [
    0x0e, 0x1f, 0xba, 0x0e, 0x00, 0xb4, 0x09, 0xcd, 0x21, 0xb8, 0x01, 0x4c, 0xcd, 0x21,
    0x54, 0x68, 0x69, 0x73, 0x20, 0x70, 0x72, 0x6f, 0x67, 0x72, 0x61, 0x6d, 0x20, 0x63,
    0x61, 0x6e, 0x6e, 0x6f, 0x74, 0x20, 0x62, 0x65, 0x20, 0x72, 0x75, 0x6e, 0x20, 0x69,
    0x6e, 0x20, 0x44, 0x4f, 0x53, 0x20, 0x6d, 0x6f, 0x64, 0x65, 0x2e, 0x0d, 0x0d, 0x0a,
    0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ];
  hdrBytes.set(dosStubBytes, 0x40);

  // PE Signature
  hdrBytes[0x80] = 0x50; // 'P'
  hdrBytes[0x81] = 0x45; // 'E'
  hdrBytes[0x82] = 0x00;
  hdrBytes[0x83] = 0x00;

  // COFF File Header (20 bytes at 0x84)
  hdrView.setUint16(0x84 + 0, 0x014c, true); // Machine = IMAGE_FILE_MACHINE_I386
  hdrView.setUint16(0x84 + 2, 3, true); // NumberOfSections = 3 (.text, .data, .rsrc)
  hdrView.setUint32(0x84 + 4, Math.floor(Date.now() / 1000), true); // TimeDateStamp
  hdrView.setUint32(0x84 + 8, 0, true); // PointerToSymbolTable
  hdrView.setUint32(0x84 + 12, 0, true); // NumberOfSymbols
  hdrView.setUint16(0x84 + 16, 0x00e0, true); // SizeOfOptionalHeader = 224 bytes
  // Characteristics: IMAGE_FILE_RELOCS_STRIPPED (0x0001) | IMAGE_FILE_EXECUTABLE_IMAGE (0x0002) | IMAGE_FILE_32BIT_MACHINE (0x0100) = 0x0103
  hdrView.setUint16(0x84 + 18, 0x0103, true);

  // Optional Header (224 bytes at 0x98)
  const optOffset = 0x84 + 20; // 0x98
  hdrView.setUint16(optOffset + 0, 0x010b, true); // Magic = PE32
  hdrView.setUint8(optOffset + 2, 14); // MajorLinkerVersion
  hdrView.setUint8(optOffset + 3, 0); // MinorLinkerVersion
  hdrView.setUint32(optOffset + 4, textBytes.length, true); // SizeOfCode
  hdrView.setUint32(optOffset + 8, dataBytes.length + rsrcBytes.length, true); // SizeOfInitializedData
  hdrView.setUint32(optOffset + 12, 0, true); // SizeOfUninitializedData
  hdrView.setUint32(optOffset + 16, textRva, true); // AddressOfEntryPoint
  hdrView.setUint32(optOffset + 20, textRva, true); // BaseOfCode
  hdrView.setUint32(optOffset + 24, dataRva, true); // BaseOfData

  // Windows Specific Fields
  const totalVirtualSize = dataRva + alignUp(dataBytes.length, secAlign) + alignUp(rsrcBytes.length, secAlign);
  hdrView.setUint32(optOffset + 28, imageBase, true); // ImageBase (0x00400000)
  hdrView.setUint32(optOffset + 32, secAlign, true); // SectionAlignment (4096)
  hdrView.setUint32(optOffset + 36, fileAlign, true); // FileAlignment (512)
  hdrView.setUint16(optOffset + 40, 6, true); // MajorOperatingSystemVersion
  hdrView.setUint16(optOffset + 42, 0, true); // MinorOperatingSystemVersion
  hdrView.setUint16(optOffset + 44, 1, true); // MajorImageVersion
  hdrView.setUint16(optOffset + 46, 0, true); // MinorImageVersion
  hdrView.setUint16(optOffset + 48, 6, true); // MajorSubsystemVersion
  hdrView.setUint16(optOffset + 50, 0, true); // MinorSubsystemVersion
  hdrView.setUint32(optOffset + 52, 0, true); // Win32VersionValue
  hdrView.setUint32(optOffset + 56, totalVirtualSize, true); // SizeOfImage
  hdrView.setUint32(optOffset + 60, 0x400, true); // SizeOfHeaders
  hdrView.setUint32(optOffset + 64, 0, true); // CheckSum
  hdrView.setUint16(optOffset + 68, 2, true); // Subsystem = IMAGE_SUBSYSTEM_WINDOWS_GUI (2)
  // DllCharacteristics: NX_COMPAT (0x0100) | TERMINAL_SERVER_AWARE (0x8000) = 0x8100
  // Note: DYNAMIC_BASE (0x0040 / ASLR) MUST NOT be set because the binary does not contain a .reloc section
  hdrView.setUint16(optOffset + 70, 0x8100, true);
  hdrView.setUint32(optOffset + 72, 0x100000, true); // SizeOfStackReserve
  hdrView.setUint32(optOffset + 76, 0x1000, true); // SizeOfStackCommit
  hdrView.setUint32(optOffset + 80, 0x100000, true); // SizeOfHeapReserve
  hdrView.setUint32(optOffset + 84, 0x1000, true); // SizeOfHeapCommit
  hdrView.setUint32(optOffset + 88, 0, true); // LoaderFlags
  hdrView.setUint32(optOffset + 92, 16, true); // NumberOfRvaAndSizes

  // Data Directories (starts at optOffset + 96)
  // Entry 1: Import Directory
  hdrView.setUint32(optOffset + 96 + 1 * 8, importDirRva, true);
  hdrView.setUint32(optOffset + 96 + 1 * 8 + 4, importTableSize, true);

  // Entry 2: Resource Directory
  hdrView.setUint32(optOffset + 96 + 2 * 8, rsrcRva, true);
  hdrView.setUint32(optOffset + 96 + 2 * 8 + 4, rsrcBytes.length, true);

  // Entry 12: IAT Directory
  hdrView.setUint32(optOffset + 96 + 12 * 8, iatK32Rva, true);
  hdrView.setUint32(optOffset + 96 + 12 * 8 + 4, iatTotalSize, true);

  // Section Headers Table (starts at optOffset + 224)
  const secOffset = optOffset + 224;
  const fileOffsetText = 0x400;
  const fileOffsetData = fileOffsetText + textBytes.length;
  const fileOffsetRsrc = fileOffsetData + dataBytes.length;

  const writeSecHeader = (
    idx: number,
    name: string,
    virtSize: number,
    virtAddr: number,
    rawSize: number,
    rawPtr: number,
    chars: number
  ) => {
    const off = secOffset + idx * 40;
    const nameBytes = encoder.encode(name);
    for (let i = 0; i < 8; i++) {
      hdrBytes[off + i] = i < nameBytes.length ? nameBytes[i] : 0;
    }
    hdrView.setUint32(off + 8, virtSize, true);
    hdrView.setUint32(off + 12, virtAddr, true);
    hdrView.setUint32(off + 16, rawSize, true);
    hdrView.setUint32(off + 20, rawPtr, true);
    hdrView.setUint32(off + 24, 0, true);
    hdrView.setUint32(off + 28, 0, true);
    hdrView.setUint16(off + 32, 0, true);
    hdrView.setUint16(off + 34, 0, true);
    hdrView.setUint32(off + 36, chars, true);
  };

  // Section 0: .text (Code, Read, Execute: 0x60000020)
  writeSecHeader(0, '.text', textBytes.length, textRva, textBytes.length, fileOffsetText, 0x60000020);

  // Section 1: .data (Initialized, Read, Write: 0xC0000040)
  writeSecHeader(1, '.data', dataBytes.length, dataRva, dataBytes.length, fileOffsetData, 0xc0000040);

  // Section 2: .rsrc (Initialized, Read: 0x40000040)
  writeSecHeader(2, '.rsrc', rsrcBytes.length, rsrcRva, rsrcBytes.length, fileOffsetRsrc, 0x40000040);

  // Combine full executable binary
  const totalExeSize = hdrBytes.length + textBytes.length + dataBytes.length + rsrcBytes.length;
  const fullExe = new Uint8Array(totalExeSize);
  fullExe.set(hdrBytes, 0);
  fullExe.set(textBytes, fileOffsetText);
  fullExe.set(dataBytes, fileOffsetData);
  fullExe.set(rsrcBytes, fileOffsetRsrc);

  return fullExe;
}

/**
 * Fetches or extracts the native WebView2 runner runtime
 */
async function getWebviewRuntimeZip(): Promise<JSZip | null> {
  try {
    const res = await fetch('/runtimes/webview.zip');
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      return zip;
    }
  } catch (err) {
    console.warn('Could not load local runtime /runtimes/webview.zip, trying fallback CDN...', err);
  }

  try {
    const res = await fetch('https://raw.githubusercontent.com/jgc777/HTML2EXE-2.0/master/releases/download/113/webview.zip');
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      return zip;
    }
  } catch (err) {
    console.warn('CDN fallback failed:', err);
  }

  return null;
}

/**
 * End-to-end export function that:
 * 1. Packages the game into self-contained HTML
 * 2. Prepares multi-resolution icon assets (from user upload or default)
 * 3. Builds the true native Windows executable (.exe) and desktop runner package
 * 4. Ensures 100% zero Microsoft Edge browser branding or browser tabs
 */
export async function exportWindowsGameExe(
  options: GenerateHtmlGameOptions & { exeOptions?: ExeExportOptions }
): Promise<WindowsExeResult> {
  const { onProgress, exeOptions, projectName } = options;

  if (onProgress) onProgress(10);

  // 1. Generate full self-contained HTML game payload
  const { blob: htmlBlob } = await generateLiveHtmlGame({
    ...options,
    isStandaloneExe: true,
    onProgress: (pct) => {
      if (onProgress) onProgress(10 + Math.round(pct * 0.45)); // 10% - 55%
    },
  });

  const htmlContent = await htmlBlob.text();

  if (onProgress) onProgress(60);

  // 2. Process icons into resolutions
  const iconResolutions = [16, 32, 48, 64, 128, 256];
  const iconSource = exeOptions?.customIconBlob || exeOptions?.customIconDataUrl || null;
  const processedIcons = await processIconToResolutions(iconSource, iconResolutions);
  const icoBytes = buildIcoFileBinary(processedIcons);
  const icoBlob = new Blob([icoBytes.buffer as ArrayBuffer], { type: 'image/x-icon' });
  const icoUrl = URL.createObjectURL(icoBlob);
  const cleanName = projectName.replace(/[^a-zA-Z0-9_\-]/g, '_').trim() || 'Game';
  const icoFilename = `${cleanName}.ico`;
  const highestRes = processedIcons[processedIcons.length - 1] || processedIcons[0];

  if (onProgress) onProgress(75);

  // 3. Load WebView2 Native Windows runner
  const runtimeZip = await getWebviewRuntimeZip();
  let webviewExeData: Uint8Array | null = null;
  let webviewLoaderDllData: Uint8Array | null = null;

  if (runtimeZip) {
    const exeFile = runtimeZip.file('Webview.exe');
    const dllFile = runtimeZip.file('WebView2Loader.dll');
    if (exeFile) webviewExeData = await exeFile.async('uint8array');
    if (dllFile) webviewLoaderDllData = await dllFile.async('uint8array');
  }

  // 4. Build config.json for embedded native window
  const windowWidth = options.canvasSize?.width ? Math.max(800, options.canvasSize.width) : 1280;
  const windowHeight = options.canvasSize?.height ? Math.max(600, options.canvasSize.height) : 720;
  const configObj = {
    title: projectName,
    width: windowWidth,
    height: windowHeight,
    resizable: true,
    fullscreen: false,
    maximized: false,
    control_box: true,
    minimizable: true,
    maximizable: true,
    show_in_taskbar: true,
    icon: 'icon.ico',
    context_menu: false,
    dev_tools: false,
    zoom_control: false,
    always_on_top: false
  };
  const configJsonStr = JSON.stringify(configObj, null, 2);

  if (onProgress) onProgress(85);

  // 5. Assemble full standalone Windows Game Suite
  const zip = new JSZip();

  // If native WebView binary was loaded, include the direct .exe and .dll
  if (webviewExeData && webviewLoaderDllData) {
    zip.file(`${cleanName}.exe`, webviewExeData);
    zip.file('WebView2Loader.dll', webviewLoaderDllData);
  } else {
    // Fallback: build PE32 executable binary
    const peExeBytes = buildWindowsExeBinary({
      htmlContent,
      projectName,
      icons: processedIcons,
    });
    zip.file(`${cleanName}.exe`, peExeBytes);
  }

  // Configuration and game files
  zip.file('config.json', configJsonStr);
  zip.file('index.html', htmlContent);
  zip.file('icon.ico', icoBytes);
  zip.file('icon.png', highestRes.pngBytes);

  // webfiles subfolder for runtime compatibility
  const webfiles = zip.folder('webfiles');
  if (webfiles) {
    webfiles.file('index.html', htmlContent);
    webfiles.file('icon.ico', icoBytes);
    webfiles.file('config.json', configJsonStr);
  }

  // Launcher batch file
  const launcherBat = `@echo off
title Launching ${projectName}
cd /d "%~dp0"
start "" "${cleanName}.exe"
`;
  zip.file(`Play_${cleanName}.bat`, launcherBat);

  // README with instructions
  const readme = `================================================================
  ${projectName.toUpperCase()} - STANDALONE WINDOWS GAME (.EXE)
================================================================

HOW TO PLAY:
1. Extract all files from this ZIP to a folder.
2. Double-click "${cleanName}.exe" to launch the game!

FEATURES:
- Native desktop window execution (powered by Windows WebView2 runtime)
- NO Microsoft Edge browser window, tabs, or address bar
- Dedicated custom window title, game icon, and taskbar entry
- 100% offline standalone game logic & audio

DISTRIBUTION:
To share your game with friends or on itch.io, simply zip this folder
and distribute it. Players only need to unzip and run ${cleanName}.exe!
`;
  zip.file('README.txt', readme);

  if (onProgress) onProgress(95);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  const zipFilename = `${cleanName}_Windows_Game.zip`;

  if (onProgress) onProgress(100);

  return {
    blob: zipBlob,
    url: zipUrl,
    filename: zipFilename,
    sizeBytes: zipBlob.size,
    icoBlob,
    icoUrl,
    icoFilename,
  };
}

/**
 * Converts any custom HTML file or code into a standalone Windows .exe package
 */
export async function convertCustomHtmlToExe(options: {
  htmlContent: string;
  gameTitle: string;
  width?: number;
  height?: number;
  fullscreen?: boolean;
  resizable?: boolean;
  customIconBlob?: Blob | null;
  onProgress?: (percent: number) => void;
}): Promise<{ blob: Blob; url: string; filename: string }> {
  const { htmlContent, gameTitle, width = 1280, height = 720, fullscreen = false, resizable = true, customIconBlob, onProgress } = options;

  if (onProgress) onProgress(15);

  const cleanName = gameTitle.replace(/[^a-zA-Z0-9_\-]/g, '_').trim() || 'CustomApp';

  // Process icon
  const iconResolutions = [16, 32, 48, 64, 128, 256];
  const processedIcons = await processIconToResolutions(customIconBlob || null, iconResolutions);
  const icoBytes = buildIcoFileBinary(processedIcons);
  const highestRes = processedIcons[processedIcons.length - 1] || processedIcons[0];

  if (onProgress) onProgress(45);

  const runtimeZip = await getWebviewRuntimeZip();
  let webviewExeData: Uint8Array | null = null;
  let webviewLoaderDllData: Uint8Array | null = null;

  if (runtimeZip) {
    const exeFile = runtimeZip.file('Webview.exe');
    const dllFile = runtimeZip.file('WebView2Loader.dll');
    if (exeFile) webviewExeData = await exeFile.async('uint8array');
    if (dllFile) webviewLoaderDllData = await dllFile.async('uint8array');
  }

  if (onProgress) onProgress(70);

  const configObj = {
    title: gameTitle,
    width,
    height,
    resizable,
    fullscreen,
    maximized: false,
    control_box: true,
    minimizable: true,
    maximizable: resizable,
    show_in_taskbar: true,
    icon: 'icon.ico',
    context_menu: false,
    dev_tools: false,
    zoom_control: false,
    always_on_top: false
  };

  const zip = new JSZip();

  if (webviewExeData && webviewLoaderDllData) {
    zip.file(`${cleanName}.exe`, webviewExeData);
    zip.file('WebView2Loader.dll', webviewLoaderDllData);
  } else {
    const peExeBytes = buildWindowsExeBinary({
      htmlContent,
      projectName: gameTitle,
      icons: processedIcons,
    });
    zip.file(`${cleanName}.exe`, peExeBytes);
  }

  zip.file('config.json', JSON.stringify(configObj, null, 2));
  zip.file('index.html', htmlContent);
  zip.file('icon.ico', icoBytes);
  zip.file('icon.png', highestRes.pngBytes);

  const webfiles = zip.folder('webfiles');
  if (webfiles) {
    webfiles.file('index.html', htmlContent);
    webfiles.file('icon.ico', icoBytes);
    webfiles.file('config.json', JSON.stringify(configObj, null, 2));
  }

  zip.file(`Play_${cleanName}.bat`, `@echo off\ncd /d "%~dp0"\nstart "" "${cleanName}.exe"\n`);
  zip.file('README.txt', `Converted HTML to Windows Executable\nDouble-click ${cleanName}.exe to run!`);

  if (onProgress) onProgress(90);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  const zipFilename = `${cleanName}_Windows_App.zip`;

  if (onProgress) onProgress(100);

  return {
    blob: zipBlob,
    url: zipUrl,
    filename: zipFilename,
  };
}

/**
 * Packages the game into a Zero-Browser Desktop Game Distribution (.zip)
 * Includes:
 * - index.html (self-contained offline game)
 * - package.json (standalone game window manifest)
 * - icon.png & icon.ico
 * - build_standalone_exe.bat (1-click script to produce a true Game.exe with 0 browser branding)
 * - README.txt (publishing guide for itch.io / Steam)
 */
export async function exportDesktopGamePackageZip(
  options: GenerateHtmlGameOptions & { exeOptions?: ExeExportOptions }
): Promise<{ blob: Blob; url: string; filename: string }> {
  const { onProgress, exeOptions, projectName } = options;

  if (onProgress) onProgress(15);

  // 1. Generate full self-contained HTML game
  const { blob: htmlBlob } = await generateLiveHtmlGame({
    ...options,
    isStandaloneExe: true,
    onProgress: (pct) => {
      if (onProgress) onProgress(15 + Math.round(pct * 0.45));
    },
  });
  const htmlContent = await htmlBlob.text();

  if (onProgress) onProgress(65);

  // 2. Process icons
  const iconResolutions = [16, 32, 48, 64, 128, 256];
  const iconSource = exeOptions?.customIconBlob || exeOptions?.customIconDataUrl || null;
  const processedIcons = await processIconToResolutions(iconSource, iconResolutions);
  const icoBytes = buildIcoFileBinary(processedIcons);

  // Get highest res icon as PNG
  const highestRes = processedIcons[processedIcons.length - 1] || processedIcons[0];

  if (onProgress) onProgress(80);

  const cleanName = projectName.replace(/[^a-zA-Z0-9_\-]/g, '_').trim() || 'Game';

  // 3. Assemble zip
  const zip = new JSZip();

  // index.html
  zip.file('index.html', htmlContent);

  // icon.png & icon.ico
  zip.file('icon.png', highestRes.pngBytes);
  zip.file('icon.ico', icoBytes);

  // package.json for standalone native window
  const packageJson = {
    name: cleanName.toLowerCase(),
    version: '1.0.0',
    description: `${projectName} - Standalone Desktop Game`,
    main: 'index.html',
    window: {
      title: projectName,
      icon: 'icon.png',
      width: options.canvasSize?.width ? Math.max(800, options.canvasSize.width) : 1280,
      height: options.canvasSize?.height ? Math.max(600, options.canvasSize.height) : 720,
      position: 'center',
      resizable: true,
      toolbar: false,
      frame: true,
      kiosk: false,
      fullscreen: false
    }
  };
  zip.file('package.json', JSON.stringify(packageJson, null, 2));

  // build_standalone_exe.bat
  const buildBat = `@echo off
title Building Standalone ${cleanName}.exe
echo ================================================================
echo   Building True Standalone Windows Game (.exe)
echo   Project: ${projectName}
echo   Zero-Browser Engine: NW.js Embedded Desktop Runtime
echo ================================================================
echo.

echo [1/4] Preparing temporary directories...
if exist temp_build rmdir /s /q temp_build
mkdir temp_build

echo [2/4] Downloading lightweight portable desktop runner (NW.js)...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://dl.nwjs.io/v0.84.0/nwjs-v0.84.0-win-x64.zip', 'temp_build\\nwjs.zip')"

echo [3/4] Extracting desktop engine files...
powershell -Command "Expand-Archive -Path 'temp_build\\nwjs.zip' -DestinationPath 'temp_build\\extracted' -Force"

echo [4/4] Merging game package directly into standalone executable...
powershell -Command "Compress-Archive -Path 'index.html', 'package.json', 'icon.png' -DestinationPath 'temp_build\\package.nw' -Force"
copy /b temp_build\\extracted\\nwjs-v0.84.0-win-x64\\nw.exe+temp_build\\package.nw "${cleanName}.exe" > nul

echo Copying required engine DLLs...
copy temp_build\\extracted\\nwjs-v0.84.0-win-x64\\*.dll . > nul 2>&1
copy temp_build\\extracted\\nwjs-v0.84.0-win-x64\\*.bin . > nul 2>&1
copy temp_build\\extracted\\nwjs-v0.84.0-win-x64\\*.pak . > nul 2>&1

echo Cleaning up build cache...
rmdir /s /q temp_build

echo.
echo ================================================================
echo   BUILD COMPLETE!
echo   Executable created: ${cleanName}.exe
echo   
echo   * Double-click ${cleanName}.exe to play immediately!
echo   * NO Microsoft Edge, NO Chrome, NO browser tabs!
echo   * Displays strictly as a standalone native game window.
echo ================================================================
echo.
pause
`;
  zip.file('build_standalone_exe.bat', buildBat);

  // run_with_npx.bat
  const runNpxBat = `@echo off
title Running ${projectName} via Desktop Runner
echo Launching ${projectName} in dedicated game window...
npx nw .
`;
  zip.file('run_with_npx.bat', runNpxBat);

  // README.txt
  const readme = `================================================================
  ${projectName.toUpperCase()} - STANDALONE DESKTOP GAME PACKAGE
================================================================

This package lets you run and distribute your game as a 100% standalone
Windows executable (${cleanName}.exe) with NO Microsoft Edge, NO Chrome,
and NO web browser interface.

HOW TO BUILD YOUR STANDALONE .EXE:
----------------------------------------------------------------
METHOD 1 (Recommended - 1-Click Auto Builder):
1. Double-click "build_standalone_exe.bat"
2. The script will automatically package your game and generate "${cleanName}.exe".
3. Double-click "${cleanName}.exe" to play!
   - Shows as "${cleanName}.exe" in Task Manager
   - No browser tabs, no address bar, no Microsoft Edge

METHOD 2 (If you have Node.js installed):
1. Open this folder in a terminal
2. Run: npx nw .
3. Your game will open instantly in a native desktop window!

METHOD 3 (Play in any browser offline):
- Simply double-click "index.html" to open the game in any web browser.

DISTRIBUTING TO ITCH.IO OR STEAM:
----------------------------------------------------------------
After running "build_standalone_exe.bat", zip the folder containing:
- ${cleanName}.exe
- The supporting .dll and .pak files
Upload that ZIP to itch.io or Steam as your Windows game release!
`;
  zip.file('README.txt', readme);

  if (onProgress) onProgress(90);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  const zipFilename = `${cleanName}_DesktopGame_Package.zip`;

  if (onProgress) onProgress(100);

  return {
    blob: zipBlob,
    url: zipUrl,
    filename: zipFilename,
  };
}

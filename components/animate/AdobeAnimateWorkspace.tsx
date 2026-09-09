import React from 'react';
import { 
  WorkspaceMode, ToolType, ShapeType, BrushType, SymmetryMode, 
  Frame, Layer, LayerFolder, AudioTrack, BackgroundSettings, 
  Actor, BackpackItem, SelectionState, OnionSkinSettings, Point 
} from '../../types';
import { AnimateHeader } from './AnimateHeader';
import { AnimateTimeline } from './AnimateTimeline';
import { AnimateToolbar } from './AnimateToolbar';
import { AnimateRightDock } from './AnimateRightDock';
import { CanvasArea, CanvasAreaHandle } from '../CanvasArea';

interface AdobeAnimateWorkspaceProps {
  // Project & Document
  projectName: string;
  setProjectName: (name: string) => void;
  hasUnsavedChanges: boolean;
  canvasWidth: number;
  canvasHeight: number;
  setCanvasSize: (size: { width: number; height: number }) => void;
  fps: number;
  setFps: (fps: number) => void;
  background: BackgroundSettings;
  setBackground: (bg: BackgroundSettings) => void;
  backgroundImage: string | null;

  // Workspace
  workspaceMode: WorkspaceMode;
  onSetWorkspaceMode: (mode: WorkspaceMode) => void;

  // Modals & Triggers
  onSaveProject: () => void;
  onExportMovie: () => void;
  onOpenProjectSettings: () => void;
  onOpenGlobalSettings: () => void;
  onTestMovie: () => void;
  onOpenCodeEditor: () => void;
  onOpenHelp: () => void;
  onOpenTutorial: () => void;
  onOpenAssetLibrary: () => void;
  onOpenBackpack: () => void;
  onOpenSoundLibrary: () => void;
  onOpenAudioEditor?: () => void;
  onOpenRecorder?: () => void;
  onOpenSpritesheetExport: () => void;
  onOpenFrameManager?: () => void;
  onExitToMenu: () => void;

  // Frames & Timeline
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onCopyFrame: (index: number) => void;
  onTweenFrame: (index: number) => void;
  onUpdateFrameDuration: (index: number, multiplier: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onionSkin: boolean;
  onToggleOnionSkin: () => void;
  onionSkinSettings: OnionSkinSettings;

  // Layers
  layers: Layer[];
  layerFolders?: LayerFolder[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onAddLayerFolder?: () => void;
  onRemoveLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onUpdateLayer: (layerId: string, dataUrl: string) => void;
  onUpdateLayerSettings: (id: string, opacity: number, blendMode: GlobalCompositeOperation) => void;

  // Audio
  audioTracks: AudioTrack[];
  onAddAudioTrack: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudioTrack: (id: string) => void;
  onUpdateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;

  // Tools & Drawing
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  currentBrushType: BrushType;
  onSelectBrushType: (type: BrushType) => void;
  currentColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  fillOpacity: number;
  onChangeFillOpacity: (opacity: number) => void;
  fillTolerance: number;
  onChangeFillTolerance: (tolerance: number) => void;
  smoothing: number;
  onChangeSmoothing: (smoothing: number) => void;
  shapeType: ShapeType;
  onSelectShapeType: (type: ShapeType) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  symmetryMode: SymmetryMode;
  onSelectSymmetryMode: (mode: SymmetryMode) => void;
  textToolFont: string;
  onSelectTextToolFont: (font: string) => void;
  textToolBold: boolean;
  setTextToolBold: (bold: boolean) => void;
  textToolItalic: boolean;
  setTextToolItalic: (italic: boolean) => void;

  // Selections & Symbols
  selection: SelectionState | null;
  onSelectionCreate: (data: SelectionState) => void;
  onSelectionUpdate: (data: SelectionState) => void;
  onSelectionCommit: (override?: SelectionState) => void;
  onSelectionDelete: () => void;
  onSelectionMakeSymbol?: (override?: SelectionState) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate: () => void;

  // Actors & Backpack
  actors: Actor[];
  onAddActor: (actor: Actor) => void;
  onRemoveActor: (id: string) => void;
  onEnterSymbolEditMode?: (actorId: string) => void;
  backpackItems: BackpackItem[];
  onStampBackpackItem: (item: BackpackItem) => void;

  // Import
  onImportImage: (file: File) => void;
  onImportVideo: (file: File) => void;

  // History
  onUndo?: () => void;
  onRedo?: () => void;

  // Device & Motion Path
  deviceType: 'mobile' | 'pc' | null;
  cameraMode: boolean;
  onToggleCameraMode: () => void;
  onApplyMotionPath: (points: Point[]) => void;
  canvasRef: React.RefObject<CanvasAreaHandle>;
}

export const AdobeAnimateWorkspace: React.FC<AdobeAnimateWorkspaceProps> = ({
  projectName,
  setProjectName,
  hasUnsavedChanges,
  canvasWidth,
  canvasHeight,
  setCanvasSize,
  fps,
  setFps,
  background,
  setBackground,
  backgroundImage,
  workspaceMode,
  onSetWorkspaceMode,
  onSaveProject,
  onExportMovie,
  onOpenProjectSettings,
  onOpenGlobalSettings,
  onTestMovie,
  onOpenCodeEditor,
  onOpenHelp,
  onOpenTutorial,
  onOpenAssetLibrary,
  onOpenBackpack,
  onOpenSoundLibrary,
  onOpenAudioEditor,
  onOpenRecorder,
  onOpenSpritesheetExport,
  onOpenFrameManager,
  onExitToMenu,
  frames,
  currentFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame,
  onCopyFrame,
  onTweenFrame,
  onUpdateFrameDuration,
  isPlaying,
  onTogglePlay,
  isLooping,
  onToggleLoop,
  onionSkin,
  onToggleOnionSkin,
  onionSkinSettings,
  layers,
  layerFolders,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onAddLayerFolder,
  onRemoveLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onRenameLayer,
  onUpdateLayer,
  onUpdateLayerSettings,
  audioTracks,
  onAddAudioTrack,
  onRemoveAudioTrack,
  onUpdateAudioTrack,
  currentTool,
  onSelectTool,
  currentBrushType,
  onSelectBrushType,
  currentColor,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  fillOpacity,
  onChangeFillOpacity,
  fillTolerance,
  onChangeFillTolerance,
  smoothing,
  onChangeSmoothing,
  shapeType,
  onSelectShapeType,
  showGrid,
  onToggleGrid,
  isFocusMode,
  onToggleFocusMode,
  symmetryMode,
  onSelectSymmetryMode,
  textToolFont,
  onSelectTextToolFont,
  textToolBold,
  setTextToolBold,
  textToolItalic,
  setTextToolItalic,
  selection,
  onSelectionCreate,
  onSelectionUpdate,
  onSelectionCommit,
  onSelectionDelete,
  onSelectionMakeSymbol,
  onFlipHorizontal,
  onFlipVertical,
  onRotate,
  actors,
  onAddActor,
  onRemoveActor,
  onEnterSymbolEditMode,
  backpackItems,
  onStampBackpackItem,
  onImportImage,
  onImportVideo,
  onUndo,
  onRedo,
  deviceType,
  cameraMode,
  onToggleCameraMode,
  onApplyMotionPath,
  canvasRef
}) => {
  const [framebarPosition, setFramebarPosition] = React.useState<'top' | 'bottom'>(() => {
    const saved = localStorage.getItem('clipanim_framebar_pos');
    return (saved as 'top' | 'bottom') || 'top';
  });

  const toggleFramebarPosition = () => {
    setFramebarPosition(prev => {
      const next = prev === 'top' ? 'bottom' : 'top';
      localStorage.setItem('clipanim_framebar_pos', next);
      return next;
    });
  };

  const currentFrame = frames[currentFrameIndex] || frames[0];
  const beforeFrames = onionSkin ? frames.slice(Math.max(0, currentFrameIndex - onionSkinSettings.numBefore), currentFrameIndex) : [];
  const afterFrames = onionSkin ? frames.slice(currentFrameIndex + 1, currentFrameIndex + 1 + onionSkinSettings.numAfter) : [];

  const renderTimeline = () => (
    <AnimateTimeline
      frames={frames}
      currentFrameIndex={currentFrameIndex}
      onSelectFrame={onSelectFrame}
      onAddFrame={onAddFrame}
      onDeleteFrame={onDeleteFrame}
      onCopyFrame={onCopyFrame}
      onTweenFrame={onTweenFrame}
      isPlaying={isPlaying}
      onTogglePlay={onTogglePlay}
      isLooping={isLooping}
      onToggleLoop={onToggleLoop}
      audioTracks={audioTracks}
      onAddAudioTrack={onAddAudioTrack}
      onRemoveAudioTrack={onRemoveAudioTrack}
      onUpdateAudioTrack={onUpdateAudioTrack}
      onUpdateFrameDuration={onUpdateFrameDuration}
      fps={fps}
      layers={layers}
      layerFolders={layerFolders}
      activeLayerId={activeLayerId}
      onSelectLayer={onSelectLayer}
      onAddLayer={onAddLayer}
      onAddLayerFolder={onAddLayerFolder}
      onRemoveLayer={onRemoveLayer}
      onToggleLayerVisibility={onToggleLayerVisibility}
      onToggleLayerLock={onToggleLayerLock}
      onRenameLayer={onRenameLayer}
      onionSkin={onionSkin}
      onToggleOnionSkin={onToggleOnionSkin}
      background={background}
      backgroundImage={backgroundImage}
      onOpenSoundLibrary={onOpenSoundLibrary}
      onOpenAudioEditor={onOpenAudioEditor}
      onOpenRecorder={onOpenRecorder}
      onOpenBackpack={onOpenBackpack}
      onOpenFrameManager={onOpenFrameManager}
      framebarPosition={framebarPosition}
      onToggleFramebarPosition={toggleFramebarPosition}
    />
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1a1a1a] text-gray-200 overflow-hidden font-sans select-none">
      
      {/* 1. Adobe Animate Top Header & Menus */}
      <AnimateHeader
        projectName={projectName}
        setProjectName={setProjectName}
        hasUnsavedChanges={hasUnsavedChanges}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        fps={fps}
        workspaceMode={workspaceMode}
        onSetWorkspaceMode={onSetWorkspaceMode}
        onSaveProject={onSaveProject}
        onExportMovie={onExportMovie}
        onOpenProjectSettings={onOpenProjectSettings}
        onOpenGlobalSettings={onOpenGlobalSettings}
        onTestMovie={onTestMovie}
        onOpenCodeEditor={onOpenCodeEditor}
        onOpenHelp={onOpenHelp}
        onOpenTutorial={onOpenTutorial}
        onOpenAssetLibrary={onOpenAssetLibrary}
        onOpenBackpack={onOpenBackpack}
        onOpenSoundLibrary={onOpenSoundLibrary}
        onOpenAudioEditor={onOpenAudioEditor}
        onOpenRecorder={onOpenRecorder}
        onOpenSpritesheetExport={onOpenSpritesheetExport}
        onUndo={onUndo}
        onRedo={onRedo}
        onAddLayer={onAddLayer}
        onAddLayerFolder={onAddLayerFolder}
        onAddKeyframe={onAddFrame}
        onInsertBlankFrame={onAddFrame}
        onDeleteFrame={() => onDeleteFrame(currentFrameIndex)}
        onConvertToSymbol={() => onSelectionMakeSymbol?.()}
        onTweenFrame={() => onTweenFrame(currentFrameIndex)}
        onTogglePlay={onTogglePlay}
        isPlaying={isPlaying}
        onImportImage={onImportImage}
        onImportVideo={onImportVideo}
        onExitToMenu={onExitToMenu}
        actorsCount={actors.length}
        framebarPosition={framebarPosition}
        onToggleFramebarPosition={toggleFramebarPosition}
      />

      {/* 2. Framebar Timeline Top (when docked above stage) */}
      {framebarPosition === 'top' && renderTimeline()}

      {/* 3. Middle Work Area: Toolbar + Stage Canvas + Right Dock */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Vertical Toolstrip */}
        <AnimateToolbar
          currentTool={currentTool}
          onSelectTool={onSelectTool}
          currentBrushType={currentBrushType}
          onSelectBrushType={onSelectBrushType}
          currentColor={currentColor}
          onChangeColor={onChangeColor}
          strokeWidth={strokeWidth}
          onChangeStrokeWidth={onChangeStrokeWidth}
          onionSkin={onionSkin}
          onToggleOnionSkin={onToggleOnionSkin}
          showGrid={showGrid}
          onToggleGrid={onToggleGrid}
          isFocusMode={isFocusMode}
          onToggleFocusMode={onToggleFocusMode}
          onImportImage={onImportImage}
          onImportVideo={onImportVideo}
          hasSelection={Boolean(selection)}
          onFlipHorizontal={onFlipHorizontal}
          onFlipVertical={onFlipVertical}
          onRotate={onRotate}
          onSelectionCommit={() => onSelectionCommit()}
          onSelectionDelete={onSelectionDelete}
          onSelectionMakeSymbol={() => onSelectionMakeSymbol?.()}
          shapeType={shapeType}
          onSelectShapeType={onSelectShapeType}
          onOpenHelp={onOpenHelp}
          onOpenCodeEditor={onOpenCodeEditor}
          symmetryMode={symmetryMode}
          onSelectSymmetryMode={onSelectSymmetryMode}
        />

        {/* Center Stage Canvas Area */}
        <main className="flex-1 relative overflow-hidden bg-[#181818] flex items-center justify-center">
          <CanvasArea
            ref={canvasRef}
            currentFrame={currentFrame}
            layers={layers}
            layerFolders={layerFolders}
            activeLayerId={activeLayerId}
            onUpdateLayer={onUpdateLayer}
            tool={currentTool}
            brushType={currentBrushType}
            shapeType={shapeType}
            color={currentColor}
            strokeWidth={strokeWidth}
            beforeFrames={beforeFrames}
            afterFrames={afterFrames}
            onionSkin={onionSkin}
            onionSkinSettings={onionSkinSettings}
            showGrid={showGrid}
            isPlaying={isPlaying}
            selection={selection}
            onSelectionCreate={onSelectionCreate}
            onSelectionUpdate={onSelectionUpdate}
            onSelectionCommit={onSelectionCommit}
            onSelectionDelete={onSelectionDelete}
            onSelectionMakeSymbol={onSelectionMakeSymbol}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            background={background}
            backgroundImage={backgroundImage}
            textToolFont={textToolFont}
            fillOpacity={fillOpacity}
            fillTolerance={fillTolerance}
            smoothing={smoothing}
            deviceType={deviceType}
            onColorPick={onChangeColor}
            cameraMode={cameraMode}
            onToggleCameraMode={onToggleCameraMode}
            symmetryMode={symmetryMode}
            onApplyMotionPath={onApplyMotionPath}
            actors={actors}
            onSelectActor={(actorId) => onEnterSymbolEditMode?.(actorId)}
          />
        </main>

        {/* Right Inspector & Library Dock */}
        <AnimateRightDock
          currentTool={currentTool}
          onSelectTool={onSelectTool}
          currentBrushType={currentBrushType}
          onSelectBrushType={onSelectBrushType}
          currentColor={currentColor}
          onChangeColor={onChangeColor}
          strokeWidth={strokeWidth}
          onChangeStrokeWidth={onChangeStrokeWidth}
          fillOpacity={fillOpacity}
          onChangeFillOpacity={onChangeFillOpacity}
          fillTolerance={fillTolerance}
          onChangeFillTolerance={onChangeFillTolerance}
          smoothing={smoothing}
          onChangeSmoothing={onChangeSmoothing}
          shapeType={shapeType}
          onSelectShapeType={onSelectShapeType}
          textToolFont={textToolFont}
          onSelectTextToolFont={onSelectTextToolFont}
          textToolBold={textToolBold}
          setTextToolBold={setTextToolBold}
          textToolItalic={textToolItalic}
          setTextToolItalic={setTextToolItalic}
          symmetryMode={symmetryMode}
          onSelectSymmetryMode={onSelectSymmetryMode}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          setCanvasSize={setCanvasSize}
          fps={fps}
          setFps={setFps}
          background={background}
          setBackground={setBackground}
          actors={actors}
          onAddActor={onAddActor}
          onRemoveActor={onRemoveActor}
          onEnterSymbolEditMode={onEnterSymbolEditMode}
          onOpenSpritesheetExport={onOpenSpritesheetExport}
          onOpenAssetLibrary={onOpenAssetLibrary}
          layers={layers}
          layerFolders={layerFolders}
          activeLayerId={activeLayerId}
          onUpdateLayerSettings={onUpdateLayerSettings}
          backpackItems={backpackItems}
          onStampBackpackItem={onStampBackpackItem}
          onOpenBackpackModal={onOpenBackpack}
          hasSelection={Boolean(selection)}
          selection={selection}
          onFlipHorizontal={onFlipHorizontal}
          onFlipVertical={onFlipVertical}
          onRotate={onRotate}
          onSelectionCommit={() => onSelectionCommit()}
          onSelectionDelete={onSelectionDelete}
          onSelectionMakeSymbol={() => onSelectionMakeSymbol?.()}
          onOpenProjectSettings={onOpenProjectSettings}
        />

      </div>

      {/* 4. Framebar Timeline Bottom (when docked below stage) */}
      {framebarPosition === 'bottom' && renderTimeline()}

    </div>
  );
};

/**
 * ActionScript 2.0 (Macromedia Flash 8) and Adobe Animate Scripting Definitions,
 * Authentic Snippets, Starter Templates, Preprocessor, and Compatibility Shims.
 */

export type ScriptType = 'flash8_as2' | 'animate_html5' | 'flash_as3' | 'clipanim_js';

export interface ScriptTypeDefinition {
  id: ScriptType;
  name: string;
  shortName: string;
  software: 'Macromedia Flash 8' | 'Adobe Animate' | 'Adobe Flash CS' | 'ClipAnim';
  badgeColor: string;
  iconName: string;
  description: string;
  syntaxGuide: string;
  docUrlLabel: string;
  starterTemplates: {
    project: string;
    frame: string;
    actor: string;
  };
}

export const SCRIPT_TYPES: ScriptTypeDefinition[] = [
  {
    id: 'flash8_as2',
    name: 'ActionScript 2.0',
    shortName: 'Flash 8 AS2',
    software: 'Macromedia Flash 8',
    badgeColor: '#FF6600',
    iconName: 'Flash',
    description: 'Iconic Macromedia Flash 8 syntax with onClipEvent, on(release), _x, _y, _rotation, _alpha, _root, Key.isDown, and hitTest.',
    syntaxGuide: 'this._x, this._y, this._alpha, this._rotation, this._visible, _root.gotoAndPlay(), Key.isDown(Key.SPACE), hitTest()',
    docUrlLabel: 'Flash 8 Actions Dictionary',
    starterTemplates: {
      project: `// Macromedia Flash 8 Global Initialization
_root.score = 0;
_root.health = 100;
trace("⚡ Flash 8 Engine Initialized! Frame: " + _root._currentframe);
stop();`,
      frame: `// Frame Action (Macromedia Flash 8)
// Stops playback on this frame or jumps on condition
stop();

if (_root.score >= 100) {
  _root.gotoAndPlay(3);
}`,
      actor: `// MovieClip Script (Macromedia Flash 8)
onClipEvent (load) {
  speed = 6;
  this._alpha = 100;
  trace("Loaded MovieClip: " + this._name);
}

onClipEvent (enterFrame) {
  // Arrow Key Controls
  if (Key.isDown(Key.RIGHT)) { this._x += speed; }
  if (Key.isDown(Key.LEFT))  { this._x -= speed; }
  if (Key.isDown(Key.UP))    { this._y -= speed; }
  if (Key.isDown(Key.DOWN))  { this._y += speed; }
}

on (release) {
  trace("Clicked " + this._name);
  this._xscale = 125;
  this._yscale = 125;
}`
    }
  },
  {
    id: 'animate_html5',
    name: 'HTML5 Canvas / CreateJS',
    shortName: 'Animate HTML5',
    software: 'Adobe Animate',
    badgeColor: '#ED2224',
    iconName: 'Layers',
    description: 'Modern Adobe Animate HTML5 Canvas format utilizing CreateJS, this.on("tick"), this.stop(), and exportRoot navigation.',
    syntaxGuide: 'this.x, this.y, this.rotation, this.alpha, exportRoot.gotoAndPlay(), this.on("tick", fn), createjs.Tween',
    docUrlLabel: 'Adobe Animate HTML5 Reference',
    starterTemplates: {
      project: `// Adobe Animate HTML5 Canvas Global Init
window.exportRoot = this;
exportRoot.score = 0;
console.log("Adobe Animate HTML5 Canvas Initialized.");`,
      frame: `// Adobe Animate Timeline Script
this.stop();

// Click button to play next sequence
if (this.btn_next) {
  this.btn_next.on("click", function() {
    exportRoot.gotoAndPlay(2);
  });
}`,
      actor: `// Adobe Animate Symbol Script
this.speed = 5;

// Tick update loop
this.on("tick", function() {
  if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;
  if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
  if (keys['ArrowUp'] || keys['KeyW']) this.y -= this.speed;
  if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed;
});

// Click interaction
this.on("click", function() {
  createjs.Tween.get(this)
    .to({ scaleX: 1.3, scaleY: 1.3 }, 150)
    .to({ scaleX: 1.0, scaleY: 1.0 }, 150);
});`
    }
  },
  {
    id: 'flash_as3',
    name: 'ActionScript 3.0',
    shortName: 'Flash AS3',
    software: 'Adobe Flash CS',
    badgeColor: '#C4181B',
    iconName: 'Code',
    description: 'Strict event-driven ActionScript 3.0 with addEventListener(Event.ENTER_FRAME), MouseEvent.CLICK, and MovieClip(root).',
    syntaxGuide: 'addEventListener("enterFrame", fn), addEventListener("click", fn), MovieClip(root).gotoAndPlay()',
    docUrlLabel: 'ActionScript 3.0 Language Reference',
    starterTemplates: {
      project: `// ActionScript 3.0 Document Class / Global Root
stop();
trace("ActionScript 3.0 Document Initialized.");`,
      frame: `// ActionScript 3.0 Frame Action
stop();

// Frame navigation
function onNextClick(event) {
  MovieClip(root).gotoAndPlay(2);
}`,
      actor: `// ActionScript 3.0 DisplayObject Controller
var moveSpeed = 6;

addEventListener("enterFrame", function(event) {
  if (keys['ArrowRight']) x += moveSpeed;
  if (keys['ArrowLeft'])  x -= moveSpeed;
  if (keys['ArrowUp'])    y -= moveSpeed;
  if (keys['ArrowDown'])  y += moveSpeed;
});

addEventListener("click", function(event) {
  trace("Clicked actor in AS3!");
  rotation += 45;
});`
    }
  },
  {
    id: 'clipanim_js',
    name: 'Modern JavaScript (ES6)',
    shortName: 'ClipAnim JS',
    software: 'ClipAnim',
    badgeColor: '#007AFF',
    iconName: 'Sparkles',
    description: 'High performance native ClipAnim engine with this.onUpdate, gameUtils, spawnParticle, and shakeCamera.',
    syntaxGuide: 'this.onUpdate, this.onClick, this.vx/vy, keys, spawnParticle(), shakeCamera(), playSound()',
    docUrlLabel: 'ClipAnim Engine Docs',
    starterTemplates: {
      project: `// ClipAnim Engine Initialization
window.score = 0;
window.lives = 3;
console.log("ClipAnim Game Engine Ready.");`,
      frame: `// ClipAnim Timeline Frame Action
if (score >= 100) {
  gotoAndPlay(4);
} else {
  stop();
}`,
      actor: `// ClipAnim Interactive Actor Script
this.speed = 6;

this.onUpdate = function(dt) {
  if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;
  if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
  if (keys['ArrowUp'] || keys['KeyW']) this.y -= this.speed;
  if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed;
};

this.onClick = function() {
  shakeCamera(6, 200);
  spawnParticle({
    x: this.x + this.width / 2,
    y: this.y + this.height / 2,
    color: '#FF3B30'
  });
};`
    }
  }
];

export interface CodeSnippet {
  id: string;
  name: string;
  category: 'Timeline & Scenes' | 'Interactivity & Mouse' | 'Movement & Controls' | 'Game & Physics' | 'Animation & Tween' | 'Audio & System';
  scriptType: ScriptType | 'all';
  origin: 'Macromedia Flash 8' | 'Adobe Animate' | 'Adobe Flash CS' | 'ClipAnim';
  description: string;
  code: string;
}

export const SNIPPETS: CodeSnippet[] = [
  // ==================== TIMELINE & SCENES ====================
  {
    id: 'flash8_stop',
    name: 'Stop Timeline Playback (stop)',
    category: 'Timeline & Scenes',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Pauses timeline playback at the current frame. Classic Macromedia Flash 8 frame action.',
    code: `// Macromedia Flash 8 - Pause at this frame
stop();`
  },
  {
    id: 'flash8_goto_play',
    name: 'Click to Go to Frame and Play (_root.gotoAndPlay)',
    category: 'Timeline & Scenes',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Jumps the main timeline to a specific frame number (1-indexed) and resumes playback.',
    code: `// Macromedia Flash 8 - Jump to Frame and Play
_root.gotoAndPlay(5);`
  },
  {
    id: 'flash8_goto_stop',
    name: 'Click to Go to Frame and Stop (_root.gotoAndStop)',
    category: 'Timeline & Scenes',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Jumps the main timeline to a specific frame number and stops.',
    code: `// Macromedia Flash 8 - Jump to Frame and Stop
_root.gotoAndStop(1);`
  },
  {
    id: 'flash8_next_prev_frame',
    name: 'Next Frame / Previous Frame Stepper',
    category: 'Timeline & Scenes',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Advances or steps backward by one frame on button press or condition.',
    code: `// Macromedia Flash 8 - Next and Previous Frame
nextFrame(); // Advance one frame
// prevFrame(); // Step backward one frame`
  },
  {
    id: 'flash8_loop_range',
    name: 'Loop Timeline Range (Frames 5 to 25)',
    category: 'Timeline & Scenes',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Inspects _currentframe and loops back to maintain an isolated animation loop.',
    code: `// Macromedia Flash 8 - Seamless Frame Loop
if (_root._currentframe >= 25) {
  _root.gotoAndPlay(5);
}`
  },
  {
    id: 'animate_html5_stop',
    name: 'Stop Playback (this.stop)',
    category: 'Timeline & Scenes',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Adobe Animate HTML5 Canvas standard stop function for halting timeline playback.',
    code: `// Adobe Animate HTML5 Canvas - Stop
this.stop();`
  },
  {
    id: 'animate_html5_goto_play',
    name: 'Timeline Navigation (exportRoot.gotoAndPlay)',
    category: 'Timeline & Scenes',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Directs the top-level HTML5 Canvas stage to jump to frame index and play.',
    code: `// Adobe Animate HTML5 Canvas - Go to Frame and Play
exportRoot.gotoAndPlay(3);`
  },
  {
    id: 'as3_goto_play',
    name: 'Go to Frame and Play (MovieClip(root))',
    category: 'Timeline & Scenes',
    scriptType: 'flash_as3',
    origin: 'Adobe Flash CS',
    description: 'ActionScript 3.0 typed root timeline navigation method.',
    code: `// ActionScript 3.0 - Jump to Frame and Play
MovieClip(root).gotoAndPlay(5);`
  },

  // ==================== INTERACTIVITY & MOUSE ====================
  {
    id: 'flash8_btn_release',
    name: 'Button Click Event (on release)',
    category: 'Interactivity & Mouse',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'The iconic Macromedia Flash 8 button action triggered when releasing the mouse button.',
    code: `// Macromedia Flash 8 Button Script
on (release) {
  trace("Button Clicked!");
  _root.gotoAndPlay(2);
}`
  },
  {
    id: 'flash8_btn_rollover',
    name: 'Button Hover Glow (on rollOver / rollOut)',
    category: 'Interactivity & Mouse',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Dynamically shifts alpha transparency and scale when hovering over the button.',
    code: `// Macromedia Flash 8 Button Hover Feedback
on (rollOver) {
  this._alpha = 75;
  this._xscale = 110;
  this._yscale = 110;
}
on (rollOut) {
  this._alpha = 100;
  this._xscale = 100;
  this._yscale = 100;
}`
  },
  {
    id: 'flash8_drag_drop',
    name: 'Drag and Drop (startDrag & stopDrag)',
    category: 'Interactivity & Mouse',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Classic Flash 8 drag and drop using startDrag(lockCenter) and stopDrag().',
    code: `// Macromedia Flash 8 Drag & Drop
this.onPress = function() {
  this.startDrag(true); // lock center to cursor
};

this.onRelease = function() {
  this.stopDrag();
};`
  },
  {
    id: 'flash8_custom_cursor',
    name: 'Custom Mouse Cursor (Mouse.hide)',
    category: 'Interactivity & Mouse',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Hides system cursor and locks this MovieClip position to _xmouse and _ymouse.',
    code: `// Macromedia Flash 8 Custom Crosshair / Wand Cursor
Mouse.hide();

this.onEnterFrame = function() {
  this._x = _root._xmouse;
  this._y = _root._ymouse;
};`
  },
  {
    id: 'animate_click_hide',
    name: 'Click to Hide Object (Adobe Animate Snippet)',
    category: 'Interactivity & Mouse',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Official Adobe Animate Code Snippet for hiding the clicked element.',
    code: `// Adobe Animate - Click to Hide an Object
this.on("click", function() {
  this.visible = false;
});`
  },
  {
    id: 'animate_click_toggle_target',
    name: 'Click to Toggle Target Visibility',
    category: 'Interactivity & Mouse',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Click this button to show or hide another named actor on the canvas.',
    code: `// Adobe Animate - Toggle Another Actor's Visibility
this.on("click", function() {
  if (typeof targetActor !== 'undefined' && targetActor) {
    targetActor.visible = !targetActor.visible;
  }
});`
  },
  {
    id: 'as3_mouse_click',
    name: 'MouseEvent.CLICK Listener (AS3)',
    category: 'Interactivity & Mouse',
    scriptType: 'flash_as3',
    origin: 'Adobe Flash CS',
    description: 'ActionScript 3.0 event listener for mouse clicks with typed callback.',
    code: `// ActionScript 3.0 Mouse Click Listener
addEventListener("click", function(e) {
  trace("Clicked Actor in AS3!");
  MovieClip(root).gotoAndPlay(2);
});`
  },

  // ==================== MOVEMENT & CONTROLS ====================
  {
    id: 'flash8_arrow_movement',
    name: '8-Way Arrow Keys Movement (Key.isDown)',
    category: 'Movement & Controls',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Classic Flash 8 onClipEvent (enterFrame) with Key.isDown(Key.RIGHT/LEFT/UP/DOWN).',
    code: `// Macromedia Flash 8 Keyboard Steering
onClipEvent (load) {
  speed = 6;
}

onClipEvent (enterFrame) {
  if (Key.isDown(Key.RIGHT)) { this._x += speed; }
  if (Key.isDown(Key.LEFT))  { this._x -= speed; }
  if (Key.isDown(Key.UP))    { this._y -= speed; }
  if (Key.isDown(Key.DOWN))  { this._y += speed; }
}`
  },
  {
    id: 'flash8_easing_spring',
    name: 'Smooth Spring & Easing towards Target',
    category: 'Movement & Controls',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'The golden Flash mathematics formula for smooth, organic camera or character easing.',
    code: `// Macromedia Flash 8 Organic Easing / Inertia
this.targetX = 400;
this.targetY = 300;
this.easing = 0.15;

this.onEnterFrame = function() {
  this._x += (this.targetX - this._x) * this.easing;
  this._y += (this.targetY - this._y) * this.easing;
};`
  },
  {
    id: 'flash8_continuous_rotate',
    name: 'Continuous Rotation Spinner (_rotation)',
    category: 'Movement & Controls',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Continuously increments this._rotation on every frame for spinning propellers or wheels.',
    code: `// Macromedia Flash 8 Continuous Wheel / Cog Rotation
this.onEnterFrame = function() {
  this._rotation = (this._rotation + 5) % 360;
};`
  },
  {
    id: 'animate_arrow_movement',
    name: 'Keyboard Movement (Adobe Animate Snippet)',
    category: 'Movement & Controls',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Adobe Animate official snippet for keyboard arrow navigation.',
    code: `// Adobe Animate - Move with Keyboard Arrow Keys
this.on("tick", function() {
  var speed = 6;
  if (keys['ArrowRight'] || keys['KeyD']) this.x += speed;
  if (keys['ArrowLeft'] || keys['KeyA']) this.x -= speed;
  if (keys['ArrowUp'] || keys['KeyW']) this.y -= speed;
  if (keys['ArrowDown'] || keys['KeyS']) this.y += speed;
});`
  },
  {
    id: 'animate_rotate_tick',
    name: 'Continuous Rotation on Tick (Adobe Animate)',
    category: 'Movement & Controls',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Adobe Animate official snippet for continuous element rotation on every tick.',
    code: `// Adobe Animate - Rotate Continuously
this.on("tick", function() {
  this.rotation += 4;
});`
  },
  {
    id: 'clipanim_look_at_mouse',
    name: 'Aim & Rotate towards Cursor (Trigonometry)',
    category: 'Movement & Controls',
    scriptType: 'clipanim_js',
    origin: 'ClipAnim',
    description: 'Calculates angle with Math.atan2 to rotate actor face towards the cursor.',
    code: `// Smoothly rotate towards cursor position
this.onUpdate = function() {
  if (typeof mouse !== 'undefined') {
    var dx = mouse.x - this.x;
    var dy = mouse.y - this.y;
    this.rotation = Math.atan2(dy, dx) * (180 / Math.PI);
  }
};`
  },

  // ==================== GAME & PHYSICS ====================
  {
    id: 'flash8_hittest_actor',
    name: 'Actor Collision Detection (hitTest)',
    category: 'Game & Physics',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Classic Macromedia Flash 8 hitTest collision check between two MovieClips.',
    code: `// Macromedia Flash 8 Collision Check
this.onEnterFrame = function() {
  if (typeof targetActor !== 'undefined' && targetActor) {
    if (this.hitTest(targetActor)) {
      trace("Collision detected with target!");
      this._alpha = 50;
    } else {
      this._alpha = 100;
    }
  }
};`
  },
  {
    id: 'flash8_hittest_mouse',
    name: 'Mouse Point Collision (hitTest with ShapeFlag)',
    category: 'Game & Physics',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Checks if mouse coordinate is hovering over the visible bounds of this MovieClip.',
    code: `// Macromedia Flash 8 Point Hover Check
this.onEnterFrame = function() {
  if (this.hitTest(_root._xmouse, _root._ymouse, true)) {
    this._xscale = 120;
    this._yscale = 120;
  } else {
    this._xscale = 100;
    this._yscale = 100;
  }
};`
  },
  {
    id: 'flash8_platformer_jump',
    name: 'Platformer Gravity & Jump Mechanics',
    category: 'Game & Physics',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Classic Flash 8 platformer jump with velocity, gravity acceleration, and ground floor clamp.',
    code: `// Macromedia Flash 8 Platformer Physics
onClipEvent (load) {
  vy = 0;
  gravity = 0.8;
  floorY = 460;
  canJump = false;
}

onClipEvent (enterFrame) {
  vy += gravity;
  this._y += vy;

  if (this._y >= floorY) {
    this._y = floorY;
    vy = 0;
    canJump = true;
  }

  // Jump on Space or Up Arrow
  if (canJump && (Key.isDown(Key.SPACE) || Key.isDown(Key.UP))) {
    vy = -14;
    canJump = false;
  }
}`
  },
  {
    id: 'flash8_health_score',
    name: 'Score Counter & Squash Bounce on Click',
    category: 'Game & Physics',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Updates _root.score and gives satisfying squish animation on click.',
    code: `// Macromedia Flash 8 Score Counter & Squish
if (_root.score == undefined) _root.score = 0;

this.onPress = function() {
  _root.score += 10;
  trace("Score updated: " + _root.score);
  
  // Squash effect
  this._xscale = 135;
  this._yscale = 65;
};

this.onEnterFrame = function() {
  // Elastic spring back to 100%
  this._xscale += (100 - this._xscale) * 0.2;
  this._yscale += (100 - this._yscale) * 0.2;
};`
  },
  {
    id: 'animate_countdown_timer',
    name: 'Countdown Timer (Adobe Animate Snippet)',
    category: 'Game & Physics',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Adobe Animate countdown timer that decrements seconds and navigates to Game Over.',
    code: `// Adobe Animate - Countdown Timer
this.timeLeft = 30;

var timer = setInterval(function() {
  this.timeLeft--;
  console.log("Time remaining:", this.timeLeft);
  if (this.timeLeft <= 0) {
    clearInterval(timer);
    exportRoot.gotoAndStop(1); // Game Over
  }
}.bind(this), 1000);`
  },
  {
    id: 'touchpad_custom_e_button',
    name: "Touchpad & Key Listener ('E' Interact / Space / Any Key)",
    category: 'Game & Physics',
    scriptType: 'all',
    origin: 'ClipAnim',
    description: "Detects presses from on-screen touchpad buttons like 'E', 'Space', or any custom button.",
    code: `// Touchpad & Keyboard Button Listener
// Works with on-screen touchpad buttons and physical keyboard!

this.onUpdate = function(dt) {
  // Check 'E' button (Interact / Action)
  if (isKeyDown('e')) {
    trace("E button is held!");
    this._rotation += 5;
  }

  // Check 'Space' button (Jump / Boost)
  if (isKeyDown(' ') || isKeyDown('space')) {
    trace("Space button is held!");
    this._y -= 3;
  }
};

// Or event-driven:
this.onKeyDown = function(key) {
  if (key.toLowerCase() === 'e') {
    trace("E button pressed!");
    shakeCamera(5, 150);
  }
  if (key === ' ' || key.toLowerCase() === 'space') {
    trace("Space button pressed!");
    spawnParticle({ x: this._x, y: this._y, color: '#3b82f6' });
  }
};`
  },
  {
    id: 'touchpad_add_dynamic_button',
    name: "Create On-Screen Touchpad Button (addTouchButton)",
    category: 'Game & Physics',
    scriptType: 'all',
    origin: 'ClipAnim',
    description: 'Dynamically adds custom on-screen touchpad buttons with specified keys (e.g. space, e, shift) directly from script.',
    code: `// Dynamically add buttons to the on-screen touchpad when coding!
// Specify label, target key ('e', ' ', 'shift', 'enter', etc.), and color

addTouchButton({
  label: "E",          // Text on the button
  key: "e",            // Key it triggers ('e', 'space', 'shift', 'w', etc.)
  color: "blue",       // 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'cyan'
  size: "md"           // 'sm' | 'md' | 'lg'
});

addTouchButton({
  label: "SPACE",
  key: " ",
  color: "red",
  size: "lg"
});`
  },
  {
    id: 'clipanim_particles',
    name: 'Radial Particle Explosion Spawner',
    category: 'Game & Physics',
    scriptType: 'clipanim_js',
    origin: 'ClipAnim',
    description: 'Spawns a radial burst of glowing particles with camera screen shake.',
    code: `// Radial Particle Burst + Screen Impact
this.onClick = function() {
  shakeCamera(8, 200);
  for (var i = 0; i < 16; i++) {
    var angle = (Math.PI * 2 * i) / 16;
    var speed = 3 + Math.random() * 4;
    spawnParticle({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: '#FFCC00',
      size: 5,
      life: 25
    });
  }
};`
  },

  // ==================== ANIMATION & TWEEN ====================
  {
    id: 'flash8_alpha_pulse',
    name: 'Alpha Breathing / Fade Glow (_alpha)',
    category: 'Animation & Tween',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Pulses opacity between 20% and 100% for glowing neon or ghost effect.',
    code: `// Macromedia Flash 8 Alpha Pulse / Ghost Effect
this.fadeDirection = 3;

this.onEnterFrame = function() {
  this._alpha += this.fadeDirection;
  if (this._alpha >= 100) {
    this._alpha = 100;
    this.fadeDirection = -3;
  } else if (this._alpha <= 20) {
    this._alpha = 20;
    this.fadeDirection = 3;
  }
};`
  },
  {
    id: 'animate_createjs_tween',
    name: 'CreateJS Tween Scale & Fade (Adobe Animate)',
    category: 'Animation & Tween',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Adobe Animate standard CreateJS Tween for smooth programmatic animations.',
    code: `// Adobe Animate CreateJS Tween
createjs.Tween.get(this)
  .to({ scaleX: 1.4, scaleY: 1.4, alpha: 0.5 }, 300)
  .to({ scaleX: 1.0, scaleY: 1.0, alpha: 1.0 }, 300);`
  },
  {
    id: 'animate_fade_in_frame',
    name: 'Fade In Transparency on Frame Load',
    category: 'Animation & Tween',
    scriptType: 'animate_html5',
    origin: 'Adobe Animate',
    description: 'Gradually ramps alpha from 0 to 1 over several frames upon entering.',
    code: `// Adobe Animate - Fade In on Frame Load
this.alpha = 0;

this.on("tick", function() {
  if (this.alpha < 1) {
    this.alpha += 0.05;
  }
});`
  },
  {
    id: 'clipanim_sine_hover',
    name: 'Floating Bobbing & Idle Hover',
    category: 'Animation & Tween',
    scriptType: 'clipanim_js',
    origin: 'ClipAnim',
    description: 'Organic sine-wave vertical floating effect for flying characters and powerups.',
    code: `// Floating Bob & Sine Hover
this.timer = 0;
this.baseY = this.y;

this.onUpdate = function() {
  this.timer += 0.05;
  this.y = this.baseY + Math.sin(this.timer) * 12;
};`
  },

  // ==================== AUDIO & SYSTEM ====================
  {
    id: 'flash8_sound_object',
    name: 'Sound Object Playback (new Sound)',
    category: 'Audio & System',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Macromedia Flash 8 sound playback using new Sound() and attachSound().',
    code: `// Macromedia Flash 8 Sound Object
var sfx = new Sound();
sfx.attachSound("laser"); // matches timeline audio track
sfx.start();`
  },
  {
    id: 'flash8_stop_all_sounds',
    name: 'Stop All Sounds (stopAllSounds)',
    category: 'Audio & System',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Macromedia Flash global audio silence function.',
    code: `// Macromedia Flash 8 - Silence Audio
stopAllSounds();`
  },
  {
    id: 'flash8_get_url',
    name: 'Open Web Link (getURL)',
    category: 'Audio & System',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Macromedia Flash getURL function to open hyperlinks in a new browser tab.',
    code: `// Macromedia Flash 8 - Open URL
getURL("https://example.com", "_blank");`
  },
  {
    id: 'flash8_trace_output',
    name: 'Debug Log Output (trace)',
    category: 'Audio & System',
    scriptType: 'flash8_as2',
    origin: 'Macromedia Flash 8',
    description: 'Classic Macromedia Flash trace() for logging messages to the Output panel.',
    code: `// Macromedia Flash 8 Output Log
trace("⚡ Hello from Flash 8 ActionScript! Current Frame: " + _root._currentframe);`
  }
];

/**
 * Preprocessor that transpiles classic Macromedia Flash 8 block syntax
 * (e.g. onClipEvent (load), on (release)) into standard executable JS handlers on `this`.
 */
export function preprocessActionScript(code: string): string {
  if (!code) return '';
  let transformed = code;

  // 1. Flash 8 onClipEvent (...) { ... }
  transformed = transformed.replace(/onClipEvent\s*\(\s*load\s*\)\s*\{/gi, 'this.onLoad = function() {');
  transformed = transformed.replace(/onClipEvent\s*\(\s*enterFrame\s*\)\s*\{/gi, 'this.onEnterFrame = function() {');
  transformed = transformed.replace(/onClipEvent\s*\(\s*keyDown\s*\)\s*\{/gi, 'this.onKeyDown = function() {');
  transformed = transformed.replace(/onClipEvent\s*\(\s*keyUp\s*\)\s*\{/gi, 'this.onKeyUp = function() {');
  transformed = transformed.replace(/onClipEvent\s*\(\s*mouseDown\s*\)\s*\{/gi, 'this.onPointerDown = function() {');
  transformed = transformed.replace(/onClipEvent\s*\(\s*mouseUp\s*\)\s*\{/gi, 'this.onPointerUp = function() {');

  // 2. Flash 8 on (...) { ... } for buttons
  transformed = transformed.replace(/on\s*\(\s*(?:release|click)\b[^{]*\)\s*\{/gi, 'this.onClick = this.onRelease = function() {');
  transformed = transformed.replace(/on\s*\(\s*press\b[^{]*\)\s*\{/gi, 'this.onPress = this.onPointerDown = function() {');
  transformed = transformed.replace(/on\s*\(\s*releaseOutside\b[^{]*\)\s*\{/gi, 'this.onReleaseOutside = function() {');
  transformed = transformed.replace(/on\s*\(\s*rollOver\b[^{]*\)\s*\{/gi, 'this.onPointerEnter = function() {');
  transformed = transformed.replace(/on\s*\(\s*rollOut\b[^{]*\)\s*\{/gi, 'this.onPointerLeave = function() {');

  // 3. AS3 Event constants mappings if used without import
  transformed = transformed.replace(/Event\.ENTER_FRAME/g, '"enterFrame"');
  transformed = transformed.replace(/MouseEvent\.CLICK/g, '"click"');
  transformed = transformed.replace(/MouseEvent\.MOUSE_DOWN/g, '"mousedown"');
  transformed = transformed.replace(/MouseEvent\.MOUSE_UP/g, '"mouseup"');

  return transformed;
}

/**
 * Creates authentic Macromedia Flash 8 & Adobe Animate global environment.
 */
export function createFlashCompatibilityEnvironment(options: {
  api: any;
  gameUtils: any;
  symbolScope: Record<string, any>;
  frames: any[];
  currentFrameRef: { current: number };
  keysRef: { current: Record<string, boolean> };
  mousePosRef: { current: { x: number; y: number } };
  addConsoleLog?: (type: 'log' | 'error' | 'info', text: string) => void;
}) {
  const { api, gameUtils, symbolScope, frames, currentFrameRef, keysRef, mousePosRef, addConsoleLog } = options;

  // Flash 8 Key Object
  const Key = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    SHIFT: 16,
    CONTROL: 17,
    ESCAPE: 27,
    SPACE: 32,
    PGUP: 33,
    PGDN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    DELETEKEY: 46,
    isDown: function(k: number | string): boolean {
      const keys = keysRef.current || {};
      if (typeof k === 'string') {
        const lower = k.toLowerCase();
        if (lower === 'space' || k === ' ') return !!keys[' '] || !!keys['Space'] || !!keys['space'];
        if (lower === 'enter') return !!keys['Enter'] || !!keys['enter'];
        if (lower === 'shift') return !!keys['Shift'] || !!keys['ShiftLeft'] || !!keys['ShiftRight'];
        if (lower === 'ctrl' || lower === 'control') return !!keys['Control'] || !!keys['ControlLeft'] || !!keys['ControlRight'];
        return !!keys[k] || !!keys[lower] || !!keys[k.toUpperCase()] || (k.length === 1 ? !!keys[`Key${k.toUpperCase()}`] : false);
      }
      if (typeof k === 'number') {
        if (k === 37) return !!keys['ArrowLeft'] || !!keys['Left'];
        if (k === 38) return !!keys['ArrowUp'] || !!keys['Up'];
        if (k === 39) return !!keys['ArrowRight'] || !!keys['Right'];
        if (k === 40) return !!keys['ArrowDown'] || !!keys['Down'];
        if (k === 32) return !!keys['Space'] || !!keys[' '];
        if (k === 13) return !!keys['Enter'];
        if (k === 16) return !!keys['Shift'] || !!keys['ShiftLeft'] || !!keys['ShiftRight'];
        if (k === 17) return !!keys['Control'] || !!keys['ControlLeft'] || !!keys['ControlRight'];
        if (k === 27) return !!keys['Escape'];
        // Letter keys A-Z: char code 65 to 90 (e.g. 69 for 'E')
        if (k >= 65 && k <= 90) {
          const char = String.fromCharCode(k);
          return !!keys[char] || !!keys[char.toLowerCase()] || !!keys[`Key${char}`];
        }
        // Number keys 0-9: char code 48 to 57
        if (k >= 48 && k <= 57) {
          const digit = String.fromCharCode(k);
          return !!keys[digit] || !!keys[`Digit${digit}`];
        }
      }
      return false;
    }
  };

  // Flash 8 Mouse Object
  const Mouse = {
    hide: function() {
      // In web, can notify or adjust cursor style
      if (typeof document !== 'undefined') {
        const c = document.querySelector('canvas');
        if (c) c.style.cursor = 'none';
      }
    },
    show: function() {
      if (typeof document !== 'undefined') {
        const c = document.querySelector('canvas');
        if (c) c.style.cursor = 'default';
      }
    },
    addListener: function() {}
  };

  // Flash 8 trace()
  const trace = (...args: any[]) => {
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    console.log('[Flash trace]', text);
    if (addConsoleLog) {
      addConsoleLog('log', text);
    }
  };

  // Flash 8 getURL()
  const getURL = (url: string, target = '_blank') => {
    trace(`getURL("${url}", "${target}")`);
    if (typeof window !== 'undefined' && url) {
      try {
        window.open(url, target);
      } catch (e) {}
    }
  };

  // Flash 8 Sound Object
  class FlashSound {
    _soundId = '';
    attachSound(id: string) {
      this._soundId = id;
    }
    start(_secondOffset = 0, loops = 0) {
      if (gameUtils && gameUtils.playSound) {
        gameUtils.playSound(this._soundId, { loop: loops > 0 });
      }
    }
    stop() {
      if (api && api.stopAllSounds) api.stopAllSounds();
    }
  }

  // CreateJS Tween Mock & Runner
  const createjs = {
    Tween: {
      get: (target: any) => {
        return {
          to: function(props: any, durationMs = 300) {
            if (!target) return this;
            const startTime = performance.now();
            const startProps: Record<string, number> = {};
            for (const key in props) {
              if (typeof target[key] === 'number') {
                startProps[key] = target[key];
              }
            }
            const animate = (now: number) => {
              const elapsed = now - startTime;
              const t = Math.min(1, elapsed / durationMs);
              for (const key in props) {
                if (typeof startProps[key] === 'number') {
                  target[key] = startProps[key] + (props[key] - startProps[key]) * t;
                }
              }
              if (t < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
            return this;
          }
        };
      }
    },
    Sound: {
      play: (id: string) => gameUtils.playSound(id)
    }
  };

  // Flash 8 _root & Adobe Animate exportRoot Proxy
  const rootListeners = new Map<string, Function[]>();

  const rootTarget = {
    gotoAndPlay: api.gotoAndPlay,
    gotoAndStop: api.gotoAndStop,
    play: api.play,
    stop: api.stop,
    nextFrame: api.nextFrame,
    prevFrame: api.prevFrame,
    get _currentframe() { return currentFrameRef.current + 1; },
    get currentFrame() { return currentFrameRef.current + 1; },
    get _totalframes() { return frames.length; },
    get totalFrames() { return frames.length; },
    get _xmouse() { return mousePosRef.current.x; },
    get _ymouse() { return mousePosRef.current.y; },
    get mouseX() { return mousePosRef.current.x; },
    get mouseY() { return mousePosRef.current.y; },
    onClick: null as Function | null,
    onPress: null as Function | null,
    onRelease: null as Function | null,
    onMouseDown: null as Function | null,
    onMouseUp: null as Function | null,
    onPointerDown: null as Function | null,
    onPointerUp: null as Function | null,
    onEnterFrame: null as Function | null,
    onUpdate: null as Function | null,
    addEventListener: function(event: string, handler: Function) {
      if (typeof handler !== 'function') return;
      const ev = event.toLowerCase();
      const list = rootListeners.get(ev) || [];
      list.push(handler);
      rootListeners.set(ev, list);
    },
    removeEventListener: function(event: string, handler: Function) {
      const ev = event.toLowerCase();
      const list = rootListeners.get(ev) || [];
      rootListeners.set(ev, list.filter(h => h !== handler));
    },
    on: function(event: string, handler: Function) {
      this.addEventListener(event, handler);
    },
    emit: function(event: string, ...args: any[]) {
      const ev = event.toLowerCase();
      const list = rootListeners.get(ev);
      if (list) {
        list.forEach(fn => {
          try { fn.apply(rootProxy, args); } catch (e) { console.error(e); }
        });
      }
    },
    addTouchButton: (config: any) => gameUtils.addTouchButton ? gameUtils.addTouchButton(config) : null,
    removeTouchButton: (keyOrLabel: string) => gameUtils.removeTouchButton ? gameUtils.removeTouchButton(keyOrLabel) : null,
    getTouchButtons: () => gameUtils.getTouchButtons ? gameUtils.getTouchButtons() : [],
    ...symbolScope
  };

  const rootProxy = new Proxy(rootTarget, {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      if (symbolScope && prop in symbolScope) return symbolScope[prop];
      return undefined;
    },
    set(target, prop: string, val: any) {
      (target as any)[prop] = val;
      return true;
    }
  });

  return {
    _root: rootProxy,
    exportRoot: rootProxy,
    root: rootProxy,
    stage: rootProxy,
    _parent: rootProxy,
    parent: rootProxy,
    timeline: rootProxy,
    MovieClip: (r: any) => r || rootProxy,
    Key,
    Mouse,
    Sound: FlashSound,
    trace,
    getURL,
    stopAllSounds: api.stopAllSounds || (() => {}),
    createjs,
    stop: api.stop,
    play: api.play,
    gotoAndPlay: api.gotoAndPlay,
    gotoAndStop: api.gotoAndStop,
    nextFrame: api.nextFrame,
    prevFrame: api.prevFrame,
    addTouchButton: (config: any) => gameUtils.addTouchButton ? gameUtils.addTouchButton(config) : null,
    removeTouchButton: (keyOrLabel: string) => gameUtils.removeTouchButton ? gameUtils.removeTouchButton(keyOrLabel) : null,
    getTouchButtons: () => gameUtils.getTouchButtons ? gameUtils.getTouchButtons() : []
  };
}

/**
 * Attaches Macromedia Flash 8 getters/setters & event dispatchers onto actor context
 */
export function attachFlashActorProperties(
  context: any,
  actor: any,
  mousePosRef: { current: { x: number; y: number } },
  dragStateRef?: { current: any }
) {
  // Store reference to actor name & instance info
  context._name = actor?.name || 'instance';

  // Event listeners registry for AS3 & Animate HTML5
  context._eventListeners = new Map<string, Function[]>();

  context.addEventListener = function(event: string, handler: Function) {
    if (typeof handler !== 'function') return;
    const ev = event.toLowerCase();
    const list = context._eventListeners.get(ev) || [];
    list.push(handler);
    context._eventListeners.set(ev, list);
  };

  context.removeEventListener = function(event: string, handler: Function) {
    const ev = event.toLowerCase();
    const list = context._eventListeners.get(ev) || [];
    context._eventListeners.set(ev, list.filter((h: Function) => h !== handler));
  };

  context.on = function(event: string, handler: Function) {
    context.addEventListener(event, handler);
  };

  context.emit = function(event: string, ...args: any[]) {
    const ev = event.toLowerCase();
    const list = context._eventListeners.get(ev);
    if (list) {
      list.forEach((fn: Function) => {
        try { fn.apply(context, args); } catch (e) { console.error(e); }
      });
    }
  };

  // Flash 8 startDrag & stopDrag
  context.startDrag = function(lockCenter?: boolean) {
    if (dragStateRef) {
      dragStateRef.current = {
        actor: context,
        lockCenter: !!lockCenter,
        offsetX: lockCenter ? context.width / 2 : mousePosRef.current.x - context.x,
        offsetY: lockCenter ? context.height / 2 : mousePosRef.current.y - context.y
      };
    }
  };

  context.stopDrag = function() {
    if (dragStateRef && dragStateRef.current && dragStateRef.current.actor === context) {
      dragStateRef.current = null;
    }
  };

  // Define Flash 8 classic properties: _x, _y, _rotation, _alpha, _xscale, _yscale, _visible, _width, _height, _name
  Object.defineProperties(context, {
    _x: {
      get() { return this.x; },
      set(val: number) { this.x = val; },
      configurable: true
    },
    _y: {
      get() { return this.y; },
      set(val: number) { this.y = val; },
      configurable: true
    },
    _rotation: {
      get() { return this.rotation || 0; },
      set(val: number) { this.rotation = val; },
      configurable: true
    },
    _alpha: {
      get() { return (this.opacity ?? 1) * 100; },
      set(val: number) { this.opacity = Math.max(0, Math.min(100, val)) / 100; },
      configurable: true
    },
    alpha: {
      get() { return this.opacity ?? 1; },
      set(val: number) { this.opacity = Math.max(0, Math.min(1, val)); },
      configurable: true
    },
    _xscale: {
      get() { return (this.scaleX ?? 1) * 100; },
      set(val: number) { this.scaleX = val / 100; },
      configurable: true
    },
    _yscale: {
      get() { return (this.scaleY ?? 1) * 100; },
      set(val: number) { this.scaleY = val / 100; },
      configurable: true
    },
    _visible: {
      get() { return this.visible !== false; },
      set(val: boolean) { this.visible = !!val; },
      configurable: true
    },
    _width: {
      get() { return this.width * Math.abs(this.scaleX ?? 1); },
      set(val: number) { this.width = val; },
      configurable: true
    },
    _height: {
      get() { return this.height * Math.abs(this.scaleY ?? 1); },
      set(val: number) { this.height = val; },
      configurable: true
    },
    _name: {
      get() { return this.name; },
      set(val: string) { this.name = val; },
      configurable: true
    },
    _currentframe: {
      get() { return (this.symbolFrame || this.currentFrame || 1); },
      configurable: true
    },
    _totalframes: {
      get() { return (this.totalFrames || 1); },
      configurable: true
    },
    _xmouse: {
      get() { return mousePosRef.current.x - this.x; },
      configurable: true
    },
    _ymouse: {
      get() { return mousePosRef.current.y - this.y; },
      configurable: true
    }
  });
}

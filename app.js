'use strict';

// -------------------------------------------------------------
// YOLO LEARNING LAB — Interactive Engine & Pedagogy
// -------------------------------------------------------------

const $ = id => document.getElementById(id);

// Canvas & Drawing State
const canvas = $('scene');
const ctx = canvas.getContext('2d');

let imageWidth = 1000;
let imageHeight = 1000;
let userImage = null;
let currentFilename = 'sample_vehicle';

// Initial bounding box (fits plate on sample illustration)
let box = { x1: 410, y1: 585, x2: 590, y2: 650 };
let currentClass = 0; // 0: plate, 1: vehicle, 2: general_object

// Interaction state: dragMode can be null, 'draw', 'move', or handle name ('nw', 'ne', etc.)
let dragMode = null;
let dragStart = { x: 0, y: 0 };
let initialBox = { ...box };
let mousePos = { x: 0, y: 0 };
let isHoveringBox = false;
let activeHandle = null;

// Handle configuration
const HANDLE_SIZE = 9;
const HANDLE_TOUCH_RADIUS = 16;
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

// Class Color Palette
const CLASS_COLORS = {
  0: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.18)', badge: '0: license_plate' },
  1: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.18)', badge: '1: vehicle' },
  2: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.18)', badge: '2: general_object' }
};

// -------------------------------------------------------------
// Coordinate Normalization & Math
// -------------------------------------------------------------

function calculateYolo(b, W, H) {
  const cx = ((b.x1 + b.x2) / 2) / W;
  const cy = ((b.y1 + b.y2) / 2) / H;
  const w  = (b.x2 - b.x1) / W;
  const h  = (b.y2 - b.y1) / H;
  return { cx, cy, w, h };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function getHandles(b) {
  const mx = (b.x1 + b.x2) / 2;
  const my = (b.y1 + b.y2) / 2;
  return {
    nw: { x: b.x1, y: b.y1, cursor: 'nwse-resize' },
    n:  { x: mx,   y: b.y1, cursor: 'ns-resize' },
    ne: { x: b.x2, y: b.y1, cursor: 'nesw-resize' },
    e:  { x: b.x2, y: my,   cursor: 'ew-resize' },
    se: { x: b.x2, y: b.y2, cursor: 'nwse-resize' },
    s:  { x: mx,   y: b.y2, cursor: 'ns-resize' },
    sw: { x: b.x1, y: b.y2, cursor: 'nesw-resize' },
    w:  { x: b.x1, y: my,   cursor: 'ew-resize' }
  };
}

function getHandleAtPoint(pt, b) {
  const handles = getHandles(b);
  for (const key of HANDLES) {
    const h = handles[key];
    const dist = Math.hypot(pt.x - h.x, pt.y - h.y);
    if (dist <= HANDLE_TOUCH_RADIUS) {
      return { name: key, cursor: h.cursor };
    }
  }
  return null;
}

function isInsideBox(pt, b) {
  return pt.x >= b.x1 && pt.x <= b.x2 && pt.y >= b.y1 && pt.y <= b.y2;
}

// Convert canvas client event to image coordinate space
function eventToCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: clamp(Math.round((e.clientX - rect.left) * scaleX), 0, canvas.width),
    y: clamp(Math.round((e.clientY - rect.top) * scaleY), 0, canvas.height)
  };
}

// -------------------------------------------------------------
// Vector Vehicle Canvas Drawing
// -------------------------------------------------------------

function drawDetailedVehicle() {
  // Deep studio background with grid
  ctx.fillStyle = '#0a101d';
  ctx.fillRect(0, 0, 1000, 1000);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1000; x += 100) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1000); ctx.stroke();
  }
  for (let y = 0; y <= 1000; y += 100) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke();
  }

  // Asphalt road & perspective floor
  const roadGrad = ctx.createLinearGradient(0, 680, 0, 1000);
  roadGrad.addColorStop(0, '#152132');
  roadGrad.addColorStop(1, '#0b1320');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(0, 680, 1000, 320);

  // Road curb highlight
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 680); ctx.lineTo(1000, 680); ctx.stroke();

  // Shadow under car
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.ellipse(500, 725, 340, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wheels / Tires
  ctx.fillStyle = '#0f172a';
  // Left Tire
  ctx.beginPath(); ctx.roundRect(190, 610, 80, 110, 14); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.stroke();
  // Right Tire
  ctx.beginPath(); ctx.roundRect(730, 610, 80, 110, 14); ctx.fill();
  ctx.stroke();

  // Car Body - Upper Cabin (Roof & Pillars)
  const roofGrad = ctx.createLinearGradient(0, 270, 0, 440);
  roofGrad.addColorStop(0, '#1e293b');
  roofGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(330, 300);
  ctx.lineTo(670, 300);
  ctx.lineTo(760, 440);
  ctx.lineTo(240, 440);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();

  // Windshield Glass
  const glassGrad = ctx.createLinearGradient(350, 310, 650, 430);
  glassGrad.addColorStop(0, '#1e3a5f');
  glassGrad.addColorStop(0.5, '#38bdf8');
  glassGrad.addColorStop(1, '#0f2744');
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(345, 312);
  ctx.lineTo(655, 312);
  ctx.lineTo(740, 432);
  ctx.lineTo(260, 432);
  ctx.closePath();
  ctx.fill();

  // Interior rearview mirror
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(475, 320, 50, 18);

  // Side mirrors
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.roundRect(200, 415, 45, 26, 8); ctx.fill();
  ctx.beginPath(); ctx.roundRect(755, 415, 45, 26, 8); ctx.fill();

  // Main Car Body (Lower Hull)
  const bodyGrad = ctx.createLinearGradient(0, 430, 0, 690);
  bodyGrad.addColorStop(0, '#2563eb');
  bodyGrad.addColorStop(0.5, '#1d4ed8');
  bodyGrad.addColorStop(1, '#0f2c66');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(180, 430, 640, 260, [24, 24, 18, 18]);
  ctx.fill();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hood Crease Lines & Aerodynamics
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(360, 435); ctx.lineTo(390, 530); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(640, 435); ctx.lineTo(610, 530); ctx.stroke();

  // Headlights (Aggressive Angle with LED glow)
  // Left Headlight
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(210, 470); ctx.lineTo(320, 490); ctx.lineTo(310, 525); ctx.lineTo(215, 505);
  ctx.closePath(); ctx.fill();

  // Right Headlight
  ctx.beginPath();
  ctx.moveTo(790, 470); ctx.lineTo(680, 490); ctx.lineTo(690, 525); ctx.lineTo(785, 505);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; // reset shadow

  // Front Grille (Honeycomb Area)
  ctx.fillStyle = '#0b1120';
  ctx.beginPath();
  ctx.roundRect(340, 480, 320, 75, 12);
  ctx.fill();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Grille Brand Logo Emblem
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(500, 516, 16, 0, Math.PI * 2);
  ctx.stroke();

  // Lower Bumper & Fog Intakes
  ctx.fillStyle = '#070d18';
  ctx.beginPath();
  ctx.roundRect(220, 575, 560, 100, [10, 10, 20, 20]);
  ctx.fill();

  // ---------------------------------------------------------
  // LICENSE PLATE (Target Object)
  // Coordinates in illustration: x1: 410, y1: 585, x2: 590, y2: 650 (180 × 65)
  // ---------------------------------------------------------
  // Plate mount
  ctx.fillStyle = '#020617';
  ctx.fillRect(402, 578, 196, 78);

  // Plate White Surface
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(410, 585, 180, 65, 5);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // IND Blue Band on left
  ctx.fillStyle = '#0038a8';
  ctx.beginPath();
  ctx.roundRect(410, 585, 24, 65, [5, 0, 0, 5]);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('IND', 413, 622);

  // License Plate Characters
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('TN 09 AB 1234', 442, 626);

  // Caption in background
  ctx.fillStyle = '#64748b';
  ctx.font = '14px monospace';
  ctx.fillText('High-Fidelity Synthetic Vehicle • 1000 × 1000 Standard Space', 270, 940);
}

// -------------------------------------------------------------
// Canvas Render Loop
// -------------------------------------------------------------

function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Background Image or Vector Art
  if (userImage) {
    ctx.drawImage(userImage, 0, 0, canvas.width, canvas.height);
  } else {
    drawDetailedVehicle();
  }

  // 2. Compute Scale Ratio
  const scale = Math.max(canvas.width, canvas.height) / 1000;
  const color = CLASS_COLORS[currentClass] || CLASS_COLORS[0];

  // 3. Draw Bounding Box Fill & Stroke
  const bW = box.x2 - box.x1;
  const bH = box.y2 - box.y1;

  if (bW > 0 && bH > 0) {
    // Semi-transparent colored fill
    ctx.fillStyle = color.fill;
    ctx.fillRect(box.x1, box.y1, bW, bH);

    // High-visibility dashed glow & solid border
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeRect(box.x1, box.y1, bW, bH);

    // Center point radar & crosshair
    const cx = (box.x1 + box.x2) / 2;
    const cy = (box.y1 + box.y2) / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 15 * scale, cy); ctx.lineTo(cx + 15 * scale, cy);
    ctx.moveTo(cx, cy - 15 * scale); ctx.lineTo(cx, cy + 15 * scale);
    ctx.stroke();

    ctx.fillStyle = color.stroke;
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Box Title Badge (Class Name + Dimensions)
    const badgeText = `${color.badge}  [${Math.round(bW)} × ${Math.round(bH)} px]`;
    ctx.font = `bold ${Math.max(12, 14 * scale)}px system-ui, sans-serif`;
    const textWidth = ctx.measureText(badgeText).width;
    const badgeHeight = Math.max(20, 24 * scale);
    const badgeY = box.y1 - badgeHeight >= 4 ? box.y1 - badgeHeight : box.y1 + 4;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(box.x1, badgeY, textWidth + 16, badgeHeight);
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(box.x1, badgeY, textWidth + 16, badgeHeight);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, box.x1 + 8, badgeY + badgeHeight - 6);

    // 4. Draw 8 Interactive Resize Handles
    const handles = getHandles(box);
    for (const key of HANDLES) {
      const h = handles[key];
      const isCurrentActive = activeHandle === key;
      const hRadius = (HANDLE_SIZE + (isCurrentActive ? 3 : 0)) * scale;

      // Outer handle ring
      ctx.fillStyle = isCurrentActive ? '#ffffff' : color.stroke;
      ctx.beginPath();
      ctx.arc(h.x, h.y, hRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white core
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(h.x, h.y, Math.max(3, hRadius - 3 * scale), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

// -------------------------------------------------------------
// UI Synchronization & Live YOLO Decoder
// -------------------------------------------------------------

function updateUI(syncInputs = true) {
  // 1. Sanitize & Clamp Coordinates
  const W = canvas.width;
  const H = canvas.height;

  // Ensure coordinates ordered
  const x1 = Math.min(box.x1, box.x2);
  const x2 = Math.max(box.x1, box.x2);
  const y1 = Math.min(box.y1, box.y2);
  const y2 = Math.max(box.y1, box.y2);

  const isValid = (x2 > x1) && (y2 > y1) && x1 >= 0 && y1 >= 0 && x2 <= W && y2 <= H;

  if (syncInputs) {
    $('inp-x1').value = Math.round(x1);
    $('inp-y1').value = Math.round(y1);
    $('inp-x2').value = Math.round(x2);
    $('inp-y2').value = Math.round(y2);
  }

  $('hud-dims').textContent = `${W} × ${H} px`;

  if (isValid) {
    $('status-valid').textContent = '● Valid Coordinates';
    $('status-valid').style.color = 'var(--accent-emerald)';
    $('btn-download').disabled = false;

    // Calculate YOLO Normalized 5-tuple
    const yolo = calculateYolo({ x1, y1, x2, y2 }, W, H);

    $('chip-val-cls').textContent = currentClass;
    $('chip-val-cx').textContent  = yolo.cx.toFixed(6);
    $('chip-val-cy').textContent  = yolo.cy.toFixed(6);
    $('chip-val-w').textContent   = yolo.w.toFixed(6);
    $('chip-val-h').textContent   = yolo.h.toFixed(6);

    // Live Math Breakdown
    const bW = x2 - x1;
    const bH = y2 - y1;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    $('live-math-explanation').innerHTML = `
      <div><strong>Step-by-step arithmetic:</strong></div>
      <div>• cx = ((x1 + x2) / 2) / W = ((${x1} + ${x2}) / 2) / ${W} = <strong>${midX.toFixed(1)} / ${W} = ${yolo.cx.toFixed(6)}</strong></div>
      <div>• cy = ((y1 + y2) / 2) / H = ((${y1} + ${y2}) / 2) / ${H} = <strong>${midY.toFixed(1)} / ${H} = ${yolo.cy.toFixed(6)}</strong></div>
      <div>• w  = (x2 - x1) / W       = (${x2} - ${x1}) / ${W}       = <strong>${bW} / ${W} = ${yolo.w.toFixed(6)}</strong> (${(yolo.w * 100).toFixed(1)}% width)</div>
      <div>• h  = (y2 - y1) / H       = (${y2} - ${y1}) / ${H}       = <strong>${bH} / ${H} = ${yolo.h.toFixed(6)}</strong> (${(yolo.h * 100).toFixed(1)}% height)</div>
    `;

    // Letterbox simulation
    updateLetterbox(x1, y1, x2, y2, W, H);

  } else {
    $('status-valid').textContent = '⚠️ Invalid or Zero Area Box';
    $('status-valid').style.color = 'var(--accent-rose)';
    $('btn-download').disabled = true;
    $('live-math-explanation').innerHTML = `<span style="color:var(--accent-rose);">Draw or adjust a box with positive area inside the canvas boundaries.</span>`;
  }

  renderCanvas();
}

function updateLetterbox(x1, y1, x2, y2, W, H) {
  const N = Number($('model-input-size').value);
  const r = Math.min(N / W, N / H);
  const padX = (N - W * r) / 2;
  const padY = (N - H * r) / 2;

  const tX1 = (x1 * r + padX).toFixed(1);
  const tY1 = (y1 * r + padY).toFixed(1);
  const tX2 = (x2 * r + padX).toFixed(1);
  const tY2 = (y2 * r + padY).toFixed(1);

  $('letterbox-details').innerHTML = `
    • Model Target: <code>${N} × ${N}</code> | Aspect Ratio Scale: <code>${r.toFixed(4)}</code><br>
    • Resized Image: <code>${(W * r).toFixed(1)} × ${(H * r).toFixed(1)} px</code> with Padding: <code>x=${padX.toFixed(1)}, y=${padY.toFixed(1)} px</code><br>
    • Letterbox Transformed Box: <code>(${tX1}, ${tY1})</code> to <code>(${tX2}, ${tY2})</code>
  `;
}

// -------------------------------------------------------------
// Canvas Pointer Events (Drawing, Moving, Resizing)
// -------------------------------------------------------------

canvas.addEventListener('pointerdown', e => {
  const pt = eventToCoords(e);
  canvas.setPointerCapture(e.pointerId);
  dragStart = { x: pt.x, y: pt.y };
  initialBox = { ...box };

  const handle = getHandleAtPoint(pt, box);
  if (handle) {
    dragMode = handle.name;
    activeHandle = handle.name;
    $('hud-status').textContent = `Resizing ${handle.name.toUpperCase()}`;
    return;
  }

  if (isInsideBox(pt, box)) {
    dragMode = 'move';
    $('hud-status').textContent = 'Moving Box';
    return;
  }

  // Outside box -> start drawing brand new box
  dragMode = 'draw';
  box = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
  $('hud-status').textContent = 'Drawing New Box';
  updateUI(true);
});

canvas.addEventListener('pointermove', e => {
  const pt = eventToCoords(e);
  mousePos = pt;

  if (!dragMode) {
    // Hover cursor determination
    const handle = getHandleAtPoint(pt, box);
    if (handle) {
      canvas.style.cursor = handle.cursor;
      activeHandle = handle.name;
    } else if (isInsideBox(pt, box)) {
      canvas.style.cursor = 'move';
      activeHandle = null;
    } else {
      canvas.style.cursor = 'crosshair';
      activeHandle = null;
    }
    renderCanvas();
    return;
  }

  const dx = pt.x - dragStart.x;
  const dy = pt.y - dragStart.y;
  const W = canvas.width;
  const H = canvas.height;

  if (dragMode === 'draw') {
    box.x1 = clamp(Math.min(dragStart.x, pt.x), 0, W);
    box.y1 = clamp(Math.min(dragStart.y, pt.y), 0, H);
    box.x2 = clamp(Math.max(dragStart.x, pt.x), 0, W);
    box.y2 = clamp(Math.max(dragStart.y, pt.y), 0, H);
  } else if (dragMode === 'move') {
    const boxW = initialBox.x2 - initialBox.x1;
    const boxH = initialBox.y2 - initialBox.y1;
    let newX1 = initialBox.x1 + dx;
    let newY1 = initialBox.y1 + dy;

    // Boundary constraint
    newX1 = clamp(newX1, 0, W - boxW);
    newY1 = clamp(newY1, 0, H - boxH);

    box.x1 = newX1;
    box.y1 = newY1;
    box.x2 = newX1 + boxW;
    box.y2 = newY1 + boxH;
  } else {
    // Resizing via handle
    const b = { ...initialBox };
    if (dragMode.includes('w')) b.x1 = clamp(initialBox.x1 + dx, 0, b.x2 - 10);
    if (dragMode.includes('e')) b.x2 = clamp(initialBox.x2 + dx, b.x1 + 10, W);
    if (dragMode.includes('n')) b.y1 = clamp(initialBox.y1 + dy, 0, b.y2 - 10);
    if (dragMode.includes('s')) b.y2 = clamp(initialBox.y2 + dy, b.y1 + 10, H);
    box = b;
  }

  updateUI(true);
});

function endPointer(e) {
  if (dragMode) {
    // Ensure x1 < x2, y1 < y2
    const sorted = {
      x1: Math.min(box.x1, box.x2),
      y1: Math.min(box.y1, box.y2),
      x2: Math.max(box.x1, box.x2),
      y2: Math.max(box.y1, box.y2)
    };
    box = sorted;
    dragMode = null;
    activeHandle = null;
    $('hud-status').textContent = 'Ready';
    updateUI(true);
  }
}

canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

// Manual numeric inputs listener
['inp-x1', 'inp-y1', 'inp-x2', 'inp-y2'].forEach(id => {
  $(id).addEventListener('input', () => {
    box.x1 = Number($('inp-x1').value);
    box.y1 = Number($('inp-y1').value);
    box.x2 = Number($('inp-x2').value);
    box.y2 = Number($('inp-y2').value);
    updateUI(false);
  });
});

// Class selector
$('class-select').addEventListener('change', e => {
  currentClass = Number(e.target.value);
  updateUI(false);
});

// Model input size change
$('model-input-size').addEventListener('change', () => {
  updateUI(false);
});

// Preset Buttons
$('preset-plate').onclick = () => {
  box = { x1: 410, y1: 585, x2: 590, y2: 650 };
  currentClass = 0;
  $('class-select').value = '0';
  updateUI(true);
};

$('preset-car').onclick = () => {
  box = { x1: 170, y1: 280, x2: 830, y2: 730 };
  currentClass = 1;
  $('class-select').value = '1';
  updateUI(true);
};

$('btn-reset').onclick = () => {
  userImage = null;
  canvas.width = 1000;
  canvas.height = 1000;
  currentFilename = 'sample_vehicle';
  box = { x1: 410, y1: 585, x2: 590, y2: 650 };
  currentClass = 0;
  $('class-select').value = '0';
  $('upload').value = '';
  updateUI(true);
};

$('btn-center').onclick = () => {
  const w = box.x2 - box.x1;
  const h = box.y2 - box.y1;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  box = {
    x1: Math.round(cx - w / 2),
    y1: Math.round(cy - h / 2),
    x2: Math.round(cx + w / 2),
    y2: Math.round(cy + h / 2)
  };
  updateUI(true);
};

// Image Upload
$('upload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    userImage = img;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    currentFilename = file.name.replace(/\.[^.]+$/, '');
    // Default box to central 50% region
    box = {
      x1: Math.round(canvas.width * 0.25),
      y1: Math.round(canvas.height * 0.25),
      x2: Math.round(canvas.width * 0.75),
      y2: Math.round(canvas.height * 0.75)
    };
    updateUI(true);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert('Failed to load image file.');
  };
  img.src = url;
});

// Download & Copy YOLO Text
function getFormattedYoloLine() {
  const yolo = calculateYolo(box, canvas.width, canvas.height);
  return `${currentClass} ${yolo.cx.toFixed(6)} ${yolo.cy.toFixed(6)} ${yolo.w.toFixed(6)} ${yolo.h.toFixed(6)}`;
}

$('btn-download').onclick = () => {
  const content = getFormattedYoloLine() + '\n';
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentFilename}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

$('btn-copy').onclick = () => {
  const line = getFormattedYoloLine();
  navigator.clipboard.writeText(line).then(() => {
    const originalText = $('btn-copy').textContent;
    $('btn-copy').textContent = '✓ Copied!';
    setTimeout(() => { $('btn-copy').textContent = originalText; }, 1500);
  });
};

// -------------------------------------------------------------
// MODULE 06: Highway Tracking & Counting Simulator
// -------------------------------------------------------------

const tCanvas = $('track');
const tCtx = tCanvas.getContext('2d');
let isSimPlaying = false;
let simFrame = 0;
let lastTick = 0;
const TRIPWIRE_X = 450;

function drawTrackerSimulation(f) {
  const W = tCanvas.width;
  const H = tCanvas.height;
  tCtx.clearRect(0, 0, W, H);

  // Highway tarmac
  const roadGrad = tCtx.createLinearGradient(0, 0, 0, H);
  roadGrad.addColorStop(0, '#0f172a');
  roadGrad.addColorStop(1, '#070b13');
  tCtx.fillStyle = roadGrad;
  tCtx.fillRect(0, 0, W, H);

  // Dashed lane dividers
  tCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  tCtx.lineWidth = 4;
  tCtx.setLineDash([25, 20]);
  tCtx.beginPath();
  tCtx.moveTo(0, H / 2);
  tCtx.lineTo(W, H / 2);
  tCtx.stroke();
  tCtx.setLineDash([]); // reset

  // Tripwire counting line at X = 450
  const carX = 40 + f * 7.5;
  const carCenter = carX + 65;
  const isPast = carCenter >= TRIPWIRE_X;

  tCtx.strokeStyle = isPast ? '#10b981' : '#f59e0b';
  tCtx.lineWidth = isPast ? 4 : 3;
  tCtx.shadowColor = isPast ? '#10b981' : '#f59e0b';
  tCtx.shadowBlur = isPast ? 12 : 6;
  tCtx.beginPath();
  tCtx.moveTo(TRIPWIRE_X, 0);
  tCtx.lineTo(TRIPWIRE_X, H);
  tCtx.stroke();
  tCtx.shadowBlur = 0;

  // Tripwire text tag
  tCtx.fillStyle = isPast ? '#10b981' : '#f59e0b';
  tCtx.font = 'bold 12px monospace';
  tCtx.fillText('TRIPWIRE VIRTUAL GATE (x = 450)', TRIPWIRE_X + 10, 24);

  // Motion Trail / History Dots (Kalman track history)
  for (let trailF = Math.max(0, f - 8); trailF < f; trailF += 2) {
    const histX = 40 + trailF * 7.5 + 65;
    tCtx.fillStyle = `rgba(56, 189, 248, ${(trailF - (f - 8)) / 10})`;
    tCtx.beginPath();
    tCtx.arc(histX, H / 2 - 20, 4, 0, Math.PI * 2);
    tCtx.fill();
  }

  // Vehicle Silhouette
  const vY = H / 2 - 60;
  tCtx.fillStyle = '#1e3a8a';
  tCtx.beginPath();
  tCtx.roundRect(carX, vY, 130, 80, 8);
  tCtx.fill();

  // Vehicle Glass
  tCtx.fillStyle = '#38bdf8';
  tCtx.fillRect(carX + 70, vY + 12, 35, 56);

  // Headlights
  tCtx.fillStyle = '#fef08a';
  tCtx.fillRect(carX + 122, vY + 8, 8, 16);
  tCtx.fillRect(carX + 122, vY + 56, 8, 16);

  // Bounding Box (Predicted by ByteTrack)
  tCtx.strokeStyle = '#06b6d4';
  tCtx.lineWidth = 2.5;
  tCtx.strokeRect(carX - 6, vY - 8, 142, 96);

  // Track ID Badge
  tCtx.fillStyle = 'rgba(6, 182, 212, 0.9)';
  tCtx.fillRect(carX - 6, vY - 32, 110, 22);
  tCtx.fillStyle = '#0f172a';
  tCtx.font = 'bold 12px monospace';
  tCtx.fillText('TRACK ID #17', carX + 2, vY - 17);

  // Update Status Badges in DOM
  $('track-frame-val').textContent = f;
  $('sim-counter-display').textContent = isPast ? '1' : '0';

  if (isPast) {
    $('sim-status-badge').textContent = '✅ VEHICLE #17 COUNTED & LOGGED';
    $('sim-status-badge').style.background = 'rgba(16, 185, 129, 0.2)';
    $('sim-status-badge').style.color = '#34d399';
  } else {
    $('sim-status-badge').textContent = '🟡 APPROACHING TRIPWIRE';
    $('sim-status-badge').style.background = 'rgba(245, 158, 11, 0.2)';
    $('sim-status-badge').style.color = '#fbbf24';
  }
}

$('track-frame').addEventListener('input', e => {
  simFrame = Number(e.target.value);
  drawTrackerSimulation(simFrame);
});

$('btn-track-play').onclick = () => {
  isSimPlaying = !isSimPlaying;
  $('btn-track-play').textContent = isSimPlaying ? '⏸ Pause' : '▶ Play Simulation';
};

$('btn-track-reset').onclick = () => {
  isSimPlaying = false;
  $('btn-track-play').textContent = '▶ Play Simulation';
  simFrame = 0;
  $('track-frame').value = 0;
  drawTrackerSimulation(0);
};

function simLoop(timestamp) {
  if (isSimPlaying && timestamp - lastTick > 45) {
    simFrame = (simFrame + 1) % 101;
    $('track-frame').value = simFrame;
    drawTrackerSimulation(simFrame);
    lastTick = timestamp;
  }
  requestAnimationFrame(simLoop);
}

// -------------------------------------------------------------
// MODULE 07: ANPR Pipeline Interactive Inspector
// -------------------------------------------------------------

const PIPELINE_DATA = [
  {
    title: "Stage 01: High-Speed Optical Capture",
    input: "CCTV / Highway IP Camera Stream (RTSP / H.264)",
    algorithm: "Hardware Global Shutter + 850nm Infrared Illuminator Strobe",
    output: "Raw 1080p / 4K RGB/Grayscale Frames at 60 FPS",
    details: "Rolling shutter sensors create motion blur on highway cars traveling at 120 km/h. Production ANPR requires global shutter cameras with synchronization to avoid stretched plate characters, especially at night."
  },
  {
    title: "Stage 02: Vehicle Detection & Tracking",
    input: "Full-resolution video frame",
    algorithm: "YOLO26n / YOLO11s + ByteTrack Association",
    output: "Vehicle bounding boxes with stable, persistent Track IDs",
    details: "Instead of searching for tiny 150px plates across an entire 4K frame, the model first finds the vehicle and assigns an ID (e.g. #17). This provides context and prevents duplicate billing at toll booths."
  },
  {
    title: "Stage 03: License Plate Localization",
    input: "Cropped vehicle bounding box from Stage 02",
    algorithm: "Specialized Lightweight Plate-Detector YOLO Head",
    output: "Tight rectangular crop or 4-corner keypoints of plate",
    details: "Operating on the vehicle crop dramatically reduces background noise (street signs, bumper stickers, billboards) and allows high-accuracy plate detection with a fraction of the compute."
  },
  {
    title: "Stage 04: Perspective Rectification & Contrast",
    input: "Angled plate crop",
    algorithm: "Spatial Transformer Network (STN) / OpenCV 4-Point Homography Warp",
    output: "Orthogonal, flat, high-contrast normalized plate crop (e.g. 256 × 64 px)",
    details: "Plates captured from overhead gantry poles are skewed by 30°–45°. Homography projection transforms the trapezoid plate back into a straight horizontal rectangle, boosting subsequent OCR accuracy from ~70% to >98%."
  },
  {
    title: "Stage 05: Character Recognition (OCR)",
    input: "Rectified horizontal plate image patch",
    algorithm: "CRNN (CNN + BiLSTM + CTC Loss) or PaddleOCR / SVTR",
    output: "Raw alphanumeric character string + per-character confidence scores",
    details: "General OCR engines (Tesseract) struggle with license plate fonts. Specialized ANPR OCR models are trained on regional plate fonts (FE-Schrift in Europe, standard embossed fonts in Asia/India) with strict alphanumeric lexicons."
  },
  {
    title: "Stage 06: Validation, Multi-frame Voting & Business Logic",
    input: "Sequence of OCR readings across multiple frames for Track #17",
    algorithm: "Temporal Majority Voting + Regional Regex Schema + Database API",
    output: "Confirmed vehicle record (e.g. 'TN 09 AB 1234') logged to database",
    details: "Single frames can have glare or mud. Combining 5 consecutive frames for Track #17 via majority voting yields near-perfect accuracy. A regex like ^[A-Z]{2}\\s[0-9]{2}\\s[A-Z]{1,2}\\s[0-9]{4}$ filters impossible misreads."
  }
];

function selectPipelineStage(index) {
  document.querySelectorAll('.pipeline-step').forEach((el, idx) => {
    el.classList.toggle('active', idx === index);
  });

  const data = PIPELINE_DATA[index];
  $('pipeline-info-card').innerHTML = `
    <h3 style="color: #fff; font-size: 17px; margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
      <span style="color:var(--accent-cyan);">${data.title}</span>
    </h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 14px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);">
        <strong style="color:var(--text-dim); text-transform:uppercase; font-size:11px; display:block; margin-bottom:4px;">Input Data:</strong>
        <span style="color:#e2e8f0;">${data.input}</span>
      </div>
      <div style="background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);">
        <strong style="color:var(--text-dim); text-transform:uppercase; font-size:11px; display:block; margin-bottom:4px;">Algorithm Engine:</strong>
        <span style="color:var(--accent-emerald); font-family:var(--mono-font);">${data.algorithm}</span>
      </div>
      <div style="background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);">
        <strong style="color:var(--text-dim); text-transform:uppercase; font-size:11px; display:block; margin-bottom:4px;">Stage Output:</strong>
        <span style="color:var(--accent-cyan); font-family:var(--mono-font);">${data.output}</span>
      </div>
    </div>
    <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">
      ${data.details}
    </p>
  `;
}

document.querySelectorAll('.pipeline-step').forEach((el, idx) => {
  el.addEventListener('click', () => selectPipelineStage(idx));
});

// -------------------------------------------------------------
// Active Navbar Highlighting on Scroll
// -------------------------------------------------------------

window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section');
  const scrollPos = window.scrollY + 120;

  sections.forEach(sec => {
    const top = sec.offsetTop;
    const height = sec.offsetHeight;
    const id = sec.getAttribute('id');
    if (scrollPos >= top && scrollPos < top + height) {
      document.querySelectorAll('nav a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
      });
    }
  });
});

// -------------------------------------------------------------
// Initial Boot
// -------------------------------------------------------------

updateUI(true);
drawTrackerSimulation(0);
selectPipelineStage(0);
requestAnimationFrame(simLoop);

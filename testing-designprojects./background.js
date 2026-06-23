const TILE_SIZE  = 200;
const GAP        = 75;
const STEP       = TILE_SIZE + GAP;
const DEFAULT_VX = -0.3;
const DEFAULT_VY =  0.3;
const LERP_DRAG  = 0.06;
const POLL_MS    = 4000;

let media = [];
let tiles = [];
let numCols, numRows;

let offsetX = 0, offsetY = 0;
let targetX = 0, targetY = 0;
let vx = DEFAULT_VX, vy = DEFAULT_VY;

let isDragging  = false;
let lastClientX, lastClientY;
let dragVX = 0, dragVY = 0;

const knownSrcs = new Set();
const container = document.getElementById('bg-grid');
const isTouchDevice = 'ontouchstart' in window;


/* ── Map background files to project slugs ──────────────── */

function bgSlug(src) {
  const name = src.split('/').pop().toLowerCase();
  if (name.startsWith('anomie')) return 'anomie';
  if (name.startsWith('enco')) return 'enco';
  if (name.startsWith('mc-') || name.startsWith('mc_')) return 'motion-connect';
  if (name.startsWith('mocp')) return 'mocp';
  if (name.startsWith('vct24') || name.startsWith('vct_') || name.startsWith('icons-')) return 'vct24';
  return null;
}


/* ── Autoplay unlock for Safari ──────────────────────────── */

const blockedVideos = new Set();
let unlocked = false;

function unlockVideos() {
  if (unlocked) return;
  unlocked = true;
  blockedVideos.forEach(v => v.play().catch(() => {}));
  blockedVideos.clear();
  ['click', 'touchstart', 'wheel', 'keydown'].forEach(evt =>
    document.removeEventListener(evt, unlockVideos, { capture: true })
  );
}

['click', 'touchstart', 'wheel', 'keydown'].forEach(evt =>
  document.addEventListener(evt, unlockVideos, { capture: true, once: false })
);


/* ── Directory listing ───────────────────────────────────── */

async function fetchMediaList() {
  const res  = await fetch('background.json');
  const data = await res.json();
  return data.media;
}


/* ── Concurrency queue ───────────────────────────────────── */

function makeQueue(limit) {
  let active = 0;
  const pending = [];
  function next() {
    while (active < limit && pending.length) {
      active++;
      const { fn, resolve } = pending.shift();
      fn().then(v => { active--; resolve(v); next(); });
    }
  }
  return fn => new Promise(resolve => { pending.push({ fn, resolve }); next(); });
}

const loadQueue = makeQueue(10);


/* ── Tooltip ─────────────────────────────────────────────── */

const tooltip = document.createElement('div');
tooltip.id = 'bg-tooltip';
document.body.appendChild(tooltip);

function clampTooltip(x, y) {
  let left = x + 12, top = y + 12;
  const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
  if (left + tw > window.innerWidth)  left = x - tw - 4;
  if (top + th > window.innerHeight)  top  = y - th - 4;
  if (left < 0) left = 4;
  if (top  < 0) top  = 4;
  tooltip.style.left = left + 'px';
  tooltip.style.top  = top  + 'px';
}

function showTooltip(name, x, y) {
  tooltip.textContent = name;
  tooltip.style.display = 'block';
  clampTooltip(x, y);
}

function moveTooltip(x, y) { clampTooltip(x, y); }
function hideTooltip()      { tooltip.style.display = 'none'; }


/* ── Media element creation ──────────────────────────────── */

function createMedia(tile, item) {
  return new Promise(resolve => {
    if (item.type === 'video') {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.preload = 'auto';
      video.src = item.src;
      tile.appendChild(video);
      video.play().then(() => blockedVideos.delete(video)).catch(() => blockedVideos.add(video));
      video.addEventListener('canplay', resolve, { once: true });
      setTimeout(resolve, 1500);
    } else {
      const img = document.createElement('img');
      img.addEventListener('load',  resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      img.src = item.src;
      tile.appendChild(img);
    }
  });
}


/* ── Swap a tile's media ─────────────────────────────────── */

function swapTile(tile, item) {
  tile.classList.remove('visible');
  setTimeout(() => {
    tile.innerHTML = '';
    loadQueue(() => createMedia(tile, item)).then(() => tile.classList.add('visible'));
  }, 400);
}


/* ── Build grid ──────────────────────────────────────────── */

function buildGrid() {
  numCols = Math.ceil(window.innerWidth  / STEP) + 3;
  numRows = Math.ceil(window.innerHeight / STEP) + 3;

  const regular = media.filter(m => !m.src.includes('Easter Eggs/'));
  const rare    = media.filter(m => m.src.includes('Easter Eggs/'));

  // Spatial deduplication: no same media within 5 tiles of each other
  // Fill grid cell-by-cell; for each cell pick a random item not used by any
  // neighbour within Chebyshev distance 5 (wrapping both axes).
  const grid = [];               // grid[r][c] = index into regular[]
  const totalTiles = numCols * numRows;

  for (let r = 0; r < numRows; r++) {
    grid[r] = [];
    for (let c = 0; c < numCols; c++) {
      const nearby = new Set();
      for (let dr = -5; dr <= 5; dr++) {
        for (let dc = -5; dc <= 5; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = ((r + dr) % numRows + numRows) % numRows;
          const nc = ((c + dc) % numCols + numCols) % numCols;
          if (grid[nr] && grid[nr][nc] !== undefined) {
            nearby.add(grid[nr][nc]);
          }
        }
      }
      const candidates = [];
      for (let i = 0; i < regular.length; i++) {
        if (!nearby.has(i)) candidates.push(i);
      }
      if (candidates.length > 0) {
        grid[r][c] = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // fallback: pick least-recently-used nearby item
        grid[r][c] = Math.floor(Math.random() * regular.length);
      }
    }
  }

  // Sprinkle easter eggs at random positions
  rare.forEach((item, ei) => {
    const r = Math.floor(Math.random() * numRows);
    const c = Math.floor(Math.random() * numCols);
    grid[r][c] = -(ei + 1); // negative = easter egg index
  });

  const entries = [];

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const tile = document.createElement('div');
      tile.className = 'bg-tile';
      tile._col = c;
      tile._row = r;
      positionTile(tile);
      container.appendChild(tile);
      tiles.push(tile);

      const idx = grid[r][c];
      const item = idx < 0 ? rare[-(idx + 1)] : regular[idx];
      const name = item.src.split('/').pop();

      if (!isTouchDevice) {
        tile.addEventListener('mouseenter', e => { if (!isOverlayOpen()) showTooltip(name, e.clientX, e.clientY); });
        tile.addEventListener('mousemove',  e => { if (isOverlayOpen()) hideTooltip(); else moveTooltip(e.clientX, e.clientY); });
        tile.addEventListener('mouseleave', hideTooltip);
      }

      if (name === 'Click me-1.jpg') {
        tile.style.cursor = 'pointer';
        tile.addEventListener('click', e => {
          e.stopPropagation();
          if (!document.body.classList.contains('comic-sans')) {
            document.body.classList.add('comic-sans');
            showComicSansPanel();
          }
          const reg = media.filter(m => !m.src.includes('Easter Eggs/'));
          const replacement = reg[Math.floor(Math.random() * reg.length)];
          swapTile(tile, replacement);
        });
      }

      if (name === 'me.jpg') {
        tile.style.cursor = 'pointer';
        tile.addEventListener('click', e => {
          e.stopPropagation();
          showMeLightbox(item.src);
        });
      }

      if (name === 'AMONGUS.jpg') {
        tile.style.cursor = 'pointer';
        tile.addEventListener('click', e => {
          e.stopPropagation();
          showAmongus('background/Easter Eggs/AMONGUS.mp4');
          const reg = media.filter(m => !m.src.includes('Easter Eggs/'));
          const replacement = reg[Math.floor(Math.random() * reg.length)];
          swapTile(tile, replacement);
        });
      }

      const slug = bgSlug(item.src);
      if (slug) {
        tile.style.cursor = 'pointer';
        tile.addEventListener('click', e => {
          if (isOverlayOpen()) return;
          e.stopPropagation();
          if (typeof openOverlay === 'function') openOverlay(null, slug);
        });
      }

      entries.push({ tile, item, r, c });
    }
  }

  // Sort: on-screen tiles first, then random for the rest
  const screenW = window.innerWidth, screenH = window.innerHeight;
  entries.sort((a, b) => {
    const aOn = a.c * STEP < screenW + STEP && a.r * STEP < screenH + STEP;
    const bOn = b.c * STEP < screenW + STEP && b.r * STEP < screenH + STEP;
    if (aOn && !bOn) return -1;
    if (!aOn && bOn) return 1;
    return Math.random() - 0.5;
  });

  // Load media, fade in with opacity ease when ready
  entries.forEach(({ tile, item }) => {
    loadQueue(() => createMedia(tile, item)).then(() => {
      tile.classList.add('visible');
    });
  });
}


/* ── Poll for new media ──────────────────────────────────── */

async function checkForNewMedia() {
  try {
    const list     = await fetchMediaList();
    const newItems = list.filter(item => !knownSrcs.has(item.src));
    if (!newItems.length) return;

    newItems.forEach(item => { knownSrcs.add(item.src); media.push(item); });
    newItems.forEach(item => {
      [...tiles].sort(() => Math.random() - 0.5)
        .slice(0, Math.min(3, tiles.length))
        .forEach(tile => swapTile(tile, item));
    });
  } catch (e) {
    console.warn('Media poll failed:', e);
  }
}


/* ── Animation ───────────────────────────────────────────── */

function tick() {
  const recover = isTouchDevice ? 0.045 : 0.015;
  if (!isDragging) {
    vx += (DEFAULT_VX - vx) * recover;
    vy += (DEFAULT_VY - vy) * recover;
    targetX += vx;
    targetY += vy;
  }
  offsetX += (targetX - offsetX) * LERP_DRAG;
  offsetY += (targetY - offsetY) * LERP_DRAG;
  tiles.forEach(positionTile);
  requestAnimationFrame(tick);
}

function positionTile(tile) {
  const totalW = numCols * STEP;
  const totalH = numRows * STEP;
  const x = ((tile._col * STEP + offsetX) % totalW + totalW) % totalW - STEP;
  const y = ((tile._row * STEP + offsetY) % totalH + totalH) % totalH - STEP;
  tile.style.transform = `translate3d(${x}px, ${y}px, 0)`;

  const vid = tile.querySelector('video');
  if (vid) {
    const onScreen = x > -TILE_SIZE && x < window.innerWidth && y > -TILE_SIZE && y < window.innerHeight;
    if (onScreen && vid.paused) vid.play().catch(() => {});
    else if (!onScreen && !vid.paused) vid.pause();
  }
}


/* ── Drag & scroll ───────────────────────────────────────── */

function isOverlayOpen() {
  return document.getElementById('project-overlay').classList.contains('is-open');
}

function bindDrag() {
  /* Mouse (desktop) */
  container.addEventListener('mousedown', e => {
    if (isOverlayOpen()) return;
    isDragging = true;
    lastClientX = e.clientX; lastClientY = e.clientY;
    dragVX = dragVY = 0;
    container.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastClientX;
    const dy = e.clientY - lastClientY;
    targetX += dx; targetY += dy;
    dragVX = dx; dragVY = dy;
    lastClientX = e.clientX; lastClientY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = 'grab';
    vx = dragVX; vy = dragVY;
  });

  /* Click to collapse (desktop) */
  container.addEventListener('click', () => {
    if (isTouchDevice || isOverlayOpen()) return;
    if (typeof closeAll === 'function') closeAll();
  });

  /* Wheel */
  container.addEventListener('wheel', e => {
    if (isOverlayOpen()) return;
    e.preventDefault();
    targetX -= e.deltaX;
    targetY -= e.deltaY;
    vx = -e.deltaX * 0.1;
    vy = -e.deltaY * 0.1;
  }, { passive: false });

  /* Touch (mobile) */
  container.addEventListener('touchstart', e => {
    if (isOverlayOpen()) return;
    const t = e.touches[0];
    isDragging = true;
    lastClientX = t.clientX; lastClientY = t.clientY;
    dragVX = dragVY = 0;
    if (typeof closeAll === 'function') closeAll();
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    hideTooltip();
    const t = e.touches[0];
    const dx = (t.clientX - lastClientX) * 1.8;
    const dy = (t.clientY - lastClientY) * 1.8;
    targetX += dx; targetY += dy;
    dragVX = dx; dragVY = dy;
    lastClientX = t.clientX; lastClientY = t.clientY;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    vx = dragVX; vy = dragVY;
  });
}


/* ── Me lightbox ────────────────────────────────────────── */

function showMeLightbox(src) {
  const existing = document.getElementById('me-lightbox');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'me-lightbox';
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';

  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'width:65vw;max-height:90vh;object-fit:contain;pointer-events:none;';
  if (window.innerWidth <= 768) img.style.width = '90vw';
  backdrop.appendChild(img);

  document.getElementById('bg-grid').classList.add('blurred');

  backdrop.addEventListener('click', () => {
    backdrop.remove();
    if (!document.getElementById('project-overlay').classList.contains('is-open')) {
      document.getElementById('bg-grid').classList.remove('blurred');
    }
  }, { once: true });

  document.body.appendChild(backdrop);
}


/* ── Comic Sans easter egg panel ─────────────────────────── */

function showComicSansPanel() {
  const existing = document.getElementById('comic-sans-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'comic-sans-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';

  const panel = document.createElement('div');
  panel.style.cssText = 'width:500px;max-width:90vw;height:250px;background:#D7D7D7;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;';

  const text = document.createElement('span');
  text.className = 'h2';
  text.innerHTML = 'The whole site is now typeset in Comic Sans.<br><br>Enjoy.';
  panel.appendChild(text);
  backdrop.appendChild(panel);

  document.getElementById('bg-grid').classList.add('blurred');

  backdrop.addEventListener('click', () => {
    backdrop.remove();
    if (!document.getElementById('project-overlay').classList.contains('is-open')) {
      document.getElementById('bg-grid').classList.remove('blurred');
    }
  }, { once: true });

  document.body.appendChild(backdrop);
}


/* ── AMONGUS easter egg ────────���─────────────────────────── */

function showAmongus(src) {
  const video = document.createElement('video');
  video.src = src;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  const scale = window.innerWidth <= 768 ? 1 : 2;
  video.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(' + scale + ');z-index:10000;max-width:80vw;max-height:80vh;pointer-events:none;';
  document.body.appendChild(video);
  video.play().catch(() => {});
  video.addEventListener('ended', () => video.remove(), { once: true });
  setTimeout(() => { if (video.parentNode) video.remove(); }, 15000);
}


/* ── Init ───────��────────────────��───────────────────────── */

async function initBackground() {
  try {
    const list = await fetchMediaList();
    if (!list.length) return;
    list.forEach(item => { knownSrcs.add(item.src); media.push(item); });
  } catch (e) {
    console.error('Could not load background media:', e);
    return;
  }

  buildGrid();
  requestAnimationFrame(tick);
  bindDrag();
  setInterval(checkForNewMedia, POLL_MS);
}

initBackground();

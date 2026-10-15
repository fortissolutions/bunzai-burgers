/**
 * Bunzai Burger - Craft Section Scroll Animation
 * Scrubs the transparent WebP burger frames inside #craft as the section scrolls past:
 * the burger holds assembled, explodes into its layers, then rejoins (frames 84 to 239),
 * while the six .anatomy-card callouts fade in with the explosion.
 */

const FIRST_FRAME = 84;   // frame_00085.webp - assembled burger, start of the explosion sequence
const LAST_FRAME = 239;   // frame_00240.webp - assembled again after the rejoin
const PEAK_FRAME = 136;   // widest explosion; shown statically for reduced motion
const HOLD = 0.18;        // desktop holds the assembled burger for the first 18% of the scroll

// Union of the burger's opaque pixels across frames 84-239 (1280x720 source frames).
// Drawing this fixed crop keeps the burger large in the canvas without jumping between frames.
const CROP = { x: 388, y: 18, w: 498, h: 670 };

class CraftBurgerAnimation {
  constructor(section, canvas) {
    this.section = section;
    this.sticky = section.querySelector('.craft-sticky');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.layerCards = Array.from(section.querySelectorAll('.anatomy-card'));
    this.framesMap = new Map();
    this.rafId = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Current interpolation state
    this.currentFloatFrame = FIRST_FRAME;
    this.currentTilt = 0;
    this.lastDrawnKey = '';
    this.cssWidth = 0;
    this.cssHeight = 0;

    this.section.dataset.anim = 'on';
    this.updateLayerCards(0);
    this.bindEvents();
    this.preloadFrames();
  }

  getFramePath(index) {
    const frameNum = String(index + 1).padStart(5, '0');
    return `./animations/burger/frames/frame_${frameNum}.webp`;
  }

  async preloadFrames() {
    const loadSingleFrame = (index) => new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = this.getFramePath(index);
      img.onload = () => {
        this.framesMap.set(index, img);
        this.scheduleUpdate();
        resolve(img);
      };
      img.onerror = () => resolve(null);
    });

    // Phase 1: both assembled ends plus the start of the explosion.
    const priority = [LAST_FRAME, PEAK_FRAME];
    for (let i = FIRST_FRAME; i <= FIRST_FRAME + 24; i++) priority.push(i);
    await Promise.allSettled(priority.map(loadSingleFrame));

    // Phase 2: progressively load the remaining frames in small chunks.
    for (let i = FIRST_FRAME + 25; i < LAST_FRAME; i += 5) {
      const chunk = [];
      for (let j = i; j < Math.min(i + 5, LAST_FRAME); j++) {
        if (!this.framesMap.has(j)) chunk.push(loadSingleFrame(j));
      }
      await Promise.allSettled(chunk);
      await new Promise((r) => setTimeout(r, 12));
    }
  }

  scheduleUpdate() {
    if (this.rafId || document.hidden) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update();
    });
  }

  bindEvents() {
    const schedule = () => this.scheduleUpdate();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    this.reducedMotion.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      else schedule();
    });
    new ResizeObserver(() => {
      this.lastDrawnKey = '';
      schedule();
    }).observe(this.canvas);
    schedule();
  }

  getFrame(index) {
    if (this.framesMap.has(index)) return this.framesMap.get(index);

    // Fallback to nearest loaded frame
    for (let offset = 1; offset <= LAST_FRAME - FIRST_FRAME; offset++) {
      if (this.framesMap.has(index - offset)) return this.framesMap.get(index - offset);
      if (this.framesMap.has(index + offset)) return this.framesMap.get(index + offset);
    }
    return null;
  }

  getProgress() {
    const rect = this.section.getBoundingClientRect();
    const stickyTop = parseFloat(getComputedStyle(this.sticky).top) || 0;
    const track = rect.height - this.sticky.offsetHeight;
    if (track <= 0) return 0;
    return Math.max(0, Math.min(1, (stickyTop - rect.top) / track));
  }

  update() {
    const winH = window.innerHeight;
    const rect = this.section.getBoundingClientRect();
    // Only work while the section is on or near the screen.
    if (rect.bottom < -winH || rect.top > winH * 2) return;

    let targetFloatFrame;
    let explodeFactor;
    if (this.reducedMotion.matches) {
      targetFloatFrame = PEAK_FRAME;
      explodeFactor = 1;
      this.currentFloatFrame = PEAK_FRAME;
      this.currentTilt = 0;
    } else {
      const progress = this.getProgress();
      const animationProgress = window.innerWidth > 768 ? Math.max(0, (progress - HOLD) / (1 - HOLD)) : progress;
      targetFloatFrame = FIRST_FRAME + animationProgress * (LAST_FRAME - FIRST_FRAME);
      explodeFactor = Math.sin(animationProgress * Math.PI);
    }
    const targetTilt = this.reducedMotion.matches ? 0 : -5 * Math.PI / 180 * explodeFactor;
    this.updateLayerCards(explodeFactor);

    // Smooth interpolation (LERP) for liquid responsiveness
    this.currentFloatFrame += (targetFloatFrame - this.currentFloatFrame) * 0.35;
    this.currentTilt += (targetTilt - this.currentTilt) * 0.25;
    this.renderCanvas();

    const settling = Math.abs(this.currentFloatFrame - targetFloatFrame) > 0.02 ||
      Math.abs(this.currentTilt - targetTilt) > 0.0001;
    if (settling) this.scheduleUpdate();
  }

  updateLayerCards(explodeFactor) {
    this.layerCards.forEach((card) => {
      if (explodeFactor > 0.15) {
        const shiftY = (1 - explodeFactor) * 20;
        card.style.opacity = Math.min(1, (explodeFactor - 0.15) * 2.5);
        card.style.transform = `translateY(${shiftY}px) scale(${0.95 + explodeFactor * 0.05})`;
        card.removeAttribute('aria-hidden');
        card.removeAttribute('tabindex');
      } else {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px) scale(0.9)';
        card.setAttribute('aria-hidden', 'true');
        card.setAttribute('tabindex', '-1');
      }
    });
  }

  renderCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    if (!cssW || !cssH) return;
    if (this.canvas.width !== Math.round(cssW * dpr) || this.canvas.height !== Math.round(cssH * dpr)) {
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.lastDrawnKey = '';
    }

    const frameIdx = Math.round(Math.max(FIRST_FRAME, Math.min(LAST_FRAME, this.currentFloatFrame)));
    const img = this.getFrame(frameIdx);
    if (!img) return;

    // Skip redraws when nothing visible changed.
    const key = `${frameIdx}|${img.src}|${this.currentTilt.toFixed(4)}|${this.canvas.width}x${this.canvas.height}`;
    if (key === this.lastDrawnKey) return;
    this.lastDrawnKey = key;

    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // Contain-fit the tilted crop inside the canvas box.
    const cos = Math.abs(Math.cos(this.currentTilt));
    const sin = Math.abs(Math.sin(this.currentTilt));
    const boundsW = CROP.w * cos + CROP.h * sin;
    const boundsH = CROP.w * sin + CROP.h * cos;
    const scale = Math.min(cssW / boundsW, cssH / boundsH) * 0.96;
    const drawW = CROP.w * scale;
    const drawH = CROP.h * scale;

    ctx.translate(cssW / 2, cssH / 2);
    ctx.rotate(this.currentTilt);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Draw one fully opaque frame at a time. Crossfading two transparent food
    // frames causes brightness flicker and visible ghosting.
    ctx.drawImage(img, CROP.x, CROP.y, CROP.w, CROP.h, -drawW / 2, -drawH / 2, drawW, drawH);
  }
}

function start() {
  const section = document.getElementById('craft');
  const canvas = document.getElementById('anatomyBurgerCanvas');
  if (section && canvas) new CraftBurgerAnimation(section, canvas);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

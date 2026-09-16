/**
 * Bunzai Burger - Single Overlay Scroll Animation Engine
 * Preloads 240 transparent WebP frames and renders 60fps scroll-driven animations
 * across #Hero (360° rotation) and #product-animation (vertical layer explosion & rejoin).
 */

class BurgerOverlayEngine {
  constructor() {
    this.totalFrames = 240;
    this.heroEndFrame = 84; // Frame index 84 = frame_00085.webp (end of 360 rotation)
    this.framesMap = new Map();
    this.loadedCount = 0;
    this.isInitialReady = false;
    this.rafId = null;

    // DOM Elements
    this.heroSection = null;
    this.productSection = null;
    this.wrapper = null;
    this.canvas = null;
    this.ctx = null;
    this.loaderOverlay = null;
    this.layerCards = [];

    // Current interpolation state
    this.currentFloatFrame = 0;
    this.idleFrame = 0;
    this.lastTick = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.targetFloatFrame = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.currentScale = 1;
    this.currentTilt = 0;
    this.desktopProduct = false;
    this.targetOpacity = 0;
    this.currentOpacity = 0;

    this.init();
  }

  getFramePath(index) {
    const frameNum = String(index + 1).padStart(5, '0');
    return `./animations/burger/frames/frame_${frameNum}.webp`;
  }

  async init() {
    this.setupDOM();
    this.bindEvents();
    await this.preloadFrames();
  }

  setupDOM() {
    this.heroSection = document.getElementById('Hero');
    this.productSection = document.getElementById('product-animation');
    this.menuSlot = document.querySelector('#flavours .bunzai-product-grid > div:first-child > div:first-child');
    if (this.menuSlot) {
      this.cardCanvas = document.createElement('canvas');
      this.cardCanvas.setAttribute('role', 'img');
      this.cardCanvas.setAttribute('aria-label', 'Bunzai burger');
      this.cardCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;z-index:5';
      this.menuSlot.appendChild(this.cardCanvas);
    }

    // Create single overlay wrapper and canvas if not present
    let wrapper = document.getElementById('burger-overlay-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'burger-overlay-wrapper';
      wrapper.className = 'burger-overlay-wrapper';
      wrapper.setAttribute('aria-hidden', 'true');
      document.body.appendChild(wrapper);
    }
    this.wrapper = wrapper;

    let canvas = document.getElementById('bunzai-burger-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'bunzai-burger-canvas';
      canvas.className = 'bunzai-burger-canvas';
      wrapper.appendChild(canvas);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Create loader indicator
    let loader = document.getElementById('burger-overlay-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'burger-overlay-loader';
      loader.className = 'burger-overlay-loader';
      loader.innerHTML = `
        <div class="burger-loader-spinner"></div>
        <span class="burger-loader-text">LOADING CINEMATIC BURGER...</span>
      `;
      wrapper.appendChild(loader);
    }
    this.loaderOverlay = loader;

    // Enhance #product-animation HTML with sticky container and layer cards
    if (this.productSection) {
      this.productSection.innerHTML = `
        <div class="product-sticky-container">
          <div class="product-animation-header">
            <div class="product-badge">
              <span class="product-badge-dot"></span>
              DECONSTRUCTED CRAFT &bull; EXPLODE & REJOIN
            </div>
            <h2 class="product-title">THE ANATOMY OF A PERFECT SMASH</h2>
            <p class="product-subtitle">Scroll to disassemble ingredients into artisan layers</p>
          </div>

          <!-- Interactive Floating Layer Cards -->
          <div class="layer-cards-container">
            <div class="layer-card layer-card-topbun" data-layer="topbun">
              <div class="layer-step">01</div>
              <div class="layer-content">
                <h4>Artisan Sourdough Bun</h4>
                <p>48-hr slow fermented, toasted with clarified butter</p>
              </div>
            </div>

            <div class="layer-card layer-card-cheese" data-layer="cheese">
              <div class="layer-step">02</div>
              <div class="layer-content">
                <h4>Aged Cheddar & Smoked Aioli</h4>
                <p>Triple melted sharp cheddar with oak-smoked glaze</p>
              </div>
            </div>

            <div class="layer-card layer-card-patty" data-layer="patty">
              <div class="layer-step">03</div>
              <div class="layer-content">
                <h4>100% Prime Angus Beef</h4>
                <p>Hand-smashed on 600°F cast iron for crispy caramelized edges</p>
              </div>
            </div>

            <div class="layer-card layer-card-veggies" data-layer="veggies">
              <div class="layer-step">04</div>
              <div class="layer-content">
                <h4>Farm-Fresh Toppings</h4>
                <p>Crisp heirloom tomato, dill pickles & butter lettuce</p>
              </div>
            </div>

            <div class="layer-card layer-card-botbun" data-layer="botbun">
              <div class="layer-step">05</div>
              <div class="layer-content">
                <h4>Toasted Crown Base</h4>
                <p>Sealed base bun infused with house Bunzai secret sauce</p>
              </div>
            </div>
          </div>

          <div class="product-scroll-hint">
            <span>SCROLL DOWN TO REJOIN BURGER</span>
            <div class="scroll-arrow-down">&darr;</div>
          </div>
        </div>
      `;

      this.layerCards = Array.from(this.productSection.querySelectorAll('.layer-card'));
    }
  }

  async preloadFrames() {
    const loadSingleFrame = (index) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = this.getFramePath(index);
        img.onload = () => {
          this.framesMap.set(index, img);
          this.loadedCount++;
          resolve(img);
        };
        img.onerror = () => {
          resolve(null);
        };
      });
    };

    // Phase 1: Load initial 25 priority frames
    const initialPromises = [];
    initialPromises.push(loadSingleFrame(this.totalFrames - 1));
    for (let i = 0; i < 25; i++) {
      initialPromises.push(loadSingleFrame(i));
    }
    await Promise.allSettled(initialPromises);
    this.isInitialReady = true;
    this.scheduleUpdate();

    if (this.loaderOverlay) {
      this.loaderOverlay.classList.add('loaded');
    }

    // Phase 2: Progressively load remaining frames
    for (let i = 25; i < this.totalFrames; i += 5) {
      const chunk = [];
      for (let j = i; j < Math.min(i + 5, this.totalFrames); j++) {
        chunk.push(loadSingleFrame(j));
      }
      await Promise.allSettled(chunk);
      await new Promise((r) => setTimeout(r, 12));
    }
  }

  scheduleUpdate() {
    if (this.rafId || document.hidden) return;
    this.rafId = requestAnimationFrame((time) => {
      this.rafId = null;
      this.update(time);
    });
  }

  bindEvents() {
    const schedule = () => this.scheduleUpdate();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    this.reducedMotion.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', () => {
      this.lastTick = 0;
      if (document.hidden) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      else schedule();
    });
    schedule();
  }

  getFrame(index) {
    if (this.framesMap.has(index)) return this.framesMap.get(index);

    // Fallback to nearest loaded frame
    let offset = 1;
    while (offset < this.totalFrames) {
      if (index - offset >= 0 && this.framesMap.has(index - offset)) {
        return this.framesMap.get(index - offset);
      }
      if (index + offset < this.totalFrames && this.framesMap.has(index + offset)) {
        return this.framesMap.get(index + offset);
      }
      offset++;
    }
    return null;
  }

  update(time = performance.now()) {
    const delta = this.lastTick ? Math.min((time - this.lastTick) / 1000, 0.05) : 0;
    this.lastTick = time;
    if (!this.heroSection || !this.productSection) return;

    const winH = window.innerHeight;
    const winW = window.innerWidth;
    const heroRect = this.heroSection.getBoundingClientRect();
    const prodRect = this.productSection.getBoundingClientRect();

    let targetFloatFrame = 0;
    let targetX = winW / 2;
    let targetY = winH / 2;
    let targetScale = 1;
    let targetTilt = 0;
    let isVisible = false;

    // Check if in Hero Section
    const inHero = heroRect.top <= winH && heroRect.bottom >= 0;
    // Check if in Product Animation Section
    const inProduct = prodRect.top <= winH * 0.35 && prodRect.bottom >= 0;
    this.dockProgress = this.menuSlot ? Math.max(0, Math.min(1, Math.max((winH - prodRect.bottom) / winH, (winH - this.menuSlot.getBoundingClientRect().top) / (winH * 0.7)))) : 0;
    if (this.cardCanvas) {
      this.drawCardBurger();
      this.cardCanvas.style.opacity = this.dockProgress >= 1 ? '1' : '0';
    }

    this.desktopProduct = winW > 768 && inProduct;
    if (inHero && !inProduct) {
      isVisible = true;
      // Calculate scroll progress within Hero section
      const scrollable = heroRect.height - winH * 0.3;
      const scrolled = -heroRect.top;
      const progress = Math.max(0, Math.min(1, scrolled / (scrollable || 1)));

      // Section 1: Hero -> 360 degree rotation (frames 0 to heroEndFrame = 84)
      // One complete source rotation every 12 seconds, independent of scrolling.
      if (this.isInitialReady && !this.reducedMotion.matches) {
        this.idleFrame = (this.idleFrame + delta * this.heroEndFrame / 12) % this.heroEndFrame;
      }
      targetFloatFrame = this.reducedMotion.matches ? 0 : this.idleFrame;
      // Do not interpolate backwards across the rotation seam.
      this.currentFloatFrame = targetFloatFrame;

      // Position in Hero Section:
      if (winW > 768) {
        targetX = winW * 0.5;
        targetY = winH * 0.52;
        targetScale = 0.90;
      } else {
        targetX = winW * 0.5;
        targetY = winH * 0.55;
        targetScale = 0.95;
      }
    } else if (inProduct) {
      isVisible = true;
      // Calculate scroll progress within Product Animation section
      const scrollable = prodRect.height - winH;
      const scrolled = -prodRect.top;
      const progress = Math.max(0, Math.min(1, scrolled / (scrollable || 1)));

      // Section 2: Product -> Vertical explosion and rejoin (frames 84 to 239)
      const prodFrameSpan = (this.totalFrames - 1) - this.heroEndFrame;
      // Desktop holds assembled for the first 18% before opening the layers.
      const animationProgress = winW > 768 ? Math.max(0, (progress - 0.18) / 0.82) : progress;
      targetFloatFrame = this.heroEndFrame + (animationProgress * prodFrameSpan);

      // Centered in Product Animation section
      targetX = winW * 0.5;
      targetY = winH * 0.50;
      targetScale = winW > 768 ? 1.05 : 1.05;

      // Update interactive layer cards opacity & transforms based on explosion progress
      const explodeFactor = Math.sin(animationProgress * Math.PI);
      targetTilt = -5 * Math.PI / 180 * explodeFactor;
      if (winW > 768) {
        const header = this.productSection.querySelector('.product-animation-header').getBoundingClientRect();
        const safeTop = Math.max(24, header.bottom + 30);
        const safeBottom = winH - 45;
        targetY = (safeTop + safeBottom) / 2;
        const rotatedHeight = Math.cos(targetTilt) + (1280 / 720) * Math.abs(Math.sin(targetTilt));
        targetScale = Math.min(0.90 - 0.12 * explodeFactor,
          Math.max(0.1, safeBottom - safeTop) / (winH * 0.85 * rotatedHeight));
      }
      this.updateLayerCards(explodeFactor);
    } else {
      isVisible = false;
      this.updateLayerCards(0);
    }

    // Smooth interpolation (LERP) for liquid responsiveness
    if (this.dockProgress > 0) {
      this.desktopProduct = false;
      targetFloatFrame = this.totalFrames - 1;
      targetTilt = 0;
      isVisible = this.dockProgress < 1;
      this.updateLayerCards(0);
    }
    this.targetOpacity = isVisible ? 1 : 0;
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * 0.25;

    if (this.wrapper) {
      this.wrapper.style.opacity = this.currentOpacity.toFixed(3);
      if (this.dockProgress > 0) this.wrapper.style.opacity = this.dockProgress < 1 ? '1' : '0';
      this.wrapper.style.pointerEvents = this.currentOpacity > 0.1 ? 'none' : 'none';
    }

    if (this.currentOpacity > 0.01) {
      this.currentFloatFrame += (targetFloatFrame - this.currentFloatFrame) * 0.35;
      this.currentX += (targetX - this.currentX) * 0.25;
      this.currentY += (targetY - this.currentY) * 0.25;
      this.currentScale += (targetScale - this.currentScale) * 0.25;
      this.currentTilt += (targetTilt - this.currentTilt) * 0.25;

      this.renderCanvas(winW, winH);
      this.wrapper.dataset.frame = String(Math.round(this.currentFloatFrame));
      this.wrapper.dataset.centerX = String(this.currentX);
    }
    const idle = inHero && !inProduct && this.isInitialReady && !this.reducedMotion.matches;
    const settling = Math.abs(this.currentTilt - targetTilt) > 0.0001 || Math.abs(this.currentScale - targetScale) > 0.001 || Math.abs(this.currentFloatFrame - targetFloatFrame) > 0.02 ||
      Math.abs(this.currentX - targetX) > 0.2 || Math.abs(this.currentY - targetY) > 0.2 ||
      Math.abs(this.currentOpacity - this.targetOpacity) > 0.005;
    if (idle || (isVisible && settling) || Math.abs(this.currentOpacity - this.targetOpacity) > 0.005) {
      this.scheduleUpdate();
    }
  }

  updateLayerCards(explodeFactor) {
    if (!this.layerCards || this.layerCards.length === 0) return;

    this.layerCards.forEach((card) => {
      if (explodeFactor > 0.15) {
        card.classList.add('active');
        const shiftY = (1 - explodeFactor) * 20;
        card.style.opacity = Math.min(1, (explodeFactor - 0.15) * 2.5);
        card.style.transform = `translateY(${shiftY}px) scale(${0.95 + explodeFactor * 0.05})`;
      } else {
        card.classList.remove('active');
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px) scale(0.9)';
      }
    });
  }

  drawCardBurger() {
    const img = this.framesMap.get(this.totalFrames - 1);
    if (!img || !this.cardCanvas) return;
    if (!this.burgerCrop) {
      const sample = document.createElement('canvas');
      sample.width = img.naturalWidth; sample.height = img.naturalHeight;
      const ctx = sample.getContext('2d'); ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
      let left = sample.width, top = sample.height, right = 0, bottom = 0;
      for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
        if (pixels[(y * sample.width + x) * 4 + 3] > 30) {
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      this.burgerCrop = {x:left,y:top,w:right-left+1,h:bottom-top+1};
    }
    const r = this.menuSlot.getBoundingClientRect(), c = this.burgerCrop;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(r.width*dpr), h = Math.round(r.height*dpr);
    if (this.cardCanvas.width === w && this.cardCanvas.height === h && this.cardPainted) return;
    this.cardCanvas.width=w; this.cardCanvas.height=h;
    const ctx=this.cardCanvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    const scale=Math.min(r.width*.84/c.w,r.height*.82/c.h);
    ctx.drawImage(img,c.x,c.y,c.w,c.h,(r.width-c.w*scale)/2,(r.height-c.h*scale)/2,c.w*scale,c.h*scale);
    this.cardPainted=true;
  }

  renderCanvas(winW, winH) {
    if (!this.canvas || !this.ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasW = winW * dpr;
    const canvasH = winH * dpr;

    if (this.canvas.width !== canvasW || this.canvas.height !== canvasH) {
      this.canvas.width = canvasW;
      this.canvas.height = canvasH;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, winW, winH);

    // Sub-frame indexing & crossfading calculations
    const floatIdx = this.dockProgress > 0 ? this.totalFrames - 1 : Math.max(0, Math.min(this.totalFrames - 1, this.currentFloatFrame));
    const f1Idx = Math.floor(floatIdx);
    const f2Idx = Math.min(this.totalFrames - 1, f1Idx + 1);
    const fraction = floatIdx - f1Idx;

    const img1 = this.getFrame(f1Idx);
    const img2 = this.getFrame(f2Idx);
    const refImg = img1 || img2;

    if (refImg) {
      const naturalW = refImg.naturalWidth || 1280;
      const naturalH = refImg.naturalHeight || 720;
      const imgRatio = naturalW / naturalH;

      let drawH = winH * 0.85 * this.currentScale;
      let drawW = drawH * imgRatio;

      if (drawW > winW * 0.95 * this.currentScale) {
        drawW = winW * 0.95 * this.currentScale;
        drawH = drawW / imgRatio;
      }

      let centerY = this.currentY;
      if (this.desktopProduct) {
        const safeTop = Math.max(24, this.productSection.querySelector('.product-animation-header').getBoundingClientRect().bottom + 30);
        const safeBottom = winH - 45;
        const boundsHeight = drawH * Math.cos(this.currentTilt) + drawW * Math.abs(Math.sin(this.currentTilt));
        const fit = Math.min(1, Math.max(1, safeBottom - safeTop) / boundsHeight);
        drawW *= fit; drawH *= fit;
        const half = boundsHeight * fit / 2;
        centerY = Math.max(safeTop + half, Math.min(safeBottom - half, centerY));
      }
      let centerX = this.currentX;
      if (this.dockProgress > 0 && this.burgerCrop) {
        const r=this.menuSlot.getBoundingClientRect(), c=this.burgerCrop;
        const scale=Math.min(r.width*.84/c.w,r.height*.82/c.h);
        const t=this.dockProgress*this.dockProgress*(3-2*this.dockProgress);
        const endX=r.left+r.width/2+(naturalW/2-c.x-c.w/2)*scale;
        const endY=r.top+r.height/2+(naturalH/2-c.y-c.h/2)*scale;
        centerX += (endX-centerX)*t; centerY += (endY-centerY)*t;
        drawW += (naturalW*scale-drawW)*t; drawH += (naturalH*scale-drawH)*t;
      }
      ctx.translate(centerX, centerY);
      ctx.rotate(this.currentTilt);
      const drawX = -drawW / 2;
      const drawY = -drawH / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Primary Sub-Frame
      if (img1) {
        ctx.globalAlpha = 1 - fraction;
        ctx.drawImage(img1, drawX, drawY, drawW, drawH);
      }

      // Secondary Sub-Frame crossfade for liquid smooth slow-motion
      if (fraction > 0.005 && img2 && img2 !== img1) {
        ctx.globalAlpha = fraction;
        ctx.drawImage(img2, drawX, drawY, drawW, drawH);
      }
    }

    ctx.restore();
  }
}

// Instantiate engine when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new BurgerOverlayEngine());
} else {
  new BurgerOverlayEngine();
}

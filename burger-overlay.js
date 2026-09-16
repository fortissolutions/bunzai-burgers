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
    this.targetFloatFrame = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.currentScale = 1;
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
    for (let i = 0; i < 25; i++) {
      initialPromises.push(loadSingleFrame(i));
    }
    await Promise.allSettled(initialPromises);
    this.isInitialReady = true;

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

  bindEvents() {
    const onScrollOrResize = () => {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => this.update());
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    // Initial trigger
    onScrollOrResize();
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

  update() {
    if (!this.heroSection || !this.productSection) return;

    const winH = window.innerHeight;
    const winW = window.innerWidth;
    const heroRect = this.heroSection.getBoundingClientRect();
    const prodRect = this.productSection.getBoundingClientRect();

    let targetFloatFrame = 0;
    let targetX = winW / 2;
    let targetY = winH / 2;
    let targetScale = 1;
    let isVisible = false;

    // Check if in Hero Section
    const inHero = heroRect.top <= winH && heroRect.bottom >= 0;
    // Check if in Product Animation Section
    const inProduct = prodRect.top <= winH && prodRect.bottom >= 0;

    if (inHero && !inProduct) {
      isVisible = true;
      // Calculate scroll progress within Hero section
      const scrollable = heroRect.height - winH * 0.3;
      const scrolled = -heroRect.top;
      const progress = Math.max(0, Math.min(1, scrolled / (scrollable || 1)));

      // Section 1: Hero -> 360 degree rotation (frames 0 to heroEndFrame = 84)
      targetFloatFrame = progress * this.heroEndFrame;

      // Position in Hero Section:
      if (winW > 768) {
        targetX = winW * 0.70;
        targetY = winH * 0.52;
        targetScale = 0.90;
      } else {
        targetX = winW * 0.5;
        targetY = winH * 0.55;
        targetScale = 0.75;
      }
    } else if (inProduct) {
      isVisible = true;
      // Calculate scroll progress within Product Animation section
      const scrollable = prodRect.height - winH;
      const scrolled = -prodRect.top;
      const progress = Math.max(0, Math.min(1, scrolled / (scrollable || 1)));

      // Section 2: Product -> Vertical explosion and rejoin (frames 84 to 239)
      const prodFrameSpan = (this.totalFrames - 1) - this.heroEndFrame;
      targetFloatFrame = this.heroEndFrame + (progress * prodFrameSpan);

      // Centered in Product Animation section
      targetX = winW * 0.5;
      targetY = winH * 0.50;
      targetScale = winW > 768 ? 1.05 : 0.85;

      // Update interactive layer cards opacity & transforms based on explosion progress
      const explodeFactor = Math.sin(progress * Math.PI);
      this.updateLayerCards(explodeFactor);
    } else {
      isVisible = false;
      this.updateLayerCards(0);
    }

    // Smooth interpolation (LERP) for liquid responsiveness
    this.targetOpacity = isVisible ? 1 : 0;
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * 0.25;

    if (this.wrapper) {
      this.wrapper.style.opacity = this.currentOpacity.toFixed(3);
      this.wrapper.style.pointerEvents = this.currentOpacity > 0.1 ? 'none' : 'none';
    }

    if (this.currentOpacity > 0.01) {
      this.currentFloatFrame += (targetFloatFrame - this.currentFloatFrame) * 0.35;
      this.currentX += (targetX - this.currentX) * 0.25;
      this.currentY += (targetY - this.currentY) * 0.25;
      this.currentScale += (targetScale - this.currentScale) * 0.25;

      this.renderCanvas(winW, winH);
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
    const floatIdx = Math.max(0, Math.min(this.totalFrames - 1, this.currentFloatFrame));
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

      const drawX = this.currentX - drawW / 2;
      const drawY = this.currentY - drawH / 2;

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

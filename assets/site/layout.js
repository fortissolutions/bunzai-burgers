// Shared layout for every Bunzai page: header, footer, toast, cart and menu-card rendering.
// Pages set <body data-page="home|craft|menu|story|locations|order|product|404"> and include
// <div data-site-header></div> / <div data-site-footer></div> placeholders.
(function () {
  const MENU = window.BUNZAI_MENU || [];
  const CART_KEY = 'bunzai-cart';
  const WHATSAPP_NUMBER = '9719876543210';
  const LINKS = {
    whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
    instagram: 'https://instagram.com/bunzai.burgers',
    tiktok: 'https://www.tiktok.com/@bunzai.burgers',
    maps: 'https://maps.google.com/?q=Muwaileh+Commercial+University+City+Road+Sharjah'
  };
  const NAV = [
    { page: 'home', label: 'Home', href: 'bunzai-burger.html' },
    { page: 'craft', label: 'Craft', href: 'craft.html' },
    { page: 'menu', label: 'Menu', href: 'menu.html' },
    { page: 'story', label: 'Story', href: 'story.html' },
    { page: 'locations', label: 'Locations', href: 'locations.html' }
  ];
  const ARROW_ICON = '<svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatPrice = (amount) => `AED ${amount}`;
  const findItem = (slug) => MENU.find((item) => item.slug === slug) || null;
  const productHref = (slug) => `product.html?item=${encodeURIComponent(slug)}`;
  const currentPage = () => document.body.dataset.page || '';

  // ---------- Cart (localStorage with in-memory fallback) ----------
  let memoryCart = {};
  function getCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return { ...memoryCart };
    }
  }
  function saveCart(cart) {
    // Drop unknown items and empty lines so stale storage can't break totals.
    const clean = {};
    Object.entries(cart).forEach(([slug, qty]) => {
      const n = Math.floor(Number(qty));
      if (findItem(slug) && n > 0) clean[slug] = Math.min(n, 99);
    });
    memoryCart = clean;
    try { localStorage.setItem(CART_KEY, JSON.stringify(clean)); } catch (e) { /* storage blocked */ }
    updateCartBadge();
    document.dispatchEvent(new CustomEvent('bunzai:cart', { detail: clean }));
    return clean;
  }
  const cartCount = () => Object.values(getCart()).reduce((sum, qty) => sum + qty, 0);
  function addToCart(slug, qty = 1) {
    const cart = getCart();
    cart[slug] = (cart[slug] || 0) + qty;
    saveCart(cart);
  }
  function setQty(slug, qty) {
    const cart = getCart();
    cart[slug] = qty;
    saveCart(cart);
  }
  const clearCart = () => saveCart({});
  function cartLines() {
    return Object.entries(getCart())
      .map(([slug, qty]) => ({ item: findItem(slug), qty }))
      .filter((line) => line.item);
  }

  function updateCartBadge() {
    const count = cartCount();
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(count);
      badge.classList.toggle('hidden', count === 0);
    });
  }

  // ---------- Toast (from the template's interactive-toasts script) ----------
  let toastTimeout;
  function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
    }, 3200);
  }

  // ---------- Header ----------
  function headerHTML() {
    const page = currentPage();
    const active = 'text-sm font-semibold tracking-wide text-brand-yellow transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-brand-yellow';
    const idle = 'text-sm font-semibold tracking-wide text-brand-muted hover:text-white transition-colors relative py-1 hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-brand-yellow';
    const desktopLinks = NAV.map((link) => `
      <a class="${link.page === page ? active : idle}" href="${link.href}"${link.page === page ? ' aria-current="page"' : ''}>${link.label}</a>`).join('');
    const mobileLinks = NAV.map((link) => `
      <a class="block px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider ${link.page === page ? 'bg-brand-yellow text-black' : 'text-brand-muted hover:text-white hover:bg-brand-panelLight'}" href="${link.href}"${link.page === page ? ' aria-current="page"' : ''}>${link.label}</a>`).join('');

    return `
<header class="sticky top-0 z-50 w-full backdrop-blur-md bg-brand-bg/85 border-b border-brand-border transition-all">
  <div class="max-w-[1180px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
    <a class="flex items-center gap-3.5 group" href="bunzai-burger.html" aria-label="Bunzai Burgers home">
      <div class="w-10 h-10 rounded-xl bg-brand-yellow flex items-center justify-center font-black text-black text-2xl shadow-lg shadow-brand-yellow/20 group-hover:scale-105 transition-transform">B</div>
      <div class="flex flex-col">
        <span class="font-extrabold tracking-wider text-lg uppercase text-white leading-none group-hover:text-brand-yellow transition-colors">Bunzai</span>
        <span class="text-[10px] tracking-widest text-brand-yellow uppercase font-bold mt-1 leading-none">Burgers</span>
      </div>
    </a>
    <nav aria-label="Main Navigation" class="hidden md:flex items-center gap-9">${desktopLinks}
    </nav>
    <div class="flex items-center gap-2 sm:gap-4">
      <a class="relative w-11 h-11 rounded-full bg-brand-panel hover:bg-brand-panelLight border border-brand-border hover:border-brand-yellow/50 flex items-center justify-center text-white transition-colors" href="order.html" aria-label="View your order">
        <svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        <span class="hidden absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-brand-yellow text-black text-[11px] font-black flex items-center justify-center" data-cart-count>0</span>
      </a>
      <a class="hidden sm:inline-flex items-center justify-center gap-2 bg-brand-yellow hover:bg-brand-yellowHover text-black text-xs font-black uppercase tracking-wider px-6 py-3 rounded-full shadow-lg shadow-brand-yellow/25 hover:shadow-brand-yellow/40 hover:-translate-y-0.5 transition-all" href="menu.html">
        <span>View Menu</span>${ARROW_ICON}
      </a>
      <button class="md:hidden w-11 h-11 rounded-full bg-brand-panel border border-brand-border flex items-center justify-center text-white" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav" data-mobile-nav-toggle>
        <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
      </button>
    </div>
  </div>
  <nav id="mobileNav" aria-label="Mobile Navigation" class="hidden md:hidden border-t border-brand-border bg-brand-bg/95 px-4 py-3 space-y-1">${mobileLinks}
    <a class="mt-2 flex items-center justify-center gap-2 bg-brand-yellow text-black text-xs font-black uppercase tracking-wider px-6 py-3 rounded-full" href="menu.html"><span>View Menu</span>${ARROW_ICON}</a>
  </nav>
</header>`;
  }

  // ---------- Footer ----------
  function footerHTML() {
    return `
<footer class="bg-brand-bg border-t border-brand-border py-12" data-purpose="page-footer">
  <div class="max-w-[1180px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
    <a class="flex items-center gap-3" href="bunzai-burger.html">
      <div class="w-8 h-8 rounded-lg bg-brand-yellow flex items-center justify-center font-black text-black text-lg">B</div>
      <span class="font-extrabold tracking-wider text-base uppercase text-white">Bunzai Burgers</span>
    </a>
    <div class="text-center">
      <span class="font-script text-2xl text-brand-yellow">Good Food. Good Vibes.</span>
    </div>
    <div class="flex flex-col sm:flex-row items-center gap-6 text-xs text-brand-muted">
      <div class="flex items-center gap-4">
        <a class="hover:text-brand-yellow transition-colors font-semibold" href="${LINKS.instagram}" target="_blank" rel="noopener noreferrer">Instagram</a>
        <span>•</span>
        <a class="hover:text-brand-yellow transition-colors font-semibold" href="${LINKS.tiktok}" target="_blank" rel="noopener noreferrer">TikTok</a>
        <span>•</span>
        <a class="hover:text-brand-yellow transition-colors font-semibold" href="${LINKS.whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
      <p>© 2026 Bunzai Burgers. All rights reserved.</p>
    </div>
  </div>
</footer>`;
  }

  const TOAST_HTML = `
<div class="fixed bottom-6 right-6 z-50 bg-brand-yellow text-black px-5 py-3.5 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 transform translate-y-24 opacity-0 transition-all duration-300 pointer-events-none" id="toastNotification" role="status" aria-live="polite">
  <span class="w-6 h-6 rounded-full bg-black text-brand-yellow flex items-center justify-center text-xs">✓</span>
  <span id="toastMessage">Added to your Bunzai order ✦</span>
</div>`;

  // ---------- Menu rendering ----------
  // Geometric stand-ins from the template for items without a photo.
  function illustrationHTML(type, large) {
    if (type === 'rings') {
      return `<div class="${large ? 'w-56 h-56 border-[14px]' : 'w-32 h-32 border-8'} rounded-full border-brand-yellow/70 border-dashed flex items-center justify-center">
        <div class="${large ? 'w-36 h-36 border-8 text-base' : 'w-20 h-20 border-4 text-xs'} rounded-full border-brand-yellow/50 border-dotted flex items-center justify-center text-brand-yellow font-bold uppercase">Crispy Ring</div>
      </div>`;
    }
    return `<div class="flex flex-col items-center">
      <div class="${large ? 'w-24 h-44 p-3' : 'w-14 h-24 p-2'} rounded-b-2xl rounded-t-sm border-2 border-brand-yellow/60 bg-gradient-to-t from-black to-amber-950 flex flex-col items-center justify-between shadow-inner">
        <div class="w-full h-2 bg-white/20 rounded-sm"></div>
        <span class="${large ? 'text-xs' : 'text-[9px]'} font-black text-brand-yellow tracking-widest uppercase">COLD</span>
      </div>
    </div>`;
  }

  function mediaHTML(item, { large = false, hoverZoom = true } = {}) {
    const zoom = hoverZoom ? ' group-hover:scale-105 transition-transform duration-500' : '';
    const visual = item.image
      ? `<img alt="${escapeHTML(item.name)}" class="w-full h-full object-cover${zoom}" src="${item.image}" loading="lazy"/>`
      : illustrationHTML(item.illustration, large);
    const badge = item.badge
      ? `<span class="absolute top-3 left-3 ${item.badge.className} text-[11px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider">${escapeHTML(item.badge.label)}</span>`
      : '';
    return `<div class="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-brand-panelLight${item.image ? '' : ' flex items-center justify-center'}">${visual}${badge}</div>`;
  }

  const CATEGORY_LABEL = { burgers: 'Burgers', sides: 'Sides', drinks: 'Drinks' };

  function addButtonHTML(item, extraClass = '') {
    return `<button aria-label="Add ${escapeHTML(item.name)} to order" class="add-to-order-btn w-10 h-10 rounded-full bg-brand-yellow hover:bg-brand-yellowHover text-black flex items-center justify-center font-black text-lg transition-transform active:scale-90 ${extraClass}" data-slug="${item.slug}" type="button">+</button>`;
  }

  // Same markup as the template's menu cards, with the image and title linking to the detail page.
  function menuCardHTML(item, bg = 'bg-brand-bg') {
    return `
<article class="menu-card group rounded-3xl ${bg} border border-brand-border hover:border-brand-borderActive p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-yellow/10" data-category="${item.category}">
  <a class="block" href="${productHref(item.slug)}">
    <div class="mb-5">${mediaHTML(item)}</div>
    <div class="flex items-start justify-between gap-3 mb-2">
      <h3 class="text-xl font-extrabold text-white group-hover:text-brand-yellow transition-colors">${escapeHTML(item.name)}</h3>
      <span class="text-lg font-black text-brand-yellow whitespace-nowrap">${formatPrice(item.price)}</span>
    </div>
    <p class="text-sm text-brand-muted leading-relaxed mb-4">${escapeHTML(item.summary)}</p>
  </a>
  <div class="flex items-center justify-between pt-4 border-t border-brand-border/60">
    <a class="text-xs uppercase font-bold tracking-wider text-slate-500 hover:text-brand-yellow transition-colors" href="${productHref(item.slug)}">${CATEGORY_LABEL[item.category]} · Details →</a>
    ${addButtonHTML(item)}
  </div>
</article>`;
  }

  function renderMenuGrid(grid, items, bg) {
    if (!grid) return;
    grid.innerHTML = items.map((item) => menuCardHTML(item, bg)).join('');
  }

  // Category filter tabs (from the template's menu-filtering script).
  function initMenuFilter(root) {
    const filterButtons = root.querySelectorAll('.menu-tab-btn');
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        filterButtons.forEach((btn) => {
          btn.classList.remove('bg-brand-yellow', 'text-black', 'active');
          btn.classList.add('text-brand-muted');
          btn.setAttribute('aria-selected', 'false');
        });
        button.classList.add('bg-brand-yellow', 'text-black', 'active');
        button.classList.remove('text-brand-muted');
        button.setAttribute('aria-selected', 'true');

        const category = button.getAttribute('data-filter');
        root.querySelectorAll('.menu-card').forEach((card) => {
          card.classList.toggle('hidden', !(category === 'all' || card.getAttribute('data-category') === category));
        });
      });
    });
  }

  // ---------- Boot ----------
  function mount() {
    const headerSlot = document.querySelector('[data-site-header]');
    if (headerSlot) headerSlot.outerHTML = headerHTML();
    const footerSlot = document.querySelector('[data-site-footer]');
    if (footerSlot) footerSlot.outerHTML = footerHTML();
    if (!document.getElementById('toastNotification')) document.body.insertAdjacentHTML('beforeend', TOAST_HTML);

    const toggle = document.querySelector('[data-mobile-nav-toggle]');
    const mobileNav = document.getElementById('mobileNav');
    if (toggle && mobileNav) {
      toggle.addEventListener('click', () => {
        const open = mobileNav.classList.toggle('hidden') === false;
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    // One delegated handler covers every "+" / "Add to order" button on every page.
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.add-to-order-btn[data-slug]');
      if (!button) return;
      const item = findItem(button.dataset.slug);
      if (!item) return;
      const qty = Math.max(1, Number(button.dataset.qty) || 1);
      addToCart(item.slug, qty);
      showToast(`${qty > 1 ? qty + ' × ' : ''}${item.name} added to your Bunzai order ✦`);
    });

    // Keep the badge in sync when the cart changes in another tab.
    window.addEventListener('storage', (event) => { if (event.key === CART_KEY) updateCartBadge(); });
    updateCartBadge();
  }

  window.Bunzai = {
    MENU, LINKS, WHATSAPP_NUMBER, CATEGORY_LABEL,
    escapeHTML, formatPrice, findItem, productHref,
    getCart, addToCart, setQty, clearCart, cartCount, cartLines,
    showToast, mediaHTML, illustrationHTML, menuCardHTML, renderMenuGrid, addButtonHTML, initMenuFilter
  };

  mount();
})();

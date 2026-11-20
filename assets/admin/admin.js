(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  async function api(path, opts = {}) {
    const res = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (res.status === 401 && !path.endsWith('/login')) { showLogin(); throw new Error('Signed out'); }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  let toastTimer;
  function toast(msg, isError) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('err', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  const fail = (err) => { if (err.message !== 'Signed out') toast(err.message, true); };

  /* ---------- auth ---------- */
  function showLogin() {
    $('app-view').hidden = true;
    $('login-view').hidden = false;
    $('login-form').elements.username.focus();
  }
  function showApp(username) {
    $('login-view').hidden = true;
    $('app-view').hidden = false;
    $('who').textContent = username;
    selectTab(location.hash.slice(1) || 'overview');
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('login-error').textContent = '';
    const f = e.target.elements;
    try {
      const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: f.username.value, password: f.password.value }) });
      f.password.value = '';
      showApp(data.username);
    } catch (err) {
      $('login-error').textContent = err.message;
    }
  });
  $('logout').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  /* ---------- tabs ---------- */
  const loaders = { overview: loadOverview, members: loadMembers, offers: loadOffers };
  function selectTab(name) {
    if (!loaders[name]) name = 'overview';
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    document.querySelectorAll('.tab').forEach((s) => { s.hidden = s.id !== 'tab-' + name; });
    history.replaceState(null, '', '#' + name);
    loaders[name]();
  }
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

  /* ---------- overview ---------- */
  async function loadOverview() {
    try {
      const { totals, byOffer, daily } = await api('/api/admin/stats');
      $('s-spins').textContent = totals.spins;
      $('s-claims').textContent = totals.claims;
      $('s-redeemed').textContent = totals.redeemed;
      $('s-pending').textContent = totals.pending;
      $('s-rate').textContent = totals.claims ? `${Math.round((totals.redeemed / totals.claims) * 100)}% redeemed in store` : '';

      const maxAwarded = Math.max(1, ...byOffer.map((o) => o.awarded));
      $('offer-stats').innerHTML = byOffer.map((o) => {
        const share = totals.claims ? Math.round((o.awarded / totals.claims) * 100) : 0;
        const status = !o.visible ? '<span class="pill off">Hidden</span>' : !o.selectable ? '<span class="pill off">Can’t be won</span>' : '';
        return `<tr>
          <td>${esc(o.name)} ${status}</td>
          <td class="num">${o.awarded}</td>
          <td class="num">${o.redeemed}</td>
          <td><div class="bar" title="${share}% of rewards"><i style="width:${(o.awarded / maxAwarded) * 100}%"></i><b style="width:${(o.redeemed / maxAwarded) * 100}%"></b></div></td>
        </tr>`;
      }).join('');

      // Fill in the last 14 days, including days with no claims.
      const byDay = Object.fromEntries(daily.map((d) => [d.day, d]));
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ key, claims: byDay[key]?.claims || 0, redeemed: byDay[key]?.redeemed || 0 });
      }
      const maxDay = Math.max(1, ...days.map((d) => d.claims));
      $('daily').innerHTML = days.map((d) => `
        <div class="day" title="${d.key}: ${d.claims} claimed, ${d.redeemed} redeemed">
          <div class="cols"><i style="height:${(d.claims / maxDay) * 100}%"></i><i style="height:${(d.redeemed / maxDay) * 100}%"></i></div>
          <span>${new Date(d.key + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>
        </div>`).join('');
    } catch (err) { fail(err); }
  }

  /* ---------- members ---------- */
  let searchTimer;
  function membersQuery() {
    const p = new URLSearchParams({ q: $('m-search').value.trim(), status: $('m-status').value });
    $('m-csv').href = '/api/admin/claims.csv?' + p;
    return p;
  }
  async function loadMembers() {
    try {
      const { claims } = await api('/api/admin/claims?' + membersQuery());
      $('m-empty').hidden = claims.length > 0;
      $('members').innerHTML = claims.map((c) => `<tr>
        <td>${esc(c.name)}</td>
        <td class="nowrap">${esc(c.phone)}</td>
        <td>${esc(c.offerName)}</td>
        <td class="mono">${esc(c.code)}</td>
        <td class="nowrap">${fmtDate(c.createdAt)}</td>
        <td>${c.redeemedAt ? `<span class="pill done">Redeemed · ${fmtDate(c.redeemedAt)}</span>` : '<span class="pill wait">Not yet</span>'}</td>
        <td class="num">${c.redeemedAt
          ? `<button class="btn small ghost" data-undo="${c.id}">Undo</button>`
          : `<button class="btn small success" data-redeem="${c.id}">Mark redeemed</button>`}</td>
      </tr>`).join('');
    } catch (err) { fail(err); }
  }
  $('m-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadMembers, 250); });
  $('m-status').addEventListener('change', loadMembers);
  $('members').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.redeem || btn.dataset.undo;
    if (btn.dataset.undo && !confirm('Mark this reward as not redeemed?')) return;
    btn.disabled = true;
    try {
      const { claim } = await api(`/api/admin/claims/${id}/redeem`, { method: btn.dataset.redeem ? 'POST' : 'DELETE' });
      toast(claim.redeemedAt ? `${claim.offerName} redeemed for ${claim.name}` : 'Marked as not redeemed');
      loadMembers();
    } catch (err) { btn.disabled = false; fail(err); }
  });

  /* ---------- offers ---------- */
  async function loadOffers() {
    try {
      const { offers } = await api('/api/admin/offers');
      renderOffers(offers);
    } catch (err) { fail(err); }
  }
  function renderOffers(offers) {
    const visible = offers.filter((o) => o.visible).length;
    const winnable = offers.filter((o) => o.visible && o.selectable).length;
    const warn = $('o-warn');
    warn.hidden = visible >= 2 && winnable >= 1;
    warn.textContent = visible < 2
      ? 'The wheel needs at least 2 offers on it. Until then customers will see “Spin & Win is taking a short break”.'
      : 'No offer can be won right now, so spins will fail. Turn on “Can be won” for at least one offer.';
    $('offers').innerHTML = offers.map((o, i) => `<tr data-id="${o.id}">
      <td><div class="order">
        <button class="btn small ghost" data-move="up" aria-label="Move ${esc(o.name)} up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn small ghost" data-move="down" aria-label="Move ${esc(o.name)} down" ${i === offers.length - 1 ? 'disabled' : ''}>↓</button>
      </div></td>
      <td><input class="name-input" value="${esc(o.name)}" maxlength="24" aria-label="Offer name" data-name></td>
      <td><label class="switch"><input type="checkbox" data-field="visible" aria-label="Show ${esc(o.name)} on wheel" ${o.visible ? 'checked' : ''}><span></span></label></td>
      <td><label class="switch"><input type="checkbox" data-field="selectable" aria-label="${esc(o.name)} can be won" ${o.selectable ? 'checked' : ''} ${o.visible ? '' : 'disabled'}><span></span></label></td>
      <td class="num">${o.claimsCount}</td>
      <td class="num"><button class="btn small ghost danger" data-delete ${o.claimsCount ? 'disabled title="Already awarded — hide it instead"' : ''}>Delete</button></td>
    </tr>`).join('');
  }

  async function patchOffer(id, body) {
    await api('/api/admin/offers/' + id, { method: 'PATCH', body: JSON.stringify(body) });
    await loadOffers();
  }

  $('offers').addEventListener('change', async (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const id = row.dataset.id;
    try {
      if (e.target.dataset.field) {
        await patchOffer(id, { [e.target.dataset.field]: e.target.checked });
        toast('Offer updated');
      } else if ('name' in e.target.dataset) {
        await patchOffer(id, { name: e.target.value });
        toast('Offer renamed');
      }
    } catch (err) { fail(err); loadOffers(); }
  });
  $('offers').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && 'name' in e.target.dataset) e.target.blur();
  });
  $('offers').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const row = btn && btn.closest('tr');
    if (!row) return;
    const id = row.dataset.id;
    try {
      if (btn.dataset.move) {
        const { offers } = await api(`/api/admin/offers/${id}/move`, { method: 'POST', body: JSON.stringify({ direction: btn.dataset.move }) });
        renderOffers(offers);
      } else if ('delete' in btn.dataset) {
        if (!confirm('Delete this offer?')) return;
        await api('/api/admin/offers/' + id, { method: 'DELETE' });
        toast('Offer deleted');
        loadOffers();
      }
    } catch (err) { fail(err); }
  });
  $('add-offer').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = e.target.elements.name;
    try {
      await api('/api/admin/offers', { method: 'POST', body: JSON.stringify({ name: input.value }) });
      input.value = '';
      toast('Offer added');
      loadOffers();
    } catch (err) { fail(err); }
  });

  /* ---------- start ---------- */
  api('/api/admin/me').then((d) => showApp(d.username)).catch(() => showLogin());
})();

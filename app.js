/* UI only. All data goes through window.PC_API (adapter.js). */
(function () {
  const API = window.PC_API;
  const $app = document.getElementById('app');
  const $nav = document.getElementById('nav');
  const $who = document.getElementById('who');
  const $themeToggle = document.getElementById('theme-toggle');

  let me = null;
  let ed = null;   // list editor state
  let cmp = null;  // comparison page state
  let offerForm = null; // catalog offer form state

  /* ---------------- Dark Mode Management ---------------- */
  const savedTheme = localStorage.getItem('pc_theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);
  if ($themeToggle) {
    $themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    $themeToggle.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      localStorage.setItem('pc_theme', next);
      $themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (minor, cur) => minor == null ? 'Not available'
    : esc(cur) + ' ' + (minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => d ? esc(d) : 'Not recorded';
  const fmtTime = (iso) => new Date(iso).toLocaleString();

  const REASONS = {
    MISSING_DATA: 'Missing price, quantity, date or source',
    INACTIVE: 'Offer or part is inactive',
    UNIT_MISMATCH: 'Unit does not match',
    CURRENCY_MISMATCH: 'Currency does not match the policy',
    PRICE_BASIS_MISMATCH: 'Price is not per single piece',
    FUTURE_DATE: 'Checked date is in the future',
    STALE: 'Checked date is older than the age limit',
    INSUFFICIENT_QUANTITY: 'Recorded quantity is below the quantity needed',
  };
  const UNRESOLVED = {
    NO_RECORDED_OFFER: 'No offer recorded for this part',
    NO_ELIGIBLE_OFFER: 'No eligible offer',
    NO_SELECTION: 'Eligible offers exist. Choose one.',
  };
  const badge = (cls, text) => '<span class="badge ' + cls + '">' + text + '</span>';
  const alertBox = (cls, html, role) => '<div class="alert ' + cls + '"' + (role ? ' role="' + role + '"' : '') + '><div>' + html + '</div></div>';
  const fe = (errors, key, id) => errors && errors[key] ? '<div class="err" id="' + id + '">' + esc(errors[key]) + '</div>' : '';

  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

  /* ---------- shell ---------- */
  let landing = false;
  function renderShell() {
    document.body.classList.toggle('landing', landing);
    if (landing && !me) {
      $nav.innerHTML = [['how', 'How it works'], ['try', 'Try it'], ['roles', 'Roles']].map(([t, l]) => '<button type="button" class="navbtn" data-action="scroll" data-target="' + t + '">' + l + '</button>').join('');
      $who.innerHTML = '<a class="btn primary" href="#/login">Sign in</a>';
      return;
    }
    const links = [];
    if (me) {
      if (me.capabilities.includes('lists')) links.push(['#/lists', 'My lists'], ['#/summaries', 'Saved summaries']);
      if (me.capabilities.includes('catalog')) links.push(['#/catalog', 'Catalog']);
    }
    const cur = location.hash || '#/';
    $nav.innerHTML = links.map(([h, t]) => '<a href="' + h + '"' + (cur.startsWith(h) || (h === '#/lists' && cur.startsWith('#/compare')) ? ' aria-current="page"' : '') + '>' + t + '</a>').join('');
    $who.innerHTML = me ? '<span class="pill">' + esc(me.name) + ' (' + esc(me.role) + ')</span><button type="button" data-action="logout">Sign out</button>' : '';
  }
  function setMain(html) { landing = false; $app.innerHTML = html; renderShell(); window.scrollTo(0, 0); }
  function pageLanding() {
    landing = true; $app.innerHTML = window.PC_LANDING.html(); renderShell(); window.scrollTo(0, 0); window.PC_LANDING.mount();
  }
  function loading(t) { setMain('<p class="sub" role="status">' + esc(t || 'Loading...') + '</p>'); }
  function errorPage(e) {
    if (e && e.status === 401) { me = null; go('#/login'); return; }
    const denied = e && e.status === 403;
    setMain('<div class="card stack"><h1>' + (denied ? 'Access denied' : 'Something went wrong') + '</h1>'
      + alertBox('bad', esc(e && e.message ? e.message : 'Unexpected error.') + (e && e.code ? ' <span class="small">(' + esc(e.code) + ')</span>' : ''), 'alert')
      + '<p class="small">The server decides what you may do. Hiding a menu item is only for convenience.</p>'
      + '<div><a class="btn" href="#/">Back to start</a></div></div>');
  }

  /* ---------- pages ---------- */
  function pageLogin(err, username) {
    setMain('<div class="login-wrap"><div class="login-art" aria-hidden="true">' + window.PC_ART.chip('#0B3C43', '#7CD3CF') + '<h2>Compare offers with confidence</h2><p>Dated offers, clear reasons, and summaries that stay put.</p></div>'
      + '<div class="card stack login-card"><h1>Sign in</h1>'
      + '<p class="sub">No public signup. Accounts are provided by an administrator.</p>'
      + (err ? alertBox('bad', esc(err), 'alert') : '')
      + '<form id="login" class="stack" novalidate>'
      + '<div><label for="u">Username</label><input id="u" name="u" autocomplete="username" value="' + esc(username || '') + '"></div>'
      + '<div><label for="p">Password</label><input id="p" name="p" type="password" autocomplete="current-password"></div>'
      + '<button class="primary" type="submit">Sign in</button></form>'
      + '<div class="stack"><div class="small">Or jump straight in with a demo account:</div><div class="row"><button type="button" data-action="quick-login" data-u="preparer">Preparer</button><button type="button" data-action="quick-login" data-u="maintainer">Maintainer</button><button type="button" data-action="quick-login" data-u="admin">Administrator</button></div></div>'
      + alertBox('info', 'Demo password: <span class="mono">demo</span>. This is a mock login, not real security.')
      + '</div></div>');
    document.getElementById('u').focus();
  }

  function pageHome() {
    if (!me) return pageLanding();
    if (me.capabilities.includes('lists')) return go('#/lists');
    if (me.capabilities.includes('catalog')) return go('#/catalog');
    setMain('<div class="card stack"><h1>Administrator</h1>' + alertBox('info', 'Account and policy administration is not built into this demo. A framework admin page may be enough later. Access mapping for administrators is still to be agreed.') + '</div>');
  }

  /* --- catalog --- */
  async function pageCatalog(search) {
    loading('Loading catalog...');
    try {
      const [parts, offers, sups] = await Promise.all([API.listParts(), API.listOffers(), API.listSuppliers()]);
      window.__cat = { parts, offers, sups };
      drawCatalog(search || '');
    } catch (e) { errorPage(e); }
  }
  function drawCatalog(search, notice) {
    const { parts, offers, sups } = window.__cat;
    const q = search.trim().toLowerCase();
    const pName = (id) => (parts.find((p) => p.id === id) || {}).exact_id || '?';
    const sName = (id) => (sups.find((s) => s.id === id) || {}).name || '?';
    const rows = offers.filter((o) => !q || pName(o.part_id).toLowerCase().includes(q) || sName(o.supplier_id).toLowerCase().includes(q) || (o.source_reference || '').toLowerCase().includes(q));
    const f = offerForm || { part_id: '', supplier_id: '', price: '', currency: 'PHP', price_basis: 'per_piece', recorded_quantity: '', checked_date: '', source_reference: '', active: true, errors: null, error: null, id: null, revision: null };
    offerForm = f;
    const opt = (list, val, label) => list.map((x) => '<option value="' + esc(x.id) + '"' + (x.id === val ? ' selected' : '') + '>' + esc(label(x)) + '</option>').join('');
    setMain('<div><h1>Offer catalog</h1><p class="sub">Parts and dated, attributed supplier offers. Recorded quantity is what was written down when checked, not live stock.</p></div>'
      + (notice ? alertBox('ok', esc(notice), 'status') : '')
      + '<div class="grid2"><section class="card main" aria-labelledby="oh"><div class="row between" style="margin-bottom:12px"><h2 id="oh">' + rows.length + ' of ' + offers.length + ' offers</h2>'
      + '<div class="field" style="max-width:280px"><label for="q" class="sr">Search</label><input id="q" type="search" placeholder="Search part, supplier or source" value="' + esc(search) + '" data-bind="catsearch"></div></div>'
      + (rows.length ? '<div class="tbl"><table><thead><tr><th>Part ID</th><th>Supplier</th><th class="num">Unit price</th><th class="num">Recorded qty</th><th>Checked</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead><tbody>'
        + rows.map((o) => {
          const missing = o.price_minor == null || o.recorded_quantity == null || !o.checked_date || !o.source_reference;
          const st = !o.active ? badge('gray', 'Inactive') : missing ? badge('bad', '! Incomplete') : badge('ok', '&#10003; Complete');
          return '<tr' + (missing ? ' class="row-bad"' : '') + '><td class="mono">' + esc(pName(o.part_id)) + '</td><td>' + esc(sName(o.supplier_id)) + '<div class="small">' + esc(o.source_reference || 'No source') + '</div></td>'
            + '<td class="num">' + money(o.price_minor, o.currency) + '</td><td class="num">' + (o.recorded_quantity == null ? 'Missing' : o.recorded_quantity) + '</td><td>' + fmtDate(o.checked_date) + '</td><td>' + st + (o.synthetic ? ' ' + badge('gray', 'Synthetic') : '') + '</td>'
            + '<td><button type="button" class="link" data-action="edit-offer" data-id="' + esc(o.id) + '">Edit</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="sub">No offers match your search.</p>')
      + '</section>'
      + '<aside class="card side stack" aria-labelledby="fh"><h2 id="fh">' + (f.id ? 'Edit offer' : 'Add offer') + '</h2>'
      + '<p class="small">Leave unknown facts empty. An offer with missing facts is saved but cannot be selected.</p>'
      + (f.error ? alertBox('bad', esc(f.error), 'alert') : '')
      + '<form id="offerform" class="stack" novalidate>'
      + '<div><label for="f-part">Exact part ID</label><select id="f-part" data-bind="of.part_id"' + (f.errors && f.errors.part_id ? ' aria-invalid="true" aria-describedby="e-part"' : '') + '><option value="">Choose a part</option>' + opt(parts, f.part_id, (p) => p.exact_id + ' - ' + p.description) + '</select>' + fe(f.errors, 'part_id', 'e-part') + '</div>'
      + '<div><label for="f-sup">Supplier</label><select id="f-sup" data-bind="of.supplier_id"' + (f.errors && f.errors.supplier_id ? ' aria-invalid="true" aria-describedby="e-sup"' : '') + '><option value="">Choose a supplier</option>' + opt(sups, f.supplier_id, (s) => s.name) + '</select>' + fe(f.errors, 'supplier_id', 'e-sup') + '</div>'
      + '<div class="row"><div class="field"><label for="f-price">Unit price</label><input id="f-price" inputmode="decimal" value="' + esc(f.price) + '" data-bind="of.price"' + (f.errors && f.errors.price ? ' aria-invalid="true" aria-describedby="e-price"' : '') + '>' + fe(f.errors, 'price', 'e-price') + '</div>'
      + '<div class="field" style="flex-basis:90px"><label for="f-cur">Currency</label><input id="f-cur" maxlength="3" value="' + esc(f.currency) + '" data-bind="of.currency"></div></div>'
      + '<div><label for="f-basis">Price basis</label><select id="f-basis" data-bind="of.price_basis"><option value="per_piece"' + (f.price_basis === 'per_piece' ? ' selected' : '') + '>Per single piece</option><option value="per_pack"' + (f.price_basis === 'per_pack' ? ' selected' : '') + '>Per pack (not supported)</option></select></div>'
      + '<div class="row"><div class="field"><label for="f-qty">Recorded quantity</label><input id="f-qty" inputmode="numeric" value="' + esc(f.recorded_quantity) + '" data-bind="of.recorded_quantity"' + (f.errors && f.errors.recorded_quantity ? ' aria-invalid="true" aria-describedby="e-qty"' : '') + '>' + fe(f.errors, 'recorded_quantity', 'e-qty') + '</div>'
      + '<div class="field"><label for="f-date">Checked date</label><input id="f-date" type="date" value="' + esc(f.checked_date) + '" data-bind="of.checked_date"></div></div>'
      + '<div><label for="f-src">Source reference</label><input id="f-src" value="' + esc(f.source_reference) + '" data-bind="of.source_reference"></div>'
      + '<label style="display:flex;gap:10px;align-items:center;font-weight:400"><input type="checkbox" data-bind="of.active"' + (f.active ? ' checked' : '') + '> Offer is active</label>'
      + '<div class="row"><button class="primary" type="submit">' + (f.id ? 'Save changes' : 'Add offer') + '</button>' + (f.id ? '<button type="button" data-action="cancel-offer">Cancel</button>' : '') + '</div></form>'
      + '</aside></div>');
  }

  /* --- lists --- */
  async function pageLists() {
    loading('Loading your lists...');
    try {
      const lists = await API.listLists();
      setMain('<div class="row between"><div><h1>My parts lists</h1><p class="sub">Only you can see your own lists.</p></div></div>'
        + '<div class="grid2"><section class="main stack" aria-label="Lists">'
        + (lists.length ? lists.map((l) => '<div class="list-card"><div class="row between" style="align-items:center"><div><strong>' + esc(l.title) + '</strong> ' + (l.archived ? badge('gray', 'Archived') : '') + '<div class="small">' + l.lines.length + ' lines, revision ' + l.revision + '</div></div>'
          + '<div class="row"><a class="btn" href="#/lists/' + esc(l.id) + '">Edit</a><a class="btn primary" href="#/compare/' + esc(l.id) + '"' + (l.lines.length ? '' : ' aria-disabled="true" tabindex="-1"') + '>Compare</a></div></div></div>').join('') : '<div class="card"><p class="sub">You have no lists yet. Create one to start.</p></div>')
        + '</section><aside class="card side stack"><h2>New list</h2><form id="newlist" class="stack" novalidate><div><label for="nl">Title</label><input id="nl" placeholder="e.g. Aircon unit service parts"><div class="err" id="nl-err" hidden></div></div><button class="primary" type="submit">Create list</button></form></aside></div>');
    } catch (e) { errorPage(e); }
  }

  async function pageEditor(id) {
    loading('Loading list...');
    try {
      const [list, parts] = await Promise.all([API.getList(id), API.listParts()]);
      ed = { id: list.id, revision: list.revision, title: list.title, archived: list.archived, parts, errors: null, error: null, saved: false,
        lines: list.lines.map((l) => ({ id: l.id, part_id: l.part_id, quantity: String(l.quantity) })) };
      drawEditor();
    } catch (e) { errorPage(e); }
  }

  function drawEditor() {
    const er = ed.errors || {}; const le = er.lines || {};
    
    // Check for duplicates
    const partCounts = {};
    ed.lines.forEach((l) => {
      if (l.part_id) partCounts[l.part_id] = (partCounts[l.part_id] || 0) + 1;
    });
    const dupParts = Object.keys(partCounts).filter((k) => partCounts[k] > 1);
    const hasDup = dupParts.length > 0;
    const dupPartNames = dupParts.map((id) => {
      const p = ed.parts.find((item) => item.id === id);
      return p ? p.exact_id : id;
    });

    const rows = ed.lines.map((l, i) => {
      const isDup = l.part_id && partCounts[l.part_id] > 1;
      const bad = !!le[i] || isDup;
      return '<tr' + (bad ? ' class="row-bad"' : '') + '><td style="min-width:220px"><label class="sr" for="lp' + i + '">Part for line ' + (i + 1) + '</label><select id="lp' + i + '" data-bind="line.part" data-i="' + i + '"' + (bad ? ' aria-invalid="true" aria-describedby="le' + i + '"' : '') + '><option value="">Choose a part</option>'
        + ed.parts.map((p) => '<option value="' + esc(p.id) + '"' + (p.id === l.part_id ? ' selected' : '') + (!p.active ? ' disabled' : '') + '>' + esc(p.exact_id) + ' - ' + esc(p.description) + '</option>').join('') + '</select>'
        + (bad ? '<div class="err" id="le' + i + '">' + esc(le[i] || (isDup ? 'Duplicate part on BOM.' : '')) + '</div>' : '') + '</td>'
        + '<td style="width:130px"><label class="sr" for="lq' + i + '">Quantity for line ' + (i + 1) + '</label><input id="lq' + i + '" inputmode="numeric" value="' + esc(l.quantity) + '" data-bind="line.qty" data-i="' + i + '"' + (bad ? ' aria-invalid="true"' : '') + '></td>'
        + '<td><button type="button" class="link" data-action="remove-line" data-i="' + i + '" aria-label="Remove line ' + (i + 1) + '">Remove</button></td></tr>';
    }).join('');

    const dupBanner = hasDup 
      ? alertBox('bad', '⚠️ <strong>' + esc(dupPartNames.join(', ')) + '</strong> is already on this BOM. Edit its quantity instead of adding a second line.', 'alert')
      : '';

    setMain('<div class="row between" style="align-items:center"><div><h1>Edit list</h1><p class="sub">Revision ' + ed.revision + '. Use whole-piece quantities. Each part can appear once.</p></div><a class="btn" href="#/lists">Back to lists</a></div>'
      + dupBanner
      + (ed.error ? alertBox('bad', esc(ed.error), 'alert') + (ed.conflict ? '<div><button type="button" data-action="reload-list">Reload latest (discards your edits)</button></div>' : '') : '')
      + (ed.saved ? alertBox('ok', 'Saved. Now at revision ' + ed.revision + '.', 'status') : '')
      + '<form id="editor" class="card stack" novalidate><div><label for="t">List title</label><input id="t" value="' + esc(ed.title) + '" data-bind="ed.title"' + (er.title ? ' aria-invalid="true" aria-describedby="et"' : '') + '>' + fe(er, 'title', 'et') + '</div>'
      + (ed.lines.length ? '<div class="tbl"><table><thead><tr><th>Part</th><th>Quantity</th><th><span class="sr">Actions</span></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="sub">This list is empty. You can save a draft, but it cannot be compared until it has lines.</p>')
      + '<div class="row"><button type="button" data-action="add-line">Add line</button></div>'
      + '<label style="display:flex;gap:10px;align-items:center;font-weight:400"><input type="checkbox" data-bind="ed.archived"' + (ed.archived ? ' checked' : '') + '> Archived</label>'
      + '<div class="row"><button class="primary" type="submit"' + (hasDup ? ' disabled' : '') + '>Save list</button><a class="btn" href="#/compare/' + esc(ed.id) + '" ' + (ed.lines.length && !ed.dirty && !hasDup ? '' : 'aria-disabled="true" tabindex="-1"') + '>Compare saved list</a></div>'
      + (ed.dirty ? '<p class="small">Save your changes before comparing.</p>' : '') + '</form>');
  }

  /* --- compare --- */
  async function pageCompare(id) {
    loading('Preparing comparison...');
    try {
      const policy = await API.getPolicy();
      cmp = { id, selections: {}, result: null, policy, error: null, saveState: 'idle', token: API.newToken(), savedId: null, settingErrors: null };
      if (!policy) { drawCompare(); return; }
      cmp.result = await API.compare(id, cmp.selections);
      drawCompare();
    } catch (e) {
      if (e.code === 'EMPTY_LIST') { setMain('<div class="card stack"><h1>Cannot compare</h1>' + alertBox('warn', 'This list is empty. Add at least one line first.', 'alert') + '<div><a class="btn" href="#/lists/' + esc(id) + '">Edit list</a></div></div>'); return; }
      errorPage(e);
    }
  }

  function candHtml(line, c) {
    const lowest = line.lowest_eligible_offer_ids.includes(c.offer_id);
    const tie = lowest && line.lowest_eligible_offer_ids.length > 1;
    const chosen = line.selected_offer_id === c.offer_id;
    const meta = esc(c.supplier_name) + ' &middot; ' + money(c.price_minor, c.currency) + ' each &middot; recorded qty ' + (c.recorded_quantity == null ? 'missing' : c.recorded_quantity)
      + '<br><span class="small">Checked ' + fmtDate(c.checked_date) + ' &middot; ' + esc(c.source_reference || 'No source') + (c.synthetic ? ' &middot; synthetic' : '') + '</span>';
    if (c.eligible) {
      return '<div class="cand' + (chosen ? ' sel' : '') + '"><label><input type="radio" name="sel-' + esc(line.line_id) + '" value="' + esc(c.offer_id) + '" data-bind="select" data-line="' + esc(line.line_id) + '"' + (chosen ? ' checked' : '') + '><span>' + meta
        + '<br>' + badge('ok', '&#10003; Eligible') + (lowest ? ' ' + badge('gray', tie ? 'Tied lowest eligible price' : 'Lowest eligible price') : '') + '</span></label></div>';
    }
    return '<div class="cand off"><div>' + meta + '<br>' + badge('bad', 'Excluded') + '<ul style="margin:6px 0 0;padding-left:18px">' + c.reasons.map((r) => '<li>' + esc(REASONS[r] || r) + '</li>').join('') + '</ul></div></div>';
  }

  function drawCompare() {
    const back = '<a class="btn" href="#/lists/' + esc(cmp.id) + '">Back to list</a>';
    if (!cmp.policy) {
      const se = cmp.settingErrors || {};
      setMain('<div class="row between" style="align-items:center"><h1>Compare</h1>' + back + '</div>'
        + alertBox('warn', '<strong>CONFIG_REQUIRED.</strong> No comparison policy has been adopted, so nothing can be compared. In a real project your team agrees the age limit and currency first. For this demo you can set sample values below.', 'alert')
        + '<form id="policy" class="card stack" style="max-width:480px" novalidate><h2>Demo policy (synthetic)</h2>'
        + '<div><label for="pa">Maximum age of a checked date, in days</label><input id="pa" inputmode="numeric" placeholder="e.g. 14"' + (se.max_age_days ? ' aria-invalid="true" aria-describedby="pae"' : '') + '>' + fe(se, 'max_age_days', 'pae') + '</div>'
        + '<div><label for="pc">Currency code</label><input id="pc" value="PHP" maxlength="3"' + (se.currency ? ' aria-invalid="true" aria-describedby="pce"' : '') + '>' + fe(se, 'currency', 'pce') + '</div>'
        + '<button class="primary" type="submit">Use this demo policy</button></form>');
      return;
    }
    const r = cmp.result; const s = r.summary; const complete = s.status === 'COMPLETE';
    const noteBlock = '<ul class="small" style="margin:0;padding-left:18px"><li>Each line uses one eligible offer that covers its full quantity. Splitting across suppliers is not supported.</li><li>Prices are used as recorded. Shipping, travel, and extra charges are excluded.</li><li>"Lowest eligible price" only compares eligible recorded offers. It is not the lowest market price.</li></ul>';
    setMain('<div class="row between" style="align-items:center"><div><h1>Compare</h1><p class="sub">Policy ' + esc(r.policy_version) + ' &middot; offers checked within ' + r.policy.max_age_days + ' days &middot; ' + esc(r.currency) + ' &middot; evaluated ' + esc(r.evaluation_date) + '</p></div>' + back + '</div>'
      + (cmp.error ? alertBox('bad', esc(cmp.error.message) + ' <span class="small">(' + esc(cmp.error.code) + ')</span>', 'alert') + (cmp.error.code === 'INPUT_CHANGED' ? '<div><button type="button" data-action="rereview">Review again</button></div>' : '') : '')
      + (cmp.savedId ? alertBox('ok', 'Saved as a ' + (complete ? 'complete' : 'partial (incomplete)') + ' sourcing summary. <a href="#/summaries/' + esc(cmp.savedId) + '">Open it</a>.', 'status') : '')
      + '<section class="card stack" aria-labelledby="sh"><div class="row between"><div><h2 id="sh">Parts subtotal' + (complete ? '' : ' (partial)') + '</h2><div class="total">' + money(s.subtotal_minor, r.currency) + '</div>'
      + '<div class="small">' + (r.lines.length - s.unresolved_count) + ' of ' + r.lines.length + ' lines costed ' + (complete ? badge('ok', '&#10003; Complete') : badge('warn', '! Incomplete')) + '</div></div>'
      + '<div class="row"><button class="primary" type="button" data-action="save-summary"' + (cmp.saveState === 'saving' || cmp.savedId ? ' disabled' : '') + '>' + (cmp.saveState === 'saving' ? 'Saving...' : cmp.saveState === 'failed' ? 'Retry save' : 'Save sourcing summary') + '</button></div></div>'
      + (complete ? '' : alertBox('warn', '<strong>' + s.unresolved_count + ' unresolved line' + (s.unresolved_count > 1 ? 's' : '') + '.</strong> Their cost is not counted, and is not zero. You may still save, and the summary will be labelled incomplete.'))
      + noteBlock + '</section>'
      + '<section class="card" aria-labelledby="lh"><h2 id="lh" style="margin-bottom:12px">Lines</h2><div class="tbl"><table><thead><tr><th>Part</th><th class="num">Qty</th><th>Offers (choose one)</th><th class="num">Line cost</th><th>Status</th></tr></thead><tbody>'
      + r.lines.map((l) => '<tr' + (l.line_status === 'UNRESOLVED' ? ' class="row-bad"' : '') + '><td style="min-width:150px"><div class="mono">' + esc(l.exact_id) + '</div><div class="small">' + esc(l.description) + '</div></td><td class="num">' + l.quantity + '</td>'
        + '<td style="min-width:320px">' + (l.candidates.length ? l.candidates.map((c) => candHtml(l, c)).join('') : '<span class="small">No offer recorded for this part.</span>') + '</td>'
        + '<td class="num">' + (l.line_cost_minor == null ? 'Not counted' : money(l.line_cost_minor, r.currency)) + '</td>'
        + '<td>' + (l.line_status === 'RESOLVED' ? badge('ok', '&#10003; Resolved') : badge('bad', '! Unresolved') + '<div class="small" style="margin-top:4px">' + esc(UNRESOLVED[l.unresolved_reason]) + '</div>') + '</td></tr>').join('')
      + '</tbody></table></div></section>'
      + '<section class="demo-tools stack" aria-label="Demo tools"><strong>Demo tools</strong><p class="small">Try the "inputs changed" protection: this changes the first offer of the first line (revision and price) as if the maintainer edited the catalog, then try saving.</p><div><button type="button" data-action="demo-change">Simulate a catalog change</button></div></section>');
  }

  async function refreshCompare() {
    cmp.result = await API.compare(cmp.id, cmp.selections);
    drawCompare();
  }

  /* --- summaries --- */
  async function pageSummaries() {
    loading('Loading summaries...');
    try {
      const list = await API.listSummaries();
      setMain('<div><h1>Saved sourcing summaries</h1><p class="sub">Each summary keeps the prices, sources and rules used when it was saved.</p></div>'
        + (list.length ? '<div class="stack">' + list.map((x) => '<a class="list-card" href="#/summaries/' + esc(x.id) + '"><div class="row between" style="align-items:center"><div><strong>' + esc(x.title) + '</strong><div class="small">Saved ' + esc(fmtTime(x.created_at)) + '</div></div><div class="row" style="align-items:center"><span class="mono">' + money(x.subtotal_minor, x.currency) + '</span>' + (x.status === 'COMPLETE' ? badge('ok', '&#10003; Complete') : badge('warn', '! Incomplete (partial subtotal)')) + '</div></div></a>').join('') + '</div>'
          : '<div class="card"><p class="sub">No saved summaries yet. Compare one of your lists and save it.</p><div style="margin-top:12px"><a class="btn primary" href="#/lists">Go to my lists</a></div></div>'));
    } catch (e) { errorPage(e); }
  }

  async function pageSummary(id) {
    loading('Loading summary...');
    try {
      const x = await API.getSummary(id); const r = x.comparison; const s = r.summary; const complete = s.status === 'COMPLETE';
      setMain('<div class="row between" style="align-items:center"><div><h1>' + esc(x.title) + '</h1><p class="sub">Saved ' + esc(fmtTime(x.created_at)) + ' &middot; policy ' + esc(r.policy_version) + ' (age limit ' + r.policy.max_age_days + ' days, ' + esc(r.currency) + ') &middot; list revision ' + r.list_revision + '</p></div><a class="btn" href="#/summaries">All summaries</a></div>'
        + alertBox('info', 'This is a frozen snapshot. It shows the values used when it was saved, even if the catalog has changed since. To use current offers, make a new comparison.')
        + '<section class="card stack"><div><div class="small">Parts subtotal' + (complete ? '' : ' (partial)') + ' as saved</div><div class="total">' + money(s.subtotal_minor, r.currency) + '</div><div class="small">' + (complete ? badge('ok', '&#10003; Complete') : badge('warn', '! Incomplete') + ' ' + s.unresolved_count + ' unresolved line(s) not counted') + ' &middot; excludes tax, shipping and other charges</div></div>'
        + '<div class="tbl"><table><thead><tr><th>Part</th><th class="num">Qty</th><th>Chosen offer and sources considered</th><th class="num">Unit price</th><th class="num">Line cost</th></tr></thead><tbody>'
        + r.lines.map((l) => { const sel = l.candidates.find((c) => c.offer_id === l.selected_offer_id);
          return '<tr' + (sel ? '' : ' class="row-bad"') + '><td><div class="mono">' + esc(l.exact_id) + '</div><div class="small">' + esc(l.description) + '</div></td><td class="num">' + l.quantity + '</td><td>'
            + (sel ? '<strong>' + esc(sel.supplier_name) + '</strong><div class="small">Checked ' + fmtDate(sel.checked_date) + ' &middot; ' + esc(sel.source_reference) + '</div>' : badge('bad', '! Unresolved') + '<div class="small">' + esc(UNRESOLVED[l.unresolved_reason]) + '</div>')
            + (l.candidates.length ? '<details style="margin-top:6px"><summary class="small">' + l.candidates.length + ' offer(s) considered</summary>' + l.candidates.map((c) => '<div class="small" style="margin-top:4px">' + esc(c.supplier_name) + ': ' + money(c.price_minor, c.currency) + ', qty ' + (c.recorded_quantity == null ? 'missing' : c.recorded_quantity) + ', checked ' + fmtDate(c.checked_date) + ' &mdash; ' + (c.eligible ? 'eligible' : 'excluded: ' + c.reasons.map((q) => esc(REASONS[q] || q)).join('; ')) + '</div>').join('') + '</details>' : '')
            + '</td><td class="num">' + (sel ? money(sel.price_minor, sel.currency) : 'Not available') + '</td><td class="num">' + (l.line_cost_minor == null ? 'Not counted' : money(l.line_cost_minor, r.currency)) + '</td></tr>'; }).join('')
        + '</tbody></table></div></section>');
    } catch (e) { errorPage(e); }
  }

  /* ---------- router ---------- */
  async function route() {
    const h = location.hash || '#/';
    try {
      if (!me) { try { me = await API.me(); } catch (e) { me = null; } }
      if (!me && (h === '#/' || h === '#')) return pageLanding();
      if (!me && h !== '#/login') { return pageLogin(); }
      if (h === '#/login') { if (me) return go('#/'); return pageLogin(); }
      let m;
      if (h === '#/' ) return pageHome();
      if (h === '#/catalog') { offerForm = null; return pageCatalog(); }
      if (h === '#/lists') return pageLists();
      if ((m = h.match(/^#\/lists\/(.+)$/))) return pageEditor(m[1]);
      if ((m = h.match(/^#\/compare\/(.+)$/))) return pageCompare(m[1]);
      if (h === '#/summaries') return pageSummaries();
      if ((m = h.match(/^#\/summaries\/(.+)$/))) return pageSummary(m[1]);
      setMain('<div class="card"><h1>Page not found</h1><a href="#/">Go back</a></div>');
    } catch (e) { errorPage(e); }
  }
  window.addEventListener('hashchange', route);

  /* ---------- events ---------- */
  document.addEventListener('submit', async (ev) => {
    const f = ev.target; ev.preventDefault();
    try {
      if (f.id === 'login') {
        const u = f.u.value.trim();
        try { me = await API.login(u, f.p.value); go('#/'); } catch (e) { pageLogin(e.message, u); }
      } else if (f.id === 'newlist') {
        const title = document.getElementById('nl').value;
        try { const l = await API.createList(title); go('#/lists/' + l.id); }
        catch (e) { const el = document.getElementById('nl-err'); el.hidden = false; el.textContent = (e.field_errors && e.field_errors.title) || e.message; document.getElementById('nl').setAttribute('aria-invalid', 'true'); document.getElementById('nl').setAttribute('aria-describedby', 'nl-err'); document.getElementById('nl').focus(); }
      } else if (f.id === 'editor') {
        const lines = ed.lines.map((l) => ({ id: l.id, part_id: l.part_id, quantity: /^\d+$/.test(String(l.quantity).trim()) ? parseInt(l.quantity, 10) : NaN }));
        try {
          const saved = await API.updateList(ed.id, ed.revision, ed.title, lines, ed.archived);
          ed.revision = saved.revision; ed.lines = saved.lines.map((l) => ({ id: l.id, part_id: l.part_id, quantity: String(l.quantity) }));
          ed.errors = null; ed.error = null; ed.saved = true; ed.dirty = false; ed.conflict = false; drawEditor();
        } catch (e) { ed.errors = e.field_errors || null; ed.error = e.message; ed.conflict = e.code === 'REVISION_CONFLICT'; ed.saved = false; drawEditor(); }
      } else if (f.id === 'policy') {
        const raw = document.getElementById('pa').value.trim();
        const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        try { cmp.policy = await API.setPolicy(n, document.getElementById('pc').value.trim().toUpperCase()); cmp.settingErrors = null; cmp.result = await API.compare(cmp.id, cmp.selections); drawCompare(); }
        catch (e) { cmp.settingErrors = e.field_errors || { max_age_days: e.message }; drawCompare(); }
      } else if (f.id === 'offerform') {
        const o = offerForm; const e0 = {};
        const price = String(o.price).trim(); const qty = String(o.recorded_quantity).trim();
        let price_minor = null, recorded_quantity = null;
        if (price !== '') { if (/^\d+(\.\d{1,2})?$/.test(price)) price_minor = Math.round(parseFloat(price) * 100); else e0.price = 'Enter an amount like 185 or 185.50.'; }
        if (qty !== '') { if (/^\d+$/.test(qty)) recorded_quantity = parseInt(qty, 10); else e0.recorded_quantity = 'Quantity must be a whole number, 0 or more.'; }
        if (Object.keys(e0).length) { o.errors = e0; o.error = 'Please fix the highlighted fields.'; return drawCatalog(document.getElementById('q') ? document.getElementById('q').value : ''); }
        try {
          await API.saveOffer({ id: o.id, revision: o.revision, part_id: o.part_id, supplier_id: o.supplier_id, price_minor, currency: o.currency, price_basis: o.price_basis, recorded_quantity, checked_date: o.checked_date, source_reference: o.source_reference, active: o.active });
          const wasEdit = !!o.id; offerForm = null;
          const [parts, offers, sups] = await Promise.all([API.listParts(), API.listOffers(), API.listSuppliers()]);
          window.__cat = { parts, offers, sups }; drawCatalog('', wasEdit ? 'Offer updated.' : 'Offer added.');
        } catch (e) { o.errors = e.field_errors || null; o.error = e.message; drawCatalog(document.getElementById('q') ? document.getElementById('q').value : ''); }
      }
    } catch (e) { errorPage(e); }
  });

  document.addEventListener('input', (ev) => {
    const t = ev.target; const b = t.getAttribute && t.getAttribute('data-bind'); if (!b) return;
    if (b === 'ed.title') { ed.title = t.value; ed.dirty = true; }
    else if (b === 'line.qty') { ed.lines[+t.dataset.i].quantity = t.value; ed.dirty = true; }
    else if (b.startsWith('of.') && b !== 'of.active') { offerForm[b.slice(3)] = t.value; }
    else if (b === 'catsearch') { drawCatalog(t.value); const q = document.getElementById('q'); q.focus(); q.setSelectionRange(t.value.length, t.value.length); }
  });

  document.addEventListener('change', async (ev) => {
    const t = ev.target; const b = t.getAttribute && t.getAttribute('data-bind'); if (!b) return;
    try {
      if (b === 'line.part') { 
        ed.lines[+t.dataset.i].part_id = t.value; 
        ed.dirty = true;
        drawEditor(); // Re-render to instantly update duplicate warnings
      }
      else if (b === 'ed.archived') { ed.archived = t.checked; ed.dirty = true; }
      else if (b === 'of.active') { offerForm.active = t.checked; }
      else if (b.startsWith('of.')) { offerForm[b.slice(3)] = t.value; }
      else if (b === 'select') { cmp.selections[t.dataset.line] = t.value; cmp.error = null; await refreshCompare(); }
    } catch (e) { errorPage(e); }
  });

  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-action]'); if (!t) {
      const a = ev.target.closest('a[aria-disabled="true"]'); if (a) ev.preventDefault(); return;
    }
    const act = t.dataset.action;
    try {
      if (act === 'logout') { await API.logout(); me = null; go('#/'); }
      else if (act === 'scroll') { const el = document.getElementById(t.dataset.target); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
      else if (act === 'quick-login') { try { me = await API.login(t.dataset.u, 'demo'); go('#/'); } catch (e) { pageLogin(e.message); } }
      else if (act === 'add-line') { ed.lines.push({ id: null, part_id: '', quantity: '1' }); ed.dirty = true; drawEditor(); const sel = document.getElementById('lp' + (ed.lines.length - 1)); if (sel) sel.focus(); }
      else if (act === 'remove-line') { ed.lines.splice(+t.dataset.i, 1); ed.dirty = true; ed.errors = null; drawEditor(); }
      else if (act === 'reload-list') { pageEditor(ed.id); }
      else if (act === 'edit-offer') {
        const o = window.__cat.offers.find((x) => x.id === t.dataset.id);
        offerForm = { id: o.id, revision: o.revision, part_id: o.part_id, supplier_id: o.supplier_id, price: o.price_minor == null ? '' : (o.price_minor / 100).toFixed(2), currency: o.currency, price_basis: o.price_basis, recorded_quantity: o.recorded_quantity == null ? '' : String(o.recorded_quantity), checked_date: o.checked_date || '', source_reference: o.source_reference || '', active: o.active, errors: null, error: null };
        drawCatalog(''); document.getElementById('fh').scrollIntoView(); document.getElementById('f-part').focus();
      }
      else if (act === 'cancel-offer') { offerForm = null; drawCatalog(''); }
      else if (act === 'rereview') { cmp.error = null; cmp.saveState = 'idle'; cmp.token = API.newToken(); await refreshCompare(); }
      else if (act === 'demo-change') {
        const l = cmp.result.lines[0]; if (l && l.candidates[0]) { await API.bumpOfferForDemo(l.candidates[0].offer_id); }
        cmp.error = null; drawCompare();
      }
      else if (act === 'save-summary') {
        const r = cmp.result; cmp.saveState = 'saving'; cmp.error = null; drawCompare();
        try {
          const sm = await API.saveSummary(cmp.id, { list_revision: r.list_revision, selections: cmp.selections, policy_version: r.policy_version, review_fingerprint: r.review_fingerprint, save_token: cmp.token });
          cmp.saveState = 'saved'; cmp.savedId = sm.id; drawCompare();
        } catch (e) { cmp.saveState = e.code === 'INPUT_CHANGED' ? 'idle' : 'failed'; cmp.error = e; drawCompare(); }
      }
    } catch (e) { errorPage(e); }
  });

  const srStyle = document.createElement('style');
  srStyle.textContent = '.sr{position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';
  document.head.appendChild(srStyle);
  route();
})();
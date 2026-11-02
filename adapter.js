/*
 * DATA ADAPTER (replaceable).
 * Every method returns a Promise, resolves with the data, or rejects with
 * { status, code, message, field_errors? } like the proposed H1 contract.
 *
 * DEMO ONLY: this file simulates the BACKEND (login, rules, snapshots) in the
 * browser using localStorage. That is NOT real security or real persistence.
 * When a real backend exists, rewrite these methods to call it with fetch()
 * and keep the same return shapes. The UI in app.js should not need to change.
 */
(function () {
  const KEY = 'partscompare_demo_v1';
  const SKEY = 'partscompare_demo_session';

  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s) { s = JSON.parse(JSON.stringify(window.PC_FIXTURES)); save(s); }
    return s;
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function nextId(s, prefix) { s.counters.id += 1; return prefix + s.counters.id; }
  function fail(status, code, message, field_errors) { return { status, code, message, field_errors }; }
  function todayStr() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function daysBetween(a, b) {
    const t = (x) => { const [y, m, d] = x.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((t(b) - t(a)) / 86400000);
  }
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'fp' + (h >>> 0).toString(16);
  }
  function uuid() {
    return (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'tok-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  const CAN = {
    preparer: ['lists', 'summaries'],
    maintainer: ['catalog'],
    administrator: [],
  };
  function currentUser(s) {
    const id = sessionStorage.getItem(SKEY);
    const u = s.users.find((x) => x.id === id);
    if (!u) throw fail(401, 'UNAUTHENTICATED', 'Please sign in.');
    return u;
  }
  function need(s, cap) {
    const u = currentUser(s);
    if (!CAN[u.role].includes(cap)) throw fail(403, 'FORBIDDEN', 'Your role is not allowed to do this.');
    return u;
  }
  const wrap = (fn) => new Promise((resolve, reject) => {
    setTimeout(() => { try { resolve(fn()); } catch (e) { reject(e); } }, 120);
  });

  /* ---------- rules (these belong in the real backend) ---------- */
  function evaluateOffer(offer, part, qty, policy, today) {
    const r = [];
    if (offer.price_minor == null || offer.recorded_quantity == null || !offer.checked_date || !offer.source_reference) r.push('MISSING_DATA');
    if (!offer.active || !part.active) r.push('INACTIVE');
    if (offer.price_basis !== 'per_piece') r.push('PRICE_BASIS_MISMATCH');
    if (offer.currency !== policy.currency) r.push('CURRENCY_MISMATCH');
    if (offer.checked_date) {
      if (offer.checked_date > today) r.push('FUTURE_DATE');
      else if (daysBetween(offer.checked_date, today) > policy.max_age_days) r.push('STALE');
    }
    if (offer.recorded_quantity != null && offer.recorded_quantity < qty) r.push('INSUFFICIENT_QUANTITY');
    return r;
  }

  function buildComparison(s, list, selections) {
    const policy = s.policy;
    if (!policy) throw fail(422, 'CONFIG_REQUIRED', 'No comparison policy has been adopted yet.');
    if (!list.lines.length) throw fail(422, 'EMPTY_LIST', 'An empty list cannot be compared.');
    const today = todayStr();
    const lines = list.lines.map((ln) => {
      const part = s.parts.find((p) => p.id === ln.part_id);
      const candidates = s.offers.filter((o) => o.part_id === ln.part_id).map((o) => {
        const reasons = evaluateOffer(o, part, ln.quantity, policy, today);
        const sup = s.suppliers.find((x) => x.id === o.supplier_id);
        return {
          offer_id: o.id, offer_revision: o.revision, supplier_name: sup ? sup.name : 'Unknown',
          price_minor: o.price_minor, currency: o.currency, price_basis: o.price_basis,
          recorded_quantity: o.recorded_quantity, checked_date: o.checked_date,
          source_reference: o.source_reference, synthetic: !!o.synthetic,
          eligible: reasons.length === 0, reasons,
        };
      });
      const eligible = candidates.filter((c) => c.eligible);
      let lowest = [];
      if (eligible.length) {
        const min = Math.min(...eligible.map((c) => c.price_minor));
        lowest = eligible.filter((c) => c.price_minor === min).map((c) => c.offer_id);
      }
      const chosenId = selections ? selections[ln.id] : null;
      let selected = null;
      if (chosenId) {
        selected = candidates.find((c) => c.offer_id === chosenId);
        if (!selected || !selected.eligible) throw fail(422, 'INVALID_INPUT', 'An excluded or unknown offer was selected.');
      }
      let reason = null;
      if (!candidates.length) reason = 'NO_RECORDED_OFFER';
      else if (!eligible.length) reason = 'NO_ELIGIBLE_OFFER';
      else if (!selected) reason = 'NO_SELECTION';
      return {
        line_id: ln.id, part_id: part.id, exact_id: part.exact_id, description: part.description,
        quantity: ln.quantity, candidates, lowest_eligible_offer_ids: lowest,
        selected_offer_id: selected ? selected.offer_id : null,
        line_status: selected ? 'RESOLVED' : 'UNRESOLVED', unresolved_reason: reason,
        line_cost_minor: selected ? selected.price_minor * ln.quantity : null,
      };
    });
    const unresolved = lines.filter((l) => l.line_status === 'UNRESOLVED').length;
    const subtotal = lines.reduce((a, l) => a + (l.line_cost_minor || 0), 0);
    const fpSource = JSON.stringify({
      lr: list.revision, pv: policy.version,
      l: lines.map((l) => [l.line_id, l.quantity, l.candidates.map((c) => [c.offer_id, c.offer_revision, c.price_minor, c.recorded_quantity, c.checked_date, c.reasons.join('+')])]),
    });
    return {
      list_revision: list.revision, policy_version: policy.version, review_fingerprint: hash(fpSource),
      currency: policy.currency, money_scale: 2, evaluation_date: today,
      policy: { max_age_days: policy.max_age_days, currency: policy.currency },
      lines, summary: { status: unresolved === 0 ? 'COMPLETE' : 'INCOMPLETE', unresolved_count: unresolved, subtotal_minor: subtotal },
    };
  }

  function ownList(s, u, id) {
    const l = s.lists.find((x) => x.id === id && x.owner_id === u.id);
    if (!l) throw fail(404, 'NOT_FOUND', 'List not found.');
    return l;
  }

  function validateLines(s, lines) {
    const fe = {}; const seen = new Set();
    lines.forEach((ln, i) => {
      const part = s.parts.find((p) => p.id === ln.part_id);
      if (!ln.part_id) fe[i] = 'Choose a part.';
      else if (!part) fe[i] = 'Unknown part.';
      else if (!part.active) fe[i] = 'This part is inactive.';
      else if (seen.has(ln.part_id)) fe[i] = 'This part is already on the list.';
      else if (!Number.isInteger(ln.quantity) || ln.quantity < 1) fe[i] = 'Quantity must be a positive whole number.';
      seen.add(ln.part_id);
    });
    return fe;
  }

  const api = {
    login: (username, password) => wrap(() => {
      const s = load();
      const u = s.users.find((x) => x.username === username);
      if (!u || password !== 'demo') throw fail(401, 'INVALID_CREDENTIALS', 'Username or password is incorrect.');
      sessionStorage.setItem(SKEY, u.id);
      return { id: u.id, name: u.name, role: u.role, capabilities: CAN[u.role] };
    }),
    logout: () => wrap(() => { sessionStorage.removeItem(SKEY); return {}; }),
    me: () => wrap(() => {
      const s = load(); const u = currentUser(s);
      return { id: u.id, name: u.name, role: u.role, capabilities: CAN[u.role] };
    }),
    resetDemo: () => wrap(() => { localStorage.removeItem(KEY); load(); return {}; }),

    getPolicy: () => wrap(() => load().policy),
    setPolicy: (max_age_days, currency) => wrap(() => {
      const s = load(); currentUser(s);
      if (!Number.isInteger(max_age_days) || max_age_days < 0) throw fail(422, 'INVALID_INPUT', 'Age limit must be a whole number of days.', { max_age_days: 'Enter a whole number, 0 or more.' });
      if (!/^[A-Z]{3}$/.test(currency)) throw fail(422, 'INVALID_INPUT', 'Currency must be a 3-letter code.', { currency: 'Use a code such as PHP.' });
      s.counters.policy += 1;
      s.policy = { version: 'DEMO-' + s.counters.policy, max_age_days, currency, synthetic: true };
      save(s); return s.policy;
    }),

    listParts: () => wrap(() => { const s = load(); currentUser(s); return s.parts; }),
    listSuppliers: () => wrap(() => { const s = load(); currentUser(s); return s.suppliers; }),
    createPart: (p) => wrap(() => {
      const s = load(); need(s, 'catalog');
      const fe = {};
      const id = (p.exact_id || '').trim();
      if (!id) fe.exact_id = 'Exact part ID is required.';
      else if (s.parts.some((x) => x.exact_id === id)) fe.exact_id = 'This part ID already exists.';
      if (Object.keys(fe).length) throw fail(422, 'INVALID_INPUT', 'Please fix the highlighted fields.', fe);
      const part = { id: nextId(s, 'p'), exact_id: id, description: (p.description || '').trim(), unit: 'piece', active: true };
      s.parts.push(part); save(s); return part;
    }),
    listOffers: () => wrap(() => { const s = load(); need(s, 'catalog'); return s.offers; }),
    saveOffer: (o) => wrap(() => {
      const s = load(); need(s, 'catalog');
      const fe = {};
      if (!o.part_id) fe.part_id = 'Choose a part.';
      if (!o.supplier_id) fe.supplier_id = 'Choose a supplier.';
      if (o.price_minor != null && (!Number.isInteger(o.price_minor) || o.price_minor < 0)) fe.price = 'Price must be 0 or more.';
      if (o.recorded_quantity != null && (!Number.isInteger(o.recorded_quantity) || o.recorded_quantity < 0)) fe.recorded_quantity = 'Quantity must be a whole number, 0 or more.';
      if (o.checked_date && !/^\d{4}-\d{2}-\d{2}$/.test(o.checked_date)) fe.checked_date = 'Use a valid date.';
      if (Object.keys(fe).length) throw fail(422, 'INVALID_INPUT', 'Please fix the highlighted fields.', fe);
      const clean = {
        part_id: o.part_id, supplier_id: o.supplier_id, price_minor: o.price_minor, currency: (o.currency || 'PHP').toUpperCase(),
        price_basis: o.price_basis, recorded_quantity: o.recorded_quantity, checked_date: o.checked_date || null,
        source_reference: (o.source_reference || '').trim() || null, active: !!o.active,
      };
      if (o.id) {
        const cur = s.offers.find((x) => x.id === o.id);
        if (!cur) throw fail(404, 'NOT_FOUND', 'Offer not found.');
        if (cur.revision !== o.revision) throw fail(409, 'REVISION_CONFLICT', 'This offer was changed by someone else. Reload it and try again.');
        Object.assign(cur, clean, { revision: cur.revision + 1 });
        save(s); return cur;
      }
      const created = Object.assign({ id: nextId(s, 'o'), revision: 1, synthetic: true }, clean);
      s.offers.push(created); save(s); return created;
    }),
    bumpOfferForDemo: (offerId) => wrap(() => {
      const s = load(); const o = s.offers.find((x) => x.id === offerId);
      if (o) { o.revision += 1; if (o.price_minor != null) o.price_minor += 100; save(s); }
      return {};
    }),

    listLists: () => wrap(() => { const s = load(); const u = need(s, 'lists'); return s.lists.filter((l) => l.owner_id === u.id); }),
    getList: (id) => wrap(() => { const s = load(); const u = need(s, 'lists'); return ownList(s, u, id); }),
    createList: (title) => wrap(() => {
      const s = load(); const u = need(s, 'lists');
      if (!(title || '').trim()) throw fail(422, 'INVALID_INPUT', 'Title is required.', { title: 'Enter a title.' });
      const l = { id: nextId(s, 'l'), owner_id: u.id, title: title.trim(), revision: 1, archived: false, lines: [] };
      s.lists.push(l); save(s); return l;
    }),
    updateList: (id, revision, title, lines, archived) => wrap(() => {
      const s = load(); const u = need(s, 'lists'); const l = ownList(s, u, id);
      if (l.revision !== revision) throw fail(409, 'REVISION_CONFLICT', 'This list changed since you opened it. Reload to see the latest version.');
      const fe = validateLines(s, lines);
      const te = (title || '').trim() ? null : 'Enter a title.';
      if (te || Object.keys(fe).length) throw fail(422, 'INVALID_INPUT', 'Please fix the highlighted fields.', { title: te, lines: fe });
      l.title = title.trim(); l.archived = !!archived;
      l.lines = lines.map((ln) => ({ id: ln.id || nextId(s, 'ln'), part_id: ln.part_id, quantity: ln.quantity }));
      l.revision += 1; save(s); return l;
    }),

    compare: (listId, selections) => wrap(() => {
      const s = load(); const u = need(s, 'lists'); const l = ownList(s, u, listId);
      return buildComparison(s, l, selections || {});
    }),
    saveSummary: (listId, payload) => wrap(() => {
      const s = load(); const u = need(s, 'lists'); const l = ownList(s, u, listId);
      const dup = s.summaries.find((x) => x.owner_id === u.id && x.save_token === payload.save_token);
      if (dup) return dup;
      const result = buildComparison(s, l, payload.selections || {});
      if (payload.list_revision !== result.list_revision || payload.policy_version !== result.policy_version || payload.review_fingerprint !== result.review_fingerprint) {
        throw fail(409, 'INPUT_CHANGED', 'Catalog, list or policy values changed since your review. Nothing was saved. Review again.');
      }
      const sm = {
        id: nextId(s, 'sm'), owner_id: u.id, list_id: l.id, title: l.title, created_at: new Date().toISOString(),
        save_token: payload.save_token, status: result.summary.status, comparison: result,
      };
      s.summaries.push(sm); save(s); return sm;
    }),
    listSummaries: () => wrap(() => {
      const s = load(); const u = need(s, 'summaries');
      return s.summaries.filter((x) => x.owner_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((x) => ({ id: x.id, title: x.title, created_at: x.created_at, status: x.status, subtotal_minor: x.comparison.summary.subtotal_minor, unresolved_count: x.comparison.summary.unresolved_count, currency: x.comparison.currency }));
    }),
    getSummary: (id) => wrap(() => {
      const s = load(); const u = need(s, 'summaries');
      const x = s.summaries.find((y) => y.id === id && y.owner_id === u.id);
      if (!x) throw fail(404, 'NOT_FOUND', 'Summary not found.');
      return x;
    }),
    newToken: uuid,
  };
  window.PC_API = api;
})();

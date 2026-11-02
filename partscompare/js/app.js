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
  let catalogFilter = 'ALL'; // active filter state

  /* ---------------- Safe Theme Initializer ---------------- */
  try {
    const savedTheme = localStorage.getItem('pc_theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    if ($themeToggle) {
      $themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
      $themeToggle.onclick = function () {
        const cur = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('pc_theme', next);
        $themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
      };
    }
  } catch (err) {
    console.error('Theme toggle init error:', err);
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

  function isAdminUser() {
    return me && (me.role === 'admin' || me.role === 'administrator');
  }

  /* ---------- shell ---------- */
  let landing = false;
  function renderShell() {
    document.body.classList.toggle('landing', landing);
    if (landing && !me) {
      $nav.innerHTML = [
        ['how', 'How it works'],
        ['try', 'Try it'],
        ['#/about', 'About Us'],
        ['#/faqs', 'FAQs']
      ].map(([t, l]) => t.startsWith('#')
        ? '<a href="' + t + '">' + l + '</a>'
        : '<button type="button" class="navbtn" data-action="scroll" data-target="' + t + '">' + l + '</button>'
      ).join('');
      $who.innerHTML = '<a class="btn primary" href="#/login">Sign in</a>';
      return;
    }
    const links = [];
    if (me) {
      if (isAdminUser()) {
        links.push(['#/', 'Admin Console']);
      }
      if (me.capabilities && me.capabilities.includes('lists')) {
        links.push(['#/lists', 'My lists'], ['#/summaries', 'Saved summaries']);
      }
      if (me.capabilities && me.capabilities.includes('catalog')) {
        links.push(['#/catalog', 'Catalog']);
      }
    }
    const cur = location.hash || '#/';
    $nav.innerHTML = links.map(([h, t]) => '<a href="' + h + '"' + (cur === h || (h === '#/lists' && cur.startsWith('#/compare')) ? ' aria-current="page"' : '') + '>' + t + '</a>').join('');
    $who.innerHTML = me ? '<span class="pill">' + esc(me.name) + ' (' + esc(me.role) + ')</span><button type="button" data-action="logout">Sign out</button>' : '';
  }

  function setMain(html) { 
    landing = false; 
    $app.innerHTML = html; 
    renderShell(); 
    window.scrollTo(0, 0); 
  }
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

  /* ---------- DEDICATED PAGE: ABOUT US ---------- */
  function pageAbout() {
    removeExistingModal();
    setMain(
      '<div class="page-container">' +
        '<div class="page-hero-banner">' +
          '<div>' +
            '<h1>About PartsCompare</h1>' +
            '<p>Project Nexus &bull; College of Engineering and Digital Technology (ICCT Colleges)</p>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:16px;">' +
            '<a class="btn ghost" href="#/">← Back to home</a>' +
            '<div class="page-banner-art">' + window.PC_ART.chip('#0B3C43', '#7CD3CF') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card stack">' +
          '<div style="display:flex; align-items:center; gap:8px;">' +
            '<span class="badge ok">Verified Capstone Scope</span>' +
            '<span class="badge gray">Academic Year 2026-2027</span>' +
          '</div>' +
          '<h2 style="font-size:22px; font-weight:700;">Project Background &amp; Intent</h2>' +
          '<p style="color:var(--mute); font-size:15px; line-height:1.7;">' +
            'PartsCompare is a web-based decision support system designed to compare an <strong>exact-part bill of materials</strong> against <strong>curated, dated supplier offers</strong>. Developed under the College of Engineering and Digital Technology, it addresses the persistent challenge faced by engineering teams and makers: reproducing parts sourcing calculations and retaining clear evidence of purchasing assumptions without relying on unverified live feeds.' +
          '</p>' +
        '</div>' +
        '<div>' +
          '<h2 style="font-size:20px; font-weight:700; margin-bottom:12px;">Core Architectural Principles</h2>' +
          '<div class="principles-grid">' +
            '<div class="info-feature-card">' +
              '<div class="info-card-ic">🏷️</div>' +
              '<h3>Curated Dataset</h3>' +
              '<p>Offers are entered with verified supplier facts, checked dates, and units rather than relying on brittle web scrapers or unvetted marketplace feeds.</p>' +
            '</div>' +
            '<div class="info-feature-card">' +
              '<div class="info-card-ic">🎯</div>' +
              '<h3>Exact Part Identity</h3>' +
              '<p>BOM items match their exact manufacturer part number. Ambiguous automatic cross-referencing and risky auto-substitutions are completely excluded.</p>' +
            '</div>' +
            '<div class="info-feature-card">' +
              '<div class="info-card-ic">⏱️</div>' +
              '<h3>Rule-Based Freshness</h3>' +
              '<p>Offers older than the agreed age threshold (e.g. ≤ 14 days) are automatically identified and excluded with transparent explanatory reasons.</p>' +
            '</div>' +
            '<div class="info-feature-card">' +
              '<div class="info-card-ic">🔒</div>' +
              '<h3>Frozen Sourcing Snapshots</h3>' +
              '<p>Saved summaries permanently preserve the exact prices, dates, and rule policies active when evaluated, remaining intact even after catalog updates.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card stack" style="background:var(--card-subtle);">' +
          '<h2 style="font-size:18px; font-weight:700;">Scope Boundaries &amp; Limitations</h2>' +
          '<p style="color:var(--mute); font-size:14px; line-height:1.6;">' +
            'PartsCompare strictly emphasizes calculation transparency and audit traceability. It intentionally excludes automated payment processing, live stock reservations, electrical compatibility validation, and shipping route planning.' +
          '</p>' +
          '<div style="margin-top:4px;">' +
            '<a class="btn primary" href="#/login">Open System Demo</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------- DEDICATED PAGE: FAQS ---------- */
  function pageFaqs() {
    removeExistingModal();
    const faqData = [
      {
        q: 'What makes an offer "Eligible" for a Bill of Materials line?',
        a: 'An offer is eligible only when it satisfies all policy criteria: it must match the exact part identifier, possess complete unit pricing and quantity facts, be dated within the agreed freshness threshold (such as ≤ 14 days from review), and have a recorded quantity equal to or greater than the full quantity required for that line.'
      },
      {
        q: 'Why are unresolved parts not counted as zero (₱0.00)?',
        a: 'Treating missing or unavailable components as zero silently distorts the subtotal and makes an incomplete procurement plan appear artificially inexpensive. In PartsCompare, unresolved lines remain explicitly marked with their exclusion reason and their cost is left as null, resulting in an auditable partial subtotal.'
      },
      {
        q: 'What happens to saved summaries when supplier prices change in the catalog?',
        a: 'Nothing. A saved sourcing summary represents a permanently frozen snapshot. It retains the exact prices, supplier names, dates, and rule assumptions that were active at the exact moment of saving. Subsequent updates by catalog maintainers will never alter past sourcing decisions.'
      },
      {
        q: 'Why does the system use manually curated offers instead of automated web scraping?',
        a: 'As established in data quality research, automated scrapers frequently produce broken prices, unit mismatches, and phantom stock. Manually curated records guarantee that each offer has an attributable human source, date of check, and verifiable quotation trail.'
      },
      {
        q: 'Can a single BOM line be split across multiple suppliers?',
        a: 'Per the baseline system scope, line splitting is not supported. Each line must be covered entirely by one eligible supplier offer to ensure clear line attribution and prevent fragmented order overhead.'
      },
      {
        q: 'Does "Lowest eligible offer" mean the lowest price in the entire commercial market?',
        a: 'No. "Lowest eligible offer" refers strictly to the lowest priced valid quote recorded within the system\'s curated catalog. It does not represent an exhaustive market-wide guarantee.'
      }
    ];

    setMain(
      '<div class="page-container">' +
        '<div class="page-hero-banner">' +
          '<div>' +
            '<h1>Frequently Asked Questions</h1>' +
            '<p>Verified rules, computation behavior, and product boundaries</p>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:16px;">' +
            '<a class="btn ghost" href="#/">← Back to home</a>' +
            '<div class="page-banner-art">' + window.PC_ART.chip('#0B3C43', '#7CD3CF') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="faq-search-wrapper">' +
          '<span class="faq-search-icon">🔍</span>' +
          '<input type="search" id="faqSearch" class="faq-search-input" placeholder="Type keywords (e.g. eligible, zero, snapshot, curated)..." autocomplete="off">' +
        '</div>' +
        '<div class="faq-accordion" id="faqAccordionList">' +
          faqData.map((item, i) => 
            '<details class="faq-item"' + (i < 2 ? ' open' : '') + ' data-q="' + esc(item.q.toLowerCase() + ' ' + item.a.toLowerCase()) + '">' +
              '<summary><strong>' + esc(item.q) + '</strong></summary>' +
              '<p>' + esc(item.a) + '</p>' +
            '</details>'
          ).join('') +
        '</div>' +
        '<div id="faqNoMatch" class="alert info" style="display:none;">' +
          'No questions found matching your search term. Try words like "eligible", "zero", or "snapshot".' +
        '</div>' +
        '<div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
          '<span class="small">Have a question not listed here? Email support@partscompare.edu.ph</span>' +
          '<a class="btn primary" href="#/">Return to Homepage</a>' +
        '</div>' +
      '</div>'
    );

    const searchInput = document.getElementById('faqSearch');
    const items = document.querySelectorAll('#faqAccordionList .faq-item');
    const noMatch = document.getElementById('faqNoMatch');

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        const val = this.value.trim().toLowerCase();
        let matches = 0;
        items.forEach(el => {
          const text = el.getAttribute('data-q') || '';
          if (!val || text.includes(val)) {
            el.style.display = 'block';
            if (val) el.setAttribute('open', 'true');
            matches++;
          } else {
            el.style.display = 'none';
          }
        });
        noMatch.style.display = matches === 0 ? 'block' : 'none';
      });
    }
  }

  /* ---------- LOGIN SLIDER ---------- */
  function pageLogin(err, username) {
    removeExistingModal();
    setMain(
      '<div class="login-slider-container" id="loginSlider">' +
        '<div class="form-panel signin-panel stack">' +
          '<h1 style="font-size: 28px; font-weight: 700;">Sign in</h1>' +
          '<p class="sub" style="margin-bottom: 4px;">Access your Bill of Materials comparison lists.</p>' +
          (err ? alertBox('bad', esc(err), 'alert') : '') +
          '<form id="login" class="stack" novalidate style="margin-top: 4px;">' +
            '<div><label for="u">Username</label><input id="u" name="u" autocomplete="username" placeholder="Enter username" value="' + esc(username || '') + '" required></div>' +
            '<div><label for="p">Password</label><input id="p" name="p" type="password" autocomplete="current-password" placeholder="••••••••" required></div>' +
            '<button class="primary" type="submit" style="margin-top: 4px; height: 46px; font-size: 15px;">Sign in</button>' +
          '</form>' +
          '<div class="stack" style="margin-top: 14px;">' +
            '<div class="small" style="font-weight: 500;">Or quick-start with a demo role:</div>' +
            '<div class="row" style="gap: 8px;">' +
              '<button type="button" class="btn" style="flex: 1; padding: 0 10px; font-size: 13px;" data-action="quick-login" data-u="preparer">Preparer</button>' +
              '<button type="button" class="btn" style="flex: 1; padding: 0 10px; font-size: 13px;" data-action="quick-login" data-u="maintainer">Maintainer</button>' +
              '<button type="button" class="btn" style="flex: 1; padding: 0 10px; font-size: 13px;" data-action="quick-login" data-u="admin">Admin</button>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top: 10px;">' + alertBox('info', 'Demo password: <span class="mono">demo</span>') + '</div>' +
        '</div>' +
        '<div class="form-panel signup-panel stack">' +
          '<h1 style="font-size: 28px; font-weight: 700;">New Account</h1>' +
          '<p class="sub" style="margin-bottom: 4px;">Request credentials from the system administrator.</p>' +
          '<form id="signup-request" class="stack" onsubmit="event.preventDefault(); alert(\'Account request submitted to Administrator for review.\');">' +
            '<div><label for="req-name">Full Name</label><input id="req-name" placeholder="Enter your full name" required></div>' +
            '<div><label for="req-user">Desired Username</label><input id="req-user" placeholder="Enter desired username" required></div>' +
            '<div><label for="req-role">Requested Role</label><select id="req-role"><option value="preparer">Preparer (Maker)</option><option value="maintainer">Catalog Maintainer</option></select></div>' +
            '<button class="primary" type="submit" style="margin-top: 4px; height: 46px; font-size: 15px;">Submit Request</button>' +
          '</form>' +
          '<div style="margin-top: 10px;">' + alertBox('warn', 'Public signup is restricted per project scope. Accounts require administrative setup.') + '</div>' +
        '</div>' +
        '<div class="overlay-panel-container">' +
          '<div class="overlay-panel">' +
            '<div class="overlay-circuit-bg">' + window.PC_ART.circuit() + '</div>' +
            '<div class="overlay-content overlay-left">' +
              '<div class="overlay-chip-art">' + window.PC_ART.chip('#0B3C43', '#7CD3CF') + '</div>' +
              '<h2>Already registered?</h2>' +
              '<p>Sign in to open and compare your exact-part lists and supplier offers.</p>' +
              '<button type="button" class="btn ghost" id="signInBtn">Back to Sign in</button>' +
            '</div>' +
            '<div class="overlay-content overlay-right">' +
              '<div class="overlay-chip-art">' + window.PC_ART.chip('#0B3C43', '#7CD3CF') + '</div>' +
              '<h2>Compare with confidence</h2>' +
              '<p>Need access or new account credentials? Submit a provisioning request.</p>' +
              '<button type="button" class="btn ghost" id="signUpBtn">Create Account</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    const container = document.getElementById('loginSlider');
    const signUpBtn = document.getElementById('signUpBtn');
    const signInBtn = document.getElementById('signInBtn');
    if (signUpBtn && container) signUpBtn.onclick = () => container.classList.add('right-panel-active');
    if (signInBtn && container) signInBtn.onclick = () => container.classList.remove('right-panel-active');
    const u = document.getElementById('u');
    if (u) u.focus();
  }

  /* ---------- SAFE ADMINISTRATOR WORKSPACE CONSOLE ---------- */
  async function pageAdmin() {
    removeExistingModal();
    loading('Loading Administration Console...');
    try {
      // Tanging Policy API lamang ang tatawagin para iwas 403 Forbidden
      let curPolicy = { max_age_days: 14, currency: 'PHP', version: 'POL-DEFAULT' };
      try {
        const policy = await API.getPolicy();
        if (policy) curPolicy = policy;
      } catch (err) {
        console.warn('Policy fetch error:', err);
      }

      setMain(
        '<div class="stack" style="gap:20px;">' +
          
          '<!-- ADMIN HEADER PROFILE -->' +
          '<div class="row between" style="align-items:flex-end;">' +
            '<div>' +
              '<div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">' +
                '<h1 style="font-size:26px; font-weight:700; margin:0;">System Administration Console</h1>' +
                '<span class="badge ok">Role: System Administrator</span>' +
              '</div>' +
              '<p class="sub">Configure organizational evaluation rules, inspect role access boundaries, and manage policy versions.</p>' +
            '</div>' +
            '<div class="row" style="gap:8px;">' +
              '<button type="button" class="btn primary" onclick="document.getElementById(\'admin-age\').focus();">Configure Policies</button>' +
            '</div>' +
          '</div>' +

          '<!-- ADMIN METRIC STATS CARDS -->' +
          '<div class="preparer-metrics-grid">' +
            '<div class="metric-card">' +
              '<div class="metric-icon">👥</div>' +
              '<div>' +
                '<div class="metric-number">3 Roles</div>' +
                '<div class="metric-label">Preparer, Maintainer, Admin</div>' +
              '</div>' +
            '</div>' +
            '<div class="metric-card">' +
              '<div class="metric-icon">⏱️</div>' +
              '<div>' +
                '<div class="metric-number">' + curPolicy.max_age_days + ' Days</div>' +
                '<div class="metric-label">Active Freshness Policy</div>' +
              '</div>' +
            '</div>' +
            '<div class="metric-card">' +
              '<div class="metric-icon">💵</div>' +
              '<div>' +
                '<div class="metric-number">' + esc(curPolicy.currency || 'PHP') + '</div>' +
                '<div class="metric-label">System Price Currency</div>' +
              '</div>' +
            '</div>' +
            '<div class="metric-card">' +
              '<div class="metric-icon">🔒</div>' +
              '<div>' +
                '<div class="metric-number">Strict RBAC</div>' +
                '<div class="metric-label">Audit Trail Protection</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<!-- ADMIN MAIN TWO-COLUMN WORKSPACE -->' +
          '<div class="grid2">' +
            
            '<!-- LEFT: ROLE ACCESS GOVERNANCE TABLE -->' +
            '<section class="main stack">' +
              '<div class="card stack">' +
                '<div class="row between" style="align-items:center;">' +
                  '<div>' +
                    '<h2 style="font-size:18px; font-weight:700;">Role-Based Access Governance</h2>' +
                    '<p class="small" style="color:var(--mute);">Defined boundaries per Software Design Capstone Specifications.</p>' +
                  '</div>' +
                  '<span class="badge ok">RBAC Enforced</span>' +
                '</div>' +

                '<div class="tbl" style="margin-top:6px;">' +
                  '<table>' +
                    '<thead>' +
                      '<tr>' +
                        '<th>Account / Username</th>' +
                        '<th>Assigned Role</th>' +
                        '<th>Core Responsibilities</th>' +
                        '<th>Status</th>' +
                      '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                      '<tr>' +
                        '<td><strong style="color:var(--ink);">Demo Preparer</strong><div class="small mono">username: preparer</div></td>' +
                        '<td><span class="badge ok">Preparer (Maker)</span></td>' +
                        '<td class="small">Creates BOMs, selects candidate offers, and freezes sourcing summaries.</td>' +
                        '<td><span class="badge ok">✓ Active</span></td>' +
                      '</tr>' +
                      '<tr>' +
                        '<td><strong style="color:var(--ink);">Demo Maintainer</strong><div class="small mono">username: maintainer</div></td>' +
                        '<td><span class="badge ok">Catalog Maintainer</span></td>' +
                        '<td class="small">Curates exact part IDs, logs supplier prices, recorded stock, and check dates.</td>' +
                        '<td><span class="badge ok">✓ Active</span></td>' +
                      '</tr>' +
                      '<tr>' +
                        '<td><strong style="color:var(--ink);">Demo Administrator</strong><div class="small mono">username: admin</div></td>' +
                        '<td><span class="badge warn">System Administrator</span></td>' +
                        '<td class="small">Maintains currency standards, policy rules, and audit integrity.</td>' +
                        '<td><span class="badge ok">✓ Active</span></td>' +
                      '</tr>' +
                    '</tbody>' +
                  '</table>' +
                '</div>' +
              '</div>' +

              '<!-- AUDIT INTEGRITY BOX -->' +
              '<div class="card stack" style="background:var(--card-subtle);">' +
                '<h2 style="font-size:17px; font-weight:700;">System Integrity &amp; Provenance Protocol</h2>' +
                '<p class="small" style="color:var(--mute); line-height:1.6;">' +
                  'Per the research framework of <em>Strong, Lee &amp; Wang (1994)</em> and <em>Haug et al. (2011)</em>, the system prevents unverified marketplace scraping. Maintainers must input attributed check sources, and Preparers can only finalize evaluations when line quantities are fully covered.' +
                '</p>' +
              '</div>' +
            '</section>' +

            '<!-- RIGHT: GLOBAL POLICY CONFIGURATION ASIDE -->' +
            '<aside class="card side stack">' +
              '<h2 style="font-size:18px; font-weight:700;">System Policy Rules</h2>' +
              '<p class="small" style="color:var(--mute);">Configure the comparison baseline applied across all BOM evaluations.</p>' +

              '<form id="policy" class="stack" novalidate style="margin-top:6px;">' +
                '<div>' +
                  '<label for="admin-age">Global Max Age Limit (Days)</label>' +
                  '<input id="admin-age" name="pa" inputmode="numeric" value="' + curPolicy.max_age_days + '" placeholder="e.g. 14" required>' +
                  '<div class="small" style="color:var(--mute); margin-top:3px;">Offers older than this limit are excluded as "Stale".</div>' +
                '</div>' +

                '<div>' +
                  '<label for="admin-cur">Standard System Currency</label>' +
                  '<input id="admin-cur" name="pc" value="' + esc(curPolicy.currency || 'PHP') + '" maxlength="3" required style="text-transform:uppercase;">' +
                  '<div class="small" style="color:var(--mute); margin-top:3px;">Agreed organizational baseline (e.g. PHP).</div>' +
                '</div>' +

                '<button class="primary" type="submit" style="margin-top:8px;">Save Global Policy</button>' +
              '</form>' +

              '<div class="alert info" style="margin-top:14px; font-size:12.5px; line-height:1.5;">' +
                '<strong>Policy Versioning:</strong> Updating these settings increments the active policy version without invalidating already-saved summaries.' +
              '</div>' +
            '</aside>' +

          '</div>' +
        '</div>'
      );
    } catch (e) { errorPage(e); }
  }

  function pageHome() {
    if (!me) return pageLanding();
    if (isAdminUser()) return pageAdmin();
    if (me.capabilities && me.capabilities.includes('lists')) return go('#/lists');
    if (me.capabilities && me.capabilities.includes('catalog')) return go('#/catalog');
    pageAdmin();
  }

  /* --- CATALOG MAINTAINER WORKSPACE --- */
  async function pageCatalog(search) {
    if (isAdminUser()) return go('#/');
    loading('Loading curated catalog...');
    try {
      const [parts, offers, sups] = await Promise.all([API.listParts(), API.listOffers(), API.listSuppliers()]);
      window.__cat = { parts, offers, sups };
      drawCatalog(search || '');
    } catch (e) { errorPage(e); }
  }

  function getOfferAgeDays(checkedDate) {
    if (!checkedDate) return 999;
    const baseDate = new Date('2026-11-02T12:00:00Z');
    const checkDate = new Date(checkedDate + 'T12:00:00Z');
    const diff = Math.floor((baseDate - checkDate) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  }

  function removeExistingModal() {
    const existing = document.getElementById('offerModalOverlay');
    if (existing) existing.remove();
  }

  function drawCatalog(search, notice) {
    const { parts, offers, sups } = window.__cat;
    const q = (search || '').trim().toLowerCase();

    const pName = (id) => (parts.find((p) => p.id === id) || {}).exact_id || '?';
    const sName = (id) => (sups.find((s) => s.id === id) || {}).name || '?';

    const totalOffers = offers.length;
    let freshCount = 0;
    let staleCount = 0;
    let incompleteCount = 0;

    offers.forEach(o => {
      const missing = o.price_minor == null || o.recorded_quantity == null || !o.checked_date || !o.source_reference;
      const days = getOfferAgeDays(o.checked_date);
      if (missing) incompleteCount++;
      else if (days > 14) staleCount++;
      else freshCount++;
    });

    const rows = offers.filter((o) => {
      const matchQuery = !q || pName(o.part_id).toLowerCase().includes(q) || sName(o.supplier_id).toLowerCase().includes(q) || (o.source_reference || '').toLowerCase().includes(q);
      if (!matchQuery) return false;

      const missing = o.price_minor == null || o.recorded_quantity == null || !o.checked_date || !o.source_reference;
      const days = getOfferAgeDays(o.checked_date);

      if (catalogFilter === 'FRESH') return !missing && days <= 14;
      if (catalogFilter === 'STALE') return !missing && days > 14;
      if (catalogFilter === 'INCOMPLETE') return missing;
      return true;
    });

    setMain(
      '<div class="stack" style="gap:20px;">' +
        '<div class="row between" style="align-items:flex-end;">' +
          '<div>' +
            '<div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">' +
              '<h1 style="font-size:26px; font-weight:700; margin:0;">Offer Catalog Workspace</h1>' +
              '<span class="badge ok">Role: Catalog Maintainer</span>' +
            '</div>' +
            '<p class="sub">Curate, update, and audit exact-part supplier offers. Recorded quantities reflect verified check dates, not live warehouse inventory.</p>' +
          '</div>' +
          '<div class="row" style="gap:8px;">' +
            '<button type="button" class="btn primary" data-action="open-add-offer-modal" style="font-weight:700;">+ Add New Offer</button>' +
          '</div>' +
        '</div>' +

        '<div class="preparer-metrics-grid">' +
          '<div class="metric-card"><div class="metric-icon">📦</div><div><div class="metric-number">' + totalOffers + '</div><div class="metric-label">Total Curated Offers</div></div></div>' +
          '<div class="metric-card"><div class="metric-icon">✓</div><div><div class="metric-number" style="color:var(--ok);">' + freshCount + '</div><div class="metric-label">Fresh &amp; Complete (≤14d)</div></div></div>' +
          '<div class="metric-card"><div class="metric-icon">⏱️</div><div><div class="metric-number" style="color:var(--warn);">' + staleCount + '</div><div class="metric-label">Stale Offers (>14 Days)</div></div></div>' +
          '<div class="metric-card"><div class="metric-icon">🏬</div><div><div class="metric-number">' + sups.length + '</div><div class="metric-label">Suppliers Tracked</div></div></div>' +
        '</div>' +

        (notice ? alertBox('ok', esc(notice), 'status') : '') +

        '<section class="card stack" aria-labelledby="oh">' +
          '<div class="row between" style="align-items:center;">' +
            '<div>' +
              '<h2 id="oh" style="font-size:18px; font-weight:700;">Curated Offers List (' + rows.length + ' shown)</h2>' +
              '<p class="small" style="color:var(--mute);">Missing values will cause an offer to be automatically excluded from BOM lines.</p>' +
            '</div>' +
            '<div class="field" style="max-width:280px;">' +
              '<input id="q" type="search" placeholder="🔍 Search part, supplier, or notes..." value="' + esc(search) + '" data-bind="catsearch">' +
            '</div>' +
          '</div>' +

          '<div class="catalog-filter-tabs">' +
            '<button type="button" class="tab-chip' + (catalogFilter === 'ALL' ? ' active' : '') + '" data-action="set-catalog-filter" data-val="ALL">All Offers (' + totalOffers + ')</button>' +
            '<button type="button" class="tab-chip' + (catalogFilter === 'FRESH' ? ' active' : '') + '" data-action="set-catalog-filter" data-val="FRESH">Fresh Only (' + freshCount + ')</button>' +
            '<button type="button" class="tab-chip' + (catalogFilter === 'STALE' ? ' active' : '') + '" data-action="set-catalog-filter" data-val="STALE">Stale (' + staleCount + ')</button>' +
            '<button type="button" class="tab-chip' + (catalogFilter === 'INCOMPLETE' ? ' active' : '') + '" data-action="set-catalog-filter" data-val="INCOMPLETE">Incomplete (' + incompleteCount + ')</button>' +
          '</div>' +

          (rows.length ? 
            '<div class="tbl"><table>' +
              '<thead><tr><th>Part ID</th><th>Supplier &amp; Source Reference</th><th class="num">Unit Price</th><th class="num">Recorded Qty</th><th>Checked Date</th><th>Status</th><th>Actions</th></tr></thead>' +
              '<tbody>' +
                rows.map((o) => {
                  const missing = o.price_minor == null || o.recorded_quantity == null || !o.checked_date || !o.source_reference;
                  const days = getOfferAgeDays(o.checked_date);
                  let st = '<span class="badge ok">✓ Complete</span>';
                  if (!o.active) st = '<span class="badge gray">Inactive</span>';
                  else if (missing) st = '<span class="badge bad">! Incomplete</span>';
                  else if (days > 14) st = '<span class="badge warn">⏱ Stale (' + days + 'd)</span>';

                  return '<tr' + (missing ? ' class="row-bad"' : '') + '>' +
                    '<td class="mono" style="font-weight:700; color:var(--ink);">' + esc(pName(o.part_id)) + '</td>' +
                    '<td><div style="font-weight:600; color:var(--ink);">' + esc(sName(o.supplier_id)) + '</div><div class="small" style="color:var(--mute); margin-top:2px;">' + esc(o.source_reference || 'No source note') + '</div></td>' +
                    '<td class="num" style="font-weight:600; color:var(--ink);">' + money(o.price_minor, o.currency) + '</td>' +
                    '<td class="num" style="font-weight:500;">' + (o.recorded_quantity == null ? '<span style="color:var(--bad); font-weight:600;">Missing</span>' : o.recorded_quantity) + '</td>' +
                    '<td style="white-space:nowrap; color:var(--mute); font-size:13px;">' + fmtDate(o.checked_date) + '</td>' +
                    '<td><div class="status-badge-container">' + st + (o.synthetic ? '<span class="badge gray" style="font-size:11px; padding:1px 6px;">Synthetic</span>' : '') + '</div></td>' +
                    '<td><button type="button" class="btn-edit-action" data-action="edit-offer" data-id="' + esc(o.id) + '">✏️ Edit</button></td>' +
                  '</tr>';
                }).join('') +
              '</tbody>' +
            '</table></div>' 
          : '<div class="alert info" style="margin-top:10px;">No offers match your search or filter condition.</div>') +
        '</section>' +
      '</div>'
    );

    renderCatalogModal();
  }

  function renderCatalogModal() {
    removeExistingModal();
    if (!offerForm || !offerForm.isOpen) return;

    const f = offerForm;
    const { parts, sups } = window.__cat;
    const opt = (list, val, label) => list.map((x) => '<option value="' + esc(x.id) + '"' + (x.id === val ? ' selected' : '') + '>' + esc(label(x)) + '</option>').join('');

    const overlay = document.createElement('div');
    overlay.id = 'offerModalOverlay';
    overlay.className = 'catalog-modal-overlay';
    overlay.innerHTML = `
      <div class="catalog-modal-card stack">
        <div class="catalog-modal-header">
          <div>
            <h2 style="font-size:20px; font-weight:700; margin:0;">${f.id ? 'Edit Offer' : 'Add Curated Offer'}</h2>
            <p class="small" style="color:var(--mute); margin-top:2px;">${f.id ? 'Updating record for ID: ' + esc(f.id) : 'Create a dated component quote.'}</p>
          </div>
          <button type="button" class="catalog-modal-close-btn" data-action="close-offer-modal" aria-label="Close modal">&times;</button>
        </div>

        ${f.error ? alertBox('bad', esc(f.error), 'alert') : ''}

        <form id="offerform" class="stack" novalidate style="margin-top:6px;">
          <div>
            <label for="f-part">Exact Part ID</label>
            <select id="f-part" data-bind="of.part_id" ${f.errors && f.errors.part_id ? 'aria-invalid="true" aria-describedby="e-part"' : ''}>
              <option value="">Choose a verified component</option>
              ${opt(parts, f.part_id, (p) => p.exact_id + ' - ' + p.description)}
            </select>
            ${fe(f.errors, 'part_id', 'e-part')}
          </div>

          <div>
            <label for="f-sup">Supplier / Shop</label>
            <select id="f-sup" data-bind="of.supplier_id" ${f.errors && f.errors.supplier_id ? 'aria-invalid="true" aria-describedby="e-sup"' : ''}>
              <option value="">Choose a supplier</option>
              ${opt(sups, f.supplier_id, (s) => s.name)}
            </select>
            ${fe(f.errors, 'supplier_id', 'e-sup')}
          </div>

          <div class="row" style="gap:10px;">
            <div class="field" style="flex:2;">
              <label for="f-price">Unit Price (PHP)</label>
              <input id="f-price" inputmode="decimal" placeholder="e.g. 185.00" value="${esc(f.price)}" data-bind="of.price" ${f.errors && f.errors.price ? 'aria-invalid="true" aria-describedby="e-price"' : ''}>
              ${fe(f.errors, 'price', 'e-price')}
            </div>
            <div class="field" style="flex:1;">
              <label for="f-cur">Currency</label>
              <input id="f-cur" maxlength="3" value="${esc(f.currency)}" data-bind="of.currency" readonly style="background:var(--card-subtle);">
            </div>
          </div>

          <div class="row" style="gap:10px;">
            <div class="field">
              <label for="f-qty">Recorded Available Qty</label>
              <input id="f-qty" inputmode="numeric" placeholder="e.g. 25" value="${esc(f.recorded_quantity)}" data-bind="of.recorded_quantity" ${f.errors && f.errors.recorded_quantity ? 'aria-invalid="true" aria-describedby="e-qty"' : ''}>
              ${fe(f.errors, 'recorded_quantity', 'e-qty')}
            </div>
            <div class="field">
              <label for="f-date">Checked Date</label>
              <input id="f-date" type="date" value="${esc(f.checked_date)}" data-bind="of.checked_date">
            </div>
          </div>

          <div>
            <label for="f-src">Source Attribution / Note</label>
            <input id="f-src" placeholder="e.g. Shop A online catalog ref #A-101" value="${esc(f.source_reference)}" data-bind="of.source_reference">
          </div>

          <label style="display:flex; gap:10px; align-items:center; font-weight:400; cursor:pointer; margin-top:4px;">
            <input type="checkbox" data-bind="of.active" ${f.active ? 'checked' : ''}>
            <span>Active offer (uncheck to retire instead of hard deleting)</span>
          </label>

          <div class="row" style="gap:10px; margin-top:14px;">
            <button class="primary" type="submit" style="flex:1; height:46px; font-weight:700;">
              ${f.id ? 'Save Changes' : '+ Add Offer'}
            </button>
            <button type="button" class="btn" data-action="close-offer-modal" style="height:46px;">Cancel</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) {
        removeExistingModal();
        offerForm = null;
      }
    });

    setTimeout(() => {
      const p = document.getElementById('f-part');
      if (p) p.focus();
    }, 50);
  }

  /* --- PREPARER WORKSPACE DASHBOARD --- */
  async function pageLists() {
    if (isAdminUser()) return go('#/');
    removeExistingModal();
    loading('Loading Preparer Workspace...');
    try {
      const lists = await API.listLists();
      const totalLists = lists.length;
      const totalComponents = lists.reduce((acc, l) => acc + (l.lines ? l.lines.length : 0), 0);

      setMain(
        '<div class="stack" style="gap:20px;">' +
          '<div class="row between" style="align-items:flex-end;">' +
            '<div>' +
              '<div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">' +
                '<h1 style="font-size:26px; font-weight:700; margin:0;">Preparer Workspace</h1>' +
                '<span class="badge ok">Maker &bull; BOM Author</span>' +
              '</div>' +
              '<p class="sub">Manage exact-part BOM lists, verify candidate supplier offers, and create frozen sourcing summaries.</p>' +
            '</div>' +
            '<div class="row" style="gap:8px;">' +
              '<a class="btn" href="#/summaries">Saved Summaries History</a>' +
              '<button type="button" class="btn primary" onclick="document.getElementById(\'nl\').focus();">+ New BOM List</button>' +
            '</div>' +
          '</div>' +

          '<div class="preparer-metrics-grid">' +
            '<div class="metric-card"><div class="metric-icon">📑</div><div><div class="metric-number">' + totalLists + '</div><div class="metric-label">Active BOM Lists</div></div></div>' +
            '<div class="metric-card"><div class="metric-icon">🧩</div><div><div class="metric-number">' + totalComponents + '</div><div class="metric-label">Total Parts Required</div></div></div>' +
            '<div class="metric-card"><div class="metric-icon">⏱️</div><div><div class="metric-number">&le; 14 Days</div><div class="metric-label">Catalog Freshness Limit</div></div></div>' +
            '<div class="metric-card"><div class="metric-icon">🔒</div><div><div class="metric-number">Immutable</div><div class="metric-label">Frozen Summary Audit</div></div></div>' +
          '</div>' +

          '<div class="preparer-guide-banner">' +
            '<div class="guide-step-item"><span class="guide-step-badge">Phase 1: Draft BOM</span><strong>Specify Exact Parts</strong><p>Add manufacturer part numbers with whole-piece quantities for your build.</p></div>' +
            '<div class="guide-step-arrow">&rarr;</div>' +
            '<div class="guide-step-item"><span class="guide-step-badge">Phase 2: Review Offers</span><strong>Compare Curated Prices</strong><p>Filter candidate offers by age limit and verify stock coverage.</p></div>' +
            '<div class="guide-step-arrow">&rarr;</div>' +
            '<div class="guide-step-item"><span class="guide-step-badge">Phase 3: Decision Lock</span><strong>Freeze Sourcing Summary</strong><p>Preserve selected supplier quotes in a permanent snapshot.</p></div>' +
          '</div>' +

          '<div class="grid2">' +
            '<section class="main stack" aria-label="Lists">' +
              '<div class="row between" style="align-items:center;">' +
                '<h2 style="font-size:18px; font-weight:700;">My BOM Projects (' + totalLists + ')</h2>' +
                '<span class="small" style="color:var(--mute);">Only visible to your preparer account</span>' +
              '</div>' +

              (lists.length ? lists.map((l) => 
                '<div class="enhanced-bom-card">' +
                  '<div style="flex:1; min-width:260px;">' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                      '<strong style="font-size:16px;">' + esc(l.title) + '</strong>' +
                      (l.archived ? '<span class="badge gray">Archived</span>' : '<span class="badge ok">Draft</span>') +
                    '</div>' +
                    '<div class="small" style="color:var(--mute); margin-top:4px;">' +
                      'Revision <strong>' + l.revision + '</strong> &bull; ' + l.lines.length + ' component line(s)' +
                    '</div>' +
                    '<div class="bom-lines-preview">' +
                      (l.lines && l.lines.length ? l.lines.slice(0, 4).map((line) => 
                        '<span class="bom-part-pill">' + esc(line.part_id || 'Part') + ' &times; ' + line.quantity + '</span>'
                      ).join('') : '<span class="small" style="color:var(--mute);">No components added yet.</span>') +
                      (l.lines && l.lines.length > 4 ? '<span class="bom-part-pill-more">+' + (l.lines.length - 4) + ' more</span>' : '') +
                    '</div>' +
                  '</div>' +
                  '<div class="row" style="gap:8px;">' +
                    '<a class="btn" href="#/lists/' + esc(l.id) + '">Edit BOM</a>' +
                    '<a class="btn primary" href="#/compare/' + esc(l.id) + '"' + (l.lines.length ? '' : ' aria-disabled="true" tabindex="-1"') + '>Compare Offers &rarr;</a>' +
                  '</div>' +
                '</div>'
              ).join('') : '<div class="card stack" style="text-align:center; padding:36px;"><p class="sub">No parts lists yet. Create your first BOM on the right.</p></div>') +
            '</section>' +

            '<aside class="card side stack">' +
              '<h2 style="font-size:18px; font-weight:700;">Create New BOM</h2>' +
              '<p class="small" style="color:var(--mute);">Prepare a bill of materials list for a new electronics build.</p>' +
              '<form id="newlist" class="stack" novalidate style="margin-top:4px;">' +
                '<div>' +
                  '<label for="nl">List Title</label>' +
                  '<input id="nl" placeholder="e.g. Ultrasonic Sensor Node" required>' +
                  '<div class="err" id="nl-err" hidden></div>' +
                '</div>' +
                '<div>' +
                  '<label class="small" style="color:var(--mute); margin-bottom:6px;">Sample Presets (Click to autofill):</label>' +
                  '<div style="display:flex; flex-direction:column; gap:6px;">' +
                    '<button type="button" class="btn btn-sm" style="justify-content:flex-start;" onclick="document.getElementById(\'nl\').value=\'Motor Driver Board (Dual H-Bridge)\';">⚡ Motor Driver Board</button>' +
                    '<button type="button" class="btn btn-sm" style="justify-content:flex-start;" onclick="document.getElementById(\'nl\').value=\'Regulated 5V/12V Power Unit\';">🔋 Regulated Power Unit</button>' +
                    '<button type="button" class="btn btn-sm" style="justify-content:flex-start;" onclick="document.getElementById(\'nl\').value=\'Aircon Service Controller Module\';">❄️ Aircon Controller Module</button>' +
                  '</div>' +
                '</div>' +
                '<button class="primary" type="submit" style="margin-top:8px;">+ Create BOM Draft</button>' +
              '</form>' +
              '<div class="alert info" style="margin-top:10px; font-size:12.5px; line-height:1.5;">' +
                '<strong>Preparer Rule:</strong> Quantities must be positive whole pieces. After creating, click <em>Edit BOM</em> to specify exact part IDs.' +
              '</div>' +
            '</aside>' +
          '</div>' +
        '</div>'
      );
    } catch (e) { errorPage(e); }
  }

  /* --- lists editor --- */
  async function pageEditor(id) {
    removeExistingModal();
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
    const partCounts = {};
    ed.lines.forEach((l) => { if (l.part_id) partCounts[l.part_id] = (partCounts[l.part_id] || 0) + 1; });
    const dupParts = Object.keys(partCounts).filter((k) => partCounts[k] > 1);
    const hasDup = dupParts.length > 0;
    const dupPartNames = dupParts.map((pid) => {
      const p = ed.parts.find((item) => item.id === pid);
      return p ? p.exact_id : pid;
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
    removeExistingModal();
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
    removeExistingModal();
    loading('Loading summaries...');
    try {
      const list = await API.listSummaries();
      setMain('<div><h1>Saved sourcing summaries</h1><p class="sub">Each summary keeps the prices, sources and rules used when it was saved.</p></div>'
        + (list.length ? '<div class="stack">' + list.map((x) => '<a class="list-card" href="#/summaries/' + esc(x.id) + '"><div class="row between" style="align-items:center"><div><strong>' + esc(x.title) + '</strong><div class="small">Saved ' + esc(fmtTime(x.created_at)) + '</div></div><div class="row" style="align-items:center"><span class="mono">' + money(x.subtotal_minor, x.currency) + '</span>' + (x.status === 'COMPLETE' ? badge('ok', '&#10003; Complete') : badge('warn', '! Incomplete (partial subtotal)')) + '</div></div></a>').join('') + '</div>'
          : '<div class="card"><p class="sub">No saved summaries yet. Compare one of your lists and save it.</p><div style="margin-top:12px"><a class="btn primary" href="#/lists">Go to my lists</a></div></div>'));
    } catch (e) { errorPage(e); }
  }

  async function pageSummary(id) {
    removeExistingModal();
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

  /* ---------- ROUTER ---------- */
  async function route() {
    const h = location.hash || '#/';
    try {
      if (h === '#/about') return pageAbout();
      if (h === '#/faqs') return pageFaqs();

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

  /* ---------- EVENT HANDLERS ---------- */
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
        const raw = (f.pa || document.getElementById('pa') || document.getElementById('admin-age')).value.trim();
        const curInput = (f.pc || document.getElementById('pc') || document.getElementById('admin-cur')).value.trim().toUpperCase();
        const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        try { 
          const updated = await API.setPolicy(n, curInput); 
          if (isAdminUser()) {
            pageAdmin();
          } else {
            cmp.policy = updated;
            cmp.settingErrors = null;
            cmp.result = await API.compare(cmp.id, cmp.selections);
            drawCompare();
          }
        }
        catch (e) { 
          if (isAdminUser()) {
            alert('Failed to update policy: ' + e.message);
          } else {
            cmp.settingErrors = e.field_errors || { max_age_days: e.message }; 
            drawCompare(); 
          }
        }
      } else if (f.id === 'offerform') {
        const o = offerForm; const e0 = {};
        const price = String(o.price).trim(); const qty = String(o.recorded_quantity).trim();
        let price_minor = null, recorded_quantity = null;
        if (price !== '') { if (/^\d+(\.\d{1,2})?$/.test(price)) price_minor = Math.round(parseFloat(price) * 100); else e0.price = 'Enter an amount like 185 or 185.50.'; }
        if (qty !== '') { if (/^\d+$/.test(qty)) recorded_quantity = parseInt(qty, 10); else e0.recorded_quantity = 'Quantity must be a whole number, 0 or more.'; }
        if (Object.keys(e0).length) { 
          o.errors = e0; 
          o.error = 'Please fix the highlighted fields.'; 
          o.isOpen = true;
          return renderCatalogModal(); 
        }
        try {
          await API.saveOffer({ id: o.id, revision: o.revision, part_id: o.part_id, supplier_id: o.supplier_id, price_minor, currency: o.currency, price_basis: o.price_basis, recorded_quantity, checked_date: o.checked_date, source_reference: o.source_reference, active: o.active });
          const wasEdit = !!o.id; 
          removeExistingModal();
          offerForm = null;
          const [parts, offers, sups] = await Promise.all([API.listParts(), API.listOffers(), API.listSuppliers()]);
          window.__cat = { parts, offers, sups }; 
          drawCatalog('', wasEdit ? 'Offer updated successfully.' : 'New offer added to catalog.');
        } catch (e) { 
          o.errors = e.field_errors || null; 
          o.error = e.message; 
          o.isOpen = true;
          renderCatalogModal(); 
        }
      }
    } catch (e) { errorPage(e); }
  });

  document.addEventListener('input', (ev) => {
    const t = ev.target; const b = t.getAttribute && t.getAttribute('data-bind'); if (!b) return;
    if (b === 'ed.title') { ed.title = t.value; ed.dirty = true; }
    else if (b === 'line.qty') { ed.lines[+t.dataset.i].quantity = t.value; ed.dirty = true; }
    else if (b.startsWith('of.') && b !== 'of.active') { if (offerForm) offerForm[b.slice(3)] = t.value; }
    else if (b === 'catsearch') { 
      drawCatalog(t.value); 
      const q = document.getElementById('q'); 
      if (q) { q.focus(); q.setSelectionRange(t.value.length, t.value.length); }
    }
  });

  document.addEventListener('change', async (ev) => {
    const t = ev.target; const b = t.getAttribute && t.getAttribute('data-bind'); if (!b) return;
    try {
      if (b === 'line.part') { 
        ed.lines[+t.dataset.i].part_id = t.value; 
        ed.dirty = true;
        drawEditor();
      }
      else if (b === 'ed.archived') { ed.archived = t.checked; ed.dirty = true; }
      else if (b === 'of.active') { if (offerForm) offerForm.active = t.checked; }
      else if (b.startsWith('of.')) { if (offerForm) offerForm[b.slice(3)] = t.value; }
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
      
      /* MODAL ACTIONS */
      else if (act === 'open-add-offer-modal') {
        offerForm = { 
          id: null, revision: null, part_id: '', supplier_id: '', price: '', 
          currency: 'PHP', price_basis: 'per_piece', recorded_quantity: '', 
          checked_date: '2026-11-02', source_reference: '', active: true, 
          errors: null, error: null, isOpen: true 
        };
        renderCatalogModal();
      }
      else if (act === 'edit-offer') {
        const o = window.__cat.offers.find((x) => x.id === t.dataset.id);
        offerForm = { 
          id: o.id, revision: o.revision, part_id: o.part_id, supplier_id: o.supplier_id, 
          price: o.price_minor == null ? '' : (o.price_minor / 100).toFixed(2), 
          currency: o.currency, price_basis: o.price_basis, 
          recorded_quantity: o.recorded_quantity == null ? '' : String(o.recorded_quantity), 
          checked_date: o.checked_date || '', source_reference: o.source_reference || '', 
          active: o.active, errors: null, error: null, isOpen: true 
        };
        renderCatalogModal();
      }
      else if (act === 'close-offer-modal') {
        removeExistingModal();
        offerForm = null;
      }
      else if (act === 'set-catalog-filter') {
        catalogFilter = t.dataset.val;
        drawCatalog(document.getElementById('q') ? document.getElementById('q').value : '');
      }

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

  /* ---------- GLOBAL HELP WIDGET AUTOMATIC INJECTION ---------- */
  const helpArticles = [
    { title: 'Offer Eligibility Rules (Age Limit & Quantity Coverage)', category: 'FAQs', url: '#/faqs', desc: 'Learn how offers are evaluated based on 14-day freshness thresholds and line quantities.' },
    { title: 'Why Unresolved Parts Are Not Counted as Zero (₱0.00)', category: 'Pricing', url: '#/faqs', desc: 'Transparent line accounting ensuring incomplete BOM lists are never hidden behind misleading subtotals.' },
    { title: 'Preserved Sourcing Snapshots & Frozen Summaries', category: 'Audit', url: '#/faqs', desc: 'How saved summaries retain exact prices, dates, and rule assumptions even if catalog entries change.' },
    { title: 'About the System & Project Nexus Scope', category: 'About Us', url: '#/about', desc: 'Background, research foundation, and College of Engineering & Digital Technology capstone scope.' },
    { title: 'Catalog Maintainer vs. BOM Preparer Roles', category: 'Roles', url: '#/about', desc: 'Who manages the curated offer catalog and who builds parts comparison lists.' },
    { title: 'Contact Project Nexus Support & Team Details', category: 'Contact', url: '#footer', desc: 'Official email address (support@partscompare.edu.ph) and ICCT campus details.' },
    { title: 'Sign in & Demo Account Credentials', category: 'Access', url: '#/login', desc: 'How to sign in using Preparer, Maintainer, or Administrator demo roles.' }
  ];

  function initFloatingHelpWidget() {
    if (document.getElementById('helpFloatBtn')) return;
    const btn = document.createElement('div');
    btn.id = 'helpFloatBtn';
    btn.className = 'help-floating-btn';
    btn.setAttribute('title', 'Need help? Click to search support articles');
    btn.innerHTML = '<span class="help-circle-icon">?</span><span class="help-text">Help</span>';
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'helpModalPanel';
    panel.className = 'help-modal-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="help-modal-header">
        <div><h3>Welcome to PartsCompare Support</h3></div>
        <button type="button" class="help-modal-close" id="helpModalClose" aria-label="Close help">&times;</button>
      </div>
      <div class="help-modal-body">
        <h4 style="font-size:15px; font-weight:700; margin:0 0 4px;">Got questions?</h4>
        <div class="help-search-box">
          <input type="search" id="helpGlobalSearch" placeholder="Search for help..." autocomplete="off">
          <button type="button" class="help-search-btn" aria-label="Search">🔍</button>
        </div>
        <div class="help-section-label">Suggested articles</div>
        <div class="help-articles-list" id="helpArticlesList"></div>
      </div>
    `;
    document.body.appendChild(panel);

    const searchInput = document.getElementById('helpGlobalSearch');
    const articlesList = document.getElementById('helpArticlesList');
    const closeBtn = document.getElementById('helpModalClose');

    function renderList(filter = '') {
      const q = filter.trim().toLowerCase();
      const filtered = helpArticles.filter(item =>
        !q || item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        articlesList.innerHTML = `<div style="font-size:13px; color:var(--mute); padding:16px; text-align:center;">No articles match "${esc(filter)}".</div>`;
        return;
      }

      articlesList.innerHTML = filtered.map(item => `
        <a class="help-article-link" href="${item.url}" onclick="document.getElementById('helpModalPanel').style.display='none';">
          <span class="help-article-icon">📖</span>
          <div>
            <strong style="display:block; margin-bottom:2px;">${esc(item.title)}</strong>
            <span style="font-size:12px; color:var(--mute);">${esc(item.desc)}</span>
          </div>
        </a>
      `).join('');
    }

    btn.onclick = () => {
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) {
        renderList(searchInput.value);
        searchInput.focus();
      }
    };

    closeBtn.onclick = () => { panel.style.display = 'none'; };
    searchInput.addEventListener('input', (e) => renderList(e.target.value));
    renderList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingHelpWidget);
  } else {
    initFloatingHelpWidget();
  }
  
  route();
})();
/* Landing page. */
(function () {
  const A = window.PC_ART;
  const money = (m) => 'PHP ' + (m / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const PARTS = [
    { name: 'ATMEGA328P-PU', desc: '8-bit microcontroller', art: () => A.chip(), offers: [['Sample Shop A', 18500, 25, 2], ['Sample Shop B', 17200, 50, 30], ['Sample Shop C', 19900, 3, 1]] },
    { name: 'HC-SR04', desc: 'Ultrasonic distance sensor', art: () => A.sensor(), offers: [['Sample Shop A', 9800, 12, 2], ['Sample Shop B', 9200, 40, 4], ['Sample Shop C', 8900, 5, 1]] },
    { name: 'SG90', desc: 'Micro servo motor', art: () => A.servo(), offers: [['Sample Shop A', 7800, 30, 2], ['Sample Shop B', 8300, 60, 9], ['Sample Shop C', 7500, 10, 21]] },
  ];
  const step = (n, icon, t, p) => '<div class="step rv"><div class="step-ic">' + A.icons[icon] + '</div><div class="step-n">Step ' + n + '</div><h3>' + t + '</h3><p>' + p + '</p></div>';
  const feat = (icon, t, p) => '<div class="feat rv"><div class="feat-ic">' + A.icons[icon] + '</div><h3>' + t + '</h3><p>' + p + '</p></div>';

  function html() {
    return '<section class="hero">' + A.circuit()
      + '<div class="hero-in"><div class="hero-copy rv in">'
      + '<h1>Compare supplier offers. Keep the proof.</h1>'
      + '<p class="lead">Record dated, attributed offers by exact part ID. Choose what fits each line. Save a sourcing summary that never changes after the fact.</p>'
      + '<div class="row"><a class="btn primary big" href="#/login">Try the demo</a><button type="button" class="btn ghost big" data-action="scroll" data-target="how">See how it works</button></div>'
      + '<p class="fine">Prototype built with synthetic sample data. Not connected to real suppliers.</p></div>'
      + '<div class="hero-art" aria-hidden="true"><div class="hero-chip">' + A.chip('#0B3C43', '#7CD3CF') + '</div>'
      + '<div class="fcard c1"><div class="mono">ATMEGA328P-PU</div><div class="small2">Sample Shop A &middot; ' + money(18500) + ' each</div><span class="badge ok">&#10003; Eligible</span></div>'
      + '<div class="fcard c2"><div class="mono">Sample Shop B</div><div class="small2">Checked 30 days ago</div><span class="badge bad">Excluded: older than limit</span></div>'
      + '<div class="fcard c3"><div class="small2">Parts subtotal (partial)</div><div class="big-n">' + money(113400) + '</div><span class="badge warn">! 2 unresolved, not counted</span></div></div></div></section>'
      
      + '<section class="strip"><div class="strip-in"><span>Exact part IDs</span><span>Dated and attributed offers</span><span>Nothing hidden as zero</span><span>Frozen summaries</span></div></section>'

      /* 1. HOW IT WORKS */
      + '<section class="sec" id="how"><div class="sec-in"><div class="sec-h rv"><h2>From parts list to sourcing summary</h2><p>An auditable workflow to verify and preserve component pricing.</p></div><div class="steps">'
      + step(1, 'tag', 'Record offers', 'A maintainer enters exact parts and supplier offers with price, recorded quantity, check date and source.')
      + step(2, 'list', 'Build a list', 'A preparer lists the exact parts and whole-piece quantities needed for a job.')
      + step(3, 'check', 'Review and choose', 'Each offer is checked for freshness and quantity. You choose one eligible offer per line.')
      + step(4, 'lock', 'Save the summary', 'The chosen values, sources and rules are frozen into a summary you can open later.') + '</div></div></section>'

      /* 2. INTERACTIVE DEMO SLIDER */
      + '<section class="sec alt" id="try"><div class="sec-in"><div class="sec-h rv"><h2>See eligibility change as you adjust the rules</h2><p>Move the sliders. Offers that are too old or too small drop out. The lowest eligible price is highlighted.</p></div>'
      + '<div class="try rv"><div class="try-ctl"><div><label for="try-part">Part</label><select id="try-part">' + PARTS.map((p, i) => '<option value="' + i + '">' + p.name + ' - ' + p.desc + '</option>').join('') + '</select></div>'
      + '<div><label for="try-qty">Quantity needed: <strong id="try-qty-v">6</strong></label><input id="try-qty" type="range" min="1" max="60" value="6"></div>'
      + '<div><label for="try-age">Oldest accepted check: <strong id="try-age-v">14</strong> days</label><input id="try-age" type="range" min="3" max="45" value="14"></div>'
      + '<div class="try-art" id="try-art"></div></div><div class="try-out" id="try-out" aria-live="polite"></div></div></div></section>'

      /* 3. CORE PRINCIPLES */
      + '<section class="sec"><div class="sec-in"><div class="sec-h rv"><h2>Clear rules, visible reasons</h2><p>Guaranteed transparency in bill of materials calculation.</p></div><div class="feats">'
      + feat('check', 'Explicit eligibility', 'Every offer shows whether it is eligible and, if not, every reason why.')
      + feat('warn', 'Unresolved is not zero', 'A line with no usable offer is left out of the total and clearly marked, so a partial total never looks complete.')
      + feat('clock', 'Dated offers', 'Offers carry a check date and a source, so you can see how fresh a price is.')
      + feat('lock', 'Frozen summaries', 'Later catalog edits do not change a saved summary. A new comparison is a separate record.') + '</div></div></section>'

      /* 4. CALL TO ACTION */
      + '<section class="cta"><div class="cta-in rv"><h2>Ready to walk through it?</h2><p>Sign in with a demo account and follow one list from comparison to saved summary.</p><a class="btn primary big" href="#/login">Open the demo</a></div></section>'

      /* 5. BEDLOFT-STYLE STRUCTURED FOOTER */
      + '<footer class="foot-pro" id="footer">'
      + '<div class="foot-pro-in">'
      
      + '<div class="foot-col foot-brand-col">'
      + '<div class="brand" style="color:#fff;margin-bottom:12px">'
      + '<svg width="28" height="28" viewBox="0 0 96 96" aria-hidden="true"><rect width="96" height="96" rx="22" fill="#2DD4BF"/><rect x="20" y="22" width="36" height="10" rx="5" fill="#0F1B2D" fill-opacity="0.6"/><rect x="20" y="44" width="44" height="10" rx="5" fill="#0F1B2D"/><rect x="20" y="66" width="30" height="10" rx="5" fill="#0F1B2D" fill-opacity="0.6"/><circle cx="70" cy="49" r="13" fill="#0F1B2D"/><path d="M63.5 49.5l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      + '<span>Parts<span style="color:#2DD4BF">Compare</span></span>'
      + '</div>'
      + '<p style="color:#94A3B8;font-size:13px;line-height:1.6;margin-bottom:14px">A Web Based Bill of Materials Comparison System Using Curated Supplier Offers. Providing reproducible evaluations and frozen sourcing summaries.</p>'
      + '</div>'

      + '<div class="foot-col">'
      + '<div class="foot-heading">COMPANY</div>'
      + '<ul class="foot-links">'
      + '<li><a href="#/about">About System</a></li>'
      + '<li><a href="#try" onclick="document.getElementById(\'try\').scrollIntoView();return false;">Interactive Demo</a></li>'
      + '<li><a href="mailto:support@partscompare.edu.ph">support@partscompare.edu.ph</a></li>'
      + '<li><a href="https://icct.edu.ph" target="_blank" rel="noopener">ICCT Colleges Foundation Inc.</a></li>'
      + '</ul></div>'

      + '<div class="foot-col">'
      + '<div class="foot-heading">FAQS</div>'
      + '<ul class="foot-links">'
      + '<li><a href="#/faqs">Frequently Asked Questions</a></li>'
      + '<li><a href="#/faqs">Offer Eligibility Rules</a></li>'
      + '<li><a href="#/faqs">Unresolved Requirements Policy</a></li>'
      + '<li><a href="#/faqs">Preserved Sourcing Snapshots</a></li>'
      + '</ul></div>'

      + '<div class="foot-col">'
      + '<div class="foot-heading">CONTACT US</div>'
      + '<ul class="foot-links">'
      + '<li><span style="color:#CBD5E1;font-size:13px;">College of Engineering &amp; Digital Technology</span></li>'
      + '<li><span style="color:#94A3B8;font-size:13px;">V.V. Soliven Ave. II, Cainta, Rizal</span></li>'
      + '<li><a href="mailto:support@partscompare.edu.ph" style="color:#2DD4BF;">Send an Email</a></li>'
      + '<li><a href="#/login">Request Account Access</a></li>'
      + '</ul></div>'

      + '</div>'
      + '<div class="foot-pro-bottom">'
      + '<div class="foot-pro-bottom-in">'
      + '<span>&copy; 2026 PartsCompare &bull; Project Nexus (CEDT). All rights reserved.</span>'
      + '</div></div>'
      + '</footer>';
  }

  function drawTry() {
    const p = PARTS[+document.getElementById('try-part').value];
    const qty = +document.getElementById('try-qty').value, age = +document.getElementById('try-age').value;
    document.getElementById('try-qty-v').textContent = qty; document.getElementById('try-age-v').textContent = age;
    document.getElementById('try-art').innerHTML = p.art();
    const rows = p.offers.map(([shop, price, rq, ago]) => {
      const reasons = []; if (ago > age) reasons.push('Checked ' + ago + ' days ago, over the ' + age + '-day limit'); if (rq < qty) reasons.push('Only ' + rq + ' recorded, ' + qty + ' needed');
      return { shop, price, rq, ago, ok: !reasons.length, reasons };
    });
    const el = rows.filter((r) => r.ok); const min = el.length ? Math.min(...el.map((r) => r.price)) : null;
    document.getElementById('try-out').innerHTML = '<h3>' + p.name + ' &times; ' + qty + '</h3>'
      + rows.map((r) => '<div class="toffer' + (r.ok ? '' : ' off') + (r.ok && r.price === min ? ' best' : '') + '"><div><strong>' + r.shop + '</strong><div class="small2">' + money(r.price) + ' each &middot; recorded qty ' + r.rq + ' &middot; checked ' + r.ago + ' days ago</div>'
        + (r.ok ? '' : '<ul>' + r.reasons.map((x) => '<li>' + x + '</li>').join('') + '</ul>') + '</div><div class="tright">'
        + (r.ok ? '<span class="badge ok">&#10003; Eligible</span>' + (r.price === min ? '<span class="badge gray">Lowest eligible</span>' : '') : '<span class="badge bad">Excluded</span>') + '</div></div>').join('')
      + '<div class="tres">' + (el.length ? '<span>Line cost with the lowest eligible offer</span><strong>' + money(min * qty) + '</strong>' : '<span class="badge warn">! Unresolved: no eligible offer</span><span>Not counted in the total, and not treated as zero.</span>') + '</div>';
  }

  function mount() {
    ['try-part', 'try-qty', 'try-age'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', drawTry);
    });
    drawTry();
    const els = document.querySelectorAll('.rv:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }
  window.PC_LANDING = { html, mount };
})();
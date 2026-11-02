/* Landing page. Content is illustrative; the demo widget is NOT the real rules engine. */
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
  const role = (t, who, items) => '<div class="role rv"><h3>' + t + '</h3><p class="who">' + who + '</p><ul>' + items.map((i) => '<li>' + i + '</li>').join('') + '</ul></div>';

  function html() {
    return '<section class="hero">' + A.circuit()
      + '<div class="hero-in"><div class="hero-copy rv in"><span class="eyebrow">Bill of materials comparison</span>'
      + '<h1>Compare supplier offers. Keep the proof.</h1>'
      + '<p class="lead">Record dated, attributed offers by exact part ID. Choose what fits each line. Save a sourcing summary that never changes after the fact.</p>'
      + '<div class="row"><a class="btn primary big" href="#/login">Try the demo</a><button type="button" class="btn ghost big" data-action="scroll" data-target="how">See how it works</button></div>'
      + '<p class="fine">Prototype built with synthetic sample data. Not connected to real suppliers.</p></div>'
      + '<div class="hero-art" aria-hidden="true"><div class="hero-chip">' + A.chip('#0B3C43', '#7CD3CF') + '</div>'
      + '<div class="fcard c1"><div class="mono">ATMEGA328P-PU</div><div class="small2">Sample Shop A &middot; ' + money(18500) + ' each</div><span class="badge ok">&#10003; Eligible</span></div>'
      + '<div class="fcard c2"><div class="mono">Sample Shop B</div><div class="small2">Checked 30 days ago</div><span class="badge bad">Excluded: older than limit</span></div>'
      + '<div class="fcard c3"><div class="small2">Parts subtotal (partial)</div><div class="big-n">' + money(113400) + '</div><span class="badge warn">! 2 unresolved, not counted</span></div></div></div></section>'
      + '<section class="strip"><div class="strip-in"><span>Exact part IDs</span><span>Dated and attributed offers</span><span>Nothing hidden as zero</span><span>Frozen summaries</span></div></section>'
      + '<section class="sec" id="how"><div class="sec-in"><div class="sec-h rv"><span class="eyebrow dark">How it works</span><h2>From parts list to sourcing summary</h2></div><div class="steps">'
      + step(1, 'tag', 'Record offers', 'A maintainer enters exact parts and supplier offers with price, recorded quantity, check date and source.')
      + step(2, 'list', 'Build a list', 'A preparer lists the exact parts and whole-piece quantities needed for a job.')
      + step(3, 'check', 'Review and choose', 'Each offer is checked for freshness and quantity. You choose one eligible offer per line.')
      + step(4, 'lock', 'Save the summary', 'The chosen values, sources and rules are frozen into a summary you can open later.') + '</div></div></section>'
      + '<section class="sec alt" id="try"><div class="sec-in"><div class="sec-h rv"><span class="eyebrow dark">Try it</span><h2>See eligibility change as you adjust the rules</h2><p>Move the sliders. Offers that are too old or too small drop out. The lowest eligible price is highlighted. This is an illustration, not the real app.</p></div>'
      + '<div class="try rv"><div class="try-ctl"><div><label for="try-part">Part</label><select id="try-part">' + PARTS.map((p, i) => '<option value="' + i + '">' + p.name + ' - ' + p.desc + '</option>').join('') + '</select></div>'
      + '<div><label for="try-qty">Quantity needed: <strong id="try-qty-v">6</strong></label><input id="try-qty" type="range" min="1" max="60" value="6"></div>'
      + '<div><label for="try-age">Oldest accepted check: <strong id="try-age-v">14</strong> days</label><input id="try-age" type="range" min="3" max="45" value="14"></div>'
      + '<div class="try-art" id="try-art"></div></div><div class="try-out" id="try-out" aria-live="polite"></div></div></div></section>'
      + '<section class="sec"><div class="sec-in"><div class="sec-h rv"><span class="eyebrow dark">Why it is built this way</span><h2>Clear rules, visible reasons</h2></div><div class="feats">'
      + feat('check', 'Explicit eligibility', 'Every offer shows whether it is eligible and, if not, every reason why.')
      + feat('warn', 'Unresolved is not zero', 'A line with no usable offer is left out of the total and clearly marked, so a partial total never looks complete.')
      + feat('clock', 'Dated offers', 'Offers carry a check date and a source, so you can see how fresh a price is.')
      + feat('lock', 'Frozen summaries', 'Later catalog edits do not change a saved summary. A new comparison is a separate record.') + '</div></div></section>'
      + '<section class="sec alt" id="roles"><div class="sec-in"><div class="sec-h rv"><span class="eyebrow dark">Roles</span><h2>Who does what</h2><p>Proposed roles. The final access rules still need to be agreed.</p></div><div class="roles">'
      + role('Preparer', 'Builds the parts list', ['Creates and edits own lists', 'Chooses offers per line', 'Saves and reopens own summaries'])
      + role('Maintainer', 'Looks after the catalog', ['Adds parts and offers', 'Keeps dates and sources current', 'Deactivates old offers instead of deleting'])
      + role('Administrator', 'Provides accounts and policy', ['Creates accounts, no public signup', 'Sets rules such as the age limit', 'Cannot promote their own role']) + '</div></div></section>'
      + '<section class="cta"><div class="cta-in rv"><h2>Ready to walk through it?</h2><p>Sign in with a demo account and follow one list from comparison to saved summary.</p><a class="btn primary big" href="#/login">Open the demo</a></div></section>'
      + '<footer class="foot"><div class="foot-in"><span>PartsCompare &middot; academic prototype</span><span>All data on this site is synthetic.</span></div></footer>';
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
    ['try-part', 'try-qty', 'try-age'].forEach((id) => document.getElementById(id).addEventListener('input', drawTry));
    drawTry();
    const els = document.querySelectorAll('.rv:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }
  window.PC_LANDING = { html, mount };
})();

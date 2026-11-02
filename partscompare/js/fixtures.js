/* SYNTHETIC FIXTURES - fake parts, shops, prices and stock. Not real data. */
(function () {
  function dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  const o = (id, part_id, supplier_id, price_minor, qty, ago, src, active = true) => ({
    id, part_id, supplier_id, price_minor, currency: 'PHP', price_basis: 'per_piece',
    recorded_quantity: qty, checked_date: ago === null ? null : dateOffset(-ago),
    source_reference: src, active, revision: 1, synthetic: true,
  });
  window.PC_FIXTURES = {
    users: [
      { id: 'u1', username: 'preparer', name: 'Demo Preparer', role: 'preparer' },
      { id: 'u2', username: 'maintainer', name: 'Demo Maintainer', role: 'maintainer' },
      { id: 'u3', username: 'admin', name: 'Demo Administrator', role: 'administrator' },
    ],
    suppliers: [
      { id: 's1', name: 'Sample Shop A' },
      { id: 's2', name: 'Sample Shop B' },
      { id: 's3', name: 'Sample Shop C' },
    ],
    parts: [
      { id: 'p1', exact_id: 'ATMEGA328P-PU', description: '8-bit microcontroller, DIP-28', unit: 'piece', active: true },
      { id: 'p2', exact_id: 'HC-SR04', description: 'Ultrasonic distance sensor', unit: 'piece', active: true },
      { id: 'p3', exact_id: 'SG90', description: 'Micro servo motor', unit: 'piece', active: true },
      { id: 'p4', exact_id: 'NE555P', description: 'Timer IC, DIP-8', unit: 'piece', active: true },
      { id: 'p5', exact_id: 'LM7805', description: '5 V linear regulator', unit: 'piece', active: true },
      { id: 'p6', exact_id: '1N4007', description: 'Rectifier diode, 1 A', unit: 'piece', active: true },
      { id: 'p7', exact_id: 'TIP120', description: 'Darlington transistor', unit: 'piece', active: true },
    ],
    offers: [
      o('o1', 'p1', 's1', 18500, 25, 2, 'Sample Shop A listing, sample ref A-101'),
      o('o2', 'p1', 's3', 19900, 3, 1, 'Sample Shop C listing, sample ref C-204'),
      o('o3', 'p2', 's2', 9200, 40, 4, 'Sample Shop B listing, sample ref B-310'),
      o('o4', 'p2', 's1', 9200, 12, 2, 'Sample Shop A listing, sample ref A-115'),
      o('o5', 'p3', 's1', 7800, 30, 2, 'Sample Shop A listing, sample ref A-120'),
      o('o6', 'p3', 's3', 7500, 10, -3, 'Sample Shop C listing, sample ref C-230'),
      o('o7', 'p4', 's3', 1400, 100, 1, 'Sample Shop C listing, sample ref C-240'),
      o('o8', 'p5', 's2', 2200, 2, 3, 'Sample Shop B listing, sample ref B-330'),
      o('o9', 'p5', 's3', 1900, 50, 41, 'Sample Shop C listing, sample ref C-250'),
      o('o10', 'p7', 's2', null, 10, 2, 'Sample Shop B listing, price not recorded'),
      o('o11', 'p7', 's1', 4500, 8, 0, 'Sample Shop A listing, sample ref A-140', false),
    ],
    lists: [
      {
        id: 'l1', owner_id: 'u1', title: 'Ultrasonic sensor node (sample)', revision: 1, archived: false,
        lines: [
          { id: 'ln1', part_id: 'p1', quantity: 2 },
          { id: 'ln2', part_id: 'p2', quantity: 4 },
          { id: 'ln3', part_id: 'p3', quantity: 4 },
          { id: 'ln4', part_id: 'p4', quantity: 6 },
          { id: 'ln5', part_id: 'p5', quantity: 3 },
          { id: 'ln6', part_id: 'p6', quantity: 20 },
        ],
      },
    ],
    summaries: [],
    policy: null,
    counters: { id: 100, policy: 0 },
  };
})();

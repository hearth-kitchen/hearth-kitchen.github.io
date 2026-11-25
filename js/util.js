/* Hearth utilities: ingredient parsing, fractions, unit conversion, aisles, timers, nutrition */
(function () {
  var U = H.util = {};

  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  U.slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'recipe'; };
  U.hash = function (s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  U.rng = function (seed) { var x = seed || 1; return function () { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return (x % 100000) / 100000; }; };
  U.fmtTime = function (min) {
    if (!min) return '—';
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  };

  /* ---------- Units ---------- */
  var UNIT_ALIASES = {
    g: 'g', gram: 'g', grams: 'g', kg: 'kg', ml: 'ml', l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
    tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
    cup: 'cup', cups: 'cup', oz: 'oz', lb: 'lb', 'fl oz': 'floz',
    clove: 'clove', cloves: 'clove', pinch: 'pinch', handful: 'handful', sprig: 'sprig', sprigs: 'sprig',
    slice: 'slice', slices: 'slice', can: 'can', cans: 'can', stick: 'stick', sticks: 'stick'
  };
  var PLURAL = { clove: 'cloves', pinch: 'pinches', handful: 'handfuls', sprig: 'sprigs', slice: 'slices', can: 'cans', stick: 'sticks', cup: 'cups' };

  function parseQty(s) {
    s = s.trim();
    var total = 0, parts = s.split(/\s+/), ok = false;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (/^\d+\/\d+$/.test(p)) { var f = p.split('/'); total += (+f[0]) / (+f[1]); ok = true; }
      else if (/^\d*\.?\d+$/.test(p)) { total += parseFloat(p); ok = true; }
    }
    return ok ? total : null;
  }

  /* "1 1/2 tbsp light soy sauce" -> {qty:1.5, unit:'tbsp', name:'light soy sauce'} */
  U.parseIng = function (line) {
    line = String(line).trim();
    var m = line.match(/^((?:\d+\s+)?\d+\/\d+|\d*\.?\d+)\s*(.*)$/);
    if (!m) return { qty: null, unit: '', name: line, raw: line };
    var qty = parseQty(m[1]), rest = m[2], unit = '';
    var um = rest.match(/^(fl oz|[a-zA-Z]+)\.?\s+(.*)$/);
    if (um && UNIT_ALIASES[um[1].toLowerCase()]) { unit = UNIT_ALIASES[um[1].toLowerCase()]; rest = um[2]; }
    else if (/^(g|kg|ml|l)$/i.test(rest.split(' ')[0]) === false) {
      var glued = rest.match(/^(g|kg|ml|l)\b\s*(.*)$/i);
      if (glued) { unit = glued[1].toLowerCase(); rest = glued[2]; }
    }
    return { qty: qty, unit: unit, name: rest, raw: line };
  };

  /* ---------- Fractions done right ---------- */
  var FR = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, '']];
  var FRC = [FR[0], FR[2], FR[3], FR[5], FR[7], FR[8], FR[10]];
  U.frac = function (x, coarse) {
    if (x == null || isNaN(x)) return '';
    if (x >= 10) return String(Math.round(x));
    var whole = Math.floor(x), rem = x - whole, best = FR[0], bd = 9, set = coarse ? FRC : FR;
    for (var i = 0; i < set.length; i++) { var d = Math.abs(rem - set[i][0]); if (d < bd) { bd = d; best = set[i]; } }
    if (best[0] === 1) { whole += 1; best = FR[0]; }
    if (whole === 0 && best[1] === '') return x > 0 ? '⅛' : '0';
    return (whole ? String(whole) : '') + best[1];
  };
  function roundNice(x) {
    if (x >= 100) return Math.round(x / 5) * 5;
    if (x >= 20) return Math.round(x);
    if (x >= 5) return Math.round(x * 2) / 2;
    return Math.round(x * 10) / 10;
  }
  function trimNum(x) { return String(+x.toFixed(2)); }

  /* Convert metric to US where sensible. Returns {qty, unit, text} */
  U.convert = function (qty, unit, system, name) {
    var n = (name || '').toLowerCase();
    if (system === 'us') {
      if (unit === 'g' || unit === 'kg') {
        var g = unit === 'kg' ? qty * 1000 : qty;
        var cupG = cupWeight(n);
        if (cupG && g >= cupG / 4) return { qty: g / cupG, unit: 'cup' };
        if (g < 15) return { qty: g / 28.35, unit: 'oz', exact: true };
        var oz = g / 28.35;
        if (oz >= 16) return { qty: oz / 16, unit: 'lb', exact: true };
        return { qty: oz, unit: 'oz', exact: true };
      }
      if (unit === 'ml' || unit === 'l') {
        var ml = unit === 'l' ? qty * 1000 : qty;
        if (ml < 15) return { qty: ml / 4.93, unit: 'tsp' };
        if (ml < 59) return { qty: ml / 14.79, unit: 'tbsp' };
        return { qty: ml / 236.6, unit: 'cup' };
      }
    } else {
      if (unit === 'cup') return { qty: qty * 240, unit: 'ml', exact: true };
      if (unit === 'oz') return { qty: qty * 28.35, unit: 'g', exact: true };
      if (unit === 'lb') return { qty: qty * 453.6, unit: 'g', exact: true };
      if (unit === 'floz') return { qty: qty * 29.57, unit: 'ml', exact: true };
      if (unit === 'kg' && qty < 1) return { qty: qty * 1000, unit: 'g', exact: true };
      if (unit === 'l' && qty < 1) return { qty: qty * 1000, unit: 'ml', exact: true };
    }
    return { qty: qty, unit: unit };
  };
  function cupWeight(n) {
    // grams per US cup for common dry goods, so bakers in US mode get cups
    var t = [['icing sugar', 120], ['flour', 125], ['caster sugar', 200], ['granulated sugar', 200], ['brown sugar', 200], ['demerara', 200], ['sugar', 200],
      ['oats', 90], ['rice', 185], ['couscous', 175], ['bulgur', 160], ['semolina', 165], ['cocoa', 85], ['chocolate chips', 170], ['grated', 100],
      ['nuts', 120], ['peanuts', 145], ['pumpkin seeds', 130], ['raisins', 145], ['cranberries', 120], ['blueberries', 150], ['berries', 145], ['peas', 135],
      ['dal', 200], ['lentils', 190], ['dried chickpeas', 200], ['poha', 80], ['yogurt', 245]];
    if (/\b(canned|tinned|can of|drained|cooked|fresh|frozen)\b/.test(n)) return 0;
    for (var i = 0; i < t.length; i++) if (new RegExp('(^|[^a-z])' + t[i][0] + '([^a-z]|$)').test(n)) return t[i][1];
    return 0;
  }

  /* Format a quantity in a unit, with fractions for spoon/cup/count units */
  U.fmtQty = function (qty, unit) {
    if (qty == null) return '';
    var spoon = /^(tsp|tbsp|cup|oz|lb|clove|pinch|handful|sprig|slice|can|stick|)$/.test(unit);
    if (unit === 'oz' && qty >= 2) return trimNum(Math.round(qty * 4) / 4).replace(/\.25$/, '¼').replace(/\.5$/, '½').replace(/\.75$/, '¾');
    if (unit === 'cup') return U.frac(qty, true);
    if (spoon) return U.frac(qty);
    if (unit === 'l' || unit === 'kg') return trimNum(Math.round(qty * 100) / 100);
    return trimNum(roundNice(qty));
  };
  U.unitLabel = function (unit, qty) {
    if (!unit) return '';
    if (unit === 'floz') return 'fl oz';
    if (Math.round(qty * 8) / 8 > 1 && PLURAL[unit]) return PLURAL[unit];
    return unit;
  };

  /* Render a scaled ingredient line → {amount, name, scaled} */
  U.renderIng = function (line, factor, system) {
    var p = U.parseIng(line);
    if (p.qty == null) return { amount: '', name: p.name, parsed: p };
    var q = p.qty * factor, u = p.unit, c = U.convert(q, u, system, p.name);
    var amt = U.fmtQty(c.qty, c.unit) + (c.unit ? ' ' + U.unitLabel(c.unit, c.qty) : '');
    return { amount: amt.trim(), name: p.name, parsed: p, qty: q, unit: u };
  };

  /* Steps: convert temperatures & cm when in US mode */
  U.convertStep = function (text, system) {
    if (system !== 'us') return text;
    return text
      .replace(/(\d+)°C \((\d+)°C fan\)/g, function (_, a, b) { return toF(a) + '°F (' + toF(b) + '°F convection)'; })
      .replace(/(\d+)(?:–(\d+))?°C/g, function (_, a, b) { return toF(a) + (b ? '–' + toF(b) : '') + '°F'; })
      .replace(/(\d+) × (\d+) cm/g, function (_, a, b) { return Math.round(a / 2.54) + ' × ' + Math.round(b / 2.54) + ' in'; })
      .replace(/(\d+) cm\b/g, function (_, a) { var i = a / 2.54; return (i >= 3 ? Math.round(i) : U.frac(i)) + ' in'; })
      .replace(/(\d+) ml\b/g, function (_, a) { var c = U.convert(+a, 'ml', 'us'); return U.fmtQty(c.qty, c.unit) + ' ' + U.unitLabel(c.unit, c.qty); })
      .replace(/(\d+) g \((\d) lb\)/g, function (_, a, b) { return b + ' lb'; });
  };
  function toF(c) { return Math.round((c * 9 / 5 + 32) / 5) * 5; }

  /* ---------- Timers in step text ---------- */
  U.findTimers = function (text) {
    var out = [], re = /(\d+(?:\.\d+)?)(?:\s*(?:–|-|to)\s*(\d+))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi, m;
    while ((m = re.exec(text))) {
      var n = parseFloat(m[2] || m[1]), u = m[3].toLowerCase(), s;
      if (u[0] === 'h') s = n * 3600; else if (u[0] === 'm') s = n * 60; else s = n;
      if (s >= 10 && s <= 86400) out.push({ secs: Math.round(s), label: m[0] });
    }
    return out;
  };
  U.clock = function (s) {
    s = Math.max(0, Math.round(s));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  };

  /* ---------- Aisles ---------- */
  var AISLES = [
    ['Meat & Fish', ['chicken', 'prawn', 'salmon', 'guanciale', 'pancetta', 'bacon', 'beef', 'lamb', 'pork', 'fish', 'tuna', 'mince']],
    ['Frozen', ['frozen']],
    ['Tins & Jars', ['canned', 'tinned', 'passata', 'tomato purée', 'stock', 'tahini', 'sesame paste', 'doubanjiang', 'soy sauce', 'vinegar', 'ketchup', 'mayonnaise', 'mustard', 'capers', 'olives', 'honey', 'maple', 'chilli oil', 'coffee liqueur', 'wine', 'coffee', 'sweetcorn', 'coconut milk', 'jam']],
    ['Spices & Seasoning', ['black pepper', 'white pepper', 'ground', 'seeds', 'turmeric', 'masala', 'chilli powder', 'chilli flakes', 'paprika', 'cinnamon', 'cardamom', 'saffron', 'cloves (spice)', 'whole cloves', 'oregano', 'thyme leaves', 'bay leaf', 'fenugreek', 'amchur', 'sichuan', 'dried red chillies', 'allspice', 'garlic powder', 'salt', 'urad dal', 'curry leaves']],
    ['Dairy & Eggs', ['milk', 'butter', 'cheese', 'cheddar', 'jack', 'paneer', 'yogurt', 'cream', 'egg', 'mascarpone', 'parmesan', 'pecorino', 'mozzarella', 'feta', 'queso', 'ghee']],
    ['Bakery & Baking', ['sugar', 'flour', 'yeast', 'baking powder', 'bicarbonate', 'vanilla', 'cocoa', 'chocolate', 'bread', 'brioche', 'sourdough', 'tortilla', 'savoiardi', 'icing']],
    ['Grains, Pasta & Pulses', ['rice', 'spaghetti', 'penne', 'pasta', 'linguine', 'trofie', 'ditalini', 'noodles', 'oats', 'couscous', 'bulgur', 'semolina', 'poha', 'dal', 'lentils', 'chickpeas', 'beans', 'chia', 'nuts', 'peanuts', 'walnuts', 'pistachios', 'almonds', 'pine nuts', 'pumpkin seeds', 'raisins', 'cranberries', 'tofu', 'tea']],
    ['Oils', ['oil']],
    ['Fresh Produce', ['']]
  ];
  U.AISLE_ORDER = ['Fresh Produce', 'Meat & Fish', 'Dairy & Eggs', 'Bakery & Baking', 'Grains, Pasta & Pulses', 'Tins & Jars', 'Spices & Seasoning', 'Oils', 'Frozen'];
  var FRESH_FIRST = ['fresh', 'lemon', 'lime', 'onion', 'garlic', 'ginger', 'tomatoes, ', 'tomato,', 'tomatoes', 'chilli, ', 'green chilli', 'jalapeño', 'coriander', 'parsley', 'basil', 'mint', 'dill', 'rosemary', 'spinach', 'kale', 'cabbage', 'pepper,', 'red pepper', 'green pepper', 'mushroom', 'cauliflower', 'potato', 'carrot', 'celery', 'courgette', 'cucumber', 'avocado', 'banana', 'apple', 'blueberr', 'berries', 'strawberr', 'bok choy', 'lettuce', 'spring onion'];
  U.aisle = function (name) {
    var n = name.toLowerCase();
    if (n.indexOf('frozen') > -1) return 'Frozen';
    if (/canned|tinned/.test(n)) return 'Tins & Jars';
    if (/chicken|prawn|salmon|guanciale|pancetta/.test(n)) return 'Meat & Fish';
    if (/(^|\s)(eggs?|egg yolk)\b/.test(n)) return 'Dairy & Eggs';
    if (/lemon juice/.test(n)) return 'Fresh Produce';
    if (!/ground|powder|seeds|flakes|dried|leaves \(kasuri/.test(n)) {
      for (var j = 0; j < FRESH_FIRST.length; j++) if (n.indexOf(FRESH_FIRST[j]) > -1) return 'Fresh Produce';
    }
    for (var i = 0; i < AISLES.length; i++) {
      var keys = AISLES[i][1];
      for (var k = 0; k < keys.length; k++) if (n.indexOf(keys[k]) > -1) return AISLES[i][0];
    }
    return 'Fresh Produce';
  };
  /* A clean shopping name: drop prep notes after comma and parentheses */
  U.shopName = function (name) {
    return name.replace(/\(.*?\)/g, '').split(',')[0].replace(/\s+/g, ' ').replace(/^(very|ripe|small|large|medium|thick|fine)\s+/i, '').trim();
  };

  /* ---------- Pantry matching ---------- */
  var STAPLES = ['salt', 'water', 'sunflower oil', 'olive oil', 'black pepper', 'sugar', 'oil'];
  U.isStaple = function (name) { var n = U.shopName(name).toLowerCase(); return STAPLES.some(function (s) { return n === s || n === 'extra virgin ' + s; }) || /^salt\b|^water$|boiling water|warm water|lukewarm water|ice-cold water/.test(n); };
  U.ingMatches = function (ingName, term) {
    var n = ingName.toLowerCase(), t = term.toLowerCase().trim();
    if (!t) return false;
    var stem = t.replace(/(oes|es|s)$/, '');
    return n.indexOf(t) > -1 || (stem.length > 2 && n.indexOf(stem) > -1);
  };

  /* ---------- Nutrition estimate for user recipes (very rough, per 100 g / per unit) ---------- */
  var NUT = [ // keyword, kcal, protein, carbs, fat (per 100 g); 'each' grams for count units
    ['oil', 884, 0, 0, 100], ['butter', 717, 1, 0, 81], ['ghee', 900, 0, 0, 100], ['cream', 340, 2, 3, 36], ['cheese', 400, 25, 1, 33], ['parmesan', 430, 38, 4, 29], ['feta', 265, 14, 4, 21], ['paneer', 300, 18, 4, 24], ['mozzarella', 280, 22, 2, 20],
    ['milk', 64, 3.3, 4.8, 3.6], ['yogurt', 61, 3.5, 4.7, 3.3], ['egg', 143, 12.6, 0.7, 9.5, 50], ['chicken', 165, 26, 0, 7], ['salmon', 208, 20, 0, 13, 140], ['prawn', 99, 24, 0, 0.3],
    ['flour', 364, 10, 76, 1], ['sugar', 387, 0, 100, 0], ['rice', 360, 7, 79, 0.6], ['pasta', 371, 13, 75, 1.5], ['spaghetti', 371, 13, 75, 1.5], ['noodles', 360, 12, 74, 2], ['oats', 389, 17, 66, 7],
    ['chickpeas', 139, 7, 20, 2.5], ['beans', 120, 8, 21, 0.5], ['lentils', 352, 25, 60, 1], ['dal', 343, 22, 63, 1.5], ['tofu', 76, 8, 2, 4.8], ['nuts', 600, 20, 20, 52], ['chocolate', 550, 6, 50, 33],
    ['potato', 77, 2, 17, 0.1, 170], ['onion', 40, 1.1, 9, 0.1, 150], ['tomato', 18, 0.9, 3.9, 0.2, 120], ['avocado', 160, 2, 9, 15, 170], ['banana', 89, 1.1, 23, 0.3, 120], ['apple', 52, 0.3, 14, 0.2, 180],
    ['bread', 265, 9, 49, 3.2, 40], ['tortilla', 310, 8, 50, 8, 40], ['honey', 304, 0, 82, 0], ['maple', 260, 0, 67, 0]
  ];
  var GRAMS = { g: 1, kg: 1000, ml: 1, l: 1000, tsp: 5, tbsp: 15, cup: 200, oz: 28.35, lb: 453.6, clove: 5, pinch: 0.4, handful: 25, slice: 35, can: 400, sprig: 1, stick: 50 };
  U.estimateNutrition = function (ings, serves) {
    var t = { kcal: 0, p: 0, c: 0, f: 0 };
    ings.forEach(function (line) {
      var p = U.parseIng(line); if (p.qty == null) return;
      var n = p.name.toLowerCase(), row = null;
      for (var i = 0; i < NUT.length; i++) if (n.indexOf(NUT[i][0]) > -1) { row = NUT[i]; break; }
      if (!row) { row = ['veg', 30, 1.5, 5, 0.3, 80]; }
      var grams = p.unit ? p.qty * (GRAMS[p.unit] || 50) : p.qty * (row[5] || 80);
      var k = grams / 100;
      t.kcal += row[1] * k; t.p += row[2] * k; t.c += row[3] * k; t.f += row[4] * k;
    });
    var s = Math.max(1, serves || 1);
    return { kcal: Math.round(t.kcal / s), p: Math.round(t.p / s), c: Math.round(t.c / s), f: Math.round(t.f / s) };
  };

  /* ---------- Microcopy ---------- */
  U.QUIPS = [
    'Measure twice, taste always.', 'Butter makes it better. Usually.', 'A watched pot does eventually boil.', 'Season like you mean it.',
    'Mise en place: French for "chop it all first".', 'The secret ingredient is patience. And garlic.', 'Every great cook has burnt the toast.',
    'Recipes are suggestions. Salt is a love language.', 'Clean as you go, thank yourself later.', 'If in doubt, add lemon.',
    'Leftovers are just plans in disguise.', 'Low and slow beats fast and fierce.'
  ];
  U.quip = function () { return U.QUIPS[Math.floor(Math.random() * U.QUIPS.length)]; };

  U.DIETS = { veg: { label: 'Vegetarian', short: 'Veg', cls: 'veg' }, vegan: { label: 'Vegan', short: 'Vegan', cls: 'vegan' }, 'non-veg': { label: 'Non-vegetarian', short: 'Non-veg', cls: 'nonveg' }, egg: { label: 'Contains egg', short: 'Egg', cls: 'egg' } };
  U.CATS = [
    { key: 'all', label: 'Everything' }, { key: 'Indian', label: 'Indian' }, { key: 'Italian', label: 'Italian' }, { key: 'Mexican', label: 'Mexican' },
    { key: 'Chinese', label: 'Chinese' }, { key: 'Mediterranean', label: 'Mediterranean' }, { key: 'baking', label: 'Baking' }, { key: 'quick', label: '15-minute' },
    { key: 'breakfast', label: 'Breakfast' }, { key: 'dessert', label: 'Desserts' }
  ];
  U.inCat = function (r, key) {
    if (key === 'all') return true;
    if (key === 'quick') return r.time <= 15;
    return r.cuisine === key || r.tags.indexOf(key) > -1;
  };

  U.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };
  U.download = function (name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
})();

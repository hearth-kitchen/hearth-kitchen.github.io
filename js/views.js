/* Hearth views: pantry, planner, shopping list, favourites, add/edit, settings, about */
(function () {
  var U = H.util, S = H.store, $ = U.$, $$ = U.$$, esc = U.esc;

  /* ---------- Pantry: "What can I cook with…" ---------- */
  var pantryTerms = null;
  H.views.pantry = function (v) {
    var st = S.get();
    if (!pantryTerms) pantryTerms = st.pantry || ['onion', 'tomato', 'garlic'];
    var names = {};
    H.all().forEach(function (r) { r.ing.forEach(function (l) { var n = U.shopName(U.parseIng(l).name).toLowerCase(); if (n.length > 2 && n.length < 28 && !U.isStaple(n)) names[n] = 1; }); });
    v.innerHTML = '<div class="page-head"><h1>What can I cook with…</h1><p class="lead">Add what\'s in your fridge and cupboards. We\'ll rank recipes by how little you\'d need to buy.</p></div>' +
      '<div class="pantry paper"><form id="pForm" class="token-input" aria-label="Add an ingredient"><ul id="pTokens" class="tokens" aria-live="polite"></ul>' +
      '<label class="sr" for="pIn">Ingredient</label><input id="pIn" list="pList" placeholder="Type an ingredient and press Enter (e.g. paneer, eggs, rice)" autocomplete="off"><button class="btn">Add</button></form>' +
      '<datalist id="pList">' + Object.keys(names).sort().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<div class="pantry-opts"><label class="switch"><input type="checkbox" id="pSpice"' + (st.pantrySpices !== false ? ' checked' : '') + '><span></span> I have a basic spice rack</label>' +
      '<span class="small">Salt, water and cooking oil are always assumed.</span><button class="link-btn" id="pClear">Clear all</button></div></div>' +
      '<div id="pResults"></div>';
    function save() { S.set(function (s) { s.pantry = pantryTerms.slice(); s.pantrySpices = $('#pSpice', v).checked; }); }
    function draw() {
      $('#pTokens', v).innerHTML = pantryTerms.map(function (t, i) { return '<li class="token">' + esc(t) + '<button type="button" data-i="' + i + '" aria-label="Remove ' + esc(t) + '">×</button></li>'; }).join('');
      $$('#pTokens button', v).forEach(function (b) { b.addEventListener('click', function () { pantryTerms.splice(+b.dataset.i, 1); save(); draw(); }); });
      var spices = $('#pSpice', v).checked;
      if (!pantryTerms.length) { $('#pResults', v).innerHTML = H.empty('An empty pantry', 'Add a few ingredients above and we\'ll find dinner. Even "eggs" gets you somewhere.'); return; }
      var res = H.all().map(function (r) {
        var need = [], have = 0;
        r.ing.forEach(function (l) {
          var n = U.parseIng(l).name;
          if (U.isStaple(n)) return;
          if (spices && U.aisle(n) === 'Spices & Seasoning') return;
          var ok = pantryTerms.some(function (t) { return U.ingMatches(n, t); });
          if (ok) have++; else need.push(U.shopName(n));
        });
        return { r: r, have: have, need: need, score: have / Math.max(1, have + need.length) };
      }).filter(function (x) { return x.have > 0; });
      res.sort(function (a, b) { return a.need.length - b.need.length || b.have - a.have; });
      var ready = res.filter(function (x) { return x.need.length === 0; });
      $('#pResults', v).innerHTML = !res.length ? H.empty('Hmm, a tricky fridge', 'Nothing uses those yet. Try a broader word like "cheese" instead of "gouda".') :
        '<div class="section-head"><div><h2>' + (ready.length ? ready.length + ' ready to cook right now' : 'Closest matches') + '</h2><p>' + res.length + ' recipes use something you have.</p></div></div>' +
        '<div class="grid pantry-grid">' + res.slice(0, 24).map(function (x, i) {
          var pct = Math.round(x.score * 100);
          return '<div class="pantry-card">' + H.card(x.r, i) + '<div class="match"><div class="bar" style="--p:' + pct + '%"><span></span></div><p><b>' + (x.need.length ? 'You have ' + x.have + ' of ' + (x.have + x.need.length) : 'You have everything!') + '</b>' +
            (x.need.length ? '<br><span class="small">Missing: ' + esc(x.need.slice(0, 5).join(', ')) + (x.need.length > 5 ? '…' : '') + '</span>' : '') + '</p></div></div>';
        }).join('') + '</div>';
      H.bindCards($('#pResults', v));
    }
    $('#pForm', v).addEventListener('submit', function (e) {
      e.preventDefault(); var inp = $('#pIn', v), val = inp.value.trim().toLowerCase();
      if (!val) return;
      val.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (t) { if (pantryTerms.indexOf(t) < 0) pantryTerms.push(t); });
      inp.value = ''; save(); draw(); H.audio.pop();
    });
    $('#pSpice', v).addEventListener('change', function () { save(); draw(); });
    $('#pClear', v).addEventListener('click', function () { pantryTerms = []; save(); draw(); $('#pIn', v).focus(); });
    draw();
  };

  /* ---------- Weekly planner ---------- */
  H.views.plan = function (v) {
    var st = S.get(), selected = null, dragId = null, dragFrom = null;
    v.innerHTML = '<div class="page-head"><h1>This week\'s table</h1><p class="lead">Drag a recipe onto a day — or tap a recipe, then tap a slot. Works with fingers, mice and keyboards.</p></div>' +
      '<div class="plan-tools"><label class="field inline"><span>Cooking for</span><span class="scaler"><button class="icon-btn" id="hhMinus" aria-label="Fewer people">−</button><input id="hhVal" type="number" min="1" max="20" value="' + (st.planServes || 2) + '" aria-label="People"><button class="icon-btn" id="hhPlus" aria-label="More people">+</button></span></label>' +
      '<button class="btn btn-ghost" id="plSurprise">✨ Fill empty dinners</button><button class="btn btn-ghost" id="plClear">' + H.icon('trash') + ' Clear week</button><a class="btn" href="#/shop">' + H.icon('basket') + ' Shopping list</a></div>' +
      '<div class="planner"><aside class="tray paper" aria-label="Recipes to plan"><label class="field search-field"><span class="sr">Filter recipes</span>' + H.icon('search') + '<input id="trQ" type="search" placeholder="Filter recipes"></label>' +
      '<p class="small" id="trHint">Tip: favourites are listed first.</p><ul class="tray-list" id="trList"></ul></aside>' +
      '<div class="week" id="week"></div></div>';
    function trayList() {
      var q = $('#trQ', v).value.trim().toLowerCase(), favs = S.get().favs;
      var list = H.all().slice().sort(function (a, b) { var fa = favs.indexOf(a.id) > -1 ? 0 : 1, fb = favs.indexOf(b.id) > -1 ? 0 : 1; return fa - fb || a.title.localeCompare(b.title); })
        .filter(function (r) { return !q || r.title.toLowerCase().indexOf(q) > -1 || r.cuisine.toLowerCase().indexOf(q) > -1; });
      $('#trList', v).innerHTML = list.map(function (r) {
        return '<li><button class="pill' + (selected === r.id ? ' sel' : '') + '" draggable="true" data-id="' + esc(r.id) + '" aria-pressed="' + (selected === r.id) + '"><span class="pill-dot" style="background:' + r.c1 + '"></span><span class="pill-t">' + esc(r.title) + '</span>' + (favs.indexOf(r.id) > -1 ? '<span class="pill-fav" aria-label="favourite">♥</span>' : '') + '<span class="small">' + U.fmtTime(r.time) + '</span></button></li>';
      }).join('');
      $$('#trList .pill', v).forEach(function (p) {
        p.addEventListener('click', function () { selected = selected === p.dataset.id ? null : p.dataset.id; trayList(); week(); hint(); });
        p.addEventListener('dragstart', function (e) { dragId = p.dataset.id; dragFrom = null; e.dataTransfer.effectAllowed = 'copyMove'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) { /* IE */ } v.classList.add('dragging'); });
        p.addEventListener('dragend', function () { v.classList.remove('dragging'); });
      });
    }
    function hint() {
      var r = selected && H.find(selected);
      $('#trHint', v).innerHTML = r ? '<b>Now tap a slot</b> to place “' + esc(r.title) + '”. <button class="link-btn" id="trCancel">Cancel</button>' : 'Tip: favourites are listed first.';
      v.classList.toggle('placing', !!r);
      var c = $('#trCancel', v); if (c) c.addEventListener('click', function () { selected = null; trayList(); week(); hint(); });
    }
    function assign(key, id) {
      S.set(function (s) { s.plan[key] = { id: id, serves: s.planServes || 2 }; });
      H.audio.pop(); week();
      var slot = $('[data-key="' + key + '"]', v); if (slot) { slot.classList.add('landed'); }
    }
    function week() {
      var plan = S.get().plan, today = (new Date().getDay() + 6) % 7;
      $('#week', v).innerHTML = H.DAYS.map(function (d, di) {
        return '<section class="day' + (di === today ? ' today' : '') + '" aria-label="' + d + '"><h3>' + d + (di === today ? ' <span class="hand">today</span>' : '') + '</h3>' +
          H.MEALS.map(function (m) {
            var key = di + '-' + m[0], p = plan[key], r = p && H.find(p.id);
            if (r) return '<div class="slot filled" data-key="' + key + '" draggable="true"><span class="slot-meal">' + m[1] + '</span><a href="#/r/' + encodeURIComponent(r.id) + '" class="slot-r"><span class="slot-art">' + H.media(r, { steam: false }) + '</span><span>' + esc(r.title) + '<small>for ' + p.serves + '</small></span></a>' +
              '<button class="slot-x" data-rm="' + key + '" aria-label="Remove ' + esc(r.title) + ' from ' + d + ' ' + m[1] + '">×</button></div>';
            return '<button class="slot empty-slot" data-key="' + key + '" aria-label="' + d + ' ' + m[1] + ': empty' + (selected ? ', tap to place' : '') + '"><span class="slot-meal">' + m[1] + '</span><span class="slot-plus">' + H.icon('plus', 18) + '</span></button>';
          }).join('') + '</section>';
      }).join('');
      $$('#week .slot', v).forEach(function (s) {
        var key = s.dataset.key;
        s.addEventListener('dragover', function (e) { e.preventDefault(); s.classList.add('over'); });
        s.addEventListener('dragleave', function () { s.classList.remove('over'); });
        s.addEventListener('drop', function (e) {
          e.preventDefault(); s.classList.remove('over');
          var id = dragId; try { id = id || e.dataTransfer.getData('text/plain'); } catch (x) { /* ignore */ }
          if (dragFrom && dragFrom !== key) { var pl = S.get().plan, a = pl[dragFrom], b = pl[key]; S.set(function (st2) { st2.plan[key] = a; if (b) st2.plan[dragFrom] = b; else delete st2.plan[dragFrom]; }); H.audio.pop(); week(); }
          else if (id && H.find(id)) assign(key, id);
          dragId = dragFrom = null;
        });
        if (s.classList.contains('filled')) {
          s.addEventListener('dragstart', function (e) { dragFrom = key; dragId = null; try { e.dataTransfer.setData('text/plain', 'slot'); } catch (x) { /* ignore */ } });
          s.addEventListener('click', function (e) { if (selected && !e.target.closest('.slot-x')) { e.preventDefault(); assign(key, selected); } });
        } else {
          s.addEventListener('click', function () {
            if (selected) { assign(key, selected); return; }
            H.toast('Pick a recipe from the list first, then tap here.'); var f = $('#trQ', v); if (f) f.focus();
          });
        }
      });
      $$('[data-rm]', v).forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); S.set(function (s) { delete s.plan[b.dataset.rm]; }); week(); }); });
    }
    function setHH(n) {
      n = Math.max(1, Math.min(20, n || 2)); $('#hhVal', v).value = n;
      S.set(function (s) { s.planServes = n; Object.keys(s.plan).forEach(function (k) { if (s.plan[k]) s.plan[k].serves = n; }); }); week();
    }
    $('#hhMinus', v).addEventListener('click', function () { setHH(+$('#hhVal', v).value - 1); });
    $('#hhPlus', v).addEventListener('click', function () { setHH(+$('#hhVal', v).value + 1); });
    $('#hhVal', v).addEventListener('change', function () { setHH(+$('#hhVal', v).value); });
    $('#trQ', v).addEventListener('input', U.debounce(trayList, 120));
    $('#plClear', v).addEventListener('click', function () {
      if (!Object.keys(S.get().plan).length) { H.toast('The week is already a blank page.'); return; }
      if (confirm('Clear the whole week?')) { S.set(function (s) { s.plan = {}; }); week(); H.toast('Fresh week, fresh start.'); }
    });
    $('#plSurprise', v).addEventListener('click', function () {
      var mains = H.all().filter(function (r) { return r.tags.indexOf('main') > -1 || !r.builtIn; }), used = {}, n = 0;
      S.set(function (s) {
        H.DAYS.forEach(function (d, i) {
          var k = i + '-d'; if (s.plan[k]) return;
          var pick; do { pick = mains[Math.floor(Math.random() * mains.length)]; } while (used[pick.id] && Object.keys(used).length < mains.length);
          used[pick.id] = 1; s.plan[k] = { id: pick.id, serves: s.planServes || 2 }; n++;
        });
      });
      week(); H.toast(n ? n + ' dinners sorted. You\'re welcome.' : 'Every dinner is already planned. Impressive.');
    });
    trayList(); week();
  };

  /* ---------- Shopping list ---------- */
  H.buildShopping = function () {
    var st = S.get(), items = {}, meals = [];
    Object.keys(st.plan).forEach(function (k) {
      var p = st.plan[k], r = p && H.find(p.id); if (!r) return;
      meals.push(r.title); var f = (p.serves || r.serves) / r.serves;
      r.ing.forEach(function (l) {
        var x = U.parseIng(l), name = U.shopName(x.name);
        if (/^(water|boiling water|warm water|lukewarm water|ice-cold water|hot water)$/i.test(name)) return;
        var unit = x.unit, q = x.qty == null ? null : x.qty * f;
        if (unit === 'kg') { unit = 'g'; q *= 1000; } if (unit === 'l') { unit = 'ml'; q *= 1000; }
        var key = name.toLowerCase() + '|' + (q == null ? 'tt' : unit);
        if (!items[key]) items[key] = { key: key, name: name, unit: unit, qty: q == null ? null : 0, aisle: U.aisle(x.name), from: [] };
        if (q != null) items[key].qty += q;
        if (items[key].from.indexOf(r.title) < 0) items[key].from.push(r.title);
      });
    });
    return { items: Object.keys(items).map(function (k) { return items[k]; }), meals: meals };
  };
  function shopAmount(it, units) {
    if (it.qty == null) return 'to taste';
    var q = it.qty, u = it.unit;
    if (units === 'metric') { if (u === 'g' && q >= 1000) { q /= 1000; u = 'kg'; } if (u === 'ml' && q >= 1000) { q /= 1000; u = 'l'; } }
    var c = U.convert(q, u, units, it.name);
    if (!c.unit && c.qty % 1) c.qty = Math.ceil(c.qty * 2) / 2;
    return (U.fmtQty(c.qty, c.unit) + ' ' + U.unitLabel(c.unit, c.qty)).trim();
  }
  H.views.shop = function (v) {
    var st = S.get(), data = H.buildShopping(), units = st.settings.units;
    var groups = {}; data.items.forEach(function (it) { (groups[it.aisle] = groups[it.aisle] || []).push(it); });
    var extra = st.shopExtra || [];
    var total = data.items.length + extra.length;
    v.innerHTML = '<div class="shop print-area" data-print="shop"><div class="page-head"><h1>Shopping list</h1><p class="lead">' + (data.meals.length ? 'For ' + data.meals.length + ' planned meal' + (data.meals.length > 1 ? 's' : '') + ', grouped by aisle so you never double back for the garlic.' : 'Plan a few meals and your list writes itself.') + '</p></div>' +
      '<div class="plan-tools no-print"><button class="btn" id="shShare">' + H.icon('share') + ' Share</button><button class="btn btn-ghost" id="shPrint">' + H.icon('print') + ' Print</button><button class="btn btn-ghost" id="shUncheck">Untick all</button><a class="btn btn-ghost" href="#/plan">' + H.icon('calendar') + ' Edit plan</a></div>' +
      '<form class="token-input paper no-print" id="shAdd"><label class="sr" for="shIn">Add an item</label><input id="shIn" placeholder="Add something else (kitchen roll, coffee, birthday candles…)"><button class="btn">Add</button></form>' +
      (total ? '' : H.empty('Your basket is empty', 'Head to the planner, drop in a few recipes, and come back. We\'ll do the maths.', '<a class="btn" href="#/plan">Open planner</a>')) +
      '<div class="aisles">' + U.AISLE_ORDER.filter(function (a) { return groups[a]; }).map(function (a) {
        return '<section class="aisle paper"><h2>' + esc(a) + '</h2><ul>' + groups[a].sort(function (x, y) { return x.name.localeCompare(y.name); }).map(function (it) {
          var on = !!st.shopChecked[it.key];
          return '<li class="' + (on ? 'done' : '') + '"><label><input type="checkbox" data-k="' + esc(it.key) + '"' + (on ? ' checked' : '') + '><span class="tick" aria-hidden="true">' + H.icon('check', 16) + '</span><span class="nm">' + esc(it.name) + '</span><span class="amt">' + esc(shopAmount(it, units)) + '</span></label><span class="from small" title="' + esc(it.from.join(', ')) + '">' + esc(it.from.length > 1 ? it.from.length + ' recipes' : it.from[0]) + '</span></li>';
        }).join('') + '</ul></section>';
      }).join('') +
      (extra.length ? '<section class="aisle paper"><h2>Also</h2><ul>' + extra.map(function (x, i) {
        return '<li class="' + (x.done ? 'done' : '') + '"><label><input type="checkbox" data-x="' + i + '"' + (x.done ? ' checked' : '') + '><span class="tick" aria-hidden="true">' + H.icon('check', 16) + '</span><span class="nm">' + esc(x.t) + '</span></label><button class="slot-x no-print" data-xr="' + i + '" aria-label="Remove ' + esc(x.t) + '">×</button></li>';
      }).join('') + '</ul></section>' : '') + '</div></div>';
    $$('input[data-k]', v).forEach(function (c) { c.addEventListener('change', function () { S.set(function (s) { if (c.checked) s.shopChecked[c.dataset.k] = 1; else delete s.shopChecked[c.dataset.k]; }); c.closest('li').classList.toggle('done', c.checked); H.audio.tick(); }); });
    $$('input[data-x]', v).forEach(function (c) { c.addEventListener('change', function () { S.set(function (s) { s.shopExtra[+c.dataset.x].done = c.checked; }); c.closest('li').classList.toggle('done', c.checked); }); });
    $$('[data-xr]', v).forEach(function (b) { b.addEventListener('click', function () { S.set(function (s) { s.shopExtra.splice(+b.dataset.xr, 1); }); H.render(false, true); }); });
    $('#shAdd', v).addEventListener('submit', function (e) { e.preventDefault(); var t = $('#shIn', v).value.trim(); if (!t) return; S.set(function (s) { s.shopExtra.push({ t: t, done: false }); }); H.render(false, true); setTimeout(function () { var i = document.getElementById('shIn'); if (i) i.focus(); }, 0); });
    $('#shUncheck', v).addEventListener('click', function () { S.set(function (s) { s.shopChecked = {}; (s.shopExtra || []).forEach(function (x) { x.done = false; }); }); H.render(false, true); });
    $('#shPrint', v).addEventListener('click', function () { H.printMode('shop'); });
    $('#shShare', v).addEventListener('click', function () {
      var lines = ['Hearth shopping list', ''];
      U.AISLE_ORDER.forEach(function (a) { if (!groups[a]) return; lines.push(a.toUpperCase()); groups[a].forEach(function (it) { if (!S.get().shopChecked[it.key]) lines.push('☐ ' + it.name + ' — ' + shopAmount(it, units)); }); lines.push(''); });
      extra.forEach(function (x) { if (!x.done) lines.push('☐ ' + x.t); });
      H.share('Shopping list', lines.join('\n'), '');
    });
  };

  /* ---------- Favourites & your recipes ---------- */
  H.views.favs = function (v) {
    var st = S.get(), favs = st.favs.map(H.find).filter(Boolean), mine = H.userList, notes = Object.keys(st.notes).map(function (k) { return { r: H.find(k), t: st.notes[k] }; }).filter(function (x) { return x.r; });
    v.innerHTML = '<div class="page-head"><h1>Favourites</h1><p class="lead">The recipes you keep coming back to, plus your own creations and notes.</p></div>' +
      (favs.length ? '<div class="grid">' + favs.map(H.card).join('') + '</div>' : H.empty('No favourites yet', 'Tap the heart on any recipe. We promise not to tell the others.', '<a class="btn" href="#/recipes">Find something lovely</a>')) +
      '<div class="section-head"><div><h2>Your recipes</h2><p>Stored privately in this browser, photos and all.</p></div><a class="btn" href="#/add">' + H.icon('plus') + ' Add a recipe</a></div>' +
      (mine.length ? '<div class="grid">' + mine.map(H.card).join('') + '</div>' : '<p class="small">Grandma\'s secret curry? Your famous toastie? Add it and it lives here.</p>') +
      (notes.length ? '<div class="section-head"><div><h2>Your notes</h2></div></div><div class="note-list">' + notes.map(function (n) { return '<a class="note-card paper" href="#/r/' + encodeURIComponent(n.r.id) + '"><b>' + esc(n.r.title) + '</b><span class="hand">' + esc(n.t.slice(0, 160)) + '</span></a>'; }).join('') + '</div>' : '');
    H.bindCards(v);
  };

  /* ---------- Add / edit your own recipe ---------- */
  H.views.add = function (v, route) {
    var editing = route.name === 'edit' ? H.find(route.arg) : null;
    if (route.name === 'edit' && (!editing || editing.builtIn)) { v.innerHTML = H.empty('Can\'t edit that one', 'Only your own recipes can be edited. Add a new one instead?', '<a class="btn" href="#/add">Add recipe</a>'); return; }
    var r = editing || { title: '', cuisine: 'Home', diet: 'veg', serves: 2, time: 30, art: 'bowl', c1: '#d9a441', c2: '#5f8452', ing: [], steps: [], blurb: '', tags: ['main'], hot: true };
    var photo = editing ? editing.photo : null, arts = ['bowl', 'plate', 'pasta', 'rice', 'pan', 'salad', 'taco', 'pizza', 'toast', 'stack', 'cake', 'loaf', 'cookies', 'muffin', 'mug', 'glass', 'jar', 'tray'];
    v.innerHTML = '<div class="page-head"><h1>' + (editing ? 'Edit recipe' : 'Add your own recipe') + '</h1><p class="lead">Family classics welcome. Everything stays on this device.</p></div>' +
      '<form class="add-form" id="aForm" novalidate><div class="add-grid"><div class="paper form-col">' +
      '<label class="field"><span>Recipe name *</span><input id="aTitle" required maxlength="80" value="' + esc(r.title) + '" placeholder="Nani\'s Sunday rajma"></label>' +
      '<label class="field"><span>A line about it</span><input id="aBlurb" maxlength="140" value="' + esc(r.blurb) + '" placeholder="The one everyone asks for."></label>' +
      '<div class="row3"><label class="field"><span>Cuisine</span><input id="aCuisine" maxlength="30" value="' + esc(r.cuisine) + '"></label>' +
      '<label class="field"><span>Serves</span><input id="aServes" type="number" min="1" max="200" value="' + r.serves + '"></label>' +
      '<label class="field"><span>Minutes</span><input id="aTime" type="number" min="1" max="2000" value="' + r.time + '"></label></div>' +
      '<fieldset class="field"><legend>Diet</legend><div class="day-pick">' + ['veg', 'vegan', 'egg', 'non-veg'].map(function (d) { return '<label><input type="radio" name="aDiet" value="' + d + '"' + (r.diet === d ? ' checked' : '') + '><span>' + U.DIETS[d].label + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="field"><legend>Tags</legend><div class="day-pick">' + [['main', 'Main'], ['breakfast', 'Breakfast'], ['dessert', 'Dessert'], ['baking', 'Baking'], ['side', 'Side'], ['snack', 'Snack']].map(function (t) { return '<label><input type="checkbox" name="aTag" value="' + t[0] + '"' + (r.tags.indexOf(t[0]) > -1 ? ' checked' : '') + '><span>' + t[1] + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<label class="field"><span>Ingredients * — one per line, amount first</span><textarea id="aIng" rows="8" placeholder="200 g basmati rice&#10;1 1/2 tsp cumin seeds&#10;2 cloves garlic, sliced&#10;salt, to taste">' + esc(r.ing.join('\n')) + '</textarea></label>' +
      '<label class="field"><span>Method * — one step per line</span><textarea id="aSteps" rows="8" placeholder="Rinse the rice until the water runs clear.&#10;Simmer for 12 minutes…">' + esc(r.steps.join('\n')) + '</textarea></label>' +
      '<p class="small">Mention times like “simmer for 10 minutes” and cook mode will offer a timer.</p></div>' +
      '<div class="form-col"><div class="paper"><h3>' + H.icon('camera') + ' Photo</h3><label class="photo-drop" id="aDrop"><input id="aPhoto" type="file" accept="image/*"><span id="aPhotoTxt">' + (photo ? 'Photo added — tap to change' : 'Tap to add a photo (optional)') + '</span></label>' +
      (photo ? '<button type="button" class="link-btn" id="aPhotoRm">Remove photo</button>' : '') +
      '<h3>Or pick an illustration</h3><label class="field"><span>Dish style</span><select id="aArt">' + arts.map(function (a) { return '<option' + (a === r.art ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></label>' +
      '<div class="row3"><label class="field"><span>Food colour</span><input id="aC1" type="color" value="' + r.c1 + '"></label><label class="field"><span>Garnish</span><input id="aC2" type="color" value="' + r.c2 + '"></label><label class="switch"><input type="checkbox" id="aHot"' + (r.hot ? ' checked' : '') + '><span></span> Steamy</label></div></div>' +
      '<div class="preview"><p class="small">Preview</p><div class="grid one" id="aPrev"></div></div>' +
      '<div class="form-actions"><button class="btn btn-big" type="submit">' + H.icon('check') + (editing ? ' Save changes' : ' Save recipe') + '</button>' + (editing ? '<button type="button" class="btn btn-ghost danger" id="aDel">' + H.icon('trash') + ' Delete</button>' : '') + '</div>' +
      '<p class="form-err" id="aErr" role="alert"></p></div></div></form>';
    var prevURL = null;
    function current() {
      var tags = $$('input[name=aTag]:checked', v).map(function (x) { return x.value; });
      return { id: editing ? editing.id : 'preview', title: $('#aTitle', v).value.trim() || 'Untitled delight', blurb: $('#aBlurb', v).value.trim(), cuisine: $('#aCuisine', v).value.trim() || 'Home',
        diet: ($('input[name=aDiet]:checked', v) || {}).value || 'veg', serves: Math.max(1, +$('#aServes', v).value || 2), time: Math.max(1, +$('#aTime', v).value || 30),
        art: $('#aArt', v).value, c1: $('#aC1', v).value, c2: $('#aC2', v).value, hot: $('#aHot', v).checked, tags: tags,
        ing: $('#aIng', v).value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), steps: $('#aSteps', v).value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), builtIn: false };
    }
    function preview() {
      var c = current(); c.yieldNoun = 'servings'; c.nut = U.estimateNutrition(c.ing, c.serves);
      var html = H.card(c, 0);
      if (photo) { if (prevURL) URL.revokeObjectURL(prevURL); prevURL = URL.createObjectURL(photo); html = html.replace(/<svg class="art"[\s\S]*?<\/svg>/, '<img class="art photo" src="' + prevURL + '" alt="">'); }
      $('#aPrev', v).innerHTML = html; var fb = $('#aPrev .fav-btn', v); if (fb) fb.remove();
      $('#aPrev .card-link', v).addEventListener('click', function (e) { e.preventDefault(); });
    }
    $('#aForm', v).addEventListener('input', U.debounce(preview, 150));
    $('#aForm', v).addEventListener('change', U.debounce(preview, 50));
    $('#aPhoto', v).addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      $('#aPhotoTxt', v).textContent = 'Preparing photo…';
      S.prepPhoto(f).then(function (b) { photo = b; $('#aPhotoTxt', v).textContent = b ? 'Photo added — tap to change' : 'That image could not be read.'; preview(); });
    });
    var rm = $('#aPhotoRm', v); if (rm) rm.addEventListener('click', function () { photo = null; rm.remove(); $('#aPhotoTxt', v).textContent = 'Tap to add a photo (optional)'; preview(); });
    $('#aForm', v).addEventListener('submit', function (e) {
      e.preventDefault(); var c = current(), err = [];
      if (!$('#aTitle', v).value.trim()) err.push('a name');
      if (!c.ing.length) err.push('at least one ingredient');
      if (!c.steps.length) err.push('at least one step');
      if (err.length) { $('#aErr', v).textContent = 'Almost! Please add ' + err.join(', ') + '.'; return; }
      c.id = editing ? editing.id : 'u-' + U.slug(c.title) + '-' + Date.now().toString(36);
      c.photo = photo || null; c.created = editing ? editing.created : Date.now(); c.updated = Date.now();
      c.nut = U.estimateNutrition(c.ing, c.serves); c.yieldNoun = 'servings';
      S.putRecipe(c).then(H.refreshUser).then(function () { H.toast(editing ? 'Changes saved.' : 'Recipe saved. It\'s officially a family classic.'); H.go('#/r/' + encodeURIComponent(c.id)); })
        .catch(function () { $('#aErr', v).textContent = 'Could not save — your browser storage may be full or disabled.'; });
    });
    var del = $('#aDel', v);
    if (del) del.addEventListener('click', function () {
      if (!confirm('Delete “' + editing.title + '”? This can\'t be undone.')) return;
      S.deleteRecipe(editing.id).then(H.refreshUser).then(function () { S.set(function (s) { var i = s.favs.indexOf(editing.id); if (i > -1) s.favs.splice(i, 1); delete s.notes[editing.id]; }); H.toast('Recipe deleted.'); H.go('#/favs'); });
    });
    preview();
  };

  /* ---------- Settings / data ---------- */
  H.views.settings = function (v) {
    var st = S.get();
    v.innerHTML = '<div class="page-head"><h1>Your kitchen drawer</h1><p class="lead">Hearth has no accounts and no servers. Your favourites, notes, plans and recipes live in this browser — back them up here.</p></div>' +
      '<div class="settings-grid"><section class="paper"><h2>Back up &amp; restore</h2><p>Download everything (including your photos) as a single JSON file, or bring a backup into this device.</p>' +
      '<div class="modal-actions"><button class="btn" id="sExport">Export my data</button><label class="btn btn-ghost file-btn">Import a backup<input type="file" id="sImport" accept="application/json,.json"></label></div><p class="small" id="sMsg" aria-live="polite"></p></section>' +
      '<section class="paper"><h2>Preferences</h2><label class="switch"><input type="checkbox" id="sVoice"' + (st.settings.voice !== false ? ' checked' : '') + '><span></span> Offer read-aloud in cook mode</label>' +
      '<label class="switch"><input type="checkbox" id="sSound"' + (st.settings.sound ? ' checked' : '') + '><span></span> Kitchen sounds (chimes, sizzle &amp; bubbles)</label>' +
      '<p class="small">Units and theme live in the header, always within reach of floury fingers.</p></section>' +
      '<section class="paper"><h2>Start over</h2><p>Wipe favourites, notes, plans and your own recipes from this browser.</p><button class="btn btn-ghost danger" id="sReset">' + H.icon('trash') + ' Reset everything</button></section></div>';
    var msg = $('#sMsg', v);
    $('#sExport', v).addEventListener('click', function () {
      msg.textContent = 'Packing the picnic basket…';
      S.exportAll().then(function (json) { U.download('hearth-backup-' + new Date().toISOString().slice(0, 10) + '.json', json); msg.textContent = 'Backup downloaded. Keep it somewhere safe (not the oven).'; })
        .catch(function () { msg.textContent = 'Export failed. Please try again.'; });
    });
    $('#sImport', v).addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { S.importAll(fr.result).then(function (n) { return H.refreshUser().then(function () { msg.textContent = 'Imported! ' + n + ' of your own recipe' + (n === 1 ? '' : 's') + ' restored.'; H.setTheme(S.get().settings.theme); H.setUnits(S.get().settings.units); }); }).catch(function (er) { msg.textContent = 'Import failed: ' + er.message; }); }
        catch (er) { msg.textContent = 'That file could not be read: ' + er.message; }
      };
      fr.readAsText(f);
    });
    $('#sVoice', v).addEventListener('change', function (e) { S.set(function (s) { s.settings.voice = e.target.checked; }); });
    $('#sSound', v).addEventListener('change', function (e) { H.setSound(e.target.checked); if (e.target.checked) H.audio.chime(true); });
    $('#sReset', v).addEventListener('click', function () {
      if (!confirm('Really wipe all your Hearth data on this device? Export first if unsure.')) return;
      S.resetAll().then(H.refreshUser).then(function () { H.setTheme('linen'); H.setUnits('metric'); H.setSound(false); H.toast('Clean slate. Smells like lemon.'); H.go('#/'); });
    });
  };

  /* ---------- About ---------- */
  H.views.about = function (v) {
    v.innerHTML = '<div class="about"><div class="page-head"><p class="eyebrow hand">about the kitchen</p><h1>Hearth is a quiet place to cook.</h1>' +
      '<p class="lead">No pop-ups, no life stories before the recipe, no sign-up. Just sixty well-tested home recipes, honest quantities, and tools that help when your hands are covered in flour.</p></div>' +
      '<div class="settings-grid"><section class="paper"><h2>What\'s inside</h2><ul class="tick-list"><li>Servings scaler with proper fractions (½, ⅓, ¾ — never 0.333)</li><li>Metric ↔ US units, temperatures included</li><li>Cook mode: big text, screen stays awake, read-aloud, multiple timers</li><li>Pantry search, weekly planner and an aisle-sorted shopping list</li><li>Your own recipes and photos, stored privately on your device</li></ul></section>' +
      '<section class="paper"><h2>Made by</h2><p><b>Designed &amp; built by Kumar Nikhil.</b> Hand-written code, hand-drawn icons, and illustrations generated from code — no stock photos were harmed.</p>' +
      '<p class="about-links"><a class="btn" href="https://kumarnikhildeveloperaccount.github.io/" target="_blank" rel="noopener">Portfolio</a> <a class="btn btn-ghost" href="https://www.linkedin.com/in/kumar-nikhil-1000a9192/" target="_blank" rel="noopener">LinkedIn</a> <a class="btn btn-ghost" href="mailto:nkashyapnikhilnk@gmail.com">Email</a></p>' +
      '<p><a href="https://kumarnikhildeveloperaccount.github.io/" target="_blank" rel="noopener">More projects by Kumar Nikhil →</a></p></section>' +
      '<section class="paper"><h2>A small note</h2><p>Nutrition numbers are approximate. Recipes are original and written for home kitchens; ovens vary, so trust your nose.</p><p class="hand">With gratitude to God — Om Namah Paarvati Pateh, Har Har Mahadev. May God bless you and everyone.</p></section></div></div>';
  };

  H.views.notFound = function (v) {
    v.innerHTML = H.empty('This pot is empty', 'We couldn\'t find that page. Maybe it boiled away?', '<a class="btn" href="#/">Back to the kitchen</a>');
  };
})();

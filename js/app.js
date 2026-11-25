/* Hearth core: init, router, shared UI, home, browse, recipe detail */
(function () {
  var U = H.util, S = H.store, $ = U.$, $$ = U.$$, esc = U.esc;
  H.views = {};
  H.userList = [];
  var photoURLs = {};

  /* ---------- Recipes ---------- */
  H.all = function () { return H.userList.concat(H.recipes); };
  H.find = function (id) { return H.all().filter(function (r) { return r.id === id; })[0]; };
  H.photoURL = function (r) {
    if (!r || !r.photo) return '';
    if (!photoURLs[r.id]) { try { photoURLs[r.id] = URL.createObjectURL(r.photo); } catch (e) { return ''; } }
    return photoURLs[r.id];
  };
  H.refreshUser = function () {
    Object.keys(photoURLs).forEach(function (k) { URL.revokeObjectURL(photoURLs[k]); }); photoURLs = {};
    return S.userRecipes().then(function (l) { H.userList = l.map(normalizeUser); });
  };
  function normalizeUser(r) {
    r.tags = r.tags || []; r.ing = r.ing || []; r.steps = r.steps || []; r.serves = +r.serves || 2; r.time = +r.time || 30;
    r.nut = r.nut || U.estimateNutrition(r.ing, r.serves); r.yieldNoun = r.yieldNoun || 'servings'; r.art = r.art || 'bowl';
    r.c1 = r.c1 || '#d9a441'; r.c2 = r.c2 || '#5f8452'; r.cuisine = r.cuisine || 'Home'; r.builtIn = false; return r;
  }
  H.media = function (r, opt) {
    var p = H.photoURL(r);
    if (p) return '<img class="art photo" src="' + p + '" alt="Photo of ' + esc(r.title) + '" loading="lazy">';
    return H.art(r, opt);
  };

  /* ---------- Toast & modal ---------- */
  var toastT;
  H.toast = function (msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2800);
  };
  H.modal = function (title, body, mount) {
    var last = document.activeElement, wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdlT"><button class="icon-btn modal-x" aria-label="Close">' + H.icon('close') + '</button><h2 id="mdlT">' + esc(title) + '</h2>' + body + '</div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('open'); });
    function close() {
      wrap.classList.remove('open'); document.removeEventListener('keydown', key);
      setTimeout(function () { wrap.remove(); }, 250); if (last && last.focus) last.focus();
    }
    function key(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        var f = $$('button,a,input,select,textarea', wrap).filter(function (x) { return !x.disabled; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener('keydown', key);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    $('.modal-x', wrap).addEventListener('click', close);
    var api = { el: wrap, close: close };
    if (mount) mount(api);
    var first = $('.modal input, .modal select, .modal button:not(.modal-x)', wrap); (first || $('.modal-x', wrap)).focus();
    return api;
  };

  /* ---------- Shared pieces ---------- */
  H.dietBadge = function (d) { var x = U.DIETS[d] || U.DIETS.veg; return '<span class="diet diet-' + x.cls + '" title="' + x.label + '"><i aria-hidden="true"></i>' + x.short + '</span>'; };
  H.card = function (r, i) {
    var fav = S.isFav(r.id);
    return '<article class="card" style="--i:' + (i || 0) + '" data-id="' + esc(r.id) + '">' +
      '<a class="card-link" href="#/r/' + encodeURIComponent(r.id) + '">' +
      '<div class="card-art">' + H.media(r) + H.dietBadge(r.diet) + (r.time <= 15 ? '<span class="quick-tag">' + H.icon('flame', 14) + ' 15-min</span>' : '') + '</div>' +
      '<div class="card-body"><p class="kicker">' + esc(r.cuisine) + ' · ' + U.fmtTime(r.time) + '</p><h3>' + esc(r.title) + '</h3><p class="blurb">' + esc(r.blurb || '') + '</p></div></a>' +
      '<button class="fav-btn' + (fav ? ' on' : '') + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remove from' : 'Save to') + ' favourites: ' + esc(r.title) + '">' + H.icon('heart', 22) + '</button></article>';
  };
  H.bindCards = function (root) {
    $$('.fav-btn', root).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var id = b.closest('.card').dataset.id, on = S.toggleFav(id);
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.classList.remove('burst'); void b.offsetWidth; b.classList.add('burst');
        H.audio.pop(); H.toast(on ? 'Saved to favourites. Good taste.' : 'Removed from favourites.');
        if (H.route.name === 'favs') H.render(false, true);
      });
    });
    if (document.documentElement.classList.contains('lowpower')) return;
    $$('.card', root).forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var b = c.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
        c.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg'); c.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
        c.style.setProperty('--mx', ((x + 0.5) * 100).toFixed(0) + '%'); c.style.setProperty('--my', ((y + 0.5) * 100).toFixed(0) + '%');
      });
      c.addEventListener('pointerleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
  };
  H.empty = function (title, text, cta) {
    return '<div class="empty"><div class="empty-art" aria-hidden="true">' + H.art({ id: 'empty' + title, title: title, art: 'bowl', c1: '#efe2c8', c2: '#c8643b', hot: true }) + '</div><h2>' + esc(title) + '</h2><p>' + text + '</p>' + (cta || '') + '</div>';
  };

  /* ---------- Router ---------- */
  H.route = { name: 'home', params: {} };
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ''), q = {}, parts = h.split('?');
    if (parts[1]) parts[1].split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); });
    var seg = parts[0].split('/').filter(Boolean);
    return { name: seg[0] || 'home', arg: seg[1] ? decodeURIComponent(seg[1]) : '', q: q };
  }
  var first = true;
  H.render = function (animate, keepScroll) {
    var r = parseHash(); H.route = { name: r.name, arg: r.arg, q: r.q };
    var fn = { home: H.views.home, recipes: H.views.recipes, r: H.views.detail, pantry: H.views.pantry, plan: H.views.plan, shop: H.views.shop,
      favs: H.views.favs, add: H.views.add, edit: H.views.add, settings: H.views.settings, about: H.views.about }[r.name] || H.views.notFound;
    var main = $('#view'), v = document.createElement('div');
    v.className = 'view' + (animate && !first ? ' curl-in' : '');
    main.innerHTML = ''; main.appendChild(v);
    try { fn(v, r); } catch (e) { v.innerHTML = H.empty('Something boiled over', 'That page hit a snag. Try going back home.', '<a class="btn" href="#/">Back home</a>'); if (window.console) console.warn(e); }
    $$('.main-nav a').forEach(function (a) { var on = a.dataset.nav === r.name || (r.name === 'r' && a.dataset.nav === 'recipes'); a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#footQuip').textContent = U.quip();
    if (!first && !keepScroll) window.scrollTo(0, 0);
    first = false;
    closeNav();
  };
  H.go = function (hash) { if (location.hash === hash) H.render(true); else location.hash = hash; };

  /* ---------- Home ---------- */
  H.views.home = function (v) {
    var all = H.recipes, day = Math.floor(Date.now() / 864e5), hero = all[day % all.length];
    var quick = all.filter(function (r) { return r.time <= 15; }).slice(0, 4);
    var hour = new Date().getHours(), greet = hour < 11 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var mealHint = hour < 11 ? 'breakfast' : 'dinner';
    var picks = all.filter(function (r) { return hour < 11 ? r.tags.indexOf('breakfast') > -1 : r.tags.indexOf('main') > -1; });
    picks = picks.sort(function (a, b) { return U.hash(a.id + day) - U.hash(b.id + day); }).slice(0, 4);
    v.innerHTML =
      '<section class="hero">' +
      '<div class="hero-copy"><p class="eyebrow hand">' + greet + ', cook.</p><h1>Everyday food,<br><em>cooked with care.</em></h1>' +
      '<p class="lead">Sixty honest home recipes, a planner that fits your week, and a cook mode with big text, timers and a voice that reads the steps aloud. Measure twice, taste always.</p>' +
      '<form class="hero-search" role="search" id="heroSearch"><label class="sr" for="heroQ">Search recipes</label>' + H.icon('search') +
      '<input id="heroQ" type="search" placeholder="Search dal, pasta, pancakes…" autocomplete="off"><button class="btn">Find</button></form>' +
      '<div class="chip-row" aria-label="Browse by category">' + U.CATS.slice(1).map(function (c) { return '<a class="chip" href="#/recipes?cat=' + encodeURIComponent(c.key) + '">' + esc(c.label) + '</a>'; }).join('') + '</div></div>' +
      '<a class="hero-art" href="#/r/' + hero.id + '" aria-label="Today\'s recipe: ' + esc(hero.title) + '"><div class="hero-plate">' + H.art(hero) + '</div>' +
      '<div class="hero-tag"><span class="hand">today\'s idea</span><b>' + esc(hero.title) + '</b><small>' + U.fmtTime(hero.time) + ' · ' + U.DIETS[hero.diet].label + '</small></div></a>' +
      '</section>' +
      '<section><div class="section-head"><div><h2>Ideas for ' + mealHint + '</h2><p>Shuffled daily, like a good friend\'s fridge.</p></div><a class="link-more" href="#/recipes">All 60 recipes →</a></div>' +
      '<div class="grid">' + picks.map(H.card).join('') + '</div></section>' +
      '<section class="band"><div class="band-inner"><div><h2>What\'s in your fridge?</h2><p>Tell us what you have — we\'ll find what you can cook, and what you\'re missing.</p><a class="btn" href="#/pantry">' + H.icon('basket') + ' Pantry search</a></div>' +
      '<div><h2>Plan the week, shop once.</h2><p>Drag recipes into your week (or tap to place them). The shopping list sorts itself by aisle.</p><a class="btn btn-ghost" href="#/plan">' + H.icon('calendar') + ' Open planner</a></div></div></section>' +
      '<section><div class="section-head"><div><h2>15-minute rescues</h2><p>For evenings that got away from you.</p></div><a class="link-more" href="#/recipes?cat=quick">More quick food →</a></div>' +
      '<div class="grid">' + quick.map(H.card).join('') + '</div></section>';
    $('#heroSearch', v).addEventListener('submit', function (e) { e.preventDefault(); H.go('#/recipes?q=' + encodeURIComponent($('#heroQ', v).value)); });
    H.bindCards(v);
  };

  /* ---------- Browse ---------- */
  H.views.recipes = function (v, r) {
    var cat = r.q.cat || 'all', q = r.q.q || '', diet = r.q.diet || 'any', max = r.q.max || 'any', sort = r.q.sort || 'az';
    v.innerHTML = '<div class="page-head"><h1>Recipes</h1><p class="lead">Sixty home-cooked favourites' + (H.userList.length ? ' plus ' + H.userList.length + ' of your own' : '') + '. Find your dinner.</p></div>' +
      '<div class="filters" role="search">' +
      '<label class="field search-field"><span class="sr">Search</span>' + H.icon('search') + '<input id="fQ" type="search" placeholder="Search by name or ingredient" value="' + esc(q) + '"></label>' +
      '<label class="field"><span>Diet</span><select id="fDiet"><option value="any">Any</option><option value="veg">Vegetarian (incl. vegan)</option><option value="vegan">Vegan</option><option value="egg">Contains egg</option><option value="non-veg">Non-veg</option></select></label>' +
      '<label class="field"><span>Time</span><select id="fMax"><option value="any">Any time</option><option value="15">≤ 15 min</option><option value="30">≤ 30 min</option><option value="60">≤ 1 hour</option></select></label>' +
      '<label class="field"><span>Sort</span><select id="fSort"><option value="az">A–Z</option><option value="time">Quickest</option><option value="kcal">Lightest</option></select></label></div>' +
      '<div class="chip-row" id="fCats" role="tablist" aria-label="Categories">' + U.CATS.map(function (c) { return '<button class="chip' + (c.key === cat ? ' on' : '') + '" role="tab" aria-selected="' + (c.key === cat) + '" data-cat="' + c.key + '">' + c.label + '</button>'; }).join('') + '</div>' +
      '<p class="count small" id="fCount" aria-live="polite"></p><div class="grid" id="fGrid"></div>';
    $('#fDiet', v).value = diet; $('#fMax', v).value = max; $('#fSort', v).value = sort;
    function apply() {
      var t = $('#fQ', v).value.trim().toLowerCase(), d = $('#fDiet', v).value, m = $('#fMax', v).value, so = $('#fSort', v).value;
      var list = H.all().filter(function (x) {
        if (!U.inCat(x, cat)) return false;
        if (d === 'veg' && !(x.diet === 'veg' || x.diet === 'vegan')) return false;
        if (d !== 'any' && d !== 'veg' && x.diet !== d) return false;
        if (m !== 'any' && x.time > +m) return false;
        if (t) { var hay = (x.title + ' ' + x.cuisine + ' ' + x.ing.join(' ') + ' ' + x.tags.join(' ')).toLowerCase(); return t.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; }); }
        return true;
      });
      list.sort(function (a, b) { return so === 'time' ? a.time - b.time : so === 'kcal' ? a.nut.kcal - b.nut.kcal : a.title.localeCompare(b.title); });
      $('#fCount', v).textContent = list.length ? list.length + ' recipe' + (list.length > 1 ? 's' : '') + ' — ' + (list.length > 20 ? 'that\'s a lot of dinners.' : 'pick one, put the kettle on.') : '';
      $('#fGrid', v).innerHTML = list.length ? list.map(H.card).join('') : '<div class="span-all">' + H.empty('Nothing in this pot', 'No recipes match those filters. Try fewer, or fewer chillies.', '<button class="btn" id="fReset">Clear filters</button>') + '</div>';
      H.bindCards($('#fGrid', v));
      var rs = $('#fReset', v); if (rs) rs.addEventListener('click', function () { H.go('#/recipes'); });
      var qs = []; if (cat !== 'all') qs.push('cat=' + encodeURIComponent(cat)); if (t) qs.push('q=' + encodeURIComponent(t)); if (d !== 'any') qs.push('diet=' + d); if (m !== 'any') qs.push('max=' + m); if (so !== 'az') qs.push('sort=' + so);
      try { history.replaceState(null, '', '#/recipes' + (qs.length ? '?' + qs.join('&') : '')); } catch (e) { /* file:// in some browsers */ }
    }
    $('#fQ', v).addEventListener('input', U.debounce(apply, 120));
    ['#fDiet', '#fMax', '#fSort'].forEach(function (s) { $(s, v).addEventListener('change', apply); });
    $$('#fCats .chip', v).forEach(function (b) {
      b.addEventListener('click', function () {
        cat = b.dataset.cat; $$('#fCats .chip', v).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); apply();
      });
    });
    apply();
  };

  /* ---------- Recipe detail ---------- */
  H.views.detail = function (v, route) {
    var r = H.find(route.arg);
    if (!r) { v.innerHTML = H.empty('Recipe not found', 'This one may have been eaten. Let\'s find you another.', '<a class="btn" href="#/recipes">Browse recipes</a>'); return; }
    var st = S.get(), serves = st.servings[r.id] || r.serves, units = st.settings.units;
    var fav = S.isFav(r.id), checks = st.checks[r.id] || [];
    v.innerHTML =
      '<article class="recipe print-area" data-print="recipe">' +
      '<nav class="crumbs small" aria-label="Breadcrumb"><a href="#/recipes">Recipes</a> / <a href="#/recipes?cat=' + encodeURIComponent(r.cuisine) + '">' + esc(r.cuisine) + '</a></nav>' +
      '<header class="recipe-head"><div class="recipe-art">' + H.media(r) + '</div>' +
      '<div class="recipe-intro"><p class="eyebrow hand">' + esc(r.cuisine) + (r.builtIn ? '' : ' · your recipe') + '</p><h1>' + esc(r.title) + '</h1><p class="lead">' + esc(r.blurb || '') + '</p>' +
      '<ul class="meta"><li>' + H.icon('clock') + U.fmtTime(r.time) + '</li><li>' + H.icon('users') + r.serves + ' ' + esc(r.yieldNoun) + '</li><li>' + H.dietBadge(r.diet) + '</li></ul>' +
      '<div class="actions no-print"><button class="btn btn-big" id="dCook">' + H.icon('pot') + ' Start cook mode</button>' +
      '<button class="icon-btn fav-solo' + (fav ? ' on' : '') + '" id="dFav" aria-pressed="' + fav + '" aria-label="Favourite">' + H.icon('heart', 22) + '</button>' +
      '<button class="icon-btn" id="dPlan" aria-label="Add to meal plan" title="Add to plan">' + H.icon('calendar') + '</button>' +
      '<button class="icon-btn" id="dPrint" aria-label="Print recipe card" title="Print">' + H.icon('print') + '</button>' +
      '<button class="icon-btn" id="dShare" aria-label="Share recipe" title="Share">' + H.icon('share') + '</button>' +
      (r.builtIn ? '' : '<a class="icon-btn" href="#/edit/' + encodeURIComponent(r.id) + '" aria-label="Edit recipe" title="Edit">' + H.icon('note') + '</a>') + '</div></div></header>' +
      '<div class="recipe-body"><section class="ingredients paper" aria-labelledby="ingH"><div class="ing-top"><h2 id="ingH">Ingredients</h2>' +
      '<div class="scaler no-print" role="group" aria-label="Servings"><button class="icon-btn" id="sMinus" aria-label="Fewer servings">−</button><label><span class="sr">Servings</span><input id="sVal" type="number" inputmode="numeric" min="1" max="200" value="' + serves + '"></label><button class="icon-btn" id="sPlus" aria-label="More servings">+</button><span class="small">' + esc(r.yieldNoun) + '</span></div></div>' +
      '<div class="unit-switch no-print" role="radiogroup" aria-label="Units"><button role="radio" data-u="metric" aria-checked="' + (units === 'metric') + '">Metric</button><button role="radio" data-u="us" aria-checked="' + (units === 'us') + '">US cups</button></div>' +
      '<ul class="ing-list" id="ingList"></ul><p class="small no-print"><button class="link-btn" id="ingClear">Uncheck all</button> · Tick things off as you gather them.</p>' +
      '<div class="nutrition"><h3>Nutrition <span class="approx">approximate, per serving</span></h3><dl>' +
      '<div><dt>Energy</dt><dd>' + r.nut.kcal + ' kcal</dd></div><div><dt>Protein</dt><dd>' + r.nut.p + ' g</dd></div><div><dt>Carbs</dt><dd>' + r.nut.c + ' g</dd></div><div><dt>Fat</dt><dd>' + r.nut.f + ' g</dd></div></dl>' +
      '<p class="small">A rough estimate from typical ingredient values. Not medical or dietary advice.</p></div></section>' +
      '<section class="method" aria-labelledby="methH"><h2 id="methH">Method</h2><ol class="steps" id="stepList"></ol>' +
      '<div class="notes paper no-print-empty"><h3>' + H.icon('note') + ' My notes</h3><label class="sr" for="dNote">Personal notes</label><textarea id="dNote" rows="4" placeholder="Less chilli next time? Doubled the garlic? Write it here — it saves itself.">' + esc(st.notes[r.id] || '') + '</textarea><p class="small" id="noteSaved" aria-live="polite"></p></div></section></div>' +
      '<p class="print-foot">Hearth · ' + esc(r.title) + ' · Measure twice, taste always.</p></article>';

    function draw() {
      var n = Math.max(1, Math.min(200, parseInt($('#sVal', v).value, 10) || r.serves)), f = n / r.serves, u = S.get().settings.units;
      $('#ingList', v).innerHTML = r.ing.map(function (line, i) {
        var x = U.renderIng(line, f, u), on = checks.indexOf(i) > -1;
        return '<li class="' + (on ? 'done' : '') + '"><label><input type="checkbox" data-i="' + i + '"' + (on ? ' checked' : '') + '><span class="tick" aria-hidden="true">' + H.icon('check', 16) + '</span><span class="amt">' + esc(x.amount) + '</span> <span class="nm">' + esc(x.name) + '</span></label></li>';
      }).join('');
      $('#stepList', v).innerHTML = r.steps.map(function (s, i) {
        var txt = U.convertStep(s, u), tm = U.findTimers(s);
        return '<li><span class="num" aria-hidden="true">' + (i + 1) + '</span><p>' + esc(txt) + '</p>' + (tm.length ? '<div class="step-timers no-print">' + tm.map(function (t) { return '<button class="chip timer-chip" data-secs="' + t.secs + '" data-label="' + esc(r.title + ' · step ' + (i + 1)) + '">' + H.icon('timer', 16) + ' ' + esc(t.label) + '</button>'; }).join('') + '</div>' : '') + '</li>';
      }).join('');
      $$('#ingList input', v).forEach(function (c) {
        c.addEventListener('change', function () {
          var i = +c.dataset.i, k = checks.indexOf(i);
          if (c.checked && k < 0) checks.push(i); if (!c.checked && k > -1) checks.splice(k, 1);
          c.closest('li').classList.toggle('done', c.checked); S.set(function (s) { s.checks[r.id] = checks.slice(); }); H.audio.tick();
          if (checks.length === r.ing.length) H.toast('Everything gathered. Mise en place, chef!');
        });
      });
      $$('.timer-chip', v).forEach(function (b) { b.addEventListener('click', function () { H.timers.add(+b.dataset.secs, b.dataset.label); }); });
    }
    function setServes(n) { n = Math.max(1, Math.min(200, n)); $('#sVal', v).value = n; S.set(function (s) { s.servings[r.id] = n; }); draw(); }
    $('#sMinus', v).addEventListener('click', function () { setServes((parseInt($('#sVal', v).value, 10) || 1) - 1); });
    $('#sPlus', v).addEventListener('click', function () { setServes((parseInt($('#sVal', v).value, 10) || 1) + 1); });
    $('#sVal', v).addEventListener('change', function () { setServes(parseInt($('#sVal', v).value, 10) || r.serves); });
    $$('.unit-switch button', v).forEach(function (b) { b.addEventListener('click', function () { H.setUnits(b.dataset.u); $$('.unit-switch button', v).forEach(function (x) { x.setAttribute('aria-checked', x === b); }); draw(); }); });
    $('#ingClear', v).addEventListener('click', function () { checks = []; S.set(function (s) { s.checks[r.id] = []; }); draw(); });
    $('#dNote', v).addEventListener('input', U.debounce(function () { var t = $('#dNote', v).value; S.set(function (s) { if (t.trim()) s.notes[r.id] = t; else delete s.notes[r.id]; }); $('#noteSaved', v).textContent = 'Saved on this device.'; }, 400));
    $('#dFav', v).addEventListener('click', function () { var b = $('#dFav', v), on = S.toggleFav(r.id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.classList.remove('burst'); void b.offsetWidth; b.classList.add('burst'); H.audio.pop(); H.toast(on ? 'Saved to favourites.' : 'Removed from favourites.'); });
    $('#dPlan', v).addEventListener('click', function () { H.addToPlanDialog(r, parseInt($('#sVal', v).value, 10) || r.serves); });
    $('#dPrint', v).addEventListener('click', function () { H.printMode('recipe'); });
    $('#dShare', v).addEventListener('click', function () { H.share(r.title + ' — a Hearth recipe', r.blurb || '', location.href); });
    $('#dCook', v).addEventListener('click', function () { H.cook.open(r, parseInt($('#sVal', v).value, 10) || r.serves); });
    draw();
  };

  /* ---------- Plan dialog (shared with views.js) ---------- */
  H.DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  H.MEALS = [['b', 'Breakfast'], ['l', 'Lunch'], ['d', 'Dinner']];
  H.addToPlanDialog = function (r, serves) {
    var today = (new Date().getDay() + 6) % 7, defMeal = r.tags.indexOf('breakfast') > -1 ? 'b' : 'd';
    H.modal('Add to your week', '<p class="small">“' + esc(r.title) + '” for ' + serves + '. Pick a slot:</p>' +
      '<div class="day-pick" role="radiogroup" aria-label="Day">' + H.DAYS.map(function (d, i) { return '<label><input type="radio" name="pd" value="' + i + '"' + (i === today ? ' checked' : '') + '><span>' + d.slice(0, 3) + '</span></label>'; }).join('') + '</div>' +
      '<div class="day-pick meal" role="radiogroup" aria-label="Meal">' + H.MEALS.map(function (m) { return '<label><input type="radio" name="pm" value="' + m[0] + '"' + (m[0] === defMeal ? ' checked' : '') + '><span>' + m[1] + '</span></label>'; }).join('') + '</div>' +
      '<div class="modal-actions"><button class="btn" id="pdSave">' + H.icon('calendar') + ' Add to plan</button><a class="btn btn-ghost" href="#/plan" id="pdOpen">Open planner</a></div>',
      function (m) {
        $('#pdSave', m.el).addEventListener('click', function () {
          var d = $('input[name=pd]:checked', m.el).value, ml = $('input[name=pm]:checked', m.el).value;
          S.set(function (s) { s.plan[d + '-' + ml] = { id: r.id, serves: serves }; });
          m.close(); H.toast('Added to ' + H.DAYS[d] + ' ' + H.MEALS.filter(function (x) { return x[0] === ml; })[0][1].toLowerCase() + '.');
        });
        $('#pdOpen', m.el).addEventListener('click', function () { m.close(); });
      });
  };

  /* ---------- Print & share ---------- */
  H.printMode = function (kind) {
    document.body.setAttribute('data-print', kind);
    var done = function () { document.body.removeAttribute('data-print'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(done, 1500); }, 60);
  };
  H.share = function (title, text, url) {
    if (navigator.share) { navigator.share({ title: title, text: text, url: url }).catch(function () { /* cancelled */ }); return; }
    var full = text + (url ? '\n' + url : '');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(function () { H.toast('Copied to clipboard — paste it anywhere.'); }, function () { H.toast('Could not copy. Try selecting the text.'); });
    else H.toast('Sharing isn\'t supported here — try printing instead.');
  };

  /* ---------- Settings: theme, units, sound ---------- */
  var THEME_COLORS = { linen: '#f4ede1', night: '#17130f', farm: '#ece2cb', minimal: '#f7f7f5' };
  H.setTheme = function (t) {
    if (!THEME_COLORS[t]) t = 'linen';
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', THEME_COLORS[t]);
    $('#themeSelect').value = t; S.set(function (s) { s.settings.theme = t; });
  };
  H.setUnits = function (u) {
    S.set(function (s) { s.settings.units = u; });
    var b = $('#unitToggle'); b.textContent = u === 'us' ? 'US' : 'Metric'; b.setAttribute('aria-label', 'Units: ' + (u === 'us' ? 'US cups' : 'metric') + '. Click to switch.');
  };
  H.setSound = function (on) {
    S.set(function (s) { s.settings.sound = on; }); H.audio.setEnabled(on);
    var b = $('#soundToggle'); b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', on); b.title = 'Kitchen sounds (' + (on ? 'on' : 'off') + ')';
  };

  /* ---------- Mobile nav ---------- */
  function closeNav() { var n = $('#mainNav'), t = $('#navToggle'); n.classList.remove('open'); t.setAttribute('aria-expanded', 'false'); t.setAttribute('aria-label', 'Open menu'); }
  function toggleNav() { var n = $('#mainNav'), t = $('#navToggle'), open = !n.classList.contains('open'); n.classList.toggle('open', open); t.setAttribute('aria-expanded', open); t.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }

  /* ---------- Easter eggs ---------- */
  function sprinkle(chars) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (var i = 0; i < 28; i++) {
      var s = document.createElement('span'); s.className = 'sprinkle'; s.textContent = chars[i % chars.length];
      s.style.left = (Math.random() * 100) + 'vw'; s.style.animationDelay = (Math.random() * 0.8) + 's'; s.style.fontSize = (18 + Math.random() * 18) + 'px';
      document.body.appendChild(s); (function (x) { setTimeout(function () { x.remove(); }, 3600); })(s);
    }
  }
  var potClicks = 0, potT;
  function potEgg(e) {
    var pot = $('#brandPot'); pot.classList.remove('wobble'); void pot.offsetWidth; pot.classList.add('wobble');
    potClicks++; clearTimeout(potT); potT = setTimeout(function () { potClicks = 0; }, 1500);
    if (potClicks >= 5) { e.preventDefault(); potClicks = 0; sprinkle(['🧄', '🌶️', '🍋', '🧅', '🌿', '🍅']); H.audio.chime(); H.toast('You stirred the pot five times. The soup is now 12% more delicious.'); }
  }
  var typed = '';
  function keyEgg(e) {
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    typed = (typed + (e.key || '')).slice(-5).toLowerCase();
    if (typed === 'umami') { sprinkle(['🍄', '🧀', '🍅', '🥢', '✨']); H.toast('Umami unlocked: the fifth taste found you.'); typed = ''; }
  }

  /* ---------- Boot ---------- */
  function boot() {
    var st = S.get(), dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    H.setTheme(st.settings.theme || (dark ? 'night' : 'linen'));
    H.setUnits(st.settings.units || 'metric');
    H.setSound(!!st.settings.sound);
    var nav = navigator, low = (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) || (nav.deviceMemory && nav.deviceMemory <= 4) || (nav.connection && nav.connection.saveData);
    if (low) document.documentElement.classList.add('lowpower');
    $('#themeSelect').addEventListener('change', function (e) { H.setTheme(e.target.value); H.toast({ linen: 'Morning Linen: kettle on, curtains open.', night: 'Night Kitchen: low lights, late snacks.', farm: 'Farmhouse: boots by the door.', minimal: 'Minimal: just the recipe, chef.' }[e.target.value]); });
    $('#unitToggle').addEventListener('click', function () { H.setUnits(S.get().settings.units === 'us' ? 'metric' : 'us'); H.toast(S.get().settings.units === 'us' ? 'Showing US cups, ounces and °F.' : 'Showing grams, millilitres and °C.'); if (H.route.name === 'r' || H.route.name === 'shop') H.render(false, true); });
    $('#soundToggle').addEventListener('click', function () { var on = !S.get().settings.sound; H.setSound(on); if (on) { H.audio.chime(true); H.toast('Kitchen sounds on. Gentle chimes only.'); } else H.toast('Sounds off. Quiet kitchen.'); });
    $('#navToggle').addEventListener('click', toggleNav);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#mainNav').classList.contains('open')) { closeNav(); $('#navToggle').focus(); } });
    $('.brand').addEventListener('click', potEgg);
    document.addEventListener('keydown', keyEgg);
    window.addEventListener('hashchange', function () { H.render(true); });
    H.refreshUser().then(function () { H.render(false); }, function () { H.render(false); });
    if (window.console && console.log) console.log('%cHearth%c — psst: stir the pot five times, or type "umami".', 'font:600 16px Georgia;color:#b9562f', 'color:#6f5f50');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

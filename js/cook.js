/* Hearth cook mode + kitchen timers */
(function () {
  var U = H.util, S = H.store, $ = U.$, $$ = U.$$, esc = U.esc;

  /* ================= Timers ================= */
  var T = H.timers = { list: [] }, loop = null, KEY = 'hearth:timers';
  try { T.list = JSON.parse(localStorage.getItem(KEY) || '[]').filter(function (t) { return t && t.total; }); } catch (e) { T.list = []; }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(T.list)); } catch (e) { /* ignore */ } }
  function remaining(t) { return t.paused ? t.left : Math.max(0, (t.end - Date.now()) / 1000); }
  T.add = function (secs, label) {
    var t = { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: label || 'Timer', total: secs, end: Date.now() + secs * 1000, paused: false, left: secs, done: false };
    T.list.push(t); persist(); draw(); start();
    H.audio.unlock(); H.toast('Timer set: ' + U.clock(secs) + '. We\'ll chime when it\'s time.');
    return t;
  };
  T.remove = function (id) { T.list = T.list.filter(function (t) { return t.id !== id; }); persist(); draw(); };
  T.toggle = function (id) {
    T.list.forEach(function (t) { if (t.id !== id || t.done) return; if (t.paused) { t.end = Date.now() + t.left * 1000; t.paused = false; } else { t.left = remaining(t); t.paused = true; } });
    persist(); draw();
  };
  T.bump = function (id, secs) {
    T.list.forEach(function (t) { if (t.id !== id) return; if (t.done) { t.done = false; t.end = Date.now() + secs * 1000; t.total = secs; } else if (t.paused) { t.left += secs; t.total += secs; } else { t.end += secs * 1000; t.total += secs; } });
    persist(); draw(); start();
  };
  function start() { if (!loop) loop = setInterval(tick, 250); }
  var titleBase = document.title, flash = null;
  function tick() {
    var active = 0;
    T.list.forEach(function (t) {
      if (t.done || t.paused) return;
      active++;
      if (remaining(t) <= 0) { t.done = true; ring(t); persist(); }
    });
    update();
    if (!active && loop) { clearInterval(loop); loop = null; }
  }
  function ring(t) {
    H.audio.chime(true); setTimeout(function () { H.audio.chime(true); }, 1800);
    if (navigator.vibrate) try { navigator.vibrate([300, 150, 300, 150, 500]); } catch (e) { /* ignore */ }
    H.toast('⏰ ' + t.label + ' — time\'s up!');
    clearInterval(flash); var n = 0;
    flash = setInterval(function () { document.title = n++ % 2 ? titleBase : '⏰ Time\'s up!'; if (n > 12) { clearInterval(flash); document.title = titleBase; } }, 900);
    draw();
  }
  function draw() {
    var tray = $('#timerTray'); if (!tray) return;
    tray.hidden = !T.list.length;
    tray.innerHTML = T.list.length ? '<h2 class="sr">Running timers</h2>' + T.list.map(function (t) {
      return '<div class="timer' + (t.done ? ' done' : '') + (t.paused ? ' paused' : '') + '" data-t="' + t.id + '" role="timer" aria-label="' + esc(t.label) + '">' +
        '<svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" class="ring-bg"/><circle cx="22" cy="22" r="19" class="ring-fg" pathLength="100"/></svg>' +
        '<div class="timer-txt"><b class="timer-clock">' + U.clock(remaining(t)) + '</b><span>' + esc(t.label) + '</span></div>' +
        '<button class="icon-btn" data-act="toggle" aria-label="' + (t.paused ? 'Resume' : 'Pause') + ' timer">' + (t.done ? '✓' : t.paused ? '▶' : '❚❚') + '</button>' +
        '<button class="icon-btn" data-act="bump" aria-label="Add one minute">+1</button>' +
        '<button class="icon-btn" data-act="rm" aria-label="Dismiss timer">×</button></div>';
    }).join('') : '';
    $$('.timer', tray).forEach(function (el) {
      var id = el.dataset.t;
      $('[data-act=toggle]', el).addEventListener('click', function () { var t = T.list.filter(function (x) { return x.id === id; })[0]; if (t && t.done) T.remove(id); else T.toggle(id); });
      $('[data-act=bump]', el).addEventListener('click', function () { T.bump(id, 60); });
      $('[data-act=rm]', el).addEventListener('click', function () { T.remove(id); });
    });
    update();
  }
  function update() {
    T.list.forEach(function (t) {
      var el = document.querySelector('.timer[data-t="' + t.id + '"]'); if (!el) return;
      var r = remaining(t), c = $('.timer-clock', el), fg = $('.ring-fg', el);
      if (c) c.textContent = t.done ? 'Done!' : U.clock(r);
      if (fg) fg.style.strokeDashoffset = String(100 - (t.done ? 0 : (r / t.total) * 100));
    });
  }
  T.redraw = draw;

  /* ================= Wake lock (with fallback) ================= */
  var wake = null, wakeVideo = null, wakeMode = 'off';
  function lockScreen() {
    if ('wakeLock' in navigator && navigator.wakeLock.request) {
      return navigator.wakeLock.request('screen').then(function (l) { wake = l; wakeMode = 'native'; l.addEventListener && l.addEventListener('release', function () { if (wakeMode === 'native') wakeMode = 'released'; status(); }); status(); })
        .catch(function () { fallbackLock(); });
    }
    fallbackLock(); return Promise.resolve();
  }
  function fallbackLock() {
    // Plays a tiny muted looping video made from a canvas — keeps many mobile browsers awake.
    try {
      if (!wakeVideo) {
        var c = document.createElement('canvas'); c.width = 2; c.height = 2; var g = c.getContext('2d');
        if (!c.captureStream) { wakeMode = 'none'; status(); return; }
        var stream = c.captureStream(1); setInterval(function () { g.fillStyle = Date.now() % 2000 > 1000 ? '#000' : '#010101'; g.fillRect(0, 0, 2, 2); }, 1000);
        wakeVideo = document.createElement('video'); wakeVideo.muted = true; wakeVideo.setAttribute('muted', ''); wakeVideo.setAttribute('playsinline', ''); wakeVideo.loop = true;
        wakeVideo.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;left:0';
        wakeVideo.srcObject = stream; document.body.appendChild(wakeVideo);
      }
      var p = wakeVideo.play(); wakeMode = 'fallback';
      if (p && p.catch) p.catch(function () { wakeMode = 'none'; status(); });
    } catch (e) { wakeMode = 'none'; }
    status();
  }
  function unlockScreen() {
    if (wake) { try { wake.release(); } catch (e) { /* ignore */ } wake = null; }
    if (wakeVideo) { try { wakeVideo.pause(); } catch (e) { /* ignore */ } }
    wakeMode = 'off';
  }
  function status() {
    var el = $('#ckWake'); if (!el) return;
    var txt = { native: 'Screen stays awake', fallback: 'Screen kept awake (compat mode)', none: 'Keep-awake unavailable — tap now and then', released: 'Screen may sleep — tap to re-lock', off: '' }[wakeMode] || '';
    el.textContent = txt; el.className = 'wake small ' + wakeMode;
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && C.isOpen && (wakeMode === 'native' || wakeMode === 'released')) lockScreen(); });

  /* ================= Cook mode ================= */
  var C = H.cook = { isOpen: false };
  var cur = null, idx = 0, serves = 2, speakOn = false, ingOpen = false;
  var synth = window.speechSynthesis;
  function speak(text) {
    if (!synth || !window.SpeechSynthesisUtterance) return;
    try { synth.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1; synth.speak(u); } catch (e) { /* ignore */ }
  }
  function ambientFor(text) {
    if (!H.audio.enabled) return;
    var t = text.toLowerCase();
    if (/fry|sizzle|sear|stir-fry|toast|brown|char|crackle|pan over/.test(t)) H.audio.startAmbient('sizzle');
    else if (/simmer|boil|bubbl|stock|poach/.test(t)) H.audio.startAmbient('bubble');
    else H.audio.stopAmbient();
  }
  C.isOpen = false;
  H.cook.open = function (r, n) {
    cur = r; idx = 0; serves = n || r.serves; ingOpen = false;
    speakOn = false;
    var el = $('#cook'), voiceOK = !!(synth && window.SpeechSynthesisUtterance) && S.get().settings.voice !== false;
    el.innerHTML = '<div class="ck-top"><div class="ck-title"><span class="hand">now cooking</span><b>' + esc(r.title) + '</b></div>' +
      '<div class="ck-tools"><button class="icon-btn" id="ckIng" aria-expanded="false" aria-controls="ckDrawer">' + H.icon('basket') + '<span class="lbl">Ingredients</span></button>' +
      (voiceOK ? '<button class="icon-btn" id="ckVoice" aria-pressed="false" title="Read steps aloud">' + H.icon('speaker') + '<span class="lbl">Read aloud</span></button>' : '') +
      '<button class="icon-btn" id="ckSound" aria-pressed="' + H.audio.enabled + '" title="Kitchen sounds">' + (H.audio.enabled ? '🔊' : '🔇') + '<span class="lbl">Sounds</span></button>' +
      '<button class="icon-btn" id="ckTimer" title="Add a custom timer">' + H.icon('timer') + '<span class="lbl">Timer</span></button>' +
      '<button class="icon-btn" id="ckClose" aria-label="Exit cook mode">' + H.icon('close') + '</button></div></div>' +
      '<div class="ck-progress" aria-hidden="true"><span id="ckBar"></span></div>' +
      '<div class="ck-stage" id="ckStage"><div class="ck-steam" aria-hidden="true"><i></i><i></i><i></i></div><div class="ck-card" id="ckCard" aria-live="polite"></div></div>' +
      '<aside class="ck-drawer" id="ckDrawer" aria-label="Ingredients" hidden><h2>Ingredients <small>for ' + serves + '</small></h2><ul class="ing-list" id="ckIngList"></ul></aside>' +
      '<div class="ck-bottom"><button class="btn btn-ghost btn-big" id="ckPrev">' + H.icon('arrowL') + ' Back</button><p class="wake small" id="ckWake"></p><button class="btn btn-big" id="ckNext">Next ' + H.icon('arrowR') + '</button></div>';
    el.hidden = false; document.body.classList.add('cooking');
    requestAnimationFrame(function () { el.classList.add('open'); });
    C.isOpen = true;
    drawIngs(); show(0, 0);
    $('#ckClose').addEventListener('click', close);
    $('#ckPrev').addEventListener('click', function () { go(-1); });
    $('#ckNext').addEventListener('click', function () { go(1); });
    $('#ckIng').addEventListener('click', function () { ingOpen = !ingOpen; $('#ckDrawer').hidden = !ingOpen; $('#ckIng').setAttribute('aria-expanded', ingOpen); });
    var vb = $('#ckVoice'); if (vb) vb.addEventListener('click', function () { speakOn = !speakOn; vb.setAttribute('aria-pressed', speakOn); vb.classList.toggle('on', speakOn); if (speakOn) speak(stepText()); else synth.cancel(); });
    $('#ckSound').addEventListener('click', function () { var on = !H.audio.enabled; H.setSound(on); var b = $('#ckSound'); b.setAttribute('aria-pressed', on); b.firstChild.textContent = on ? '🔊' : '🔇'; if (on) ambientFor(cur.steps[idx] || ''); });
    $('#ckTimer').addEventListener('click', customTimer);
    $('#ckWake').addEventListener('click', function () { lockScreen(); });
    document.addEventListener('keydown', keys);
    swipe($('#ckStage'));
    lockScreen();
    setTimeout(function () { $('#ckNext').focus(); }, 50);
  };
  function stepText() { return idx >= cur.steps.length ? 'All done. Enjoy your ' + cur.title + '!' : 'Step ' + (idx + 1) + '. ' + U.convertStep(cur.steps[idx], S.get().settings.units); }
  function drawIngs() {
    var f = serves / cur.serves, u = S.get().settings.units, checks = S.get().checks[cur.id] || [];
    $('#ckIngList').innerHTML = cur.ing.map(function (l, i) {
      var x = U.renderIng(l, f, u), on = checks.indexOf(i) > -1;
      return '<li class="' + (on ? 'done' : '') + '"><label><input type="checkbox" data-i="' + i + '"' + (on ? ' checked' : '') + '><span class="tick" aria-hidden="true">' + H.icon('check', 16) + '</span><span class="amt">' + esc(x.amount) + '</span> <span class="nm">' + esc(x.name) + '</span></label></li>';
    }).join('');
    $$('#ckIngList input').forEach(function (c) {
      c.addEventListener('change', function () {
        S.set(function (s) { var a = s.checks[cur.id] = s.checks[cur.id] || [], i = +c.dataset.i, k = a.indexOf(i); if (c.checked && k < 0) a.push(i); if (!c.checked && k > -1) a.splice(k, 1); });
        c.closest('li').classList.toggle('done', c.checked);
      });
    });
  }
  function show(i, dir) {
    idx = Math.max(0, Math.min(cur.steps.length, i));
    var card = $('#ckCard'), n = cur.steps.length, done = idx >= n, u = S.get().settings.units;
    var html;
    if (done) {
      html = '<p class="ck-step-n hand">the end (the delicious part)</p><p class="ck-text">Dinner is served. Taste, season, and take a bow.</p>' +
        '<div class="ck-done-art">' + H.media(cur) + '</div><div class="ck-step-timers"><button class="btn" id="ckFinish">' + H.icon('check') + ' Finish &amp; close</button><button class="btn btn-ghost" id="ckAgain">Back to step 1</button></div>';
    } else {
      var s = cur.steps[idx], tm = U.findTimers(s);
      html = '<p class="ck-step-n"><span class="hand">step</span> ' + (idx + 1) + ' <span class="of">of ' + n + '</span></p><p class="ck-text">' + esc(U.convertStep(s, u)) + '</p>' +
        (tm.length ? '<div class="ck-step-timers">' + tm.map(function (t) { return '<button class="btn btn-ghost timer-start" data-secs="' + t.secs + '">' + H.icon('timer') + ' Start ' + esc(t.label) + ' timer</button>'; }).join('') + '</div>' : '');
    }
    card.classList.remove('flip-next', 'flip-prev'); void card.offsetWidth;
    if (dir) card.classList.add(dir > 0 ? 'flip-next' : 'flip-prev');
    card.innerHTML = html;
    $('#ckBar').style.width = (Math.min(idx, n) / n * 100) + '%';
    $('#ckPrev').disabled = idx === 0;
    var nx = $('#ckNext'); nx.hidden = done; 
    $$('.timer-start', card).forEach(function (b) { b.addEventListener('click', function () { H.timers.add(+b.dataset.secs, cur.title + ' · step ' + (idx + 1)); b.classList.add('started'); }); });
    var fin = $('#ckFinish'); if (fin) fin.addEventListener('click', function () { S.set(function (s) { s.cooked = (s.cooked || 0) + 1; }); H.toast('Lovely work, chef. That\'s ' + S.get().cooked + ' meal' + (S.get().cooked > 1 ? 's' : '') + ' cooked with Hearth.'); close(); });
    var ag = $('#ckAgain'); if (ag) ag.addEventListener('click', function () { show(0, -1); });
    if (speakOn) speak(stepText());
    if (done) { H.audio.stopAmbient(); H.audio.chime(); } else ambientFor(cur.steps[idx]);
  }
  function go(d) { if (idx + d < 0 || idx + d > cur.steps.length) return; H.audio.tick(); show(idx + d, d); }
  function keys(e) {
    if (!C.isOpen) return;
    if (/input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    else if (e.key === 'Escape') { if ($('.modal-wrap')) return; close(); }
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); speak(stepText()); }
  }
  function swipe(el) {
    var x0 = null, y0 = 0;
    el.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; x0 = e.clientX; y0 = e.clientY; });
    el.addEventListener('pointerup', function (e) {
      if (x0 == null) return; var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
    });
    el.addEventListener('pointercancel', function () { x0 = null; });
  }
  function customTimer() {
    H.modal('Set a timer', '<div class="timer-presets">' + [1, 3, 5, 10, 15, 20, 30, 45].map(function (m) { return '<button class="chip" data-m="' + m + '">' + m + ' min</button>'; }).join('') + '</div>' +
      '<div class="row3"><label class="field"><span>Minutes</span><input id="ctM" type="number" min="0" max="600" value="10"></label><label class="field"><span>Seconds</span><input id="ctS" type="number" min="0" max="59" value="0"></label><label class="field"><span>Label</span><input id="ctL" maxlength="40" value="' + esc(cur ? cur.title : 'Timer') + '"></label></div>' +
      '<div class="modal-actions"><button class="btn" id="ctGo">' + H.icon('timer') + ' Start timer</button></div>', function (m) {
        $$('.timer-presets .chip', m.el).forEach(function (b) { b.addEventListener('click', function () { H.timers.add(+b.dataset.m * 60, $('#ctL', m.el).value || 'Timer'); m.close(); }); });
        $('#ctGo', m.el).addEventListener('click', function () { var s = (+$('#ctM', m.el).value || 0) * 60 + (+$('#ctS', m.el).value || 0); if (s < 1) { H.toast('A timer needs at least a second.'); return; } H.timers.add(s, $('#ctL', m.el).value || 'Timer'); m.close(); });
      });
  }
  function close() {
    var el = $('#cook'); el.classList.remove('open'); C.isOpen = false;
    document.removeEventListener('keydown', keys);
    if (synth) try { synth.cancel(); } catch (e) { /* ignore */ }
    H.audio.stopAmbient(); unlockScreen();
    setTimeout(function () { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('cooking'); var b = document.getElementById('dCook'); if (b) b.focus(); }, 300);
  }
  C.close = close;

  draw(); if (T.list.some(function (t) { return !t.done; })) start();
})();

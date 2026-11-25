/* Hearth sounds: all synthesised with Web Audio. Muted until the user enables them. */
(function () {
  var A = H.audio = { enabled: false };
  var ctx = null, master = null, amb = null;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination); } catch (e) { ctx = null; }
    return ctx;
  }
  /* iOS: unlock on first gesture by playing a silent buffer */
  A.unlock = function () {
    var c = ensure(); if (!c) return;
    if (c.state === 'suspended' && c.resume) c.resume();
    try { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* ignore */ }
  };
  var unlockOnce = function () { A.unlock(); window.removeEventListener('pointerdown', unlockOnce); window.removeEventListener('keydown', unlockOnce); };
  window.addEventListener('pointerdown', unlockOnce); window.addEventListener('keydown', unlockOnce);

  A.setEnabled = function (on) { A.enabled = !!on; if (on) A.unlock(); else A.stopAmbient(); };

  function tone(freq, start, dur, type, vol, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol || 0.2, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest || master); o.start(start); o.stop(start + dur + 0.05);
  }
  /* soft kitchen-bell chime (always plays for timers if sound is on, or if force) */
  A.chime = function (force) {
    if (!A.enabled && !force) return;
    var c = ensure(); if (!c) return; if (c.state === 'suspended') c.resume();
    var t = c.currentTime + 0.02;
    [[880, 0], [1318.5, 0.18], [1760, 0.36], [1318.5, 0.9], [1760, 1.08]].forEach(function (n) {
      tone(n[0], t + n[1], 1.3, 'sine', 0.22); tone(n[0] * 2.01, t + n[1], 0.6, 'sine', 0.05);
    });
  };
  A.tick = function () {
    if (!A.enabled) return; var c = ensure(); if (!c) return;
    tone(1900, c.currentTime + 0.005, 0.05, 'triangle', 0.05);
  };
  A.pop = function () {
    if (!A.enabled) return; var c = ensure(); if (!c) return;
    var t = c.currentTime + 0.005, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.08);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.15);
  };

  /* Ambient: gentle sizzle (filtered crackle noise) + random bubble blips */
  A.startAmbient = function (kind) {
    if (!A.enabled) return; var c = ensure(); if (!c) return;
    A.stopAmbient();
    var len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { var crackle = Math.random() < 0.0025 ? (Math.random() * 2 - 1) * 3 : 0; d[i] = (Math.random() * 2 - 1) * 0.25 + crackle; }
    var src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
    var g = c.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(kind === 'bubble' ? 0.015 : 0.05, c.currentTime + 1.5);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master); src.start();
    var timer = setInterval(function () {
      if (!ctx || ctx.state !== 'running') return;
      var n = kind === 'bubble' ? 3 : 1;
      for (var k = 0; k < n; k++) {
        var t = ctx.currentTime + Math.random() * 0.4, o = ctx.createOscillator(), bg = ctx.createGain(), f = 180 + Math.random() * 380;
        o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.06);
        bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(kind === 'bubble' ? 0.05 : 0.015, t + 0.01); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(bg); bg.connect(master); o.start(t); o.stop(t + 0.12);
      }
    }, 420);
    amb = { src: src, gain: g, timer: timer };
  };
  A.stopAmbient = function () {
    if (!amb || !ctx) { amb = null; return; }
    var a = amb; amb = null; clearInterval(a.timer);
    try { a.gain.gain.cancelScheduledValues(ctx.currentTime); a.gain.gain.setValueAtTime(a.gain.gain.value || 0.01, ctx.currentTime); a.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6); a.src.stop(ctx.currentTime + 0.7); } catch (e) { /* already stopped */ }
  };
  A.ambientOn = function () { return !!amb; };
})();

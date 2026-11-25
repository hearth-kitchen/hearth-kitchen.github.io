/* Hearth storage: small state in localStorage, user recipes + photos in IndexedDB */
(function () {
  var KEY = 'hearth:v1';
  var S = H.store = {};
  var defaults = function () {
    return { favs: [], notes: {}, plan: {}, planServes: 2, shopChecked: {}, shopExtra: [], checks: {}, servings: {},
      settings: { theme: '', units: 'metric', sound: false, voice: true }, cooked: 0 };
  };
  var mem = null, lsOK = true;
  try { localStorage.setItem('hearth:t', '1'); localStorage.removeItem('hearth:t'); } catch (e) { lsOK = false; }

  S.get = function () {
    if (mem) return mem;
    var d = defaults();
    try {
      var raw = lsOK && localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); for (var k in d) if (o[k] !== undefined) d[k] = o[k]; d.settings = Object.assign(defaults().settings, o.settings || {}); }
    } catch (e) { /* corrupted — start fresh */ }
    mem = d; return mem;
  };
  S.save = function () { try { if (lsOK) localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { H.toast && H.toast('Storage is full — export your data to keep it safe.'); } };
  S.set = function (fn) { fn(S.get()); S.save(); };

  S.isFav = function (id) { return S.get().favs.indexOf(id) > -1; };
  S.toggleFav = function (id) {
    var st = S.get(), i = st.favs.indexOf(id);
    if (i > -1) st.favs.splice(i, 1); else st.favs.unshift(id);
    S.save(); return i === -1;
  };

  /* ---------- IndexedDB ---------- */
  var dbp = null, fallback = {};
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res) {
      if (!('indexedDB' in window)) return res(null);
      try {
        var rq = indexedDB.open('hearth', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('recipes', { keyPath: 'id' }); };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { res(null); };
        rq.onblocked = function () { res(null); };
      } catch (e) { res(null); }
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      if (!d) return fn(null);
      return new Promise(function (res, rej) {
        var t = d.transaction('recipes', mode), st = t.objectStore('recipes'), out = fn(st);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  S.userRecipes = function () {
    return tx('readonly', function (st) {
      if (!st) return Object.keys(fallback).map(function (k) { return fallback[k]; });
      return st.getAll();
    }).then(function (r) { return (r || []).sort(function (a, b) { return (b.created || 0) - (a.created || 0); }); })
      .catch(function () { return []; });
  };
  S.putRecipe = function (r) {
    return tx('readwrite', function (st) { if (!st) { fallback[r.id] = r; return r; } st.put(r); return r; });
  };
  S.deleteRecipe = function (id) {
    return tx('readwrite', function (st) { if (!st) { delete fallback[id]; return; } st.delete(id); });
  };

  /* Photo helpers: downscale to max 1400px JPEG to keep the DB lean */
  S.prepPhoto = function (file) {
    return new Promise(function (res) {
      if (!file) return res(null);
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1400, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        if (c.toBlob) c.toBlob(function (b) { res(b || file); }, 'image/jpeg', 0.85); else res(file);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(null); };
      img.src = url;
    });
  };
  function blobToDataURL(b) {
    return new Promise(function (res) { if (!b) return res(null); var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(b); });
  }
  function dataURLToBlob(u) {
    try {
      var parts = u.split(','), mime = parts[0].match(/:(.*?);/)[1], bin = atob(parts[1]), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    } catch (e) { return null; }
  }

  /* ---------- Export / import ---------- */
  S.exportAll = function () {
    return S.userRecipes().then(function (list) {
      return Promise.all(list.map(function (r) {
        return blobToDataURL(r.photo).then(function (d) { var c = Object.assign({}, r); delete c.photo; c.photoData = d; return c; });
      }));
    }).then(function (recipes) {
      return JSON.stringify({ app: 'hearth', version: 1, exportedAt: new Date().toISOString(), state: S.get(), userRecipes: recipes }, null, 2);
    });
  };
  S.importAll = function (text) {
    var o = JSON.parse(text);
    if (!o || o.app !== 'hearth') throw new Error('This file does not look like a Hearth export.');
    var st = S.get(), inn = o.state || {};
    (inn.favs || []).forEach(function (f) { if (st.favs.indexOf(f) < 0) st.favs.push(f); });
    Object.assign(st.notes, inn.notes || {});
    Object.assign(st.plan, inn.plan || {});
    Object.assign(st.checks, inn.checks || {});
    if (inn.settings) st.settings = Object.assign(st.settings, inn.settings);
    if (Array.isArray(inn.shopExtra)) st.shopExtra = st.shopExtra.concat(inn.shopExtra);
    S.save();
    var rs = (o.userRecipes || []).map(function (r) {
      var c = Object.assign({}, r); if (c.photoData) c.photo = dataURLToBlob(c.photoData); delete c.photoData; return S.putRecipe(c);
    });
    return Promise.all(rs).then(function () { return rs.length; });
  };
  S.resetAll = function () {
    mem = defaults(); S.save();
    return S.userRecipes().then(function (l) { return Promise.all(l.map(function (r) { return S.deleteRecipe(r.id); })); });
  };
})();

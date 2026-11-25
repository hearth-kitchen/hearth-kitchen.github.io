/* Hearth illustrations: deterministic, hand-drawn-feeling SVG food art (no external images) */
(function () {
  var U = H.util, uid = 0;

  function shade(hex, amt) { // amt -1..1
    var c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    var n = parseInt(c, 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  H.shade = shade;
  /* organic closed blob path */
  function blob(cx, cy, rx, ry, rnd, pts, wob) {
    pts = pts || 9; wob = wob == null ? 0.18 : wob;
    var p = [];
    for (var i = 0; i < pts; i++) {
      var a = (i / pts) * Math.PI * 2, k = 1 - wob / 2 + rnd() * wob;
      p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    var d = '';
    for (var j = 0; j < pts; j++) {
      var a0 = p[j], a1 = p[(j + 1) % pts], m = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2];
      if (j === 0) { var pm = p[pts - 1]; d += 'M' + ((pm[0] + a0[0]) / 2).toFixed(1) + ',' + ((pm[1] + a0[1]) / 2).toFixed(1); }
      d += 'Q' + a0[0].toFixed(1) + ',' + a0[1].toFixed(1) + ' ' + m[0].toFixed(1) + ',' + m[1].toFixed(1);
    }
    return d + 'Z';
  }
  function leaf(x, y, s, rot, col) {
    return '<path d="M0,0 C' + (6 * s) + ',' + (-7 * s) + ' ' + (16 * s) + ',' + (-6 * s) + ' ' + (22 * s) + ',0 C' + (16 * s) + ',' + (6 * s) + ' ' + (6 * s) + ',' + (7 * s) + ' 0,0Z" fill="' + col + '" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(0) + ')"/>' +
      '<path d="M1,0 L' + (19 * s) + ',0" stroke="' + shade(col, -0.35) + '" stroke-width="0.9" stroke-linecap="round" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(0) + ')" opacity=".6"/>';
  }
  function scatter(rnd, n, cx, cy, rx, ry, fn) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
      s += fn(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, i);
    }
    return s;
  }
  function garnish(rnd, cx, cy, rx, ry, c2, n) {
    return scatter(rnd, n || 7, cx, cy, rx, ry, function (x, y, i) {
      return i % 3 === 0 ? leaf(x, y, 0.55 + rnd() * 0.4, rnd() * 360, c2) : '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (1.6 + rnd() * 2.4).toFixed(1) + '" fill="' + shade(c2, rnd() * 0.3 - 0.15) + '"/>';
    });
  }
  function steam(x, y, w) {
    var s = '<g class="art-steam" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".75">';
    for (var i = 0; i < 3; i++) {
      var sx = x - w / 3 + i * w / 3;
      s += '<path style="animation-delay:' + (i * 0.8).toFixed(1) + 's" d="M' + sx + ',' + y + ' c-9,-12 9,-20 0,-32 c-9,-12 9,-20 0,-32"/>';
    }
    return s + '</g>';
  }
  var plateRim = function (cx, cy, rx, ry, col) {
    return '<ellipse cx="' + cx + '" cy="' + (cy + 6) + '" rx="' + (rx + 4) + '" ry="' + (ry + 3) + '" fill="rgba(60,40,20,.18)"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + col + '"/>' +
      '<ellipse cx="' + cx + '" cy="' + (cy - 2) + '" rx="' + (rx * 0.74) + '" ry="' + (ry * 0.7) + '" fill="' + shade(col, -0.05) + '"/>';
  };

  var DISH = {
    bowl: function (r, a) {
      return '<path d="M80,150 C84,230 316,230 320,150Z" fill="url(#' + a.id + 'b)"/>' +
        '<path d="M118,212 C150,226 250,226 282,212 L272,228 C240,238 160,238 128,228Z" fill="' + shade(a.bowl, -0.3) + '"/>' +
        '<ellipse cx="200" cy="150" rx="120" ry="30" fill="' + shade(a.bowl, 0.2) + '"/>' +
        '<path d="' + blob(200, 150, 108, 23, a.rnd, 12, 0.08) + '" fill="url(#' + a.id + 'f)"/>' +
        scatter(a.rnd, 10, 200, 150, 90, 16, function (x, y) { return '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + (3 + a.rnd() * 5).toFixed(1) + '" ry="2.2" fill="' + shade(r.c1, -0.18) + '" opacity=".55"/>'; }) +
        '<path d="M150,140 C170,132 196,134 214,142" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        garnish(a.rnd, 200, 148, 80, 14, r.c2, 8) +
        '<path d="M262,136 L330,92" stroke="' + shade(a.bowl, -0.15) + '" stroke-width="9" stroke-linecap="round"/>';
    },
    rice: function (r, a) {
      return '<path d="M96,160 C100,232 300,232 304,160Z" fill="url(#' + a.id + 'b)"/>' +
        '<ellipse cx="200" cy="160" rx="104" ry="24" fill="' + shade(a.bowl, 0.2) + '"/>' +
        '<path d="M108,162 C110,96 290,96 292,162 C250,176 150,176 108,162Z" fill="url(#' + a.id + 'f)"/>' +
        scatter(a.rnd, 46, 200, 135, 78, 28, function (x, y) { return '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="4.2" ry="1.8" transform="rotate(' + (a.rnd() * 180).toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="' + shade(r.c1, 0.35) + '"/>'; }) +
        garnish(a.rnd, 200, 130, 60, 22, r.c2, 6);
    },
    plate: function (r, a) {
      return plateRim(200, 172, 150, 54, a.plate) +
        '<path d="' + blob(185, 160, 78, 34, a.rnd, 10, 0.3) + '" fill="url(#' + a.id + 'f)"/>' +
        '<path d="' + blob(235, 170, 44, 20, a.rnd, 8, 0.3) + '" fill="' + shade(r.c1, -0.12) + '"/>' +
        '<path d="M150,148 C170,140 196,142 210,150" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        garnish(a.rnd, 200, 160, 82, 26, r.c2, 9);
    },
    pasta: function (r, a) {
      var s = plateRim(200, 172, 150, 54, a.plate), c = shade(r.c1, 0.05);
      for (var i = 0; i < 16; i++) {
        var x = 130 + a.rnd() * 130, y = 140 + a.rnd() * 40, w = 30 + a.rnd() * 40;
        s += '<path d="M' + x.toFixed(0) + ',' + y.toFixed(0) + ' c' + (w / 3).toFixed(0) + ',-18 ' + (w * 0.8).toFixed(0) + ',16 ' + w.toFixed(0) + ',-4" stroke="' + shade(c, a.rnd() * 0.2 - 0.12) + '" stroke-width="6" fill="none" stroke-linecap="round"/>';
      }
      return s + '<path d="' + blob(200, 158, 56, 22, a.rnd, 9, 0.3) + '" fill="' + c + '" opacity=".55"/>' + garnish(a.rnd, 200, 156, 70, 22, r.c2, 9);
    },
    pan: function (r, a) {
      return '<path d="M300,150 L382,118" stroke="#3a2c24" stroke-width="13" stroke-linecap="round"/>' +
        '<ellipse cx="190" cy="172" rx="134" ry="52" fill="rgba(40,25,15,.25)"/>' +
        '<ellipse cx="190" cy="162" rx="130" ry="50" fill="#3b302a"/><ellipse cx="190" cy="158" rx="116" ry="42" fill="#2a221d"/>' +
        '<path d="' + blob(190, 158, 104, 36, a.rnd, 12, 0.12) + '" fill="url(#' + a.id + 'f)"/>' +
        scatter(a.rnd, 7, 190, 158, 80, 24, function (x, y) { return '<path d="' + blob(x, y, 9 + a.rnd() * 9, 6 + a.rnd() * 5, a.rnd, 7, 0.4) + '" fill="' + shade(r.c1, a.rnd() * 0.4 - 0.25) + '"/>'; }) +
        garnish(a.rnd, 190, 156, 82, 26, r.c2, 10);
    },
    taco: function (r, a) {
      var s = '<ellipse cx="200" cy="218" rx="150" ry="22" fill="rgba(60,40,20,.18)"/>';
      [[130, 0], [210, 8], [285, -4]].forEach(function (t, i) {
        var x = t[0], y = 168 + t[1];
        s += '<path d="M' + (x - 56) + ',' + (y + 30) + ' C' + (x - 54) + ',' + (y - 50) + ' ' + (x + 54) + ',' + (y - 50) + ' ' + (x + 56) + ',' + (y + 30) + 'Z" fill="#f0cf86"/>' +
          '<path d="' + blob(x, y - 4, 44, 16, a.rnd, 9, 0.35) + '" fill="url(#' + a.id + 'f)"/>' +
          garnish(a.rnd, x, y - 10, 34, 9, r.c2, 6) +
          '<path d="M' + (x - 48) + ',' + (y + 30) + ' C' + (x - 44) + ',' + (y - 30) + ' ' + (x + 44) + ',' + (y - 30) + ' ' + (x + 48) + ',' + (y + 30) + '" stroke="#e2b663" stroke-width="3" fill="none"/>';
      });
      return s;
    },
    pizza: function (r, a) {
      var s = '<ellipse cx="200" cy="176" rx="146" ry="58" fill="rgba(60,40,20,.2)"/><ellipse cx="200" cy="166" rx="140" ry="54" fill="#d79a4a"/>' +
        '<ellipse cx="200" cy="163" rx="124" ry="46" fill="url(#' + a.id + 'f)"/>';
      s += scatter(a.rnd, 9, 200, 162, 96, 34, function (x, y) { return '<path d="' + blob(x, y, 14, 7, a.rnd, 8, 0.4) + '" fill="' + r.c2 + '"/>'; });
      s += scatter(a.rnd, 6, 200, 160, 90, 30, function (x, y) { return leaf(x, y, 0.7, a.rnd() * 360, '#3f8a3a'); });
      return s + scatter(a.rnd, 14, 200, 166, 136, 52, function (x, y) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.5" fill="#8a4a1a" opacity=".5"/>'; });
    },
    salad: function (r, a) {
      var s = '<path d="M70,148 C76,226 324,226 330,148Z" fill="url(#' + a.id + 'b)"/><ellipse cx="200" cy="148" rx="130" ry="30" fill="' + shade(a.bowl, 0.15) + '"/>';
      for (var i = 0; i < 26; i++) {
        var x = 100 + a.rnd() * 200, y = 118 + a.rnd() * 36, c = [r.c1, r.c2, shade(r.c2, 0.25), '#f4f0e2', shade(r.c1, -0.2)][i % 5];
        s += i % 4 === 1 ? leaf(x - 10, y, 0.9 + a.rnd() * 0.5, a.rnd() * 360, r.c2) : '<path d="' + blob(x, y, 8 + a.rnd() * 8, 6 + a.rnd() * 6, a.rnd, 6, 0.35) + '" fill="' + c + '"/>';
      }
      return s;
    },
    loaf: function (r, a) {
      return '<ellipse cx="190" cy="214" rx="140" ry="18" fill="rgba(60,40,20,.2)"/>' +
        '<path d="M70,210 L70,140 C70,96 300,96 300,140 L300,210Z" fill="url(#' + a.id + 'f)"/>' +
        '<path d="M100,124 C140,110 230,110 270,124" stroke="' + shade(r.c1, -0.3) + '" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>' +
        '<path d="M120,140 l12,-12 M160,134 l12,-12 M200,134 l12,-12 M240,138 l12,-12" stroke="' + shade(r.c1, 0.35) + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M304,210 L304,150 C304,128 350,128 352,150 L352,210Z" fill="' + r.c2 + '" stroke="' + shade(r.c1, -0.2) + '" stroke-width="7"/>' +
        scatter(a.rnd, 12, 328, 176, 14, 24, function (x, y) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.6" fill="' + shade(r.c2, -0.25) + '"/>'; });
    },
    cake: function (r, a) {
      return '<ellipse cx="200" cy="216" rx="150" ry="20" fill="rgba(60,40,20,.2)"/><ellipse cx="200" cy="206" rx="146" ry="22" fill="' + a.plate + '"/>' +
        '<rect x="80" y="110" width="240" height="92" rx="12" fill="url(#' + a.id + 'f)"/>' +
        '<path d="M80,124 C80,104 320,104 320,124 L320,138 C300,150 290,128 270,144 C250,160 236,132 212,146 C190,160 170,134 150,148 C128,162 110,132 80,142Z" fill="' + r.c2 + '"/>' +
        '<path d="M80,160 L320,160" stroke="' + shade(r.c1, -0.2) + '" stroke-width="3" opacity=".5"/>' +
        scatter(a.rnd, 10, 200, 116, 100, 6, function (x, y) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.2" fill="' + shade(r.c1, -0.2) + '" opacity=".6"/>'; });
    },
    cookies: function (r, a) {
      var s = '<ellipse cx="200" cy="200" rx="160" ry="26" fill="rgba(60,40,20,.16)"/>';
      [[130, 166, 54], [252, 160, 58], [196, 196, 48], [312, 198, 38], [80, 204, 34]].forEach(function (c) {
        s += '<path d="' + blob(c[0], c[1], c[2], c[2] * 0.42, a.rnd, 11, 0.14) + '" fill="url(#' + a.id + 'f)"/>' +
          scatter(a.rnd, 6, c[0], c[1] - 3, c[2] * 0.7, c[2] * 0.26, function (x, y) { return '<path d="' + blob(x, y, 5, 3.2, a.rnd, 6, 0.4) + '" fill="' + r.c2 + '"/>'; });
      });
      return s;
    },
    muffin: function (r, a) {
      var s = '';
      [[140, 0], [262, 10]].forEach(function (m) {
        var x = m[0], y = 150 + m[1];
        s += '<ellipse cx="' + x + '" cy="' + (y + 66) + '" rx="64" ry="12" fill="rgba(60,40,20,.2)"/>' +
          '<path d="M' + (x - 50) + ',' + y + ' L' + (x - 38) + ',' + (y + 64) + ' L' + (x + 38) + ',' + (y + 64) + ' L' + (x + 50) + ',' + y + 'Z" fill="' + shade(r.c2, -0.05) + '"/>';
        for (var i = -3; i <= 3; i++) s += '<path d="M' + (x + i * 13) + ',' + (y + 2) + ' L' + (x + i * 10) + ',' + (y + 62) + '" stroke="' + shade(r.c2, -0.25) + '" stroke-width="2"/>';
        s += '<path d="' + blob(x, y - 10, 62, 34, a.rnd, 10, 0.16) + '" fill="#e8b866"/>' +
          scatter(a.rnd, 7, x, y - 14, 44, 20, function (bx, by) { return '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="5.5" fill="' + r.c1 + '"/><circle cx="' + (bx - 1.5).toFixed(1) + '" cy="' + (by - 1.5).toFixed(1) + '" r="1.5" fill="#fff" opacity=".5"/>'; });
      });
      return s;
    },
    stack: function (r, a) {
      var s = plateRim(200, 212, 140, 34, a.plate);
      for (var i = 0; i < 6; i++) {
        var y = 196 - i * 17;
        s += '<ellipse cx="200" cy="' + y + '" rx="100" ry="24" fill="' + shade(r.c1, -0.25) + '"/><ellipse cx="200" cy="' + (y - 5) + '" rx="100" ry="22" fill="url(#' + a.id + 'f)"/>';
      }
      return s + '<path d="M130,104 C150,90 250,90 270,104 C268,118 262,124 258,140 C254,124 230,120 210,124 C204,140 202,150 198,156 C194,140 190,126 170,122 C158,124 150,132 140,128 C138,116 132,112 130,104Z" fill="#a8641c" opacity=".85"/>' +
        '<rect x="186" y="82" width="28" height="16" rx="4" fill="#f6e27a"/>' +
        scatter(a.rnd, 5, 200, 98, 50, 8, function (x, y) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" fill="' + r.c2 + '"/>'; });
    },
    toast: function (r, a) {
      return '<ellipse cx="200" cy="214" rx="150" ry="22" fill="rgba(60,40,20,.18)"/>' +
        '<path d="M92,210 L92,120 C70,110 76,70 118,74 C150,52 250,52 282,74 C324,70 330,110 308,120 L308,210Z" fill="#c9893f"/>' +
        '<path d="M104,200 L104,124 C88,114 94,86 122,88 C154,70 246,70 278,88 C306,86 312,114 296,124 L296,200Z" fill="#efcf8f"/>' +
        '<path d="' + blob(200, 140, 82, 46, a.rnd, 11, 0.2) + '" fill="url(#' + a.id + 'f)"/>' + garnish(a.rnd, 200, 138, 64, 34, r.c2, 9);
    },
    jar: function (r, a) {
      return '<ellipse cx="200" cy="232" rx="90" ry="14" fill="rgba(60,40,20,.2)"/>' +
        '<rect x="132" y="80" width="136" height="150" rx="26" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.8)" stroke-width="4"/>' +
        '<path d="M138,150 L262,150 L262,204 C262,222 250,226 236,226 L164,226 C150,226 138,222 138,204Z" fill="url(#' + a.id + 'f)"/>' +
        '<path d="M138,128 C170,140 230,118 262,130 L262,152 L138,152Z" fill="#f7f1e3"/>' +
        scatter(a.rnd, 9, 200, 118, 50, 10, function (x, y) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (5 + a.rnd() * 4).toFixed(1) + '" fill="' + shade(r.c2, a.rnd() * 0.3 - 0.1) + '"/>'; }) +
        '<rect x="124" y="64" width="152" height="22" rx="8" fill="' + shade(r.c1, -0.25) + '"/>' +
        '<path d="M150,96 L150,210" stroke="#fff" stroke-opacity=".6" stroke-width="6" stroke-linecap="round"/>';
    },
    mug: function (r, a) {
      return '<ellipse cx="200" cy="228" rx="110" ry="16" fill="rgba(60,40,20,.2)"/><ellipse cx="200" cy="224" rx="104" ry="14" fill="' + a.plate + '"/>' +
        '<path d="M266,120 C318,116 318,196 262,190" stroke="' + r.c2 + '" stroke-width="16" fill="none"/>' +
        '<path d="M126,104 L134,206 C136,222 264,222 266,206 L274,104Z" fill="' + r.c2 + '"/>' +
        '<ellipse cx="200" cy="104" rx="74" ry="16" fill="' + shade(r.c2, -0.2) + '"/><ellipse cx="200" cy="106" rx="66" ry="12" fill="url(#' + a.id + 'f)"/>' +
        '<path d="M150,130 L156,196" stroke="#fff" stroke-opacity=".45" stroke-width="7" stroke-linecap="round"/>';
    },
    glass: function (r, a) {
      return '<ellipse cx="200" cy="232" rx="80" ry="12" fill="rgba(60,40,20,.2)"/>' +
        '<path d="M140,80 L260,80 L246,190 C244,214 156,214 154,190Z" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.85)" stroke-width="4"/>' +
        '<path d="M146,118 L254,118 L246,188 C244,206 156,206 154,188Z" fill="url(#' + a.id + 'f)"/>' +
        '<path d="' + blob(200, 110, 56, 16, a.rnd, 9, 0.25) + '" fill="' + r.c2 + '"/>' +
        '<circle cx="214" cy="98" r="7" fill="#b8323a"/><path d="M214,92 c2,-8 8,-10 12,-12" stroke="#3f6a2a" stroke-width="2" fill="none"/>' +
        '<rect x="188" y="208" width="24" height="18" fill="rgba(255,255,255,.6)"/>' +
        scatter(a.rnd, 8, 200, 104, 40, 8, function (x, y) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="4" height="2" fill="' + shade(r.c1, -0.1) + '"/>'; });
    },
    tray: function (r, a) {
      var s = '<rect x="58" y="96" width="290" height="132" rx="14" fill="rgba(60,40,20,.2)"/><rect x="52" y="86" width="290" height="132" rx="14" fill="#5a4a40"/>' +
        '<rect x="62" y="94" width="270" height="116" rx="18" fill="url(#' + a.id + 'f)"/>';
      for (var i = 0; i < 24; i++) { var x = 80 + (i % 8) * 33 + a.rnd() * 6, y = 112 + Math.floor(i / 8) * 34 + a.rnd() * 6; s += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="6" ry="4.5" fill="' + shade(r.c1, -0.22) + '"/>'; }
      return s + scatter(a.rnd, 9, 197, 152, 120, 48, function (x, y) { return '<path d="M' + x.toFixed(1) + ',' + y.toFixed(1) + ' l14,-4" stroke="' + r.c2 + '" stroke-width="3" stroke-linecap="round"/>'; }) +
        scatter(a.rnd, 18, 197, 152, 125, 50, function (x, y) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="2.5" height="2.5" fill="#fff" opacity=".8"/>'; });
    }
  };

  /* Main: returns an SVG string */
  H.art = function (r, opt) {
    opt = opt || {};
    var id = 'a' + (++uid), rnd = U.rng(U.hash(r.id || r.title) || 7);
    var c1 = r.c1 || '#d9a441', c2 = r.c2 || '#5f8452';
    var bg1 = shade(c1, 0.72), bg2 = shade(c2, 0.62);
    var bowlCols = ['#f4efe6', '#e6d3b3', '#d9e3dc', '#e9dccb', '#c9d6e3', '#f0d9c9'];
    var a = { id: id, rnd: rnd, bowl: bowlCols[U.hash(r.id + 'b') % bowlCols.length], plate: '#fbf7ef' };
    var kind = DISH[r.art] ? r.art : 'bowl';
    var hot = r.hot && opt.steam !== false;
    var tex = '';
    for (var i = 0; i < 9; i++) tex += '<path d="M0,' + (i * 36 + 8) + ' C120,' + (i * 36 + 2 + rnd() * 10) + ' 280,' + (i * 36 + 14) + ' 400,' + (i * 36 + 6) + '" stroke="#fff" stroke-opacity=".12" stroke-width="1.2" fill="none"/>';
    return '<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration of ' + U.esc(r.title) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + bg1 + '"/><stop offset="1" stop-color="' + bg2 + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'l" cx=".25" cy=".15" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a.bowl + '"/><stop offset="1" stop-color="' + shade(a.bowl, -0.22) + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'f" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="' + shade(c1, 0.18) + '"/><stop offset="1" stop-color="' + shade(c1, -0.12) + '"/></radialGradient></defs>' +
      '<rect width="400" height="300" fill="url(#' + id + 'g)"/>' + tex +
      '<circle cx="' + (330 + rnd() * 40) + '" cy="' + (40 + rnd() * 30) + '" r="' + (40 + rnd() * 30) + '" fill="' + shade(c2, 0.4) + '" opacity=".35"/>' +
      '<path d="M0,250 C120,238 280,262 400,246 L400,300 L0,300Z" fill="' + shade(c1, 0.55) + '" opacity=".55"/>' +
      DISH[kind](r, a) + (hot ? steam(200, kind === 'mug' ? 90 : 118, 70) : '') +
      '<rect width="400" height="300" fill="url(#' + id + 'l)"/></svg>';
  };

  /* Small hand-drawn icons */
  var I = {
    heart: '<path d="M12 20.5c-.4 0-8.4-5-8.5-10.8C3.4 6.3 6 4.2 8.4 4.4c1.6.1 2.9 1.1 3.6 2.4.8-1.4 2.2-2.4 3.8-2.4 2.5 0 4.8 2.2 4.6 5.4-.3 5.8-8 10.7-8.4 10.7z"/>',
    clock: '<path d="M12 3.2c5 .1 8.9 3.9 8.8 8.9-.1 4.9-4 8.7-8.9 8.7-5-.1-8.8-4-8.7-9 .1-4.8 3.9-8.7 8.8-8.6z"/><path d="M12 7.2v5.1l3.3 2"/>',
    users: '<path d="M8.8 11.2c2 0 3.3-1.6 3.2-3.4-.1-1.8-1.5-3.2-3.3-3.1-1.8 0-3.2 1.5-3.1 3.3 0 1.8 1.4 3.2 3.2 3.2zM2.8 19.6c.4-3.6 3-5.6 6-5.6s5.6 2 6 5.6M16 5c1.6.2 2.8 1.6 2.7 3.2-.1 1.4-1.1 2.6-2.5 2.9M17.6 14.2c2 .6 3.4 2.4 3.6 5.2"/>',
    pot: '<path d="M4 10.5c5-.4 11-.5 16 0-.3 5.6-3.3 9.2-8 9.2s-7.7-3.6-8-9.2zM2.5 10.6h19M8.5 7.5c-1-1.5 1-2.2 0-4M12 7.5c-1-1.5 1-2.2 0-4M15.5 7.5c-1-1.5 1-2.2 0-4"/>',
    print: '<path d="M7 9V3.6h10V9M6.6 17.5H4.2c-.6 0-1-.4-1-1v-6.3c0-.7.5-1.2 1.2-1.2h15.3c.7 0 1.1.5 1.1 1.2v6.3c0 .6-.4 1-1 1h-2.3M7 14.3h10V21H7z"/>',
    share: '<path d="M17.8 8.2c1.5 0 2.7-1.2 2.7-2.6S19.3 3 17.8 3s-2.6 1.2-2.6 2.6 1.1 2.6 2.6 2.6zM6.2 14.7c1.5 0 2.6-1.2 2.6-2.6S7.7 9.4 6.2 9.4 3.5 10.6 3.5 12s1.2 2.7 2.7 2.7zM17.8 21c1.5 0 2.6-1.1 2.6-2.6 0-1.4-1.1-2.6-2.6-2.6s-2.6 1.2-2.6 2.6c0 1.5 1.1 2.6 2.6 2.6zM8.5 13.3l7 3.9M15.4 6.9l-6.9 3.8"/>',
    plus: '<path d="M12 4.5c.1 5 0 10 0 15M4.5 12.1c5-.1 10 0 15 0"/>',
    leaf: '<path d="M4.5 19.5C4 10 9.5 4.5 19.6 4.4c.4 9.6-5 15.3-15.1 15.1zM4.5 19.5C8 15 11.5 12 15 9.5"/>',
    flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.6-8.6 1.7 1.3 2.2 3 2.2 4.4 1.4-1.4 1.9-3.7 1.7-6.6 3.4 2.2 5.5 6 5.5 10.2 0 4-2.6 6.8-6.5 6.8z"/>',
    timer: '<path d="M12 6.2c4.3 0 7.6 3.3 7.6 7.5s-3.3 7.6-7.6 7.6-7.5-3.4-7.5-7.6S7.8 6.2 12 6.2zM9.8 2.8h4.4M12 9.6v4.2M18 7.3l1.6-1.5"/>',
    speaker: '<path d="M4 9.4h3.4L12 5.3v13.4l-4.6-4.1H4zM15.6 9c1 .9 1.4 1.9 1.4 3s-.4 2.1-1.4 3M18 6.4c1.8 1.5 2.7 3.4 2.7 5.6 0 2.2-.9 4.1-2.7 5.6"/>',
    check: '<path d="M4.5 12.6c1.8 1.7 3.4 3.4 4.9 5.2 3.1-4.4 6.4-8.4 10.2-11.8"/>',
    calendar: '<path d="M4.2 6.3c5.2-.3 10.4-.3 15.6 0 .3 4.6.3 9.2 0 13.8-5.2.3-10.4.3-15.6 0-.3-4.6-.3-9.2 0-13.8zM4.2 10.5h15.6M8.3 3.5v4.4M15.7 3.5v4.4"/>',
    basket: '<path d="M3.4 9.5h17.2l-1.9 9.3c-.1.7-.7 1.2-1.4 1.2H6.7c-.7 0-1.3-.5-1.4-1.2zM7.5 9.5l3-6M16.5 9.5l-3-6M9 13v3.6M15 13v3.6M12 13v3.6"/>',
    trash: '<path d="M4.5 6.6h15M9.5 6.4V3.8h5v2.6M6.3 6.6l.9 13.6h9.6l.9-13.6"/>',
    search: '<path d="M10.5 3.8c3.8 0 6.8 3 6.7 6.8-.1 3.7-3 6.6-6.8 6.5-3.7 0-6.6-3-6.5-6.7.1-3.7 3-6.6 6.6-6.6zM15.4 15.6l5 4.8"/>',
    arrowL: '<path d="M14.8 5.2c-2.4 2.3-4.6 4.6-6.8 6.9 2.3 2.2 4.5 4.5 6.8 6.8"/>',
    arrowR: '<path d="M9.2 5.2c2.4 2.3 4.6 4.6 6.8 6.9-2.3 2.2-4.5 4.5-6.8 6.8"/>',
    close: '<path d="M5.5 5.6c4.3 4.2 8.6 8.5 13 12.8M18.5 5.5c-4.3 4.4-8.6 8.7-13 13"/>',
    note: '<path d="M5 3.8h10.5l3.6 3.6v12.8H5zM15.2 3.9v3.8h3.8M8.3 12h7.5M8.3 15.6h5.2"/>',
    sun: '<path d="M12 7.6c2.5 0 4.4 2 4.4 4.4s-2 4.4-4.4 4.4-4.4-2-4.4-4.4 1.9-4.4 4.4-4.4zM12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    egg: '<path d="M12 3.4c3.4 0 6.4 5.4 6.4 10 0 4-2.8 6.9-6.4 6.9s-6.4-2.9-6.4-6.9c0-4.6 3-10 6.4-10z"/>',
    camera: '<path d="M3.5 8.2c0-.8.6-1.4 1.4-1.4h2.6L9 4.6h6l1.5 2.2h2.6c.8 0 1.4.6 1.4 1.4v10c0 .8-.6 1.4-1.4 1.4H4.9c-.8 0-1.4-.6-1.4-1.4zM12 10c2 0 3.5 1.5 3.5 3.4S14 16.9 12 16.9s-3.5-1.5-3.5-3.5S10 10 12 10z"/>'
  };
  H.icon = function (name, size) {
    return '<svg class="ico" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (I[name] || I.pot) + '</svg>';
  };
})();

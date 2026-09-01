/* Dibu — la portada es una lámina. Relleno por toque en JavaScript puro. */
(function () {
  'use strict';

  var canvas = document.getElementById('lamina');
  if (!canvas || !canvas.getContext) return;

  var sheet = canvas.parentElement;
  var src = canvas.getAttribute('data-src');
  var THRESHOLD = 128;               // luminancia por debajo de la cual un píxel es "trazo"
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = canvas.width, H = canvas.height;
  var ctx = canvas.getContext('2d');

  // Capa de rellenos (colores) y capa de línea (la lámina original).
  var fills = document.createElement('canvas');
  fills.width = W; fills.height = H;
  var fctx = fills.getContext('2d', { willReadFrequently: true });

  var lineImg = new Image();
  var barrier = null;                 // Uint8Array: 1 = trazo negro (no se puede rellenar)
  var pending = [];                   // rellenos en animación
  var raf = 0;
  var currentColor = null;
  var palette = [];

  // ---------- Paleta ----------
  var ceras = document.querySelectorAll('.cera');
  Array.prototype.forEach.call(ceras, function (b, i) {
    var c = b.getAttribute('data-color');
    palette.push(c);
    if (b.getAttribute('aria-pressed') === 'true') currentColor = c;
    b.addEventListener('click', function () { selectColor(b); });
  });
  if (!currentColor && ceras.length) selectColor(ceras[0]);

  function selectColor(btn) {
    Array.prototype.forEach.call(ceras, function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    currentColor = btn.getAttribute('data-color');
    setCursor(currentColor);
  }

  function setCursor(color) {
    // Cursor con forma de cera del color elegido (solo ratón; en táctil no se ve).
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
      '<path d="M6 26 L20 12 L26 18 L12 32Z" fill="' + color + '" stroke="#141414" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M2 30 L6 26 L12 32Z" fill="#141414"/>' +
      '<path d="M20 12 L24 8 L30 14 L26 18Z" fill="#fff" stroke="#141414" stroke-width="2" stroke-linejoin="round"/></svg>';
    canvas.style.cursor = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") 3 29, crosshair';
  }

  // ---------- Carga de la lámina ----------
  lineImg.onload = function () {
    var tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    var tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.fillStyle = '#fff';
    tctx.fillRect(0, 0, W, H);
    tctx.drawImage(lineImg, 0, 0, W, H);
    var d = tctx.getImageData(0, 0, W, H).data;
    barrier = new Uint8Array(W * H);
    for (var i = 0, p = 0; i < barrier.length; i++, p += 4) {
      var lum = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
      if (lum < THRESHOLD) barrier[i] = 1;
    }
    fctx.fillStyle = '#fff';
    fctx.fillRect(0, 0, W, H);
    render();
    sheet.setAttribute('data-ready', '');
  };
  lineImg.onerror = function () {
    var l = sheet.querySelector('.loading');
    if (l) l.textContent = '✕';
  };
  lineImg.src = src;

  // ---------- Render ----------
  function render() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(fills, 0, 0);
    var now = performance.now();
    for (var i = pending.length - 1; i >= 0; i--) {
      var p = pending[i];
      var t = Math.min(1, (now - p.start) / p.dur);
      var e = 1 - Math.pow(1 - t, 3);   // ease-out
      ctx.globalAlpha = e;
      ctx.drawImage(p.canvas, p.x, p.y);
      if (t >= 1) {
        ctx.globalAlpha = 1;
        fctx.drawImage(p.canvas, p.x, p.y);   // consolidar en la capa de rellenos
        pending.splice(i, 1);
      }
    }
    ctx.globalAlpha = 1;
    if (barrier) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(lineImg, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    raf = 0;
    if (pending.length) kick();
  }
  // Si la pestaña está oculta, requestAnimationFrame no se dispara: usamos un temporizador.
  function kick() {
    if (raf) return;
    if (document.hidden) raf = setTimeout(function () { raf = 0; render(); }, 16);
    else raf = requestAnimationFrame(render);
  }

  // ---------- Relleno por scanline ----------
  // Devuelve {x,y,w,h,canvas} con la región conectada desde (sx,sy), o null si es trazo.
  function floodRegion(sx, sy, color) {
    if (!barrier) return null;
    var start = sy * W + sx;
    if (barrier[start]) return null;
    var visited = new Uint8Array(W * H);
    var stack = [sx, sy];
    var minX = sx, maxX = sx, minY = sy, maxY = sy;
    var count = 0;
    var spans = [];   // tríos [y, x1, x2]

    while (stack.length) {
      var y = stack.pop(), x = stack.pop();
      var row = y * W;
      if (visited[row + x] || barrier[row + x]) continue;
      // extender a izquierda y derecha
      var x1 = x, x2 = x;
      while (x1 > 0 && !barrier[row + x1 - 1] && !visited[row + x1 - 1]) x1--;
      while (x2 < W - 1 && !barrier[row + x2 + 1] && !visited[row + x2 + 1]) x2++;
      for (var i = x1; i <= x2; i++) visited[row + i] = 1;
      spans.push(y, x1, x2);
      count += x2 - x1 + 1;
      if (x1 < minX) minX = x1; if (x2 > maxX) maxX = x2;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      // sembrar filas vecinas
      if (y > 0) seedRow(y - 1, x1, x2, stack, visited);
      if (y < H - 1) seedRow(y + 1, x1, x2, stack, visited);
    }
    if (!count) return null;

    var w = maxX - minX + 1, h = maxY - minY + 1;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var cc = c.getContext('2d');
    var img = cc.createImageData(w, h);
    var rgb = hexToRgb(color);
    var data = img.data;
    for (var s = 0; s < spans.length; s += 3) {
      var yy = spans[s] - minY, a = spans[s + 1] - minX, b = spans[s + 2] - minX;
      var base = yy * w;
      for (var xx = a; xx <= b; xx++) {
        var q = (base + xx) * 4;
        data[q] = rgb[0]; data[q + 1] = rgb[1]; data[q + 2] = rgb[2]; data[q + 3] = 255;
      }
    }
    cc.putImageData(img, 0, 0);
    return { x: minX, y: minY, w: w, h: h, canvas: c, size: count };
  }

  function seedRow(y, x1, x2, stack, visited) {
    var row = y * W, inside = false;
    for (var x = x1; x <= x2; x++) {
      var free = !barrier[row + x] && !visited[row + x];
      if (free && !inside) { stack.push(x, y); inside = true; }
      else if (!free) inside = false;
    }
  }

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function paint(sx, sy, color, dur) {
    var r = floodRegion(sx, sy, color);
    if (!r) return false;
    if (reduceMotion) dur = 0;
    if (dur <= 0) {
      fctx.drawImage(r.canvas, r.x, r.y);
      kick();
    } else {
      r.start = performance.now();
      r.dur = dur;
      pending.push(r);
      kick();
    }
    return true;
  }

  // ---------- Entrada: ratón y dedo ----------
  var down = null;
  function toCanvas(ev) {
    var rect = canvas.getBoundingClientRect();
    var x = Math.floor((ev.clientX - rect.left) / rect.width * W);
    var y = Math.floor((ev.clientY - rect.top) / rect.height * H);
    return [Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y))];
  }
  if (window.PointerEvent) {
    canvas.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      down = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    });
    canvas.addEventListener('pointerup', function (ev) {
      if (!down || down.id !== ev.pointerId) return;
      var moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
      down = null;
      if (moved > 12) return;          // el usuario estaba haciendo scroll
      var p = toCanvas(ev);
      paint(p[0], p[1], currentColor, 260);
    });
    canvas.addEventListener('pointercancel', function () { down = null; });
  } else {
    canvas.addEventListener('click', function (ev) {
      var p = toCanvas(ev);
      paint(p[0], p[1], currentColor, 260);
    });
    canvas.addEventListener('touchend', function (ev) {
      var t = ev.changedTouches[0];
      var p = toCanvas(t);
      paint(p[0], p[1], currentColor, 260);
    });
  }

  // ---------- Botones ----------
  var clearBtn = document.getElementById('borrar');
  var surpriseBtn = document.getElementById('sorpresa');
  var surpriseTimer = 0;

  if (clearBtn) clearBtn.addEventListener('click', function () {
    pending.length = 0;
    clearTimeout(surpriseTimer);
    fctx.fillStyle = '#fff';
    fctx.fillRect(0, 0, W, H);
    kick();
  });

  if (surpriseBtn) surpriseBtn.addEventListener('click', function () {
    if (!barrier) return;
    clearTimeout(surpriseTimer);
    // Buscar hasta 14 zonas distintas de tamaño razonable, empezando en puntos aleatorios.
    var seen = new Uint8Array(W * H);
    var picks = [];
    var tries = 0;
    while (picks.length < 14 && tries < 400) {
      tries++;
      var x = 40 + Math.floor(Math.random() * (W - 80));
      var y = 40 + Math.floor(Math.random() * (H - 80));
      var idx = y * W + x;
      if (barrier[idx] || seen[idx]) continue;
      var r = floodRegion(x, y, '#000');
      if (!r) continue;
      // marcar la región como vista para no repetirla
      var rd = r.canvas.getContext('2d').getImageData(0, 0, r.w, r.h).data;
      for (var yy = 0; yy < r.h; yy++) for (var xx = 0; xx < r.w; xx++) {
        if (rd[(yy * r.w + xx) * 4 + 3]) seen[(r.y + yy) * W + (r.x + xx)] = 1;
      }
      if (r.size < 400) continue;               // demasiado pequeña
      if (r.size > W * H * 0.45) continue;       // el fondo entero: lo dejamos para el final
      picks.push([x, y]);
    }
    var i = 0;
    var lastColor = null;
    function step() {
      if (i >= picks.length) return;
      var c;
      do { c = palette[Math.floor(Math.random() * palette.length)]; } while (c === lastColor && palette.length > 1);
      lastColor = c;
      paint(picks[i][0], picks[i][1], c, reduceMotion ? 0 : 420);
      i++;
      surpriseTimer = setTimeout(step, reduceMotion ? 0 : 140);
    }
    step();
  });

  setCursor(currentColor);
})();

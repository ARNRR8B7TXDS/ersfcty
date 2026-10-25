/* Circular Carousel, vanilla JS port.
   Original React component by David Haz, React Bits (reactbits.dev), MIT + Commons Clause. */
(function () {
var PRESETS = {
  cylinder: { axis: 'y', tilt: -5, perspective: 2500, curve: 1, spread: 1, inward: false, billboard: false, backfaces: true, window: 0 },
  orbit: { axis: 'y', tilt: -16, perspective: 1500, curve: 0, spread: 1.45, inward: false, billboard: true, backfaces: false, window: 0 },
  wheel: { axis: 'x', tilt: 0, perspective: 1800, curve: 0, spread: 1, inward: false, billboard: false, backfaces: true, window: 1.7 },
  panorama: { axis: 'y', tilt: 0, perspective: 0, curve: 1, spread: 1, inward: true, billboard: false, backfaces: false, window: 0 }
};
var INTRO_LENGTH = { assemble: 1500, rise: 1400, spin: 1800, none: 0 };
var TILES = 8, OVERLAP = 2.5, DRAG_THRESHOLD = 5, SPRING = 118, SETTLE_SPEED = 9, CAPTION_SPACE = 76, TO_RAD = Math.PI / 180;
var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
var wrap = function (d) { return ((((d + 180) % 360) + 360) % 360) - 180; };
var easeOut = function (t) { return 1 - Math.pow(1 - t, 4); };
var easeOutQuint = function (t) { return 1 - Math.pow(1 - t, 5); };
var fa = function (n) { return Number(n).toLocaleString('fa-IR'); };
function rotateX(p, deg) { var r = deg * TO_RAD, c = Math.cos(r), s = Math.sin(r); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
function rotateY(p, deg) { var r = deg * TO_RAD, c = Math.cos(r), s = Math.sin(r); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

function CircularCarousel(root, opts) {
  var o = Object.assign({ items: [], preset: 'cylinder', intro: 'rise', cardWidth: 220, aspectRatio: 1, gap: 25, autoplay: 'drift', speed: 14, interval: 3, direction: 'left', draggable: true, momentum: 0.6, snap: true, pauseOnHover: true, focusOnClick: true, parallax: 0.3, stretch: 0.5, depthFade: 0.55, fadeColor: '#000000', innerShade: 0.6, cornerRadius: 12, captions: false, onChange: null, onItemClick: null }, opts || {});
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var list = o.items, count = list.length;
  if (!count) return { destroy: function () {} };
  var shape = PRESETS[o.preset] ? o.preset : 'cylinder', layout = PRESETS[shape], axis = layout.axis;
  var tilt = o.tilt != null ? o.tilt : layout.tilt;
  var curveValue = layout.billboard ? 0 : clamp(o.curve != null ? o.curve : layout.curve, 0, 1);
  var cardW = Math.max(40, o.cardWidth), cardH = cardW / clamp(o.aspectRatio, 0.2, 5);
  var along = axis === 'x' ? cardH : cardW, step = 360 / count;
  var n = Math.max(count, 3), pitch = (along + o.gap) * layout.spread;
  var chord = pitch / (2 * Math.sin(Math.PI / n)), arc = (n * pitch) / (2 * Math.PI);
  var radius = Math.max(chord + (arc - chord) * curveValue, along * 0.6);

  var total = curveValue > 0.001 ? TILES : 1, length = along / total, bend = curveValue > 0.001 ? radius / curveValue : 0;
  var tiles = [];
  for (var ti = 0; ti < total; ti++) {
    var start = ti * length - (ti > 0 ? OVERLAP / 2 : 0);
    var end = (ti + 1) * length + (ti < total - 1 ? OVERLAP / 2 : 0);
    var center = (start + end) / 2 - along / 2;
    var alpha = bend ? center / bend : 0;
    var shift = bend ? bend * Math.sin(alpha) : center;
    var sink = bend ? bend * (1 - Math.cos(alpha)) : 0;
    var depth = layout.inward ? sink : -sink;
    var turn = ((layout.inward ? -alpha : alpha) * 180) / Math.PI;
    var move = axis === 'x'
      ? 'translate3d(0px, ' + shift + 'px, ' + depth + 'px) rotateX(' + (-turn) + 'deg)'
      : 'translate3d(' + shift + 'px, 0px, ' + depth + 'px) rotateY(' + turn + 'deg)';
    tiles.push({ index: ti, total: total, start: start, end: end, size: end - start, move: move });
  }

  var s = {
    count: count, step: step, radius: radius, layout: layout, axis: axis, tilt: tilt,
    perspective: layout.inward ? radius : (o.perspective != null ? o.perspective : layout.perspective),
    cardW: cardW, cardH: cardH,
    intro: reduced ? 'none' : (o.intro in INTRO_LENGTH ? o.intro : 'rise'),
    autoplay: reduced ? 'off' : o.autoplay, speed: o.speed, interval: Math.max(0.5, o.interval),
    draggable: o.draggable, momentum: clamp(o.momentum, 0, 1), snap: o.snap, pauseOnHover: o.pauseOnHover,
    parallax: reduced ? 0 : clamp(o.parallax, 0, 1), stretch: reduced ? 0 : clamp(o.stretch, 0, 1),
    depthFade: clamp(o.depthFade, 0, 1), captions: o.captions, reduced: reduced
  };
  var dragSign = layout.inward ? -1 : 1, directionSign = (o.direction === 'right' ? 1 : -1) * dragSign;
  var state = { angle: 0, velocity: 0, target: null, dir: directionSign, press: null, drag: false, hover: false, pointer: { inside: false, x: 0, y: 0 }, yaw: 0, pitch: 0, intro: null, introDone: false, holdUntil: 0, stepAt: 0, suppressClick: false, wheelTimer: 0, fit: 1, shift: 0, drop: 0, last: 0 };
  var ready = false, active = 0, raf = 0, visible = true, destroyed = false;

  /* ---------- DOM ---------- */
  root.classList.add('circular-carousel');
  root.setAttribute('dir', 'ltr');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carousel');
  root.setAttribute('aria-label', 'چرخ‌فلک تصاویر');
  root.tabIndex = 0;
  root.dataset.axis = axis;
  root.dataset.shape = shape;
  if (o.draggable) root.setAttribute('data-draggable', '');
  root.style.setProperty('--cc-fade', o.fadeColor);
  root.style.setProperty('--cc-radius', Math.max(0, o.cornerRadius) + 'px');
  root.style.setProperty('--cc-inner', (1 - clamp(o.innerShade, 0, 1)).toFixed(3));
  var view = el('div', 'circular-carousel__view', root);
  var stage = el('div', 'circular-carousel__stage', view);
  var camera = el('div', 'circular-carousel__camera', stage);
  var ring = el('div', 'circular-carousel__ring', camera);
  var cards = [];

  function tileEl(item, tile, back) {
    var strip = back ? tile.total - 1 - tile.index : tile.index;
    var first = strip === 0, last = strip === tile.total - 1, r = 'var(--cc-radius)';
    var frameRadius = axis === 'x'
      ? (first ? r : 0) + ' ' + (first ? r : 0) + ' ' + (last ? r : 0) + ' ' + (last ? r : 0)
      : (first ? r : 0) + ' ' + (last ? r : 0) + ' ' + (last ? r : 0) + ' ' + (first ? r : 0);
    var offset = back ? along - tile.end : tile.start, size = tile.size;
    var box = axis === 'x' ? { left: -cardW / 2, top: -size / 2, width: cardW, height: size } : { left: -size / 2, top: -cardH / 2, width: size, height: cardH };
    var photo = axis === 'x' ? { left: 0, top: -offset, width: cardW, height: cardH } : { left: -offset, top: 0, width: cardW, height: cardH };
    var flip = axis === 'x' ? ' rotateX(180deg)' : ' rotateY(180deg)';
    var t = el('div', 'circular-carousel__tile');
    t.setAttribute('aria-hidden', 'true');
    t.style.left = box.left + 'px'; t.style.top = box.top + 'px'; t.style.width = box.width + 'px'; t.style.height = box.height + 'px';
    t.style.transform = tile.move + (back ? flip : '');
    var frame = el('div', 'circular-carousel__frame', t);
    frame.style.height = (axis === 'x' ? size : cardH) + 'px';
    frame.style.borderRadius = frameRadius;
    var img = el('img', 'circular-carousel__photo', frame);
    img.src = item.src; img.alt = ''; img.draggable = false; img.decoding = 'async';
    img.style.left = photo.left + 'px'; img.style.top = photo.top + 'px'; img.style.width = photo.width + 'px'; img.style.height = photo.height + 'px';
    if (back) el('div', 'circular-carousel__inner', frame);
    el('div', 'circular-carousel__shade', frame);
    return t;
  }
  list.forEach(function (item, index) {
    var card = el('div', 'circular-carousel__card', ring);
    card.setAttribute('data-cc-index', index);
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', (item.title || item.alt || 'تصویر ' + fa(index + 1)) + '، ' + fa(index + 1) + ' از ' + fa(count));
    tiles.forEach(function (tile) { card.appendChild(tileEl(item, tile, false)); });
    if (layout.backfaces) tiles.forEach(function (tile) { card.appendChild(tileEl(item, tile, true)); });
    cards.push(card);
  });

  var capTitle = null, reels = [];
  if (o.captions) {
    var cap = el('div', 'circular-carousel__caption', root);
    cap.setAttribute('aria-hidden', 'true');
    capTitle = el('span', '', cap);
    var cnt = el('span', 'circular-carousel__count', cap);
    var dg = el('span', 'circular-carousel__digits', cnt);
    for (var d = 0; d < 2; d++) {
      var digit = el('span', 'circular-carousel__digit', dg), reel = el('span', 'circular-carousel__reel', digit);
      for (var k = 0; k < 10; k++) el('span', '', reel).textContent = fa(k);
      reels.push(reel);
    }
    el('span', 'circular-carousel__slash', cnt).textContent = '/';
    el('span', '', cnt).textContent = fa(Math.floor(count / 10)) + fa(count % 10);
  }
  var live = el('div', 'circular-carousel__live', root);
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');

  function updateCaption() {
    var cur = list[active] || list[0];
    var label = cur.title || cur.alt || 'تصویر ' + fa(active + 1);
    if (capTitle) {
      capTitle.innerHTML = '';
      var t = el('span', 'circular-carousel__title', capTitle);
      t.appendChild(document.createTextNode(cur.title || cur.alt || ''));
      if (cur.subtitle) el('span', 'circular-carousel__subtitle', t).textContent = cur.subtitle;
      var digits = String(active + 1).padStart(2, '0');
      reels.forEach(function (r, i) { r.style.transform = 'translateY(' + (-Number(digits[i]) * 10) + '%)'; });
    }
    live.textContent = label + '، ' + fa(active + 1) + ' از ' + fa(count);
  }
  updateCaption();

  /* ---------- layout / motion ---------- */
  function nearest(angle) { return Math.round(angle / s.step) * s.step; }

  function measure() {
    var rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var room = s.captions ? CAPTION_SPACE : 0, width = rect.width * 0.94, height = (rect.height - room) * 0.92, P = s.perspective;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    if (s.layout.inward) { minX = -width / 2; maxX = width / 2; minY = -s.cardH / 2; maxY = s.cardH / 2; }
    else {
      var corners = [[-s.cardW / 2, -s.cardH / 2], [s.cardW / 2, -s.cardH / 2], [-s.cardW / 2, s.cardH / 2], [s.cardW / 2, s.cardH / 2]];
      var limit = s.layout.window ? s.layout.window * s.step : 180;
      for (var a = -limit; a <= limit; a += limit / 24) {
        for (var ci = 0; ci < 4; ci++) {
          var cx = corners[ci][0], cy = corners[ci][1], p;
          if (s.axis === 'x') p = rotateY(rotateX([cx, cy, s.radius], -a), s.tilt);
          else if (s.layout.billboard) { var c = rotateY([0, 0, s.radius], a); p = rotateX([c[0] + cx, cy, c[2]], s.tilt); }
          else p = rotateX(rotateY([cx, cy, s.radius], a), s.tilt);
          p = [p[0], p[1], p[2] - s.radius];
          if (p[2] >= P * 0.95) continue;
          var kk = P / (P - p[2]);
          minX = Math.min(minX, p[0] * kk); maxX = Math.max(maxX, p[0] * kk);
          minY = Math.min(minY, p[1] * kk); maxY = Math.max(maxY, p[1] * kk);
        }
      }
    }
    var spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
    var fit = Math.min(1, width / spanX, height / spanY);
    state.fit = fit;
    state.shift = -((minY + maxY) / 2) * fit - room / 2;
    state.drop = s.axis === 'x' ? (rect.width / fit) * 0.55 + s.cardW : (rect.height / fit) * 0.55 + s.cardH;
    stage.style.perspective = P + 'px';
    stage.style.transform = 'translate3d(0, ' + state.shift + 'px, 0) scale(' + fit + ')';
  }

  function introCard(elapsed, landing) {
    if (!state.intro) return { radius: 1, lift: 0 };
    var type = state.intro.type, reach = Math.abs(wrap(landing + state.angle)), p;
    if (type === 'assemble') { p = easeOut(clamp((elapsed - (reach / 180) * 420) / 1080, 0, 1)); return { radius: 1 + 0.6 * (1 - p), lift: 0 }; }
    if (type === 'rise') { p = easeOutQuint(clamp((elapsed - (reach / 180) * 480) / 900, 0, 1)); return { radius: 1, lift: (1 - p) * state.drop }; }
    if (type === 'spin') { p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1)); return { radius: 1 + 0.28 * (1 - p), lift: 0 }; }
    return { radius: 1, lift: 0 };
  }

  function advance(dt, now) {
    if (!state.introDone && ready) {
      if (!state.intro) { if (s.intro === 'none') state.introDone = true; else state.intro = { type: s.intro, start: now }; }
      if (state.intro && now - state.intro.start >= INTRO_LENGTH[state.intro.type]) { state.intro = null; state.introDone = true; }
    }
    var paused = (s.pauseOnHover && state.hover) || state.drag || now < state.holdUntil;
    var cruise = s.autoplay === 'drift' && !paused && !state.intro ? s.speed * state.dir : 0;
    var busy = Boolean(state.intro) || state.drag;
    if (state.drag || state.intro) {
      state.velocity = state.drag ? state.velocity : 0;
    } else if (state.target !== null) {
      var remaining = dt, damping = 2 * Math.sqrt(SPRING);
      while (remaining > 0) {
        var h = Math.min(remaining, 1 / 240);
        state.velocity += (SPRING * (state.target - state.angle) - damping * state.velocity) * h;
        state.angle += state.velocity * h;
        remaining -= h;
      }
      if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) { state.angle = state.target; state.velocity = 0; state.target = null; }
      busy = true;
    } else {
      var tau = 0.18 + s.momentum * 1.5;
      state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / tau));
      state.angle += state.velocity * dt;
      if (cruise === 0 && s.snap && Math.abs(state.velocity) < SETTLE_SPEED) state.target = nearest(state.angle);
      busy = busy || cruise !== 0 || Math.abs(state.velocity) > 0.01 || state.target !== null;
    }
    if (s.autoplay === 'step' && !paused && !state.intro && state.introDone) {
      if (!state.stepAt) state.stepAt = now + s.interval * 1000;
      if (now >= state.stepAt) {
        state.target = (state.target !== null ? state.target : nearest(state.angle)) + s.step * state.dir;
        state.stepAt = now + s.interval * 1000;
      }
      busy = true;
    } else state.stepAt = 0;
    if (now < state.holdUntil) busy = true;
    var ease = 1 - Math.exp(-dt / 0.35);
    var aimYaw = state.pointer.inside ? state.pointer.x * s.parallax * 9 : 0;
    var aimPitch = state.pointer.inside ? -state.pointer.y * s.parallax * 6 : 0;
    state.yaw += (aimYaw - state.yaw) * ease;
    state.pitch += (aimPitch - state.pitch) * ease;
    if (Math.abs(aimYaw - state.yaw) > 0.01 || Math.abs(aimPitch - state.pitch) > 0.01) busy = true;
    return busy;
  }

  function render(now) {
    var elapsed = state.intro ? now - state.intro.start : 0;
    var swell = 1 + s.stretch * 0.12 * Math.min(1, Math.abs(state.velocity) / 420);
    var spinOffset = 0, p;
    if (state.intro && state.intro.type === 'spin') { p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1)); spinOffset = -300 * state.dir * (1 - p); }
    else if (state.intro && state.intro.type === 'assemble') { p = easeOut(clamp(elapsed / INTRO_LENGTH.assemble, 0, 1)); spinOffset = -32 * state.dir * (1 - p); }
    var angle = state.angle + spinOffset, R = s.radius * swell;
    if (s.axis === 'x') {
      camera.style.transform = 'translate3d(0, 0, ' + (-R) + 'px) rotateY(' + (s.tilt + state.yaw) + 'deg) rotateX(' + state.pitch + 'deg)';
      ring.style.transform = 'rotateX(' + (-angle) + 'deg)';
    } else if (s.layout.inward) {
      camera.style.transform = 'translate3d(0, 0, ' + (s.perspective - 1) + 'px) rotateX(' + (s.tilt + state.pitch) + 'deg) rotateY(' + state.yaw + 'deg)';
      ring.style.transform = 'rotateY(' + angle + 'deg)';
    } else {
      camera.style.transform = 'translate3d(0, 0, ' + (-R) + 'px) rotateX(' + (s.tilt + state.pitch) + 'deg) rotateY(' + state.yaw + 'deg)';
      ring.style.transform = 'rotateY(' + angle + 'deg)';
    }
    for (var i = 0; i < s.count; i++) {
      var card = cards[i], base = i * s.step, mod = introCard(elapsed, base), r = R * mod.radius, tr;
      if (s.axis === 'x') tr = 'rotateX(' + (-base) + 'deg) translateZ(' + r + 'px)';
      else if (s.layout.inward) tr = 'rotateY(' + base + 'deg) translateZ(' + (-r) + 'px)';
      else {
        tr = 'rotateY(' + base + 'deg) translateZ(' + r + 'px)';
        if (s.layout.billboard) tr += ' rotateY(' + (-(base + angle)) + 'deg)';
      }
      if (mod.lift) tr += s.axis === 'x' ? ' translateX(' + mod.lift + 'px)' : ' translateY(' + mod.lift + 'px)';
      card.style.transform = tr;
      var world = wrap(base + angle), facing = Math.cos(world * TO_RAD);
      if (s.layout.inward) card.style.visibility = Math.abs(world) > 86 ? 'hidden' : '';
      card.style.setProperty('--cc-depth', (s.depthFade * Math.pow((1 - facing) / 2, 1.25)).toFixed(3));
    }
    var index = ((Math.round(-state.angle / s.step) % s.count) + s.count) % s.count || 0;
    if (index !== active) { active = index; updateCaption(); if (o.onChange) o.onChange(index); }
  }

  function frame(now) {
    raf = 0;
    if (destroyed) return;
    var dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60;
    state.last = now;
    var busy = advance(dt, now);
    render(now);
    if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
    else state.last = 0;
  }
  function wake() { if (!raf && !destroyed && visible && !document.hidden) raf = requestAnimationFrame(frame); }
  function onVisibility() { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; state.last = 0; } else wake(); }

  var ro = new ResizeObserver(function () { measure(); wake(); });
  ro.observe(root);
  var io = new IntersectionObserver(function (e) {
    visible = e[0].isIntersecting;
    if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; state.last = 0; }
  });
  io.observe(root);
  document.addEventListener('visibilitychange', onVisibility);

  /* ---------- interaction ---------- */
  function focusIndex(index) {
    var target = -index * s.step;
    target += 360 * Math.round((state.angle - target) / 360);
    state.target = target;
    state.holdUntil = performance.now() + 2800;
    wake();
  }
  function stepBy(delta) {
    var base = state.target !== null ? state.target : Math.round(state.angle / s.step) * s.step;
    state.target = base - delta * s.step * (s.layout.inward ? -1 : 1);
    state.holdUntil = performance.now() + 2800;
    wake();
  }
  root.addEventListener('wheel', function (event) {
    if (!s.draggable) return;
    var delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
    if (!delta) return;
    event.preventDefault();
    var perPixel = 180 / (Math.PI * s.radius * state.fit), sign = s.layout.inward ? -1 : 1;
    state.target = null;
    state.angle -= delta * perPixel * sign;
    state.velocity = -delta * perPixel * sign * 30;
    state.holdUntil = performance.now() + 1600;
    clearTimeout(state.wheelTimer);
    state.wheelTimer = setTimeout(function () { if (s.snap) state.target = nearest(state.angle + state.velocity * 0.12); wake(); }, 140);
    wake();
  }, { passive: false });
  root.addEventListener('pointerdown', function (event) {
    state.suppressClick = false;
    if (!s.draggable || event.button !== 0) return;
    state.press = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: state.angle, moved: false, origin: 0, samples: [{ time: performance.now(), angle: state.angle }] };
  });
  root.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'mouse') {
      state.pointer.inside = true;
      var rect = root.getBoundingClientRect();
      state.pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      state.pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    }
    var press = state.press;
    if (!press || press.id !== event.pointerId) { wake(); return; }
    var delta = s.axis === 'x' ? event.clientY - press.y : event.clientX - press.x;
    var cross = s.axis === 'x' ? event.clientX - press.x : event.clientY - press.y;
    if (!press.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      if (Math.abs(cross) > Math.abs(delta) * 1.2 && event.pointerType !== 'mouse') { state.press = null; return; }
      press.moved = true; press.origin = delta; state.drag = true; state.target = null; state.velocity = 0;
      root.setAttribute('data-dragging', '');
      try { root.setPointerCapture(event.pointerId); } catch (e) {}
    }
    var perPixel = 180 / (Math.PI * s.radius * state.fit);
    state.angle = press.angle + (delta - press.origin) * perPixel * (s.layout.inward ? -1 : 1);
    var now = performance.now();
    press.samples.push({ time: now, angle: state.angle });
    while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
    wake();
  });
  function release(event) {
    var press = state.press;
    if (!press || press.id !== event.pointerId) return;
    state.press = null;
    if (!press.moved) return;
    state.drag = false;
    root.removeAttribute('data-dragging');
    state.suppressClick = true;
    var first = press.samples[0], last = press.samples[press.samples.length - 1], span = (last.time - first.time) / 1000;
    var velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0;
    state.velocity = velocity;
    if (Math.abs(velocity) > 60) state.dir = Math.sign(velocity);
    var coasting = s.autoplay === 'drift' && !(s.pauseOnHover && state.hover && event.pointerType === 'mouse');
    if (s.snap && !coasting) {
      var tau = 0.18 + s.momentum * 1.5;
      state.target = Math.round((state.angle + velocity * tau * 0.55) / s.step) * s.step;
    }
    wake();
  }
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { state.hover = true; wake(); } });
  root.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { state.hover = false; state.pointer.inside = false; } wake(); });
  root.addEventListener('click', function (event) {
    if (state.suppressClick) { state.suppressClick = false; return; }
    var card = event.target.closest && event.target.closest('[data-cc-index]');
    if (!card) return;
    var index = Number(card.getAttribute('data-cc-index'));
    if (o.focusOnClick) focusIndex(index);
    if (o.onItemClick) o.onItemClick(list[index], index);
  });
  root.addEventListener('keydown', function (event) {
    var forward = axis === 'x' ? 'ArrowDown' : 'ArrowRight', backward = axis === 'x' ? 'ArrowUp' : 'ArrowLeft';
    if (event.key === forward) stepBy(1);
    else if (event.key === backward) stepBy(-1);
    else if (event.key === 'Home') focusIndex(0);
    else if (event.key === 'End') focusIndex(count - 1);
    else if (event.key === 'Enter' || event.key === ' ') { if (o.onItemClick) o.onItemClick(list[active], active); }
    else return;
    event.preventDefault();
  });

  /* ---------- start: wait for images, then play the intro ---------- */
  function load(src) {
    return new Promise(function (resolve) {
      var image = new Image();
      image.decoding = 'async';
      image.onload = function () { if (image.decode) image.decode().then(resolve, resolve); else resolve(); };
      image.onerror = resolve;
      image.src = src;
    });
  }
  measure();
  render(performance.now());
  Promise.race([Promise.all(list.slice(0, 16).map(function (i) { return load(i.src); })), new Promise(function (r) { setTimeout(r, 2400); })]).then(function () {
    if (destroyed) return;
    ready = true;
    root.setAttribute('data-ready', '');
    measure();
    wake();
  });

  return {
    destroy: function () {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      clearTimeout(state.wheelTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}
window.CircularCarousel = CircularCarousel;
})();

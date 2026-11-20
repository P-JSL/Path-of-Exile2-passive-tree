import { getBounds } from './tree-model.js';
import { ViewportIndex } from './spatial-index.js';
import { iconSpriteKey, nodeFrameKey, drawAtlasFrame, loadVisualAtlases, loadClassArt } from './visual-assets.js';

export class TreeRenderer {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!this.ctx) throw new Error('Canvas 2D를 지원하지 않는 브라우저입니다.');
    this.callbacks = callbacks;
    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map();
    this.viewportIndex = null;
    this.isInteracting = false;
    this.allocated = new Set();
    this.zoom = .03; this.centerX = 0; this.centerY = 0;
    this.width = 0; this.height = 0; this.selectedId = null; this.searchMatches = new Set(); this.searchActive = false;
    this.pointerMap = new Map(); this.pointerStart = null; this.pinchStart = null;
    this.isTouch = window.matchMedia('(pointer:coarse)').matches;
    this.pendingDraw = false;
    this.art = null;
    this.classArt = null;
    this.className = null;
    this.classStart = null;
    this.mode = 'passive';
    this.backgroundCache = new Map();
    // Rendering works immediately with the existing vector fallback.
    void loadVisualAtlases().then(art => { this.art = art; this.schedule(); })
      .catch(error => console.warn('Official tree art unavailable:', error));
    this.attachEvents();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement);
    this.resize();
  }
  setScene(nodes, allEdges, options = {}) {
    this.nodes = nodes;
    this.nodeMap = new Map(nodes.map(n => [n.id, n]));
    // Long-distance logical links (class → separate ascendancy tree, Pathfinder portals)
    // are not visible map connectors. Keep them in the model for path logic.
    this.edges = allEdges.filter(e => {
      const a = this.nodeMap.get(e.a), b = this.nodeMap.get(e.b);
      return a && b && Math.hypot(a.x - b.x, a.y - b.y) <= 3000;
    });
    this.orbitRadii = options.orbitRadii ?? [];
    this.viewportIndex = new ViewportIndex(this.nodes, this.edges, this.nodeMap, this.orbitRadii);
    this.mode = options.mode || 'passive';
    this.classStart = options.classStart ?? null;
    this.loadBackground(options.className);
    this.allocated = options.allocated ?? new Set();
    this.rootIds = new Set(Array.isArray(options.rootId) ? options.rootId : [options.rootId]);
    this.rootNeighborIds = new Set([...this.rootIds].flatMap(id =>
      (this.nodeMap.get(id)?.connections || []).map(link => Number(link.id))));
    this.weaponSet1 = options.weaponSet1 ?? new Set();
    this.weaponSet2 = options.weaponSet2 ?? new Set();
    this.lockedOracle = !!options.lockedOracle;
    this.selectedId = options.selectedId ?? null;
    this.localizeName = options.localizeName ?? (n => n.name);
    this.searchMatches = options.searchMatches ?? new Set();
    this.searchActive = !!options.searchActive;
    this.fitAll();
  }
  loadBackground(className) {
    if (!className || className === this.className) return;
    this.className = className;
    this.classArt = null;
    if (!this.backgroundCache.has(className)) {
      this.backgroundCache.set(className, loadClassArt(className)
        .catch(error => { console.warn('Class artwork unavailable:', error); return null; }));
    }
    void this.backgroundCache.get(className).then(art => {
      if (this.className === className) { this.classArt = art; this.schedule(); }
    });
  }
  drawClassBackground() {
    if (this.mode !== 'passive' || !this.classArt || !this.classStart) return;
    const root = this.nodeMap.get(this.classStart);
    if (!root) return;
    const center = this.toScreen(root.x, root.y);
    const size = 2100 * this.zoom;
    if (size < 22) return;
    const name = 'class' + this.className + ':Class0';
    this.ctx.save();
    this.ctx.globalAlpha = .84;
    drawAtlasFrame(this.ctx, this.classArt, name, center.x, center.y, size);
    this.ctx.restore();
  }
  update(options = {}) {
    if (options.allocated) this.allocated = options.allocated;
    if ('selectedId' in options) this.selectedId = options.selectedId;
    if ('lockedOracle' in options) this.lockedOracle = options.lockedOracle;
    if ('searchMatches' in options) this.searchMatches = options.searchMatches;
    if ('searchActive' in options) this.searchActive = !!options.searchActive;
    if (options.localizeName) this.localizeName = options.localizeName;
    this.schedule();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || (this.width === rect.width && this.height === rect.height)) return;
    const prevWidth = this.width;
    this.width = rect.width; this.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, this.isTouch ? 1.5 : 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!prevWidth && this.nodes.length) this.fitAll(); else this.schedule();
  }
  fitAll() {
    const box = getBounds(this.nodes, 600);
    this.centerX = (box.minX + box.maxX) / 2;
    this.centerY = (box.minY + box.maxY) / 2;
    if (this.width && this.height) {
      this.zoom = Math.max(.012, Math.min(1.8, Math.min((this.width - 35) / Math.max(box.maxX - box.minX, 1), (this.height - 35) / Math.max(box.maxY - box.minY, 1))));
    }
    this.schedule();
  }
  focus(x, y, zoom = null) {
    this.centerX = x; this.centerY = y;
    if (zoom !== null) this.zoom = Math.max(.012, Math.min(3, zoom));
    this.schedule();
  }
  zoomBy(factor, px = this.width / 2, py = this.height / 2) {
    const point = this.toWorld(px, py);
    this.zoom = Math.max(.012, Math.min(3, this.zoom * factor));
    this.centerX = point.x - (px - this.width / 2) / this.zoom;
    this.centerY = point.y - (py - this.height / 2) / this.zoom;
    this.schedule();
  }
  toWorld(px, py) { return { x: this.centerX + (px - this.width / 2) / this.zoom, y: this.centerY + (py - this.height / 2) / this.zoom }; }
  toScreen(x, y) { return { x: (x - this.centerX) * this.zoom + this.width / 2, y: (y - this.centerY) * this.zoom + this.height / 2 }; }
  nearest(px, py) {
    const target = this.toWorld(px, py);
    const limit = (this.isTouch ? 20 : 13) / this.zoom;
    return this.viewportIndex?.nearest(target.x, target.y, limit) ?? null;
  }
  schedule() {
    if (this.pendingDraw) return;
    this.pendingDraw = true;
    requestAnimationFrame(() => { this.pendingDraw = false; this.draw(); });
  }
  draw() {
    const { ctx, width: w, height: h } = this;
    if (!w || !h) return;
    ctx.fillStyle = '#0c1420'; ctx.fillRect(0, 0, w, h);
    const left = this.centerX - w / (2 * this.zoom), right = this.centerX + w / (2 * this.zoom);
    const top = this.centerY - h / (2 * this.zoom), bottom = this.centerY + h / (2 * this.zoom);
    // Subtle grid follows world coordinates, without expensive DOM elements.
    const step = Math.pow(2, Math.ceil(Math.log2(80 / this.zoom)));
    if (step < 20000) {
      ctx.lineWidth = 1; ctx.strokeStyle = '#2231414a'; ctx.beginPath();
      for (let x = Math.ceil(left / step) * step; x < right; x += step) { let v = this.toScreen(x, 0).x; ctx.moveTo(v, 0); ctx.lineTo(v, h); }
      for (let y = Math.ceil(top / step) * step; y < bottom; y += step) { let v = this.toScreen(0, y).y; ctx.moveTo(0, v); ctx.lineTo(w, v); }
      ctx.stroke();
    }
    this.drawClassBackground();
    // Each connection uses actual source and target skill IDs; nonzero orbit edges curve.
    const d = this.zoom;
    ctx.lineWidth = Math.max(.65, Math.min(2.8, .9 + d * 2));
    for (const edge of this.viewportIndex.visibleEdges(left, top, right, bottom, 500)) {
      const a = this.nodeMap.get(edge.a), b = this.nodeMap.get(edge.b);
      // Orbit arcs can cross the viewport when both endpoints are off-screen.
      // The viewport index already checks their entire official orbit bounds.
      const curved = edge.orbit && a.group === b.group && a.orbit === b.orbit &&
        Number.isFinite(a.groupX) && Number.isFinite(a.groupY);
      if (!curved && ((a.x < left - 500 && b.x < left - 500) ||
        (a.x > right + 500 && b.x > right + 500) ||
        (a.y < top - 500 && b.y < top - 500) ||
        (a.y > bottom + 500 && b.y > bottom + 500))) continue;
      const p = this.toScreen(a.x, a.y), q = this.toScreen(b.x, b.y);
      const activated = (this.allocated.has(a.id) || this.rootIds.has(a.id)) && (this.allocated.has(b.id) || this.rootIds.has(b.id));
      const selected = a.id === this.selectedId || b.id === this.selectedId;
      // Unallocated edges stay understated at full-tree zoom; active/selected paths stand out.
      ctx.strokeStyle = activated ? '#69baa9' : selected ? '#b8a174bb' : this.searchActive ? '#465b6f2a' : a.hiddenOracle || b.hiddenOracle ? '#69618a55' : '#66788e54';
      ctx.beginPath();
      const sameOrbit = edge.orbit && a.group === b.group && a.orbit === b.orbit &&
        Number.isFinite(a.groupX) && Number.isFinite(a.groupY);
      const radius = (this.orbitRadii[a.orbit] || 0) * this.zoom;
      if (sameOrbit && radius > 0) {
        // Use the exported group centre. A chord-derived centre can select the
        // wrong side of a circle and draw a connector through unrelated nodes.
        const center = this.toScreen(a.groupX, a.groupY);
        const start = Math.atan2(p.y - center.y, p.x - center.x);
        const end = Math.atan2(q.y - center.y, q.x - center.x);
        let sweep = end - start;
        if (sweep > Math.PI) sweep -= Math.PI * 2;
        if (sweep < -Math.PI) sweep += Math.PI * 2;
        ctx.arc(center.x, center.y, radius, start, start + sweep, sweep < 0);
      } else {
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    const normal = [], special = [];
    for (const n of this.viewportIndex.visibleNodes(left, top, right, bottom, 500)) {
      if (n.x < left - 500 || n.x > right + 500 || n.y < top - 500 || n.y > bottom + 500) continue;
      (n.category === 'normal' ? normal : special).push(n);
    }
    for (const n of normal) this.drawNode(n);
    for (const n of special) this.drawNode(n);
  }
  drawNode(n) {
    const ctx = this.ctx, p = this.toScreen(n.x, n.y);
    const noteworthy = n.category !== 'normal';
    let radius = Math.max(noteworthy ? 2.3 : 1.2, Math.min(noteworthy ? 15 : 9, this.zoom * (noteworthy ? 36 : 21)));
    const allocated = this.allocated.has(n.id), highlighted = n.id === this.selectedId;
    const activeSearch = this.searchMatches.has(n.id);
    const locked = this.lockedOracle && n.hiddenOracle;
    const color = allocated ? '#6be0be' : n.hiddenOracle ? '#a99bea' : n.category === 'keystone' ? '#edbb75' : n.category === 'notable' ? '#d4b16a' : n.category === 'start' ? '#fff0b6' : n.category === 'socket' ? '#809df2' : '#8194a3';
    if (highlighted || activeSearch) {
      ctx.beginPath(); ctx.arc(p.x, p.y, radius + (highlighted ? 7 : 4), 0, Math.PI * 2);
      ctx.fillStyle = highlighted ? '#ead19750' : '#7fbdd12d'; ctx.fill();
      ctx.strokeStyle = highlighted ? '#f7d78f' : '#96d1f1'; ctx.lineWidth = highlighted ? 2 : 1.2; ctx.stroke();
    }
    const dimmed = this.searchActive && !activeSearch && !highlighted && !allocated;
    ctx.globalAlpha = locked ? .55 : dimmed ? .30 : 1;
    const rendered = this.drawOfficialNode(n, p, allocated);
    if (rendered) {
      if (this.zoom >= .2 && (n.category === 'keystone' || n.category === 'start')) {
        ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e9dbbb';
        ctx.fillText(this.localizeName(n), p.x, p.y - radius - 15);
      }
      ctx.globalAlpha = 1;
      this.drawWeaponSetRing(n, p, radius, allocated);
      if (activeSearch || highlighted) this.drawSearchOutline(p, radius, highlighted);
      return;
    }
    ctx.fillStyle = allocated ? '#54d9b6' : '#111c2a';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(.8, noteworthy ? 1.8 : .9);
    ctx.beginPath();
    if (n.category === 'socket') ctx.rect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    else ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (noteworthy && radius >= 4.5) { ctx.beginPath(); ctx.arc(p.x, p.y, radius * .44, 0, Math.PI * 2); ctx.fillStyle = allocated ? '#10241c' : color + 'b0'; ctx.fill(); }
    if (this.zoom >= .2 && (n.category === 'keystone' || n.category === 'start')) {
      ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e9dbbb'; ctx.fillText(this.localizeName(n), p.x, p.y - radius - 10);
    }
    ctx.globalAlpha = 1;
    this.drawWeaponSetRing(n, p, radius, allocated);
    if (activeSearch || highlighted) this.drawSearchOutline(p, radius, highlighted);
  }
  drawSearchOutline(position, radius, selected) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius + (selected ? 9 : 7), 0, Math.PI * 2);
    ctx.lineWidth = selected ? 3 : 2.2;
    ctx.strokeStyle = selected ? '#ffe3a0' : '#ffd567';
    ctx.shadowColor = selected ? '#efb858' : '#f4c04e';
    ctx.shadowBlur = selected ? 12 : 9;
    ctx.stroke();
    ctx.restore();
  }
  drawWeaponSetRing(n, position, radius, allocated) {
    if (!allocated || this.zoom < .09) return;
    const first = this.weaponSet1.has(n.id), second = this.weaponSet2.has(n.id);
    if (!first && !second) return;
    const ctx = this.ctx;
    const ringRadius = radius + 5;
    ctx.save();
    ctx.lineWidth = 2.3;
    if (first && second) {
      ctx.strokeStyle = '#e2bb78';
      ctx.beginPath(); ctx.arc(position.x, position.y, ringRadius, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.strokeStyle = '#b6a0ff';
      ctx.beginPath(); ctx.arc(position.x, position.y, ringRadius, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    } else {
      ctx.strokeStyle = first ? '#e2bb78' : '#b6a0ff';
      ctx.beginPath(); ctx.arc(position.x, position.y, ringRadius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  drawOfficialNode(n, position, allocated) {
    if (!this.art || !n.icon || n.isOnlyImage || this.zoom < .065) return false;
    // Keep touch dragging fluid; the full sprites return immediately on release.
    if (this.isInteracting && this.zoom < .28 &&
        !this.allocated.has(n.id) && n.id !== this.selectedId) return false;
    const size = this.zoom * (n.category === 'keystone' ? 240 :
      n.category === 'notable' ? 174 : n.category === 'socket' ? 138 : 118);
    if (size < 6) return false;
    const frame = nodeFrameKey(n, allocated, !allocated && this.rootNeighborIds.has(n.id));
    const source = iconSpriteKey(n);
    const iconExists = !!this.art.skills.frames?.[source];
    if (!iconExists) return false;
    const ctx = this.ctx;
    const w = Math.max(7, Math.min(94, size));
    drawAtlasFrame(ctx, this.art.skills, source, position.x, position.y, w);
    if (frame) drawAtlasFrame(ctx, this.art.frame, frame, position.x, position.y, w * 1.42);
    return true;
  }
  eventPosition(event) { const b = this.canvas.getBoundingClientRect(); return { x: event.clientX - b.left, y: event.clientY - b.top }; }
  attachEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      e.preventDefault(); c.setPointerCapture(e.pointerId);
      this.isInteracting = true;
      const p = this.eventPosition(e); this.pointerMap.set(e.pointerId, p);
      if (this.pointerMap.size === 1) this.pointerStart = { ...p, centerX: this.centerX, centerY: this.centerY, moved: false };
      if (this.pointerMap.size === 2) {
        const [a, b] = [...this.pointerMap.values()];
        this.pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.zoom, point: this.toWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
        this.pointerStart = null;
      }
    });
    c.addEventListener('pointermove', e => {
      if (!this.pointerMap.has(e.pointerId)) return;
      e.preventDefault(); const p = this.eventPosition(e);
      this.pointerMap.set(e.pointerId, p);
      if (this.pointerMap.size === 2 && this.pinchStart) {
        const [a, b] = [...this.pointerMap.values()];
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        this.zoom = Math.min(3, Math.max(.012, this.pinchStart.zoom * dist / Math.max(1, this.pinchStart.dist)));
        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        this.centerX = this.pinchStart.point.x - (midX - this.width / 2) / this.zoom;
        this.centerY = this.pinchStart.point.y - (midY - this.height / 2) / this.zoom;
        this.schedule();
      } else if (this.pointerMap.size === 1 && this.pointerStart) {
        const dx = p.x - this.pointerStart.x, dy = p.y - this.pointerStart.y;
        if (Math.hypot(dx, dy) > 7) this.pointerStart.moved = true;
        this.centerX = this.pointerStart.centerX - dx / this.zoom;
        this.centerY = this.pointerStart.centerY - dy / this.zoom;
        this.schedule();
      }
    });
    const end = e => {
      if (!this.pointerMap.has(e.pointerId)) return;
      const position = this.eventPosition(e), clicked = this.pointerMap.size === 1 && this.pointerStart && !this.pointerStart.moved;
      this.pointerMap.delete(e.pointerId);
      if (!this.pointerMap.size) {
        this.pinchStart = null; this.pointerStart = null; this.isInteracting = false;
        this.schedule();
      } else {
        // After a two-finger pinch, the remaining finger can keep panning.
        const remaining = [...this.pointerMap.values()][0];
        this.pinchStart = null;
        this.pointerStart = { ...remaining, centerX: this.centerX, centerY: this.centerY, moved: true };
      }
      if (clicked && e.type === 'pointerup') this.callbacks.onSelect(this.nearest(position.x, position.y), e);
    };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', e => {
      e.preventDefault(); const p = this.eventPosition(e); this.zoomBy(Math.exp(-Math.max(-160, Math.min(160, e.deltaY)) * .002), p.x, p.y);
    }, { passive: false });
    c.addEventListener('dblclick', e => { e.preventDefault(); const p = this.eventPosition(e); this.zoomBy(1.8, p.x, p.y); });
    c.addEventListener('contextmenu', e => e.preventDefault());
  }
}

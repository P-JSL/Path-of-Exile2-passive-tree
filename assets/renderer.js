import { getBounds } from './tree-model.js';

export class TreeRenderer {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!this.ctx) throw new Error('Canvas 2D를 지원하지 않는 브라우저입니다.');
    this.callbacks = callbacks;
    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map();
    this.allocated = new Set();
    this.zoom = .03; this.centerX = 0; this.centerY = 0;
    this.width = 0; this.height = 0; this.selectedId = null; this.searchMatches = new Set();
    this.pointerMap = new Map(); this.pointerStart = null; this.pinchStart = null;
    this.isTouch = window.matchMedia('(pointer:coarse)').matches;
    this.pendingDraw = false;
    this.attachEvents();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement);
    this.resize();
  }
  setScene(nodes, allEdges, options = {}) {
    this.nodes = nodes;
    this.nodeMap = new Map(nodes.map(n => [n.id, n]));
    this.edges = allEdges.filter(e => this.nodeMap.has(e.a) && this.nodeMap.has(e.b));
    this.allocated = options.allocated ?? new Set();
    this.rootIds = new Set(Array.isArray(options.rootId) ? options.rootId : [options.rootId]);
    this.lockedOracle = !!options.lockedOracle;
    this.selectedId = options.selectedId ?? null;
    this.searchMatches = options.searchMatches ?? new Set();
    this.fitAll();
  }
  update(options = {}) {
    if (options.allocated) this.allocated = options.allocated;
    if ('selectedId' in options) this.selectedId = options.selectedId;
    if ('lockedOracle' in options) this.lockedOracle = options.lockedOracle;
    if (options.searchMatches) this.searchMatches = options.searchMatches;
    this.schedule();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const prevWidth = this.width;
    this.width = rect.width; this.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    let winner = null, smallest = limit * limit;
    for (const n of this.nodes) {
      const dx = n.x - target.x, dy = n.y - target.y, dist = dx * dx + dy * dy;
      if (dist < smallest) { smallest = dist; winner = n; }
    }
    return winner;
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
    // Each connection uses actual source and target skill IDs; nonzero orbit edges curve.
    const d = this.zoom;
    ctx.lineWidth = Math.max(.65, Math.min(2.8, .9 + d * 2));
    for (const edge of this.edges) {
      const a = this.nodeMap.get(edge.a), b = this.nodeMap.get(edge.b);
      if ((a.x < left - 500 && b.x < left - 500) || (a.x > right + 500 && b.x > right + 500) || (a.y < top - 500 && b.y < top - 500) || (a.y > bottom + 500 && b.y > bottom + 500)) continue;
      const p = this.toScreen(a.x, a.y), q = this.toScreen(b.x, b.y);
      const activated = (this.allocated.has(a.id) || this.rootIds.has(a.id)) && (this.allocated.has(b.id) || this.rootIds.has(b.id));
      ctx.strokeStyle = activated ? '#69baa9' : a.hiddenOracle || b.hiddenOracle ? '#69618a9c' : '#455262b8';
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      if (edge.orbit && edge.orbit !== 2147483647) {
        const dx = q.x - p.x, dy = q.y - p.y;
        const len = Math.hypot(dx, dy);
        const bend = Math.min(len * .32, this.zoom * 65) * Math.sign(edge.orbit);
        ctx.quadraticCurveTo((p.x + q.x) / 2 - dy / (len || 1) * bend, (p.y + q.y) / 2 + dx / (len || 1) * bend, q.x, q.y);
      } else ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    const normal = [], special = [];
    for (const n of this.nodes) {
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
    ctx.globalAlpha = locked ? .55 : 1;
    ctx.fillStyle = allocated ? '#54d9b6' : '#111c2a';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(.8, noteworthy ? 1.8 : .9);
    ctx.beginPath();
    if (n.category === 'socket') ctx.rect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    else ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (noteworthy && radius >= 4.5) { ctx.beginPath(); ctx.arc(p.x, p.y, radius * .44, 0, Math.PI * 2); ctx.fillStyle = allocated ? '#10241c' : color + 'b0'; ctx.fill(); }
    if (this.zoom >= .2 && (n.category === 'keystone' || n.category === 'start')) {
      ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e9dbbb'; ctx.fillText(n.name, p.x, p.y - radius - 10);
    }
    ctx.globalAlpha = 1;
  }
  eventPosition(event) { const b = this.canvas.getBoundingClientRect(); return { x: event.clientX - b.left, y: event.clientY - b.top }; }
  attachEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      e.preventDefault(); c.setPointerCapture(e.pointerId);
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
      if (!this.pointerMap.size) { this.pinchStart = null; this.pointerStart = null; }
      else { this.pinchStart = null; this.pointerStart = null; }
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

/* Ember Studio — 3D product stage + 3D ring carousel.
   Vanilla custom elements. three.js is loaded lazily, only when the stage is near the viewport. */
const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/* Pose library: where the comb sits for each scroll step. [x, y, z, rotX, rotY, rotZ, scale] */
const POSES = {
  diagonal: [0.95, -0.05, 0, 0.42, -0.55, 0.5, 1],
  teeth: [0.9, 0.2, 0.3, -0.9, -0.95, 0.25, 1],
  ions: [-1.7, 0.2, 1.3, -0.5, 0.85, -0.42, 1],
  upright: [1.9, 0, -0.6, -0.25, -0.5, 1.5708, 0.94],
  flat: [0, -0.2, 0.4, 0.9, 0, 0, 1.05],
};

class EmberStage extends HTMLElement {
  connectedCallback() {
    if (this._init) return;
    this._init = true;
    this.canvas = this.querySelector('canvas');
    this.view = this.querySelector('.ember__view');
    this.steps = [...this.querySelectorAll('[data-ember-step]')];
    this.deg = this.querySelector('[data-ember-deg]');
    this.dot = this.querySelector('[data-ember-dot]');
    this.heat = 0.5;
    this.heatTarget = 0.5;
    this.ang = 0;
    this.vel = 0;
    this.idle = 0;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.classList.add('is-js');
    this.measureTop();

    this.stepIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting)),
      { threshold: 0.3 }
    );
    this.steps.forEach((s) => this.stepIO.observe(s));

    this.io = new IntersectionObserver(
      (entries) => {
        this.visible = entries[0].isIntersecting;
        if (this.visible) this.boot();
        this.kick();
      },
      { rootMargin: '300px 0px' }
    );
    this.io.observe(this);
    document.addEventListener('visibilitychange', () => this.kick());

    this.addEventListener('change', (e) => {
      const input = e.target.closest('[data-ember-heat]');
      if (!input) return;
      this.heatTarget = Number(input.value);
      this.level = Number(input.dataset.level || 2);
      this.drawDisplay && this.drawDisplay();
    });
    this.bindDrag();
  }

  bindDrag() {
    const el = this.view;
    let id = null, lastX = 0, lastT = 0, v = 0, startX = 0, startY = 0, dragging = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      id = e.pointerId; lastX = startX = e.clientX; startY = e.clientY; lastT = e.timeStamp; v = 0; dragging = false;
    });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      this.idle = 0;
      if (id !== e.pointerId) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { id = null; return; }
        if (Math.abs(dx) < 6) return;
        dragging = true; this.dragging = true; this.classList.add('is-dragging');
        try { el.setPointerCapture(id); } catch (_) {}
      }
      const d = e.clientX - lastX;
      const dtm = Math.max(8, e.timeStamp - lastT);
      this.ang += d * 0.0075;
      v = (d * 0.0075 / dtm) * 1000 * 0.6 + v * 0.4;
      lastX = e.clientX; lastT = e.timeStamp;
      this.kick();
    });
    const end = (e) => {
      if (id !== e.pointerId) return;
      id = null;
      if (dragging) { this.vel = clamp(v, -14, 14); }
      dragging = false; this.dragging = false; this.classList.remove('is-dragging');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', () => { this.pointer.tx = 0; this.pointer.ty = 0; });
  }

  async boot() {
    if (this.booted) return;
    this.booted = true;
    try {
      const THREE = await import(this.dataset.three);
      this.build(THREE);
      this.classList.add('is-ready');
      this.kick();
    } catch (err) {
      this.classList.add('is-fallback');
    }
  }

  build(THREE) {
    this.THREE = THREE;
    const css = getComputedStyle(this);
    const accent = (css.getPropertyValue('--ember-accent') || '#e8623a').trim();
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    this.renderer = renderer;
    const scene = (this.scene = new THREE.Scene());
    const camera = (this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60));
    camera.position.set(0, 0, 7.5);

    /* Studio lighting baked into an environment map: warm softbox key, ember rim, cool kicker. */
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x070403);
    const panel = (w, h, color, k, pos) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })
      );
      m.position.set(pos[0], pos[1], pos[2]);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    panel(7, 7, '#ffe6d0', 7, [-6, 7, 5]);
    panel(9, 2.2, '#fff4ea', 6, [0, 8, -2]);
    panel(3, 9, accent, 6, [8, -1, -3]);
    panel(2.5, 7, '#a8bcff', 2.2, [-8, -2, -4]);
    panel(12, 12, '#4a2a1e', 1.1, [0, -8, 0]);
    panel(4, 4, '#fff1e2', 3, [3, 2, 8]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xfff0e0, 1.4);
    key.position.set(-3, 5, 6);
    scene.add(key);
    this.heatLight = new THREE.PointLight(new THREE.Color(accent), 0, 6, 2);
    scene.add(this.heatLight);

    /* Materials */
    const shell = new THREE.MeshPhysicalMaterial({ color: '#efdcd1', roughness: 0.36, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.28, sheen: 0.6, sheenColor: new THREE.Color('#ffd9c4'), sheenRoughness: 0.5 });
    const copper = new THREE.MeshStandardMaterial({ color: '#d79b6c', metalness: 1, roughness: 0.2 });
    const hot = (this.hotMat = new THREE.MeshStandardMaterial({ color: '#dfa273', metalness: 1, roughness: 0.24, emissive: new THREE.Color(accent), emissiveIntensity: 0.3 }));
    const ink = new THREE.MeshStandardMaterial({ color: '#1a1412', roughness: 0.55, metalness: 0.1 });

    const rig = (this.rig = new THREE.Group());
    const turn = (this.turn = new THREE.Group());
    const comb = (this.comb = new THREE.Group());
    scene.add(rig); rig.add(turn); turn.add(comb);
    comb.position.x = 0.35; /* centre the model on its own length so it spins in place */
    const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); comb.add(m); return m; };
    const HALF = Math.PI / 2;

    /* Handle */
    const handle = add(new THREE.CapsuleGeometry(0.2, 2.2, 14, 40), shell, -1.05);
    handle.rotation.z = HALF; handle.scale.set(1, 1, 0.84);
    const grip = add(new THREE.CapsuleGeometry(0.203, 0.9, 10, 40), ink, -1.55);
    grip.rotation.z = HALF; grip.scale.set(1, 1, 0.845);
    grip.material = new THREE.MeshPhysicalMaterial({ color: '#e7cfc2', roughness: 0.7, clearcoat: 0.1 });
    [-2.02, -1.08, 0.18].forEach((x) => {
      const ring = add(new THREE.TorusGeometry(0.204, 0.018, 12, 64), copper, x);
      ring.rotation.y = HALF; ring.scale.set(0.84, 1, 1);
    });
    /* Strain relief + swivel */
    const swivel = add(new THREE.CylinderGeometry(0.11, 0.15, 0.22, 32), copper, -2.42);
    swivel.rotation.z = HALF;
    const relief = add(new THREE.CylinderGeometry(0.05, 0.1, 0.5, 24), ink, -2.76);
    relief.rotation.z = HALF;

    /* Head: spine, heated plate, teeth */
    const spine = add(new THREE.CapsuleGeometry(0.19, 1.9, 12, 36), shell, 1.2, 0.02);
    spine.rotation.z = HALF; spine.scale.set(0.8, 1, 0.82);
    add(new THREE.BoxGeometry(1.86, 0.07, 0.25), hot, 1.2, -0.13);
    const guardGeo = new THREE.CapsuleGeometry(0.05, 0.5, 6, 16);
    [0.24, 2.16].forEach((x) => { const g = add(guardGeo, shell, x, -0.42); g.scale.set(1, 1, 2.2); });

    const rows = 2, per = 21, n = rows * per;
    const toothGeo = new THREE.CylinderGeometry(0.03, 0.017, 0.6, 14);
    const tipGeo = new THREE.SphereGeometry(0.03, 14, 10);
    const teeth = new THREE.InstancedMesh(toothGeo, hot, n);
    const tips = new THREE.InstancedMesh(tipGeo, ink, n);
    const m4 = new THREE.Matrix4();
    this.emitters = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < per; i++) {
        const x = 0.38 + ((i + (r ? 0.5 : 0)) / per) * 1.68;
        const z = r ? -0.075 : 0.075;
        const k = r * per + i;
        m4.makeTranslation(x, -0.46, z); teeth.setMatrixAt(k, m4);
        m4.makeTranslation(x, -0.77, z); tips.setMatrixAt(k, m4);
        this.emitters.push([x, -0.6, z]);
      }
    }
    comb.add(teeth); comb.add(tips);

    /* Controls on the handle: power button + heat display */
    const btn = add(new THREE.CylinderGeometry(0.062, 0.062, 0.02, 32), copper, -0.28, 0, 0.166);
    btn.rotation.x = HALF;
    const led = add(new THREE.RingGeometry(0.07, 0.082, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.2), toneMapped: false }), -0.28, 0, 0.176);
    this.led = led;
    const dc = document.createElement('canvas'); dc.width = 320; dc.height = 112;
    const dtex = new THREE.CanvasTexture(dc); dtex.colorSpace = THREE.SRGBColorSpace; dtex.anisotropy = 4;
    add(new THREE.PlaneGeometry(0.4, 0.14), new THREE.MeshBasicMaterial({ map: dtex, toneMapped: false }), -0.68, 0, 0.169);
    this.level = 2;
    this.drawDisplay = () => {
      const c = dc.getContext('2d');
      c.fillStyle = '#0d0907'; c.beginPath(); c.roundRect(0, 0, 320, 112, 30); c.fill();
      for (let i = 0; i < 5; i++) {
        const on = i < this.level + 2;
        c.fillStyle = on ? accent : 'rgba(255,255,255,.12)';
        c.beginPath(); c.roundRect(46 + i * 48, 76 - i * 10, 30, 12 + i * 10, 6); c.fill();
      }
      dtex.needsUpdate = true;
    };
    this.drawDisplay();

    /* Heat glow + ion particles */
    const gc = document.createElement('canvas'); gc.width = gc.height = 128;
    const g2 = gc.getContext('2d');
    const grad = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    [[0, 1], [0.12, 0.62], [0.28, 0.3], [0.48, 0.12], [0.7, 0.035], [0.88, 0.008], [1, 0]].forEach(([s, a]) => grad.addColorStop(s, `rgba(255,255,255,${a})`));
    g2.fillStyle = grad; g2.fillRect(0, 0, 128, 128);
    const gtex = new THREE.CanvasTexture(gc);
    const glow = (this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, color: new THREE.Color(accent), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0.3 })));
    glow.position.set(1.2, -0.4, 0); glow.scale.set(3.4, 2.2, 1); glow.renderOrder = -1;
    comb.add(glow);

    const P = (this.pCount = 110);
    const pos = new Float32Array(P * 3), col = new Float32Array(P * 3);
    this.pAge = new Float32Array(P); this.pSpeed = new Float32Array(P); this.pSpawn = new Float32Array(P * 3); this.pPhase = new Float32Array(P);
    for (let i = 0; i < P; i++) { this.pAge[i] = Math.random(); this.pSpeed[i] = 0.16 + Math.random() * 0.22; this.pPhase[i] = Math.random() * 6.28; this.pSpawn[i * 3 + 1] = -99; }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: gtex, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.ionColor = new THREE.Color(accent).lerp(new THREE.Color('#ffd9b8'), 0.45);
    this.v3 = new THREE.Vector3();

    new ResizeObserver(() => this.resize()).observe(this.view);
    this.resize();
    /* Entrance: start slightly off-pose and let the damping glide it into place. */
    this.cur = this.poseAt(0).slice();
    if (!reduceMq.matches) { this.cur[0] += 0.7; this.cur[4] -= 0.6; this.cur[6] *= 0.9; }
  }

  measureTop() {
    const top = this.getBoundingClientRect().top + window.scrollY;
    this.style.setProperty('--ember-top', (top < 320 ? Math.round(top) : 0) + 'px');
  }

  resize() {
    this.measureTop();
    if (!this.renderer) return;
    const w = this.view.clientWidth, h = this.view.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.narrow = w / h < 0.9;
    this.camera.position.z = this.narrow ? 9.6 : 7.5;
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  kick() {
    if (this.raf || !this.renderer || !this.visible || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  poseAt(i) {
    const step = this.steps[clamp(i, 0, this.steps.length - 1)];
    const p = POSES[(step && step.dataset.pose) || 'diagonal'] || POSES.diagonal;
    if (!this.narrow) {
      /* Narrower desktop windows: pull the comb in and shrink it so it never leaves the frame. */
      const fit = clamp(this.camera.aspect / 1.78, 0.6, 1);
      return fit === 1 ? p : [p[0] * fit, p[1], p[2] * fit, p[3], p[4], p[5], p[6] * fit];
    }
    /* Phones: keep the comb centred and in the upper half, copy sits below it. */
    return [p[0] * 0.12, p[1] + 1.25, Math.min(p[2], 0.6), p[3], p[4], p[5], p[6] * 0.86];
  }

  tick(now) {
    this.raf = 0;
    if (!this.visible || document.hidden || !this.cur) return;
    const still = reduceMq.matches;
    const dt = Math.min(0.034, (now - this.last) / 1000) || 0.016;
    this.last = now;
    const t = now / 1000;

    /* Scroll position -> pose */
    const rect = this.getBoundingClientRect();
    const vh = this.view.clientHeight || window.innerHeight;
    const prog = clamp(-rect.top / vh, 0, this.steps.length - 1);
    const i = Math.floor(prog);
    const f = smooth(clamp((prog - i - 0.18) / 0.64, 0, 1));
    const a = this.poseAt(i), b = this.poseAt(i + 1);
    for (let k = 0; k < 7; k++) {
      const target = lerp(a[k], b[k], f);
      this.cur[k] = still ? target : damp(this.cur[k], target, 5.5, dt);
    }
    const c = this.cur;

    /* Turntable: drag inertia, then a slow idle spin */
    if (!this.dragging) {
      this.idle += dt;
      const auto = !still && this.idle > 3 ? 0.26 : 0;
      this.vel = damp(this.vel, auto, auto ? 0.8 : 2.2, dt);
      this.ang += this.vel * dt;
    }
    const ptr = this.pointer;
    ptr.x = damp(ptr.x, ptr.tx, 4, dt); ptr.y = damp(ptr.y, ptr.ty, 4, dt);
    const bob = still ? 0 : Math.sin(t * 0.9) * 0.05;
    this.rig.position.set(c[0], c[1] + bob, c[2]);
    this.rig.rotation.set(c[3] + ptr.y * 0.07, c[4] + ptr.x * 0.12, c[5] + (still ? 0 : Math.sin(t * 0.6) * 0.02));
    this.rig.scale.setScalar(c[6]);
    this.turn.rotation.x = this.ang;

    /* Heat */
    this.heat = damp(this.heat, this.heatTarget, 3, dt);
    const pulse = still ? 0 : Math.sin(t * 2.1) * 0.06;
    this.hotMat.emissiveIntensity = 0.12 + this.heat * 1.25 + pulse;
    this.glow.material.opacity = 0.1 + this.heat * 0.42 + pulse * 0.5;
    this.comb.localToWorld(this.v3.set(1.2, -0.5, 0));
    this.heatLight.position.copy(this.v3);
    this.heatLight.intensity = 2 + this.heat * 10;

    /* Ions drift up from the teeth in world space */
    const posAttr = this.points.geometry.attributes.position, colAttr = this.points.geometry.attributes.color;
    const ic = this.ionColor;
    for (let p = 0; p < this.pCount; p++) {
      let age = this.pAge[p] + dt * this.pSpeed[p] * (still ? 0 : 1);
      if (age >= 1 || this.pSpawn[p * 3 + 1] === -99) {
        age = age >= 1 ? 0 : age;
        const e = this.emitters[(Math.random() * this.emitters.length) | 0];
        this.comb.localToWorld(this.v3.set(e[0], e[1], e[2]));
        this.pSpawn[p * 3] = this.v3.x; this.pSpawn[p * 3 + 1] = this.v3.y; this.pSpawn[p * 3 + 2] = this.v3.z;
      }
      this.pAge[p] = age;
      const ph = this.pPhase[p];
      posAttr.array[p * 3] = this.pSpawn[p * 3] + Math.sin(age * 5 + ph) * 0.07;
      posAttr.array[p * 3 + 1] = this.pSpawn[p * 3 + 1] + age * 1.15;
      posAttr.array[p * 3 + 2] = this.pSpawn[p * 3 + 2] + Math.cos(age * 4 + ph) * 0.05;
      const fade = Math.sin(Math.PI * age) * (0.25 + this.heat * 0.75);
      colAttr.array[p * 3] = ic.r * fade; colAttr.array[p * 3 + 1] = ic.g * fade; colAttr.array[p * 3 + 2] = ic.b * fade;
    }
    posAttr.needsUpdate = true; colAttr.needsUpdate = true;

    if (this.deg) {
      const d = ((Math.round((this.ang * 180) / Math.PI) % 360) + 360) % 360;
      if (d !== this._d) { this._d = d; this.deg.textContent = String(d).padStart(3, '0') + '°'; if (this.dot) this.dot.style.left = (d / 360) * 100 + '%'; }
    }
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }
}
EmberStage.poses = POSES;
if (!customElements.get('ember-stage')) customElements.define('ember-stage', EmberStage);

/* ---------- 3D ring carousel (DOM cards, perspective maths, critically damped spring) ---------- */
class EmberRing extends HTMLElement {
  connectedCallback() {
    if (this._init) return;
    this._init = true;
    this.stage = this.querySelector('[data-ring-stage]');
    const originals = [...this.querySelectorAll('[data-ring-card]')];
    this.count = originals.length;
    if (!this.count) return;
    /* Clone until the ring has enough bodies to look full */
    const total = this.count * Math.ceil(8 / this.count);
    for (let k = this.count; k < total; k++) {
      const clone = originals[k % this.count].cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('a,button').forEach((x) => (x.tabIndex = -1));
      this.stage.appendChild(clone);
    }
    this.cards = [...this.querySelectorAll('[data-ring-card]')];
    this.N = this.cards.length;
    this.ticks = [...this.querySelectorAll('[data-ring-tick]')];
    this.index = 0; this.target = 0; this.cur = reduceMq.matches ? 0 : -1.15; this.vel = 0;
    this.K = 95; this.C = 2 * Math.sqrt(95);
    this.speed = Number(this.dataset.speed || 5) * 1000;

    this.addEventListener('click', (e) => {
      if (this.justDragged) return;
      if (e.target.closest('[data-ring-next]')) return this.engage(), this.moveTo(Math.round(this.target) + 1);
      if (e.target.closest('[data-ring-prev]')) return this.engage(), this.moveTo(Math.round(this.target) - 1);
      const tick = e.target.closest('[data-ring-tick]');
      if (tick) return this.engage(), this.go(Number(tick.dataset.ringTick));
      const card = e.target.closest('[data-ring-card]');
      if (card) { const k = this.rank(this.cards.indexOf(card)); if (k) { this.engage(); this.moveTo(Math.round(this.target) + k); } }
    });
    this.stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); this.engage(); this.moveTo(Math.round(this.target) + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.engage(); this.moveTo(Math.round(this.target) - 1); }
    });
    this.addEventListener('pointerenter', () => (this.hover = true));
    this.addEventListener('pointerleave', () => (this.hover = false));
    this.bindDrag();

    new ResizeObserver(() => { this.measure(); this.kick(); }).observe(this.stage);
    this.io = new IntersectionObserver((en) => {
      this.visible = en[0].isIntersecting;
      if (this.visible && !this.revealed) { this.revealed = true; this.classList.add('is-revealed'); this.autoplay(); }
      this.kick();
    }, { threshold: 0.15 });
    this.io.observe(this);
    this.measure(); this.setIndex(0, true); this.render();
  }

  rank(a) { let k = (((a - Math.round(this.target)) % this.N) + this.N) % this.N; if (k > this.N / 2) k -= this.N; return k; }
  engage() { this.engaged = true; clearTimeout(this.timer); this.classList.remove('is-playing'); }
  autoplay() {
    clearTimeout(this.timer);
    if (this.engaged || reduceMq.matches || this.dataset.autoplay !== 'true') return;
    this.classList.add('is-playing');
    this.ticks.forEach((t) => t.classList.remove('is-run'));
    void this.offsetWidth;
    const cur = this.ticks[this.index]; if (cur) cur.classList.add('is-run');
    this.timer = setTimeout(() => {
      if (this.visible && !this.dragging && !this.hover && !document.hidden) this.moveTo(Math.round(this.target) + 1);
      else this.autoplay();
    }, this.speed);
  }
  go(i) { let d = (((i - this.index) % this.count) + this.count) % this.count; if (d > this.count / 2) d -= this.count; this.moveTo(Math.round(this.target) + d); }
  moveTo(T) { this.target = T; this.setIndex(((T % this.count) + this.count) % this.count); this.kick(); }
  setIndex(i, silent) {
    this.index = i;
    this.ticks.forEach((t, j) => { t.setAttribute('aria-current', j === i ? 'true' : 'false'); t.classList.toggle('is-past', j < i); });
    const live = this.querySelector('[data-ring-live]');
    if (live && !silent) live.textContent = this.cards[i].dataset.label || '';
    if (!silent) this.autoplay();
  }
  measure() {
    const r = this.stage.getBoundingClientRect();
    this.W = r.width; this.H = r.height; this.mobile = this.W < 750;
    this.unit = Math.max(this.mobile ? 90 : 120, this.W * (this.mobile ? 0.5 : 0.24));
  }
  bindDrag() {
    const el = this.stage; let id = null, sx = 0, sy = 0, t0 = 0, samples = [];
    el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button) return; id = e.pointerId; sx = e.clientX; sy = e.clientY; t0 = this.target; samples = [{ x: sx, t: e.timeStamp }]; });
    el.addEventListener('pointermove', (e) => {
      if (id !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!this.dragging) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { id = null; return; }
        if (Math.abs(dx) < 8 || Math.abs(dx) < 1.2 * Math.abs(dy)) return;
        this.dragging = true; this.classList.add('is-dragging'); this.engage();
        try { el.setPointerCapture(id); } catch (_) {}
      }
      samples.push({ x: e.clientX, t: e.timeStamp }); if (samples.length > 6) samples.shift();
      this.target = t0 - dx / this.unit; this.kick();
    });
    const end = (e) => {
      if (id !== e.pointerId) return; id = null;
      if (!this.dragging) return;
      this.dragging = false; this.classList.remove('is-dragging');
      const a = samples[0], b = samples[samples.length - 1];
      const vx = b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
      const from = Math.round(t0);
      let i = Math.round(this.target - (vx * 160) / this.unit);
      if (i === from && Math.abs(vx) > 0.3) i = from + (vx < 0 ? 1 : -1);
      i = clamp(i, from - 2, from + 2);
      this.moveTo(i);
      this.justDragged = true; setTimeout(() => (this.justDragged = false), 60);
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  kick() { if (this.raf || !this.visible) return; this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.tick(t)); }
  tick(now) {
    this.raf = 0;
    const dt = Math.min(0.034, (now - this.last) / 1000) || 1 / 60; this.last = now;
    if (reduceMq.matches) { this.cur = this.target; this.vel = 0; }
    else {
      const h = dt / 3;
      for (let s = 0; s < 3; s++) { const acc = -this.K * (this.cur - this.target) - this.C * this.vel; this.vel += acc * h; this.cur += this.vel * h; }
    }
    const settled = Math.abs(this.cur - this.target) < 0.0005 && Math.abs(this.vel) < 0.0005 && !this.dragging;
    if (settled) { this.cur = this.target; this.vel = 0; }
    this.render();
    if (!settled) this.raf = requestAnimationFrame((t) => this.tick(t));
  }
  render() {
    const W = this.W, H = this.H; if (!W) return;
    const step = (Math.PI * 2) / this.N;
    const R = W * (this.mobile ? 0.78 : 0.44), P = W * (this.mobile ? 1.9 : 1.5);
    for (let a = 0; a < this.N; a++) {
      let phi = ((a - this.cur) * step) % (Math.PI * 2);
      if (phi > Math.PI) phi -= Math.PI * 2; if (phi < -Math.PI) phi += Math.PI * 2;
      const z = R * (1 - Math.cos(phi)), persp = P / (P + z), sl = Math.abs(phi) / step;
      const scale = persp * (1 + 0.06 * clamp(1 - sl, 0, 1));
      const x = R * Math.sin(phi) * persp;
      const lift = (1 - persp) * H * 0.42;
      const blur = sl <= 1 ? 1.6 * sl : Math.min(1.6 + (sl - 1) * 2, 6);
      const op = clamp((Math.cos(phi) + 0.5) / 0.3, 0, 1);
      const el = this.cards[a], st = el.style;
      st.transform = `translate3d(${x.toFixed(2)}px, ${(-lift).toFixed(2)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(4)})`;
      st.opacity = op.toFixed(3);
      st.zIndex = Math.round(scale * 1000);
      st.visibility = op < 0.01 ? 'hidden' : 'visible';
      const bl = Math.round(blur * 10) / 10;
      if (el._b !== bl) { el._b = bl; st.filter = bl <= 0.05 ? '' : `blur(${bl}px)`; }
      el.classList.toggle('is-front', sl < 0.5);
    }
  }
}
if (!customElements.get('ember-ring')) customElements.define('ember-ring', EmberRing);

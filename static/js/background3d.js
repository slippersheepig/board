// background3d.js — Three.js 3D 背景（方案 C：全量 3D 化）
// 升级要点：
//  1. 正交相机 → 透视相机（PerspectiveCamera），恢复真实「近大远小」纵深
//  2. MeshBasicMaterial 平涂 → MeshStandardMaterial + 点光源/环境光，球体有明暗过渡与高光
//  3. 太阳：自发光 + 双层光晕脉冲呼吸；行星：程序化表面条纹贴图 + 自转
//  4. 轨道光点流：每条轨道上一圈加色粒子流，比行星转得更快，制造能量感
//  5. 相机自动缓慢摆动 + 鼠标视差（yaw/pitch 真旋转，不再只是平移几像素）
//  6. 星场贴图缓慢漂移；前景粒子分近/远两层，近快远慢，增强空间感
//  7. 保留全部资源优化：DPR 封顶、抗锯齿关、页面隐藏暂停、prefers-reduced-motion 降级
//
// 对外接口不变：
//   init(THREE, canvas, options) -> dispose | null
//   hasActive() -> boolean

let dispose = null;

export function init(THREE, canvas, options = {}) {
  if (!canvas || !THREE) return null;
  if (typeof THREE.WebGLRenderer === 'undefined') return null;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // —— 渲染器 ——
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
  } catch (e) {
    console.warn('[bg3d] WebGL init failed', e);
    return null;
  }

  const isMobile = matchMedia('(max-width: 640px)').matches;
  const baseDpr = options.dpr || 1.4;
  const dpr = Math.min(
    baseDpr * (isMobile ? 0.75 : 1),
    window.devicePixelRatio || 1
  );
  renderer.setPixelRatio(Math.min(dpr, 2));
  renderer.setClearColor(0x02050a, 1);

  const scene = new THREE.Scene();
  scene.background = null;

  // —— 相机（透视）：距离根据视口动态计算，保证轨道系统始终完整可见 ——
  const FOV = 55;
  let camW = window.innerWidth;
  let camH = window.innerHeight;
  const camera = new THREE.PerspectiveCamera(FOV, camW / camH, 1, 4000);

  // 需要容纳的半径：外轨道 185 + 光晕余量
  const NEED_R = 250;
  function idealCamDist() {
    const tanF = Math.tan((FOV / 2) * Math.PI / 180);
    const aspect = camW / camH;
    const distForWidth = NEED_R / (tanF * Math.max(aspect, 0.35));
    const distForHeight = NEED_R / tanF;
    return Math.max(distForWidth, distForHeight, 480);
  }

  // ================= 一、星场 =================
  function makeStarTexture(starCount) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#02050a';
    g.fillRect(0, 0, c.width, c.height);

    // 微弱星云渐变
    const neb = g.createRadialGradient(180, 180, 40, 180, 180, 520);
    neb.addColorStop(0, 'rgba(70, 30, 140, 0.22)');
    neb.addColorStop(0.5, 'rgba(40, 20, 90, 0.09)');
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = neb; g.fillRect(0, 0, c.width, c.height);
    const neb2 = g.createRadialGradient(760, 700, 60, 760, 700, 480);
    neb2.addColorStop(0, 'rgba(20, 60, 130, 0.18)');
    neb2.addColorStop(0.6, 'rgba(10, 30, 80, 0.06)');
    neb2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = neb2; g.fillRect(0, 0, c.width, c.height);

    // 星星
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const r = Math.random() * 1.4 + 0.3;
      const a = 0.25 + Math.random() * 0.75;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      if (Math.random() < 0.12) {
        g.fillStyle = `rgba(150,210,255,${a * 0.8})`;
        g.beginPath();
        g.arc(x, y, r * 0.6, 0, Math.PI * 2);
        g.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function buildStarfield() {
    const tex = makeStarTexture(isMobile ? 280 : 450);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      opacity: 0.95
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1600, 1600, 1600), mat);
    box.rotation.set(0, Math.PI * 0.13, 0);
    scene.add(box);
    return box;
  }
  const starfield = buildStarfield();

  // 前景粒子：近/远两层，近层更大更快，制造穿越星空的纵深感
  function makeParticleLayer(count, spreadZ, size, opacity, color) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * camW * 1.6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * camH * 1.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity,
      sizeAttenuation: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return { points: new THREE.Points(geo, mat), pos, geo, count, spreadZ };
  }
  const layerFar = makeParticleLayer(isMobile ? 40 : 70, 500, 2.2, 0.55, 0xbfd8ff);
  const layerNear = makeParticleLayer(isMobile ? 30 : 50, 260, 3.6, 0.85, 0xffffff);
  scene.add(layerFar.points);
  scene.add(layerNear.points);

  // ================= 二、光照 =================
  // ⚠️ three r155+ 默认物理光照单位：点光源衰减 = intensity / distance^decay。
  // 行星距离太阳 62~185，必须用 decay=1 且 intensity 按距离量级取值，
  // 否则照到行星上的光强趋近于 0（r160 实测会几乎全黑）。
  scene.add(new THREE.AmbientLight(0x30405a, 1.0));
  const sunLight = new THREE.PointLight(0xffe0b0, 180, 0, 1); // decay=1：水星≈2.9 / 地球≈1.5 / 火星≈1.0
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(0x8899ff, 0.35);
  rimLight.position.set(-300, 200, 400);
  scene.add(rimLight);

  // ================= 三、太阳系 =================
  const system = new THREE.Group();
  scene.add(system);
  // 轨道平面倾斜：透视相机下能看到椭圆透视效果
  system.rotation.set(0.46, 0, -0.12);

  // —— 行星程序化表面贴图（横向条纹 + 噪点，一次性生成，运行时零成本）——
  function makePlanetTexture(hexBase, hexBand) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = hexBase;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = hexBand;
    let y = 0;
    while (y < c.height) {
      const h = 3 + Math.random() * 8;
      g.globalAlpha = 0.15 + Math.random() * 0.3;
      g.fillRect(0, y, c.width, h);
      y += h + Math.random() * 5;
    }
    g.globalAlpha = 1;
    // 少量噪点增加质感
    for (let i = 0; i < 220; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
      g.fillRect(Math.random() * c.width, Math.random() * c.height, 1.5, 1.5);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // —— 太阳：自发光球体 + 双层脉冲光晕 ——
  const sunRadius = 34;
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(sunRadius, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd98a })
  );
  system.add(sun);

  function makeGlowTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const grad = g.createRadialGradient(cx, cy, size * 0.08, cx, cy, size * 0.48);
    grad.addColorStop(0, 'rgba(255,255,240,0.95)');
    grad.addColorStop(0.35, 'rgba(255,190,100,0.45)');
    grad.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function makeSprite(texture, scale) {
    const smat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sp = new THREE.Sprite(smat);
    sp.scale.set(scale, scale, 1);
    return sp;
  }
  const glowTex = makeGlowTexture(256);
  const sunGlowInner = makeSprite(glowTex, sunRadius * 5);
  const sunGlowOuter = makeSprite(glowTex, sunRadius * 11);
  sunGlowOuter.material.opacity = 0.55;
  system.add(sunGlowInner);
  system.add(sunGlowOuter);

  // —— 行星：MeshStandardMaterial + 自转 + 轨道光点流 ——
  const planets = [];
  function circlePoints(r, seg) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    return pts;
  }

  function addPlanet({ orbitR, radius, color, bandColor, speed, phase }) {
    const pivot = new THREE.Group();
    pivot.rotation.y = phase || 0; // 初始相位：避免行星开局排在同一条直线上

    // 轨道线
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(circlePoints(orbitR, 128)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.32 })
    );
    ring.rotation.x = Math.PI / 2;
    pivot.add(ring);

    // 轨道光点流：一圈小粒子沿轨道快速流动（独立组，速度是公转的 ~4 倍）
    const FLOW_N = isMobile ? 5 : 8;
    const flowGeo = new THREE.BufferGeometry();
    const flowPos = new Float32Array(FLOW_N * 3);
    for (let i = 0; i < FLOW_N; i++) {
      const a = (i / FLOW_N) * Math.PI * 2;
      flowPos[i * 3] = Math.cos(a) * orbitR;
      flowPos[i * 3 + 2] = Math.sin(a) * orbitR;
    }
    flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
    const flow = new THREE.Points(flowGeo, new THREE.PointsMaterial({
      color: 0xaee2ff,
      size: 2.4,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    pivot.add(flow);

    // 行星本体（受光照的标准材质）
    const holder = new THREE.Group();
    pivot.add(holder);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 28, 20),
      new THREE.MeshStandardMaterial({
        map: makePlanetTexture(color, bandColor),
        roughness: 0.65,
        metalness: 0.15
      })
    );
    mesh.position.set(orbitR, 0, 0);
    mesh.rotation.z = 0.2 + Math.random() * 0.2; // 轴倾角，自转更好看
    holder.add(mesh);

    system.add(pivot);
    const entry = {
      pivot, holder, mesh, flow, flowN: FLOW_N, orbitR,
      speed: speed * 60,
      flowSpeed: speed * 60 * 4,
      phase: phase || 0,
      spin: 0.25 + Math.random() * 0.35
    };
    planets.push(entry);
    return entry;
  }

  addPlanet({ orbitR: 62,  radius: 7,  color: '#c8a06a', bandColor: '#8f6f42', speed: 0.0016,  phase: 0.6 });
  const earthEntry = addPlanet({ orbitR: 118, radius: 14, color: '#3f8fd8', bandColor: '#7ec97e', speed: 0.0010,  phase: 2.2 });
  addPlanet({ orbitR: 185, radius: 10, color: '#d96f43', bandColor: '#f0b07a', speed: 0.00068, phase: 4.0 });

  // —— 地球的月球（同样受光照 + 自身轨道微光点）——
  const moonPivot = new THREE.Group();
  const moonRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(circlePoints(26, 48)),
    new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.28 })
  );
  moonRing.rotation.x = Math.PI / 2;
  moonPivot.add(moonRing);
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xb8c2cc, roughness: 0.85, metalness: 0.05 })
  );
  moonMesh.position.set(26, 0, 0);
  moonPivot.add(moonMesh);
  // 挂在地球的 holder 下（而非系统原点），这样月球会跟随地球一起公转；
  // 坐标仍是相对太阳系的 (118,0,0)，即地球所在位置
  moonPivot.position.set(118, 0, 0);
  earthEntry.holder.add(moonPivot);

  // ================= 四、流星 =================
  const meteorGroup = new THREE.Group();
  scene.add(meteorGroup);
  const MAX_METEORS = isMobile ? 1 : 3;
  const meteors = [];
  function spawnMeteor() {
    if (meteorGroup.children.length >= MAX_METEORS) return;
    const len = 50 + Math.random() * 80;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xcfe9ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const line = new THREE.Line(geo, mat);
    line.position.set(
      (Math.random() - 0.5) * camW * 0.9,
      (Math.random() * 0.5 + 0.1) * camH * 0.8,
      (Math.random() - 0.5) * 150
    );
    meteorGroup.add(line);
    meteors.push({
      line, len,
      speedX: 6 + Math.random() * 8,
      speedY: -2 - Math.random() * 3,
      life: 1,
      dirX: Math.random() < 0.5 ? -1 : 1
    });
  }

  // ================= 渲染循环 =================
  const clock = new THREE.Clock();
  let rafId = null;
  let running = true;

  // 相机控制：鼠标 → 目标 yaw/pitch（真旋转），加上自动缓慢摆动
  let mouseX = 0, mouseY = 0;          // -1..1
  let yaw = 0, pitch = 0;              // 当前角度
  const MOUSE_YAW_MAX = 0.38;          // 弧度，明显但不出戏
  const MOUSE_PITCH_MAX = 0.22;
  const AUTO_YAW_AMP = reducedMotion ? 0 : 0.14;
  const AUTO_PITCH_AMP = reducedMotion ? 0 : 0.06;

  function onPointerMove(e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
  }
  function onPointerLeave() { mouseX = 0; mouseY = 0; }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);

  function resize() {
    camW = window.innerWidth;
    camH = window.innerHeight;
    camera.aspect = camW / camH;
    renderer.setSize(camW, camH, false);
    // 竖屏窄视口时相机距离可达 ~1000+，星空盒（半边长 800）必须同步放大，
    // 否则相机会飞出盒子外，BackSide 星空整片消失
    const dist = idealCamDist();
    starfield.scale.setScalar(Math.max(1, (dist * 1.35) / 800));
    repositionCamera(true);
    // 粒子随视口重新分布
    for (const layer of [layerFar, layerNear]) {
      for (let i = 0; i < layer.count; i++) {
        layer.pos[i * 3] = (Math.random() - 0.5) * camW * 1.6;
        layer.pos[i * 3 + 1] = (Math.random() - 0.5) * camH * 1.6;
      }
      layer.geo.attributes.position.needsUpdate = true;
    }
  }
  function repositionCamera(immediate) {
    // 由 yaw/pitch 计算相机在以原点为球心的球面位置
    const dist = idealCamDist();
    const cy = Math.cos(pitch);
    camera.position.set(
      Math.sin(yaw) * cy * dist,
      Math.sin(pitch) * dist,
      Math.cos(yaw) * cy * dist
    );
    camera.lookAt(0, 0, 0);
    if (immediate) camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();

  let meteorTimer = 1 + Math.random() * 3;

  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.getElapsedTime();

    if (!reducedMotion) {
      // 星场极缓慢漂移
      starfield.rotation.y += dt * 0.004;
      starfield.rotation.x += dt * 0.0012;

      // 粒子分层漂移：近层快、远层慢
      for (const layer of [layerFar, layerNear]) {
        const arr = layer.pos;
        const drift = layer === layerNear ? 14 : 6;
        for (let i = 0; i < layer.count; i++) {
          arr[i * 3] += dt * drift;
          if (arr[i * 3] > camW * 0.85) arr[i * 3] = -camW * 0.85;
        }
        layer.geo.attributes.position.needsUpdate = true;
      }
    }

    // 行星公转 + 轨道光点流 + 自转
    for (const p of planets) {
      p.holder.rotation.y += dt * p.speed;
      p.flow.rotation.y += dt * p.flowSpeed;
      p.mesh.rotation.y += dt * p.spin;
    }
    moonPivot.rotation.y += dt * 0.57;
    moonMesh.rotation.y += dt * 0.3;

    // 太阳：光晕脉冲呼吸 + 本体轻微缩放
    if (!reducedMotion) {
      const pulse = 1 + Math.sin(t * 1.6) * 0.07;
      const pulse2 = 1 + Math.sin(t * 1.6 + 0.8) * 0.12;
      sunGlowInner.scale.set(sunRadius * 5 * pulse, sunRadius * 5 * pulse, 1);
      sunGlowOuter.scale.set(sunRadius * 11 * pulse2, sunRadius * 11 * pulse2, 1);
      const sunS = 1 + Math.sin(t * 2.3) * 0.02;
      sun.scale.set(sunS, sunS, sunS);
      sunLight.intensity = 180 + Math.sin(t * 1.6) * 30; // 与物理光照单位同量级的脉冲
    }

    // 相机：目标角 = 自动摆动 + 鼠标偏移，平滑追踪
    const targetYaw = Math.sin(t * 0.13) * AUTO_YAW_AMP + mouseX * MOUSE_YAW_MAX;
    const targetPitch = 0.16 + Math.cos(t * 0.09) * AUTO_PITCH_AMP + mouseY * MOUSE_PITCH_MAX;
    yaw += (targetYaw - yaw) * 0.04;
    pitch += (targetPitch - pitch) * 0.04;
    repositionCamera(false);

    // 流星
    if (!reducedMotion) {
      meteorTimer -= dt;
      if (meteorTimer <= 0) {
        spawnMeteor();
        meteorTimer = 1.5 + Math.random() * 5;
      }
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.line.position.x += m.speedX * m.dirX * dt;
      m.line.position.y += m.speedY * dt;
      const pos = m.line.geometry.attributes.position.array;
      pos[0] = 0; pos[1] = 0; pos[2] = 0;
      pos[3] = -m.dirX * m.len; pos[4] = m.len * 0.35; pos[5] = 0;
      m.line.geometry.attributes.position.needsUpdate = true;
      const opacity = m.line.material.opacity = Math.max(0, m.life);
      m.life -= dt * 1.4;
      if (opacity <= 0) {
        meteorGroup.remove(m.line);
        m.line.geometry.dispose();
        m.line.material.dispose();
        meteors.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') {
      if (!running) { running = true; clock.getDelta(); rafId = requestAnimationFrame(animate); }
    } else {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  animate();

  // —— 销毁函数 ——
  dispose = function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    renderer.dispose();
    dispose = null; // 复位，保证 hasActive() 在销毁后返回 false
  };
  return dispose;
}

export function hasActive() { return !!dispose; }

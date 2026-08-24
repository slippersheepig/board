// background3d.js — Three.js 3D 背景
// 目标：
//  1. 星球与轨道系统 3D 化，视觉效果更酷炫
//  2. 不遮挡中央的 SVG 时钟与工具卡片（轨道大圆环延伸至四周，中央天体被卡片自然遮挡）
//  3. 严格控制客户端资源消耗：
//     - 像素比封顶、抗锯齿关闭、场景物少量少面
//     - 背景星场用「贴图 + 少量粒子」而非逐帧重绘成百上千个点
//     - 页面隐藏时暂停渲染循环（visibilitychange）
//     - 适配 prefers-reduced-motion 与低配设备
//
// 使用正交相机：把 3D 世界坐标直接映射到屏幕像素（x: -w/2..w/2, y: -h/2..h/2），
// 这样能精确控制天体落在哪些屏幕区域，避免盖住时钟与工具。

let dispose = null;

export function init(THREE, canvas, options = {}) {
  // —— 提前做能力/资源判断（调用方已做，这里再兜底一次）——
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

  // 像素比封顶：桌面 1.5，移动端更保守，低配再降
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

  // —— 相机（正交，世界坐标 == 屏幕像素）——
  let camW = window.innerWidth;
  let camH = window.innerHeight;
  const camera = new THREE.OrthographicCamera(
    -camW / 2, camW / 2, camH / 2, -camH / 2, -1000, 1000
  );
  camera.position.set(0, 0, 500);
  camera.lookAt(0, 0, 0);

  // 轻微透视视差用的相机方位（让场景看起来有 3D 深度感）
  let camTargetX = 0, camTargetY = 0;
  camera.position.z = 520;

  // ================= 一、星场 =================
  // 用一张运行时生成的贴图贴到 8 个面上（BoxGeometry），得到整片星空，成本极低。
  function makeStarTexture(starCount) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#02050a';
    g.fillRect(0, 0, c.width, c.height);

    // 微弱星云渐变
    const neb = g.createRadialGradient(180, 180, 40, 180, 180, 520);
    neb.addColorStop(0, 'rgba(70, 30, 140, 0.20)');
    neb.addColorStop(0.5, 'rgba(40, 20, 90, 0.08)');
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = neb; g.fillRect(0, 0, c.width, c.height);
    const neb2 = g.createRadialGradient(760, 700, 60, 760, 700, 480);
    neb2.addColorStop(0, 'rgba(20, 60, 130, 0.16)');
    neb2.addColorStop(0.6, 'rgba(10, 30, 80, 0.05)');
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
    const tex = makeStarTexture(isMobile ? 260 : 420);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      opacity: 0.95
    });
    // 8 面大盒子，尺寸略大于近裁剪面，确保完全包裹视野
    const box = new THREE.Mesh(new THREE.BoxGeometry(1500, 1500, 1500), mat);
    // 随机翻转其中一些面，让星星分布更自然（不加会显得重复）
    box.rotation.set(0, Math.PI * 0.13, 0);
    scene.add(box);
    return box;
  }
  const starfield = buildStarfield();

  // 少量前景粒子，制造轻微「在星空内部」的视差与闪烁
  const PARTICLE_COUNT = isMobile ? 60 : 110;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * camW * 1.4;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * camH * 1.4;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 3.2,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: false,
    depthWrite: false
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ================= 二、太阳系 =================
  const system = new THREE.Group();
  scene.add(system);

  // 轨道所在平面：绕 x 轴倾斜 + 绕 z 旋转，制造与屏幕的透视夹角
  system.rotation.set(0.42, 0, -0.10);

  // —— 太阳 ——
  const sunRadius = 34;
  const sunGeo = new THREE.SphereGeometry(sunRadius, 32, 24);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcf66 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  system.add(sun);

  // 太阳光晕（2D 贴图 billboard，始终面向相机）
  function makeGlowTexture(r, inner, outer, innerA, outerA) {
    const c = document.createElement('canvas');
    c.width = c.height = r * 4;
    const g = c.getContext('2d');
    const cx = c.width / 2, cy = c.height / 2;
    const grad = g.createRadialGradient(cx, cy, inner, cx, cy, outer);
    grad.addColorStop(0, `rgba(255,255,255,${innerA})`);
    grad.addColorStop(0.5, `rgba(255,180,90,${innerA * 0.5})`);
    grad.addColorStop(1, `rgba(255,140,40,${outerA})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
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
  system.add(makeSprite(makeGlowTexture(128, 20, 120, 0.9, 0.0), sunRadius * 7));

  // —— 内行星（水星）：半径 62 ——
  // —— 地球：半径 118，带月球 ——
  // —— 外行星（火星）：半径 185 ——
  const planets = [];
  function addPlanet({ orbitR, radius, color, speed, phase, label, reverse }) {
    const pivot = new THREE.Group();
    // 轨道线
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        (() => {
          const pts = [];
          for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
          }
          return pts;
        })()
      ),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2; // 平放到轨道平面
    pivot.add(ring);

    const holder = new THREE.Group();
    pivot.add(holder);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 18),
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.position.set(orbitR, 0, 0);
    holder.add(mesh);

    system.add(pivot);

    planets.push({
      pivot,
      holder,
      mesh,
      radius,
      speed: (reverse ? -1 : 1) * speed,
      phase: phase || 0,
      orbitR,
      label
    });
  }

  // 颜色与半径（相对太阳比例，保证在屏幕上和谐）
  addPlanet({ orbitR: 62,  radius: 7,  color: 0xc8a06a, speed: 0.0016, phase: 0.6,  label: '水星' });
  addPlanet({ orbitR: 118, radius: 14, color: 0x4aa8ff, speed: 0.0010, phase: 2.2,  label: '地球' });
  addPlanet({ orbitR: 185, radius: 10, color: 0xe07a4f, speed: 0.00068, phase: 4.0, label: '火星' });

  // 地球的月球
  const earthEntry = planets.find(p => p.label === '地球');
  const moonPivot = new THREE.Group();
  const moonRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      (() => {
        const pts = [];
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * 26, 0, Math.sin(a) * 26));
        }
        return pts;
      })()
    ),
    new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.3 })
  );
  moonRing.rotation.x = Math.PI / 2;
  moonPivot.add(moonRing);
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xb8c2cc })
  );
  moonMesh.position.set(26, 0, 0);
  moonPivot.add(moonMesh);
  moonPivot.position.set(118, 0, 0); // 挂在地球轨道半径处
  system.add(moonPivot);

  // 天体名称标签（始终面向相机，居中于天体上方）
  const labelSprites = new THREE.Group();
  scene.add(labelSprites);
  // —— 先不启用 Sprite 文字标签（需要字体加载），改用极简点光源/光晕即可 ——

  // ================= 三、流星 =================
  // 流星：用短小的线条，随机出现、快速划过
  const meteorGroup = new THREE.Group();
  scene.add(meteorGroup);
  const MAX_METEORS = isMobile ? 1 : 3;
  const meteors = [];
  function spawnMeteor() {
    if (meteorGroup.children.length >= MAX_METEORS) return;
    const len = 40 + Math.random() * 70;
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
    // 在屏幕中上部区域随机起点
    line.position.set(
      (Math.random() - 0.5) * camW * 0.9,
      (Math.random() * 0.5 + 0.1) * camH,
      0
    );
    const speedX = 6 + Math.random() * 8;
    const speedY = -2 - Math.random() * 3;
    meteorGroup.add(line);
    meteors.push({ line, len, speedX, speedY, life: 1, dirX: Math.random() < 0.5 ? -1 : 1 });
  }

  // ================= 渲染循环 =================
  const clock = new THREE.Clock();
  let rafId = null;
  let running = true;
  let lastMouse = { x: null, y: null };

  // 相机的轻微鼠标视差（仅在用户移动鼠标时短暂生效，静止后缓慢归中）
  function onPointerMove(e) {
    camTargetX = (e.clientX / window.innerWidth - 0.5) * 26;
    camTargetY = -(e.clientY / window.innerHeight - 0.5) * 18;
  }
  function onPointerLeave() { camTargetX = 0; camTargetY = 0; }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);

  function resize() {
    camW = window.innerWidth;
    camH = window.innerHeight;
    camera.left = -camW / 2;
    camera.right = camW / 2;
    camera.top = camH / 2;
    camera.bottom = -camH / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(camW, camH, false);
    // 让粒子阵列随视口重新分布（保持覆盖视野）
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * camW * 1.4;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * camH * 1.4;
    }
    pGeo.attributes.position.needsUpdate = true;
  }
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();

  let meteorTimer = 0;
  let elapsed = Math.random() * 1000;

  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();
    elapsed += dt;

    // 星场极缓慢旋转（仅非 reduced-motion 时）
    if (!reducedMotion) {
      starfield.rotation.y += dt * 0.002;
    }

    // 行星公转（每秒角度 = speed * 60 度量）
    for (const p of planets) {
      p.holder.rotation.y += dt * p.speed * 60;
    }
    moonPivot.rotation.y += dt * 0.0095 * 60;

    // 流星
    meteorTimer -= dt;
    if (meteorTimer <= 0) {
      spawnMeteor();
      meteorTimer = 1.5 + Math.random() * 5;
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.line.position.x += m.speedX * m.dirX * dt;
      m.line.position.y += m.speedY * dt;
      // 更新几何：起点->终点（沿运动方向拖尾）
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

    // 相机平滑跟随鼠标，产生轻微视差（幅度很小，不破坏布局）
    camera.position.x += (camTargetX - camera.position.x) * 0.05;
    camera.position.y += (camTargetY - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

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

  // —— 返回销毁函数 ——
  dispose = function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    // 释放资源
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    renderer.dispose();
  };
  return dispose;
}

// 供外部判断是否已初始化
export function hasActive() { return !!dispose; }
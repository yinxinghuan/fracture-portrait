import './style.css';
import { callAigramAPI, isInAigram, telegramId } from './shared/runtime/bridge.ts';
import { fragmentShaderSource, vertexShaderSource } from './shaders.js';

const search = new URLSearchParams(location.search);
const baselineMode = search.get('baseline') === '1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = document.querySelector('.fp-stage');
const canvas = document.querySelector('.fp-canvas');
const ghost = document.querySelector('#ghost');
const loading = document.querySelector('#loading');
const identityName = document.querySelector('#identityName');
const errorPanel = document.querySelector('#errorPanel');
const retryButton = document.querySelector('#retryButton');

if (baselineMode) document.body.classList.add('fp-baseline');

const COPY = {
  zh: {
    loading: '正在显影',
    errorTitle: '肖像没有显现',
    errorBody: '请重新载入这块玻璃',
    retry: '重新载入'
  },
  en: {
    loading: 'DEVELOPING',
    errorTitle: 'PORTRAIT NOT FOUND',
    errorBody: 'Reload this sheet of glass',
    retry: 'RELOAD'
  }
};

const localeOverride = localStorage.getItem('game_locale');
const locale = localeOverride === 'en' || localeOverride === 'zh'
  ? localeOverride
  : navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
document.querySelector('#loadingText').textContent = COPY[locale].loading;
document.querySelector('#errorTitle').textContent = COPY[locale].errorTitle;
document.querySelector('#errorBody').textContent = COPY[locale].errorBody;
retryButton.textContent = COPY[locale].retry;

const TIMING = reducedMotion
  ? { crack: 80, hold: 700, restore: 180 }
  : { crack: 180, hold: 1350, restore: 900 };

const params = {
  clickRandomizer: 0.332,
  distance: baselineMode ? 0.015 : 0,
  effect: baselineMode ? 1 : 0,
  edgeThickness: 0.006
};

const pointer = {
  x: baselineMode ? 0.55 : 0.58,
  y: baselineMode ? 0.5 : 0.46
};

let gl;
let program;
let uniforms;
let image;
let texture;
let frameId = 0;
let phase = baselineMode ? 'baseline' : 'intact';
let phaseStarted = 0;
let userHasActed = false;
let ghostTimer = 0;
let resizeTimer = 0;
let restoreSoundPlayed = false;
let audioContext = null;
let identitySource = 'alteru-default';

function absolutePublicUrl(path) {
  return new URL(path, document.baseURI).href;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function compileShader(source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const detail = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${detail}`);
  }
  return shader;
}

function initWebGL() {
  if (search.get('forceError') === '1') throw new Error('Forced WebGL error');
  gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: false
  });
  if (!gl) throw new Error('WebGL unavailable');

  const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
  }

  gl.useProgram(program);
  uniforms = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let index = 0; index < uniformCount; index += 1) {
    const uniformName = gl.getActiveUniform(program, index).name;
    uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
  }

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(uniforms.u_image_texture, 0);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const nextImage = new Image();
    nextImage.decoding = 'async';
    if (new URL(url, location.href).origin !== location.origin) {
      nextImage.crossOrigin = 'anonymous';
    }
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error(`Image unavailable: ${url}`));
    nextImage.src = url;
  });
}

function drawCover(context, source, width, height) {
  const scale = Math.max(width / source.naturalWidth, height / source.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (source.naturalWidth - sourceWidth) * 0.5;
  const sourceY = Math.max(0, (source.naturalHeight - sourceHeight) * 0.43);
  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );
}

function createViewportTextureCanvas(source) {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(2, Math.round(innerWidth * ratio));
  const height = Math.max(2, Math.round(innerHeight * ratio));
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const context = output.getContext('2d');
  context.fillStyle = '#08090b';
  context.fillRect(0, 0, width, height);
  drawCover(context, source, width, height);
  context.fillStyle = 'rgba(5, 6, 8, 0.06)';
  context.fillRect(0, 0, width, height);
  return output;
}

function uploadImageTexture() {
  if (!image || !gl) return;
  const source = baselineMode ? image : createViewportTextureCanvas(image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  const imgRatio = baselineMode
    ? image.naturalWidth / image.naturalHeight
    : canvas.width / canvas.height;
  gl.uniform1f(uniforms.u_img_ratio, imgRatio);
}

function resizeCanvas() {
  if (!gl) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(2, Math.round(innerWidth * ratio));
  canvas.height = Math.max(2, Math.round(innerHeight * ratio));
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(uniforms.u_ratio, canvas.width / canvas.height);
  uploadImageTexture();
  requestRender();
}

function updateUniforms() {
  gl.uniform1f(uniforms.u_click_randomizer, params.clickRandomizer);
  gl.uniform1f(uniforms.u_rotation, 0);
  gl.uniform1f(uniforms.u_effect, params.distance);
  gl.uniform1f(uniforms.u_effect_active, params.effect);
  gl.uniform1f(uniforms.u_edge_thickness, params.edgeThickness);
  gl.uniform2f(uniforms.u_pointer_position, pointer.x, pointer.y);
}

function draw() {
  updateUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function requestRender() {
  if (!frameId && !document.hidden) frameId = requestAnimationFrame(render);
}

function render(now) {
  frameId = 0;
  if (phase === 'cracking') {
    const progress = Math.min(1, (now - phaseStarted) / TIMING.crack);
    const eased = easeOutCubic(progress);
    params.effect = eased;
    params.distance = 0.052 * eased;
    if (progress >= 1) {
      phase = 'holding';
      phaseStarted = now;
    }
  } else if (phase === 'holding') {
    params.effect = 1;
    params.distance = 0.052;
    if (now - phaseStarted >= TIMING.hold) {
      phase = 'restoring';
      phaseStarted = now;
      if (!restoreSoundPlayed) {
        playRestoreSound();
        restoreSoundPlayed = true;
      }
    }
  } else if (phase === 'restoring') {
    const progress = Math.min(1, (now - phaseStarted) / TIMING.restore);
    const eased = easeInOutSine(progress);
    params.effect = 1 - eased;
    params.distance = 0.052 * (1 - eased);
    if (progress >= 1) {
      phase = 'intact';
      params.effect = 0;
      params.distance = 0;
    }
  }

  draw();
  if (phase === 'cracking' || phase === 'holding' || phase === 'restoring') {
    requestRender();
  }
}

function normalizedPoint(clientX, clientY) {
  return {
    x: Math.max(0.02, Math.min(0.98, clientX / innerWidth)),
    y: Math.max(0.02, Math.min(0.98, clientY / innerHeight))
  };
}

function triggerFracture(x, y, { silent = false } = {}) {
  pointer.x = x;
  pointer.y = y;
  params.clickRandomizer = Math.random();
  params.effect = 0;
  params.distance = 0;
  phase = 'cracking';
  phaseStarted = performance.now();
  restoreSoundPlayed = false;
  if (!silent) playCrackSound();
  requestRender();
}

function stopGhost() {
  clearTimeout(ghostTimer);
  ghost.classList.remove('fp-ghost--show');
}

function runGhostDemo() {
  if (reducedMotion || userHasActed || baselineMode) return;
  ghost.classList.add('fp-ghost--show');
  ghostTimer = window.setTimeout(() => {
    if (!userHasActed) triggerFracture(0.62, 0.48, { silent: true });
  }, 470);
  ghost.addEventListener('animationend', () => {
    ghost.classList.remove('fp-ghost--show');
  }, { once: true });
}

function installProductControls() {
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    userHasActed = true;
    stopGhost();
    const point = normalizedPoint(event.clientX, event.clientY);
    triggerFracture(point.x, point.y);
  });

  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    event.preventDefault();
    userHasActed = true;
    stopGhost();
    triggerFracture(0.5, 0.47);
  });
}

function installBaselineControls() {
  canvas.addEventListener('click', event => {
    const point = normalizedPoint(event.pageX, event.pageY);
    pointer.x = point.x;
    pointer.y = point.y;
    params.clickRandomizer = Math.random();
    draw();
  });
  document.addEventListener('keydown', event => {
    if (event.code === 'Space') {
      params.effect = params.effect > 0 ? 0 : 1;
      draw();
    }
  });
  let direction = 1;
  const autoRun = () => {
    params.clickRandomizer -= 0.03;
    pointer.x += (70 / innerWidth) * direction;
    pointer.y += 40 / innerHeight;
    direction *= -1;
    draw();
  };
  setTimeout(autoRun, 500);
  setTimeout(autoRun, 1000);
}

function createAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioContext = new AudioContextClass();
  }
  if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function playCrackSound() {
  try {
    const context = createAudioContext();
    if (!context) return;
    const duration = 0.055;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const decay = 1 - index / channel.length;
      channel[index] = (Math.random() * 2 - 1) * decay * decay;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, context.currentTime);
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  } catch {
    // Audio is optional; visual feedback remains immediate.
  }
}

function playRestoreSound() {
  if (!userHasActed) return;
  try {
    const context = audioContext;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(330, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(165, context.currentTime + 0.26);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.26);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.27);
  } catch {
    // Audio is optional.
  }
}

async function readPlayerProfile() {
  if (!isInAigram || !telegramId) return null;
  const response = await callAigramAPI(
    `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(telegramId)}`,
    'GET'
  );
  return response?.data ?? null;
}

async function resolveIdentity() {
  const previewAvatar = search.get('avatar_url');
  const previewName = search.get('user_name');
  let profile = null;
  if (isInAigram && !previewName) {
    profile = await readPlayerProfile();
    if (!profile?.name && !profile?.user_name) {
      throw new Error('AlterU profile did not return name');
    }
  } else if (isInAigram && !previewAvatar) {
    try {
      profile = await readPlayerProfile();
    } catch (error) {
      console.warn('Fracture Portrait avatar fallback:', error);
    }
  }

  const avatarUrl = previewAvatar || profile?.head_url || null;
  const userName = previewName
    || profile?.name
    || profile?.user_name
    || 'AlterU';

  if (previewAvatar) identitySource = 'preview-avatar';
  else if (profile?.head_url) identitySource = 'player-avatar';

  return { avatarUrl, userName };
}

async function loadIdentityImage(avatarUrl) {
  if (avatarUrl) {
    try {
      return await loadImage(avatarUrl);
    } catch (error) {
      console.warn('Fracture Portrait avatar image fallback:', error);
    }
  }
  identitySource = 'alteru-default';
  return loadImage(absolutePublicUrl('./alteru-default-avatar.jpg'));
}

function showError(error) {
  console.error(error);
  loading.hidden = true;
  errorPanel.hidden = false;
}

async function init() {
  initWebGL();
  if (baselineMode) {
    image = await loadImage(absolutePublicUrl('./upstream-original.jpg'));
    resizeCanvas();
    draw();
    installBaselineControls();
    return;
  }

  const identity = await resolveIdentity();
  identityName.textContent = identity.userName.toLocaleUpperCase(locale);
  image = await loadIdentityImage(identity.avatarUrl);
  stage.dataset.identitySource = identitySource;
  resizeCanvas();
  draw();
  installProductControls();
  stage.classList.add('fp-ready');
  window.setTimeout(runGhostDemo, 850);
}

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(resizeCanvas, 120);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  } else if (!document.hidden) {
    requestRender();
  }
});

canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  showError(new Error('WebGL context lost'));
});

retryButton.addEventListener('click', () => location.reload());

init().catch(showError);

const marker = document.querySelector('#marker');
const positionEl = document.querySelector('#position');
const speedEl = document.querySelector('#speed');
const phaseEl = document.querySelector('#phase');
const statusEl = document.querySelector('#status');
const startBtn = document.querySelector('#startBtn');
const pauseBtn = document.querySelector('#pauseBtn');
const resetBtn = document.querySelector('#resetBtn');

const settings = {
  minSpeed: document.querySelector('#minSpeed'),
  maxSpeed: document.querySelector('#maxSpeed'),
  minPause: document.querySelector('#minPause'),
  maxPause: document.querySelector('#maxPause'),
  pauseChance: document.querySelector('#pauseChance'),
  variation: document.querySelector('#variation')
};

const outputs = {
  minSpeed: document.querySelector('#minSpeedValue'),
  maxSpeed: document.querySelector('#maxSpeedValue'),
  minPause: document.querySelector('#minPauseValue'),
  maxPause: document.querySelector('#maxPauseValue'),
  pauseChance: document.querySelector('#pauseChanceValue'),
  variation: document.querySelector('#variationValue')
};

let position = 0.5;
let destination = 0.5;
let speed = 1;
let targetSpeed = 1;
let running = false;
let paused = false;
let pauseUntil = 0;
let lastTime = 0;
let nextSpeedChange = 0;
let pauseAfterArrival = false;

const random = (min, max) => min + Math.random() * (max - min);

function readSettings() {
  return {
    minSpeed: Number(settings.minSpeed.value),
    maxSpeed: Number(settings.maxSpeed.value),
    minPause: Number(settings.minPause.value),
    maxPause: Number(settings.maxPause.value),
    pauseChance: Number(settings.pauseChance.value) / 100,
    variation: Number(settings.variation.value) / 100
  };
}

function chooseSpeed(now) {
  const s = readSettings();
  targetSpeed = random(Math.min(s.minSpeed, s.maxSpeed), Math.max(s.minSpeed, s.maxSpeed));
  nextSpeedChange = now + random(1800, 4500);
}

function chooseDestination(now) {
  const s = readSettings();
  const previous = destination;
  const roll = Math.random();

  if (roll < 0.20) destination = 0;
  else if (roll < 0.40) destination = 1;
  else destination = random(0.05, 0.95);

  if (Math.abs(destination - previous) < 0.08) {
    destination = previous < 0.5 ? random(0.60, 0.95) : random(0.05, 0.40);
  }

  // Decide whether to stop after reaching this destination.
  pauseAfterArrival = Math.random() <= s.pauseChance;
  phaseEl.textContent = destination > position ? 'MOVING UP' : 'MOVING DOWN';
}

function beginPause(now) {
  const s = readSettings();
  const min = Math.min(s.minPause, s.maxPause);
  const max = Math.max(s.minPause, s.maxPause);
  pauseUntil = now + random(min, max) * 1000;
  paused = true;
  marker.classList.add('paused');
  phaseEl.textContent = 'PAUSED';
}

function updateUI() {
  // Only this one place writes the marker position.
  // It uses a single CSS property every frame, so there is no second animation fighting it.
  marker.style.top = `${(1 - position) * 100}%`;
  positionEl.textContent = `${Math.round(position * 100)}%`;
  speedEl.textContent = `${speed.toFixed(2)}×`;
}

function frame(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(50, Math.max(0, now - lastTime));
  lastTime = now;

  if (running && !paused) {
    if (now >= nextSpeedChange) chooseSpeed(now);

    // Smooth speed changes, never a position jump.
    const smoothing = 1 - Math.exp(-dt / 800);
    speed += (targetSpeed - speed) * smoothing;

    const distance = destination - position;
    const pixelsPerSecond = 140 * speed;

    // Move in continuous time toward the destination.
    // The final frame is clamped only to the destination itself.
    if (Math.abs(distance) > 0.000001) {
      const viewport = Math.max(1, marker.parentElement?.clientHeight || window.innerHeight);
      const normalizedStep = (pixelsPerSecond * dt / 1000) / viewport;
      const step = Math.min(Math.abs(distance), normalizedStep);
      position += Math.sign(distance) * step;
    }

    if (Math.abs(destination - position) <= 0.000001) {
      position = destination;
      if (pauseAfterArrival) beginPause(now);
      else chooseDestination(now);
    }
  }

  if (running && paused && now >= pauseUntil) {
    paused = false;
    marker.classList.remove('paused');
    chooseDestination(now);
    phaseEl.textContent = destination > position ? 'MOVING UP' : 'MOVING DOWN';
  }

  updateUI();
  requestAnimationFrame(frame);
}

function start() {
  running = true;
  paused = false;
  marker.classList.remove('paused');

  const now = performance.now();
  lastTime = now;
  chooseSpeed(now);
  speed = targetSpeed;
  chooseDestination(now);

  statusEl.textContent = 'RUNNING';
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'PAUSE';
}

function togglePause() {
  if (!running) return;

  paused = !paused;
  if (paused) {
    pauseUntil = Infinity;
    marker.classList.add('paused');
    phaseEl.textContent = 'PAUSED';
    pauseBtn.textContent = 'RESUME';
    statusEl.textContent = 'PAUSED';
  } else {
    paused = false;
    marker.classList.remove('paused');
    lastTime = performance.now();
    phaseEl.textContent = destination > position ? 'MOVING UP' : 'MOVING DOWN';
    pauseBtn.textContent = 'PAUSE';
    statusEl.textContent = 'RUNNING';
  }
}

function reset() {
  running = false;
  paused = false;
  pauseUntil = 0;
  position = 0.5;
  destination = 0.5;
  speed = 1;
  targetSpeed = 1;
  pauseAfterArrival = false;

  marker.classList.remove('paused');
  statusEl.textContent = 'READY';
  phaseEl.textContent = 'READY';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = 'PAUSE';
  updateUI();
}

function updateOutputs() {
  outputs.minSpeed.textContent = `${Number(settings.minSpeed.value).toFixed(2)}×`;
  outputs.maxSpeed.textContent = `${Number(settings.maxSpeed.value).toFixed(2)}×`;
  outputs.minPause.textContent = `${Number(settings.minPause.value).toFixed(1)} s`;
  outputs.maxPause.textContent = `${Number(settings.maxPause.value).toFixed(1)} s`;
  outputs.pauseChance.textContent = `${settings.pauseChance.value}%`;
  outputs.variation.textContent = `${settings.variation.value}%`;
}

Object.values(settings).forEach(input => input.addEventListener('input', updateOutputs));
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', reset);

updateOutputs();
updateUI();
requestAnimationFrame(frame);

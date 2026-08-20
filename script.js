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

let position = 50;
let destination = 50;
let speed = 1;
let targetSpeed = 1;
let running = false;
let paused = false;
let pauseUntil = 0;
let lastTime = 0;
let nextSpeedChange = 0;

const random = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
  const min = Math.min(s.minSpeed, s.maxSpeed);
  const max = Math.max(s.minSpeed, s.maxSpeed);
  targetSpeed = random(min, max);
  nextSpeedChange = now + random(1600, 5000);
}

// Pick a NEW destination only after the marker has reached the current one.
// This is the key to preventing teleportation.
function chooseDestination(now) {
  const s = readSettings();
  const oldDestination = destination;

  // Sometimes go exactly to an edge, otherwise choose any point on the bar.
  const roll = Math.random();
  if (roll < 0.18) destination = 0;
  else if (roll < 0.36) destination = 100;
  else destination = random(5, 95);

  // Avoid selecting essentially the same position twice.
  if (Math.abs(destination - oldDestination) < 8) {
    destination = oldDestination < 50 ? random(60, 95) : random(5, 40);
  }

  targetSpeed = clamp(targetSpeed, Math.min(s.minSpeed, s.maxSpeed), Math.max(s.minSpeed, s.maxSpeed));
  phaseEl.textContent = destination > position ? 'MOVING UP' : 'MOVING DOWN';
}

function startPause(now) {
  const s = readSettings();
  if (Math.random() > s.pauseChance) {
    chooseDestination(now);
    return;
  }

  const min = Math.min(s.minPause, s.maxPause);
  const max = Math.max(s.minPause, s.maxPause);
  pauseUntil = now + random(min, max) * 1000;
  paused = true;
  marker.classList.add('paused');
  phaseEl.textContent = 'PAUSED';
}

function updateUI() {
  marker.style.top = `${100 - position}%`;
  positionEl.textContent = `${Math.round(position)}%`;
  speedEl.textContent = `${speed.toFixed(2)}×`;
}

function frame(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  if (running && !paused) {
    if (now >= nextSpeedChange) chooseSpeed(now);

    // Smooth acceleration/deceleration toward the selected speed.
    const smoothing = 1 - Math.exp(-dt / 700);
    speed += (targetSpeed - speed) * smoothing;

    const distance = Math.abs(destination - position);
    const step = (dt / 1000) * speed * 18;

    // Move ONLY toward the destination. Never assign a random position here.
    if (distance > 0.01) {
      const amount = Math.min(distance, step);
      position += Math.sign(destination - position) * amount;
    }

    // Destination reached: snap only by the tiny remaining distance, then pause.
    if (Math.abs(destination - position) <= 0.01) {
      position = destination;
      startPause(now);
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

  // First movement starts from the current visible position.
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
  position = 50;
  destination = 50;
  speed = 1;
  targetSpeed = 1;

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

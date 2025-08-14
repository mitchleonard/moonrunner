// --------- Utilities ---------
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// --------- Canvas & World ---------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
});
const GROUND_Y = () => H * 0.8;

// --------- Game State ---------
let running = false;
let gameOver = false;
let elapsed = 0;
let last = 0;
let speed = 340;
let gravity = 1650;
let jumpV = 620;
let avatar = 'astro';

const player = { x: W * 0.18, y: 0, w: 46, h: 64, vy: 0, onGround: true, trail: [], anti: 0 };
const terrain = { items: [], powerups: [], stars: Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + 0.2 })), dust: [] };
const types = { CRATER: 'crater', ROCK: 'rock', ROVER: 'rover', ANTI: 'anti' };

// --------- Course Generation ---------
function reset() {
    // Reset physics
    gravity = 1650;
    jumpV = 620;
    
    // Reset player
    player.y = GROUND_Y() - player.h;
    player.vy = 0;
    player.onGround = true;
    player.trail.length = 0;
    player.anti = 0;
    
    // Reset terrain
    terrain.items.length = 0;
    terrain.powerups.length = 0;
    terrain.dust.length = 0;

    let x = W + 200;
    const lane = GROUND_Y();
    for (let i = 0; i < 20; i++) {
        const gap = rand(280, 520);
        x += gap;
        const choice = Math.random();
        if (choice < 0.45) {
            const w = rand(36, 52), h = rand(36, 60);
            terrain.items.push({ x, y: lane - h, w, h, type: types.ROCK });
        } else if (choice < 0.8) {
            const w = rand(90, 130), h = rand(44, 56);
            terrain.items.push({ x, y: lane - h, w, h, type: types.ROVER });
        } else {
            const w = rand(120, 200);
            terrain.items.push({ x, y: lane - 8, w, h: 24, type: types.CRATER });
        }
        if (Math.random() < 0.28) { terrain.powerups.push({ x: x + rand(60, 120), y: lane - rand(120, 180), r: 12, type: types.ANTI }); }
    }
}

// --------- Input ---------
function jump() {
    if (!running || gameOver) return;
    if (player.onGround) {
        const boost = player.anti > 0 ? 1.6 : 1.0;
        player.vy = -jumpV * boost; player.onGround = false;
    }
}

function fastFall() {
    if (!running || gameOver || player.onGround) return;
    player.vy += gravity * 0.1;
}

canvas.addEventListener('pointerdown', (e) => {
    const isTopHalf = e.clientY < window.innerHeight / 2;
    if (isTopHalf) {
        jump();
    } else {
        fastFall();
    }
});
window.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.code === 'ArrowUp' || e.code === 'Space') { e.preventDefault(); jump(); }
    if (e.code === 'ArrowDown') { e.preventDefault(); fastFall(); }
});
// Mobile controls are handled by the canvas tap events

// --------- Collision helpers ---------
function aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function hitCrater(p, crater) {
    const feetY = p.y + p.h;
    const inX = (p.x + p.w * 0.4) < (crater.x + crater.w) && (p.x + p.w * 0.6) > crater.x;
    return inX && feetY >= GROUND_Y() - 2 && p.vy >= 0;
}

// --------- Landing Animation ---------
function createDust(x, y) {
    for (let i = 0; i < 8; i++) {
        terrain.dust.push({
            x, y,
            vx: rand(-100, 100),
            vy: rand(-50, -150),
            r: rand(2, 5),
            alpha: 1
        });
    }
}

// --------- Rendering ---------
function drawBackground(dt) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
    terrain.stars.forEach(s => {
        s.x -= (speed * 0.1) * dt; if (s.x < -2) { s.x = W + 2; s.y = Math.random() * H; }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
    });
    const g = ctx.createRadialGradient(W * 0.85, H * 0.2, 10, W * 0.85, H * 0.2, 220);
    g.addColorStop(0, 'rgba(91,255,234,0.25)'); g.addColorStop(1, 'rgba(91,255,234,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W * 0.85, H * 0.2, 220, 0, Math.PI * 2); ctx.fill();
    const isLightMode = document.body.classList.contains('light-mode');
    ctx.fillStyle = isLightMode ? '#e8eeff' : '#121933';
    ctx.fillRect(0, GROUND_Y(), W, H - GROUND_Y());
    ctx.strokeStyle = isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(169,183,255,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); const y = GROUND_Y() + 10 + i * 10; ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawPlayer() {
    ctx.save();
    player.trail.forEach((t) => { const a = t.a; if (a <= 0) return; ctx.globalAlpha = a; ctx.fillStyle = '#5bffea'; ctx.fillRect(t.x, t.y, player.w, player.h); ctx.globalAlpha = 1; });
    if (avatar === 'astro') {
        ctx.fillStyle = '#e0e6ff'; ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillStyle = '#2bd1c4'; ctx.fillRect(player.x + 6, player.y + 10, player.w - 12, 22);
        ctx.fillStyle = '#9fb3ff'; ctx.fillRect(player.x - 8, player.y + 18, 8, 30);
        ctx.fillStyle = '#8da0ff'; ctx.fillRect(player.x, player.y + player.h - 10, player.w, 10);
    } else if (avatar === 'alien') {
        ctx.fillStyle = '#7efc8a'; ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillStyle = '#001016'; ctx.fillRect(player.x + 10, player.y + 12, player.w - 20, 18);
        ctx.fillStyle = '#cbffdf'; ctx.fillRect(player.x + 6, player.y + 36, player.w - 12, 10);
    } else { // scientist
        ctx.fillStyle = '#ffe9a9'; ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillStyle = '#202b52'; ctx.fillRect(player.x + 6, player.y + 8, player.w - 12, 10);
        ctx.fillStyle = '#ffd166'; ctx.fillRect(player.x + 8, player.y + 22, player.w - 16, 20);
        ctx.fillStyle = '#8da0ff'; ctx.fillRect(player.x, player.y + player.h - 10, player.w, 10);
    }
    if (player.anti > 0) { ctx.strokeStyle = 'rgba(91,255,234,0.9)'; ctx.lineWidth = 3; ctx.strokeRect(player.x - 4, player.y - 4, player.w + 8, player.h + 8); }
    ctx.restore();
}

function drawItems(dt) {
    ctx.save();
    terrain.items.forEach(o => {
        o.x -= speed * dt;
        if (o.type === types.ROCK) { ctx.fillStyle = '#98a5ff'; ctx.fillRect(o.x, o.y, o.w, o.h); }
        else if (o.type === types.ROVER) { ctx.fillStyle = '#ffd166'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#202b52'; ctx.fillRect(o.x + 8, o.y + o.h - 8, 18, 8); ctx.fillRect(o.x + o.w - 26, o.y + o.h - 8, 18, 8); }
        else if (o.type === types.CRATER) { ctx.fillStyle = '#5b5b5b'; ctx.fillRect(o.x, GROUND_Y() - o.h, o.w, o.h); ctx.strokeStyle = 'rgba(169,183,255,0.35)'; ctx.strokeRect(o.x, o.y, o.w, o.h); }
    });
    terrain.powerups.forEach(p => { p.x -= speed * dt; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + Math.sin(performance.now() / 1000 * 5 + p.x * 0.02) * 1.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(91,255,234,0.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(91,255,234,0.5)'; ctx.lineWidth = 2; ctx.stroke(); });

    // Draw dust particles
    for (let i = terrain.dust.length - 1; i >= 0; i--) {
        const p = terrain.dust[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt; // gravity on dust
        p.alpha -= 1.5 * dt;
        p.r = Math.max(0, p.r - 2 * dt);
        if (p.alpha <= 0) {
            terrain.dust.splice(i, 1);
        } else {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = '#a9b7ff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

// --------- Loop & Difficulty ---------
let perfNow = 0;
const MAX_SPEED = 800;
const BASE_ACCEL = 6;
const RAMP_FACTOR = 0.12;

function step(ts) {
    if (!last) last = ts; const dt = Math.min(0.033, (ts - last) / 1000); last = ts; perfNow = ts / 1000;
    if (running) {
        elapsed += dt; document.getElementById('score').textContent = `${elapsed.toFixed(1)}s`;
        const extra = RAMP_FACTOR * elapsed; speed = clamp(speed + dt * (BASE_ACCEL + extra), 340, MAX_SPEED);

        // physics
        const wasOnGround = player.onGround;
        player.vy += gravity * dt * (player.anti > 0 ? 0.55 : 1.0);
        player.y += player.vy * dt;
        if (player.y + player.h >= GROUND_Y()) {
            player.y = GROUND_Y() - player.h; player.vy = 0; player.onGround = true;
            if (!wasOnGround) {
                createDust(player.x + player.w / 2, player.y + player.h);
            }
        }
        if (Math.random() < 0.4) { player.trail.push({ x: player.x, y: player.y, a: 0.18 }); }
        for (let i = player.trail.length - 1; i >= 0; i--) { player.trail[i].a -= dt * 0.6; if (player.trail[i].a <= 0) player.trail.splice(i, 1); }
        if (player.anti > 0) { player.anti -= dt; }

        const lastX = terrain.items.length ? terrain.items[terrain.items.length - 1].x : 0;
        if (lastX < W * 1.2) {
            let x = (lastX || W) + rand(280, 520);
            const lane = GROUND_Y();
            for (let i = 0; i < 6; i++) {
                const choice = Math.random();
                if (choice < 0.45) { const w = rand(36, 52), h = rand(36, 60); terrain.items.push({ x, y: lane - h, w, h, type: types.ROCK }); }
                else if (choice < 0.8) { const w = rand(90, 130), h = rand(44, 56); terrain.items.push({ x, y: lane - h, w, h, type: types.ROVER }); }
                else { const w = rand(120, 200); terrain.items.push({ x, y: lane - 8, w, h: 24, type: types.CRATER }); }
                if (Math.random() < 0.25) { terrain.powerups.push({ x: x + rand(60, 120), y: lane - rand(120, 180), r: 12, type: types.ANTI }); }
                x += rand(280, 520);
            }
        }

        for (const o of terrain.items) { if (o.type === types.CRATER) { if (hitCrater(player, o)) return end(); } else if (aabb(player, o)) return end(); }
        for (let i = terrain.powerups.length - 1; i >= 0; i--) { const p = terrain.powerups[i]; const dx = (player.x + player.w / 2) - p.x; const dy = (player.y + player.h / 2) - p.y; const dist = Math.hypot(dx, dy); if (dist < p.r + Math.max(player.w, player.h) / 2) { player.anti = 5.0; terrain.powerups.splice(i, 1); } }
    }

    drawBackground(dt); drawItems(dt); drawPlayer();
    requestAnimationFrame(step);
}

// --------- UI & Leaderboard ---------
const startUI = document.getElementById('start');
const overUI = document.getElementById('gameover');
const finalScoreEl = document.getElementById('finalScore');
const lbEl = document.getElementById('leaderboard');
const nameWrap = document.getElementById('nameEntry');
const nameInput = document.getElementById('nameInput');
const saveBtn = document.getElementById('saveScore');
const avatarSelector = document.getElementById('avatar-selector');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

avatarSelector.addEventListener('click', e => {
    const option = e.target.closest('.avatar-option');
    if (!option) return;
    avatar = option.dataset.avatar;
    document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
});

themeToggle.addEventListener('click', () => {
    const isLightMode = document.body.classList.toggle('light-mode');
    themeIcon.textContent = isLightMode ? '☀️' : '🌙';
    // Update game map for light mode
    if (isLightMode) {
        terrain.stars.forEach(s => s.color = '#000000');
    } else {
        terrain.stars.forEach(s => s.color = '#ffffff');
    }
});

function start() {
    // Hide UI
    startUI.classList.add('hidden');
    overUI.classList.add('hidden');
    nameWrap.classList.add('hidden');
    disableSave();
    // Always reset all game state for a true fresh start
    elapsed = 0;
    last = 0;
    speed = 340;
    gravity = 1650;
    jumpV = 620;
    avatar = avatar || 'astro';
    document.getElementById('score').textContent = '0.0s';
    reset();
    running = true;
    gameOver = false;
    // Ensure the game loop is re-armed after replay
    requestAnimationFrame(step);
}

function end() {
    running = false;
    gameOver = true;
    finalScoreEl.textContent = `Time: ${elapsed.toFixed(1)}s`;
    renderLeaderboard();
    overUI.classList.remove('hidden');
}

function getLB() { try { return JSON.parse(localStorage.getItem('moonrunner_leaderboard') || '[]'); } catch (e) { return []; } }
function setLB(arr) { localStorage.setItem('moonrunner_leaderboard', JSON.stringify(arr)); }

function renderLeaderboard() {
    const lb = getLB();
    const qualifies = (lb.length < 5) || lb.some(entry => elapsed > entry.score);
    lbEl.innerHTML = '<div class="subtitle">Top 5 Runs (by time survived)</div>';
    const merged = [...lb, { name: 'YOU', score: elapsed, me: true }].sort((a, b) => b.score - a.score).slice(0, 5);
    merged.forEach((e, i) => { const row = document.createElement('div'); row.className = 'lb-row ' + (e.me ? 'me' : ''); const l = document.createElement('span'); l.textContent = `${i + 1}. ${e.name}`; const r = document.createElement('span'); r.textContent = `${e.score.toFixed(1)}s`; row.appendChild(l); row.appendChild(r); lbEl.appendChild(row); });

    if (qualifies) { nameWrap.classList.remove('hidden'); nameInput.value = ''; nameInput.focus(); enableSaveOnce(); }
    else { nameWrap.classList.add('hidden'); disableSave(); }
}

let canSave = false;
function enableSaveOnce() { canSave = true; saveBtn.disabled = false; }
function disableSave() { canSave = false; saveBtn.disabled = true; }

function doSave() {
    if (!canSave) return;
    disableSave();
    const name = (nameInput.value || 'ASTRO').toUpperCase().slice(0, 5);
    const lb = getLB(); lb.push({ name, score: elapsed }); lb.sort((a, b) => b.score - a.score); setLB(lb.slice(0, 5));
    nameWrap.classList.add('hidden');
    lbEl.innerHTML = '<div class="subtitle">Top 5 Runs (by time survived)</div>';
    getLB().forEach((e, i) => { const row = document.createElement('div'); row.className = 'lb-row'; const l = document.createElement('span'); l.textContent = `${i + 1}. ${e.name}`; const r = document.createElement('span'); r.textContent = `${e.score.toFixed(1)}s`; row.appendChild(l); row.appendChild(r); lbEl.appendChild(row); });
    // Ensure game state is properly reset after saving
    gameOver = true;
    running = false;
}

saveBtn.addEventListener('click', doSave);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSave(); } });

document.getElementById('replayBtn').addEventListener('click', () => { 
    start();
});
document.getElementById('playBtn').addEventListener('click', start);

// Boot
document.querySelector('.avatar-option[data-avatar="astro"]').classList.add('selected');
reset();
requestAnimationFrame(step);


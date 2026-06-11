/* ========================================
   PARTICLE BACKGROUND
   ======================================== */
(function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;
    const PARTICLE_COUNT = 70;
    const COLORS = ['rgba(249,115,22,', 'rgba(59,130,246,', 'rgba(34,197,94,'];

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.r = Math.random() * 2 + 0.5;
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            this.alpha = Math.random() * 0.3 + 0.05;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > w) this.vx *= -1;
            if (this.y < 0 || this.y > h) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = this.color + this.alpha + ')';
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = 'rgba(255,255,255,' + (0.03 * (1 - dist / 150)) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => { p.update(); p.draw(); });
        drawLines();
        requestAnimationFrame(animate);
    }
    animate();
})();

/* ========================================
   NAVBAR SCROLL
   ======================================== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
});

/* ========================================
   MOBILE MENU
   ======================================== */
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
});
mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

/* ========================================
   INTERSECTION OBSERVER — REVEAL
   ======================================== */
function createObserver(selector, className, options = {}) {
    const els = document.querySelectorAll(selector);
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add(className);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, ...options });
    els.forEach(el => obs.observe(el));
}

// Hero animate-in
createObserver('.animate-in', 'visible');

// General reveals for cards and sections
document.querySelectorAll(
    '.project-card, .checklist-card, .gantt-wrapper, .validation-card, .metric-card, .algo-card, .section-header, .cta-block, .arch-node'
).forEach(el => el.classList.add('reveal'));
createObserver('.reveal', 'visible');

/* ========================================
   ANIMATED COUNTER (Reuse %)
   ======================================== */
function animateCounter(el, target, suffix = '', duration = 1500) {
    let start = 0;
    const step = target / (duration / 16);
    function tick() {
        start += step;
        if (start >= target) {
            el.textContent = target + suffix;
            return;
        }
        el.textContent = Math.floor(start) + suffix;
        requestAnimationFrame(tick);
    }
    tick();
}

// Code reuse bar
const reuseBar = document.getElementById('reuseBar');
const reusePercent = document.getElementById('reusePercent');
const reuseObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            reuseBar.style.width = '72%';
            animateCounter(reusePercent, 72, '%');
            reuseObs.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });
reuseObs.observe(document.querySelector('.code-reuse-section'));

/* ========================================
   METRIC COUNTERS
   ======================================== */
const metricCards = document.querySelectorAll('.metric-card');
const metricObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const card = entry.target;
            const valEl = card.querySelector('.metric-value');
            const target = parseInt(valEl.dataset.target, 10);
            animateCounter(valEl, target, '');
            const fill = card.querySelector('.metric-bar-fill');
            if (fill) fill.classList.add('animate');
            metricObs.unobserve(card);
        }
    });
}, { threshold: 0.4 });
metricCards.forEach(c => metricObs.observe(c));

/* ========================================
   GANTT BAR ANIMATION
   ======================================== */
const ganttBars = document.querySelectorAll('.gantt-bar');
const ganttObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const bars = document.querySelectorAll('.gantt-bar');
            bars.forEach((bar, i) => {
                setTimeout(() => bar.classList.add('animate'), i * 120);
            });
            ganttObs.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });
ganttObs.observe(document.getElementById('ganttChart'));

/* ========================================
   CTA BUTTON
   ======================================== */
const ctaBtn = document.getElementById('ctaBtn');
const ctaSections = document.getElementById('ctaSections');
let ctaOpen = false;

ctaBtn.addEventListener('click', () => {
    ctaOpen = !ctaOpen;
    if (ctaOpen) {
        ctaSections.classList.add('open');
        ctaBtn.querySelector('span').textContent = 'Collapse Project Structure';
        // Re-animate children
        ctaSections.querySelectorAll('.cta-section-card').forEach((card, i) => {
            card.style.animation = 'none';
            card.offsetHeight; // reflow
            card.style.animation = `fadeSlideUp 0.5s ease ${i * 0.08}s forwards`;
        });
    } else {
        ctaSections.classList.remove('open');
        ctaBtn.querySelector('span').textContent = 'Build Complete Project Structure';
    }
});

/* ========================================
   SMOOTH SCROLL (polyfill for anchor links)
   ======================================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

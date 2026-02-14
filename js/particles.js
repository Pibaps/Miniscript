(function () {
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let animationId;

    const CONFIG = {
        particleCount: 80,
        maxDistance: 140,
        mouseRadius: 180,
        speed: 0.35,
        particleSize: { min: 1.5, max: 3 },
        mouseRepelForce: 0.04
    };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function getColors() {
        const style = getComputedStyle(document.documentElement);
        return {
            particle: style.getPropertyValue('--particle-color').trim() || 'rgba(212,168,67,0.5)',
            line: style.getPropertyValue('--particle-line').trim() || 'rgba(212,168,67,0.12)'
        };
    }

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * CONFIG.speed * 2;
            this.vy = (Math.random() - 0.5) * CONFIG.speed * 2;
            this.size = CONFIG.particleSize.min + Math.random() * (CONFIG.particleSize.max - CONFIG.particleSize.min);
            this.baseVx = this.vx;
            this.baseVy = this.vy;
        }

        update() {
            // Mouse interaction
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.mouseRadius && dist > 0) {
                const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius * CONFIG.mouseRepelForce;
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }

            // Damping back to base velocity
            this.vx += (this.baseVx - this.vx) * 0.01;
            this.vy += (this.baseVy - this.vy) * 0.01;

            this.x += this.vx;
            this.y += this.vy;

            // Wrap around
            if (this.x < -10) this.x = width + 10;
            if (this.x > width + 10) this.x = -10;
            if (this.y < -10) this.y = height + 10;
            if (this.y > height + 10) this.y = -10;
        }

        draw(color) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    function init() {
        resize();
        particles = [];

        // Adjust count for screen size
        const factor = (width * height) / (1920 * 1080);
        const count = Math.round(CONFIG.particleCount * Math.max(0.4, Math.min(1.2, factor)));

        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        const colors = getColors();

        // Update & draw particles
        for (const p of particles) {
            p.update();
            p.draw(colors.particle);
        }

        // Draw lines between nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONFIG.maxDistance) {
                    const opacity = 1 - dist / CONFIG.maxDistance;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = colors.line.replace(/[\d.]+\)$/, (opacity * 0.35) + ')');
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    // Event listeners
    window.addEventListener('resize', () => {
        resize();
        // Reinit if size changes drastically
        if (Math.abs(particles.length - CONFIG.particleCount) > 20) {
            init();
        }
    });

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
    });

    // Allow canvas to receive pointer events for mouse tracking
    // but not block clicks
    canvas.style.pointerEvents = 'none';

    // We listen on window instead, so pointerEvents none is fine.
    // Start
    init();
    animate();
})();
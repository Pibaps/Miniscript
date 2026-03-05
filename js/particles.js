(function() {
    // simple star-field generator inside the hero background
    const container = document.getElementById('star-container');
    if (!container) return;

    const STAR_COUNT = 200;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    for (let i = 0; i < STAR_COUNT; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = rand(1, 3);
        star.style.width = star.style.height = size + 'px';
        star.style.left = rand(0, 100) + '%';
        star.style.top = rand(0, 100) + '%';
        star.style.animationDuration = rand(3, 6) + 's';
        star.style.animationDelay = rand(0, 6) + 's';
        container.appendChild(star);
    }
})();

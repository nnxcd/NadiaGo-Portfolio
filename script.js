/* =========================================================
   NADIA GO — FIELD LOG
   Behavior: live Melbourne clock, scroll-reveal, marquee
   pure CSS, optional custom cursor, physics chip stage
   that lives inside .hero-physics-box on the right.
   ========================================================= */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /* ---------------------------------------------------------
     1. LIVE CLOCK — Melbourne, AU
     --------------------------------------------------------- */
  var clockEl = document.getElementById('clock');

  function updateClock() {
    if (!clockEl) return;
    try {
      var now = new Date();
      clockEl.textContent = now.toLocaleTimeString('en-US', {
        timeZone: 'Australia/Melbourne',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (err) {
      clockEl.textContent = new Date().toLocaleTimeString();
    }
  }

  updateClock();
  setInterval(updateClock, 1000);

  /* ---------------------------------------------------------
     2. SCROLL REVEAL
     --------------------------------------------------------- */
  var revealTargets = document.querySelectorAll('[data-reveal]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealTargets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------------------------------------------------
     3. CUSTOM CURSOR
     --------------------------------------------------------- */
  if (!isCoarsePointer && !prefersReducedMotion) {
    var dot = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-ring');

    if (dot && ring) {
      document.body.classList.add('custom-cursor-active');

      var mouseX = window.innerWidth / 2;
      var mouseY = window.innerHeight / 2;
      var ringX = mouseX;
      var ringY = mouseY;

      window.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform =
          'translate(' + mouseX + 'px, ' + mouseY + 'px) translate(-50%, -50%)';
      });

      function animateRing() {
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;
        ring.style.transform =
          'translate(' + ringX + 'px, ' + ringY + 'px) translate(-50%, -50%)';
        window.requestAnimationFrame(animateRing);
      }
      animateRing();

      document.addEventListener('mouseover', function (e) {
        var target = e.target.closest('a, button');
        if (target) {
          ring.classList.add('is-active');
          ring.setAttribute('data-mode', target.getAttribute('data-cursor') || 'hot');
        }
      });

      document.addEventListener('mouseout', function (e) {
        var target = e.target.closest('a, button');
        if (target) ring.classList.remove('is-active');
      });

      document.addEventListener('mouseleave', function () {
        dot.style.opacity = '0';
        ring.style.opacity = '0';
      });
      document.addEventListener('mouseenter', function () {
        dot.style.opacity = '';
        ring.style.opacity = '';
      });
    }
  }

  /* ---------------------------------------------------------
     4. PHYSICS CHIP STAGE
     Chips drop into .hero-physics-box with gravity and stay
     draggable. Matter.js bounds are derived from the box
     element itself so chips can't escape the bordered area.
     --------------------------------------------------------- */
  var stage = document.querySelector('.physics-stage');
  var physicsBox = document.querySelector('.hero-physics-box');

  if (stage && physicsBox && !prefersReducedMotion && typeof Matter !== 'undefined') {
    var chips = Array.prototype.slice.call(stage.querySelectorAll('.chip'));

    if (chips.length) {
      stage.classList.add('physics-active');
      stage.addEventListener('dragstart', function (e) { e.preventDefault(); });

      var Engine = Matter.Engine,
          World  = Matter.World,
          Bodies = Matter.Bodies,
          Body   = Matter.Body,
          Mouse  = Matter.Mouse,
          MouseConstraint = Matter.MouseConstraint;

      var engine = Engine.create();
      engine.gravity.y = 0.85;

      /* Use the physics box dimensions, not window */
      var rect = physicsBox.getBoundingClientRect();
      var W = rect.width  || 480;
      var H = rect.height || 360;
      var wall = 60;

      World.add(engine.world, [
        Bodies.rectangle(W / 2, H + wall / 2,  W * 2, wall, { isStatic: true }),
        Bodies.rectangle(W / 2, -wall / 2,      W * 2, wall, { isStatic: true }),
        Bodies.rectangle(-wall / 2,  H / 2, wall, H * 2, { isStatic: true }),
        Bodies.rectangle(W + wall / 2, H / 2, wall, H * 2, { isStatic: true })
      ]);

      var tracked = chips.map(function (el, i) {
        var w = el.offsetWidth  || 60;
        var h = el.offsetHeight || 60;
        var startX = 40 + Math.random() * Math.max(W - 80, 40);
        var startY = -h - i * 65;
        var isCircle = el.getAttribute('data-shape') === 'circle';

        var body = isCircle
          ? Bodies.circle(startX, startY, w / 2, {
              restitution: 0.55, friction: 0.35, frictionAir: 0.02
            })
          : Bodies.rectangle(startX, startY, w, h, {
              chamfer: { radius: h / 2 },
              restitution: 0.4, friction: 0.4, frictionAir: 0.02
            });

        Body.setAngle(body, (Math.random() - 0.5) * 0.6);
        World.add(engine.world, body);
        return { el: el, body: body, w: w, h: h };
      });

      /* Bind mouse to the stage element, not window */
      var mouse = Mouse.create(stage);
      var mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: { stiffness: 0.2, angularStiffness: 0 }
      });
      World.add(engine.world, mouseConstraint);

      /* Keep scroll working */
      ['mousewheel', 'DOMMouseScroll', 'touchstart', 'touchmove', 'touchend'].forEach(function (evt) {
        if (mouse[evt]) mouse.element.removeEventListener(evt, mouse[evt]);
      });
      mouse.element.addEventListener('touchstart', mouse.mousedown,  { passive: true });
      mouse.element.addEventListener('touchmove', function (e) {
        if (mouseConstraint.body) mouse.mousemove(e);
      }, { passive: true });
      mouse.element.addEventListener('touchend', function (e) {
        if (mouseConstraint.body) mouse.mouseup(e);
      }, { passive: true });

      function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

      (function loop() {
        mouse.position.x = clamp(mouse.position.x, 0, W);
        mouse.position.y = clamp(mouse.position.y, 0, H);

        Engine.update(engine);

        tracked.forEach(function (t) {
          var pos  = t.body.position;
          var halfW = t.w / 2;
          var halfH = t.h / 2;
          var cx = clamp(pos.x, halfW, W - halfW);
          var cy = clamp(pos.y, halfH, H - halfH);

          if (cx !== pos.x || cy !== pos.y) {
            var vel = t.body.velocity;
            Body.setPosition(t.body, { x: cx, y: cy });
            Body.setVelocity(t.body, {
              x: cx !== pos.x ? 0 : vel.x,
              y: cy !== pos.y ? 0 : vel.y
            });
          }

          t.el.style.transform =
            'translate(' + (cx - halfW) + 'px, ' + (cy - halfH) + 'px) rotate(' + t.body.angle + 'rad)';
        });

        window.requestAnimationFrame(loop);
      })();
    }
  }

  /* ---------------------------------------------------------
     5. FLOATING CASE-STUDY NAV — active section highlight
     --------------------------------------------------------- */
  var floatnav = document.getElementById('cs-floatnav');

  if (floatnav) {
    var navLinks = Array.prototype.slice.call(floatnav.querySelectorAll('a[data-section]'));
    var sections = navLinks.map(function (a) {
      return document.getElementById(a.getAttribute('data-section'));
    }).filter(Boolean);

    function updateActiveLink() {
      /* find the section whose top is closest to 40% down the viewport */
      var threshold = window.innerHeight * 0.4;
      var active = sections[0];

      sections.forEach(function (sec) {
        var top = sec.getBoundingClientRect().top;
        if (top <= threshold) active = sec;
      });

      navLinks.forEach(function (a) {
        var matches = active && a.getAttribute('data-section') === active.id;
        a.classList.toggle('is-active', matches);
      });
    }

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
      updateActiveLink();
      window.addEventListener('scroll', updateActiveLink, { passive: true });
    } else {
      /* reduced motion: just mark first link active */
      if (navLinks.length) navLinks[0].classList.add('is-active');
    }
  }

})();
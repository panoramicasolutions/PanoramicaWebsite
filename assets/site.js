(function () {
  var toggle = document.querySelector('.nav-toggle');
  var panel = document.getElementById('nav-panel');
  if (!toggle || !panel) return;

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', function () { setOpen(panel.hidden); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });

  document.addEventListener('click', function (e) {
    if (!panel.hidden && !e.target.closest('.site-header')) setOpen(false);
  });

  panel.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) {
    if (e.matches) setOpen(false);
  });
})();

// Sticky demo-call bar on offer pages: visible once the hero has scrolled out of view.
(function () {
  var bar = document.querySelector('[data-offer-bar]');
  var hero = document.querySelector('.hero--offer');
  if (!bar || !hero) return;
  var ticking = false;
  function update() {
    ticking = false;
    bar.classList.toggle('is-visible', hero.getBoundingClientRect().bottom < 0);
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

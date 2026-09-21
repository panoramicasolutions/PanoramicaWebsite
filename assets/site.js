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

// Offer pages: a tab strip for "what we need" and "not included". Without JavaScript both panels stay visible.
(function () {
  var roots = document.querySelectorAll('[data-tabs]');
  Array.prototype.forEach.call(roots, function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    if (!tabs.length || panels.indexOf(null) !== -1) return;

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        t.setAttribute('aria-selected', String(i === j));
        t.tabIndex = i === j ? 0 : -1;
        panels[j].hidden = i !== j;
      });
      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select((i + 1) % n, true); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select((i - 1 + n) % n, true); }
        else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        else if (e.key === 'End') { e.preventDefault(); select(n - 1, true); }
      });
    });

    root.classList.add('is-ready');
    select(0);
  });
})();

// Offer pages: "Does it fit?" check. Ticking statements fills the meter and changes the verdict.
(function () {
  var box = document.querySelector('[data-fit]');
  if (!box) return;
  var inputs = box.querySelectorAll('input[type="checkbox"]');
  var verdict = box.querySelector('[data-verdict]');
  if (!verdict) return;

  function update() {
    var n = 0;
    Array.prototype.forEach.call(inputs, function (input) { if (input.checked) n += 1; });
    box.setAttribute('data-count', String(n));
    var text = box.getAttribute('data-v' + n);
    if (text) verdict.textContent = text;
  }

  box.addEventListener('change', update);
  update();
})();

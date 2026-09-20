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

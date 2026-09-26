/* Goldmine depth selector on the offer page: choosing a depth shows what it adds. The page reads correctly without it. */
(function () {
  var box = document.querySelector('[data-tiers]');
  if (!box) return;
  var scope = box.querySelector('[data-scope]');
  var bars = box.querySelectorAll('.tier-select__meter i');
  var buttons = box.querySelectorAll('.tier-btn');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function select(i) {
    buttons.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });
    bars.forEach(function (b, n) { b.classList.toggle('on', n <= i); });
    scope.textContent = buttons[i].getAttribute('data-scope');
    scope.classList.remove('mk-swap');
    void scope.offsetWidth;
    if (!reduce) scope.classList.add('mk-swap');
  }

  buttons.forEach(function (b, i) { b.addEventListener('click', function () { select(i); }); });
})();

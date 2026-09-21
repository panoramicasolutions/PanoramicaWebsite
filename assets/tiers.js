/* Goldmine depth selector on the services page. The page reads correctly without it. */
(function () {
  var box = document.querySelector('[data-tiers]');
  if (!box) return;
  var amount = box.querySelector('[data-amount]');
  var scope = box.querySelector('[data-scope]');
  var bars = box.querySelectorAll('.tier-select__meter i');
  var buttons = box.querySelectorAll('.tier-btn');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = 0;

  function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }

  function countTo(from, to) {
    clearTimeout(amount._t);
    cancelAnimationFrame(amount._raf);
    if (reduce) { amount.textContent = money(to); return; }
    var start = null;
    var dur = 550;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      amount.textContent = money(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) amount._raf = requestAnimationFrame(step);
    }
    amount._raf = requestAnimationFrame(step);
    // If frames are throttled (background tab), still land on the real price.
    amount._t = setTimeout(function () { amount.textContent = money(to); }, dur + 800);
  }

  function select(i) {
    var from = Number(buttons[current].getAttribute('data-price'));
    var to = Number(buttons[i].getAttribute('data-price'));
    current = i;
    buttons.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });
    bars.forEach(function (b, n) { b.classList.toggle('on', n <= i); });
    scope.textContent = buttons[i].getAttribute('data-scope');
    scope.classList.remove('mk-swap');
    void scope.offsetWidth;
    if (!reduce) scope.classList.add('mk-swap');
    countTo(from, to);
  }

  buttons.forEach(function (b, i) { b.addEventListener('click', function () { select(i); }); });
})();

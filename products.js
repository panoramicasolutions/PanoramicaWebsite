(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICON = '<svg viewBox="0 0 229.39 76.81" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#DCEE6A" opacity="0.55" d="M177.49 0 203.7 76.81 0 76.81 177.49 0z"/><path fill="#DCEE6A" d="M229.39,25.69h0C208.97,26.92,189.46,17.11,178.27,0h0s0,0,0,0c1.23,20.42-8.57,39.93-25.69,51.12h0s0,0,0,0c20.42-1.23,39.93,8.57,51.12,25.69h0s0,0,0,0c-1.23-20.42,8.57-39.93,25.69-51.12h0Z"/></svg>';

  var css = ''
    /* card */
    + '.pp-grid{display:grid;grid-template-columns:1fr;gap:24px}'
    + '@media (min-width:768px){.pp-grid{grid-template-columns:repeat(2,1fr)}}'
    + '.pp-card{position:relative;display:flex;flex-direction:column;padding:32px;border-radius:16px;border:1px solid #262626;background:#0F0F0F;text-align:left;transition:border-color .3s,box-shadow .3s;font-family:Inter,system-ui,sans-serif}'
    + '.pp-card:hover{border-color:rgba(220,238,106,.5);box-shadow:0 0 40px rgba(220,238,106,.12)}'
    + '.pp-icon{width:56px;height:56px;border-radius:50%;border:1px solid #262626;display:flex;align-items:center;justify-content:center;margin-bottom:24px;transition:border-color .3s}'
    + '.pp-card:hover .pp-icon{border-color:rgba(220,238,106,.6)}'
    + '.pp-icon svg{width:28px;height:auto}'
    + '.pp-cat{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#DCEE6A;font-weight:700;margin-bottom:8px}'
    + '.pp-name{font-size:24px;font-weight:700;color:#fff;margin:0 0 12px}'
    + '.pp-link{color:inherit;text-decoration:none}'
    + '.pp-link::after{content:"";position:absolute;inset:0;border-radius:16px}'
    + '.pp-link:focus-visible::after{outline:2px solid #DCEE6A;outline-offset:3px}'
    + '.pp-summary{font-size:14px;line-height:1.6;color:#A0A0A0;margin:0 0 24px}'
    + '@media (min-width:768px){.pp-summary{min-height:4.8em}}'
    + '.pp-price{position:relative;z-index:2;border-top:1px solid #262626;padding-top:20px}'
    + '.pp-label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#A0A0A0;margin-bottom:6px}'
    + '.pp-amount{font-size:44px;font-weight:700;color:#fff;line-height:1.05;letter-spacing:-.02em;font-variant-numeric:tabular-nums}'
    + '.pp-scope{font-size:14px;color:#DCEE6A;margin:8px 0 14px;min-height:22px}'
    + '.pp-swap{animation:pp-swap .35s ease-out}'
    + '@keyframes pp-swap{from{opacity:.25;transform:translateY(4px)}to{opacity:1;transform:none}}'
    + '.pp-meter{display:flex;gap:6px;margin-bottom:16px}'
    + '.pp-meter i{flex:1;height:4px;border-radius:2px;background:#262626;transition:background .3s}'
    + '.pp-meter i.on{background:#DCEE6A}'
    + '.pp-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
    + '.pp-tier{cursor:pointer;background:#0A0A0A;border:1px solid #262626;border-radius:10px;padding:10px 6px;color:#A0A0A0;font:inherit;text-align:center;transition:border-color .2s,color .2s,background .2s}'
    + '.pp-tier span{display:block;font-size:13px;font-weight:600;color:#e5e5e5}'
    + '.pp-tier small{display:block;font-size:12px;margin-top:2px}'
    + '.pp-tier:hover{border-color:rgba(220,238,106,.45)}'
    + '.pp-tier[aria-pressed=true]{border-color:#DCEE6A;background:rgba(220,238,106,.08);color:#DCEE6A}'
    + '.pp-tier[aria-pressed=true] span{color:#DCEE6A}'
    + '.pp-tier:focus-visible{outline:2px solid #DCEE6A;outline-offset:2px}'
    + '.pp-foot{margin-top:auto;padding-top:20px}'
    + '.pp-note{font-size:12px;line-height:1.6;color:rgba(160,160,160,.75);margin:0 0 16px}'
    + '.pp-cta{font-size:14px;font-weight:600;color:#DCEE6A;display:inline-flex;align-items:center;gap:6px}'
    + '.pp-cta b{font-weight:400;display:inline-block;transition:transform .2s}'
    + '.pp-card:hover .pp-cta b{transform:translateX(4px)}'
    + '@media (max-width:480px){.pp-card{padding:24px}.pp-amount{font-size:38px}.pp-tier span{font-size:12px}}'
    /* compact price list */
    + '.pc-list{border:1px solid #262626;border-radius:16px;background:#0F0F0F;overflow:hidden;font-family:Inter,system-ui,sans-serif}'
    + '.pc-row{display:grid;grid-template-columns:minmax(150px,1.1fr) 2fr auto 24px;gap:20px;align-items:center;padding:22px 28px;color:inherit;text-decoration:none;border-top:1px solid #262626;transition:background .2s}'
    + '.pc-row:first-child{border-top:0}'
    + '.pc-row:hover{background:rgba(220,238,106,.05)}'
    + '.pc-row:focus-visible{outline:2px solid #DCEE6A;outline-offset:-2px}'
    + '.pc-name{font-size:18px;font-weight:700;color:#fff}'
    + '.pc-cat{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#DCEE6A;font-weight:700;margin-top:4px}'
    + '.pc-summary{font-size:14px;line-height:1.55;color:#A0A0A0;margin:0}'
    + '.pc-price{text-align:right;white-space:nowrap}'
    + '.pc-price small{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#A0A0A0;margin-bottom:2px}'
    + '.pc-amt{font-size:24px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:-.01em}'
    + '.pc-arrow{color:#DCEE6A;transition:transform .2s}'
    + '.pc-row:hover .pc-arrow{transform:translateX(4px)}'
    + '@media (max-width:720px){.pc-row{grid-template-columns:1fr auto;gap:8px 16px;padding:20px}.pc-summary{grid-column:1 / -1;grid-row:2}.pc-arrow{display:none}}';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
  function minPrice(p) { return Math.min.apply(null, p.tiers.map(function (t) { return t.price; })); }

  function injectCss() {
    if (document.getElementById('pp-css')) return;
    var s = document.createElement('style');
    s.id = 'pp-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function countTo(el, from, to) {
    clearTimeout(el._ppT);
    cancelAnimationFrame(el._pp);
    if (reduceMotion) { el.textContent = money(to); return; }
    var start = null, dur = 600;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = money(from + (to - from) * eased);
      if (t < 1) el._pp = requestAnimationFrame(step);
    }
    el._pp = requestAnimationFrame(step);
    el._ppT = setTimeout(function () { el.textContent = money(to); }, dur + 900);
  }

  function countOnView(el, to) {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    function go() { el.textContent = money(0); countTo(el, 0, to); }
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) { go(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); go(); }
    });
    io.observe(el);
  }

  function cardHtml(p) {
    var multi = p.tiers.length > 1;
    var extras = '';
    if (multi) {
      var meter = p.tiers.map(function (_, i) { return '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join('');
      var tiers = p.tiers.map(function (t, i) {
        return '<button type="button" class="pp-tier" data-i="' + i + '" aria-pressed="' + (i === 0) + '">'
          + '<span>' + esc(t.name) + '</span><small>' + money(t.price) + '</small></button>';
      }).join('');
      extras = '<div class="pp-meter" aria-hidden="true">' + meter + '</div>'
        + '<div class="pp-tiers" role="group" aria-label="Choose a build depth">' + tiers + '</div>';
    }
    return '<article class="pp-card">'
      + '<div class="pp-icon">' + ICON + '</div>'
      + '<div class="pp-cat">' + esc(p.category) + '</div>'
      + '<h3 class="pp-name"><a class="pp-link" href="' + esc(p.url) + '">' + esc(p.name) + '</a></h3>'
      + '<p class="pp-summary">' + esc(p.summary) + '</p>'
      + '<div class="pp-price">'
      +   '<div class="pp-label">' + esc(p.priceLabel) + '</div>'
      +   '<div class="pp-amount" aria-live="polite">' + money(p.tiers[0].price) + '</div>'
      +   '<div class="pp-scope">' + esc(p.tiers[0].scope) + '</div>'
      +   extras
      + '</div>'
      + '<div class="pp-foot">'
      +   '<p class="pp-note">' + esc(p.note) + '</p>'
      +   '<span class="pp-cta">View the offer <b>&rarr;</b></span>'
      + '</div>'
      + '</article>';
  }

  function wireCard(card, p) {
    var amount = card.querySelector('.pp-amount');
    var scope = card.querySelector('.pp-scope');
    var bars = card.querySelectorAll('.pp-meter i');
    var buttons = card.querySelectorAll('.pp-tier');
    var current = 0;

    function select(i) {
      var from = p.tiers[current].price, to = p.tiers[i].price;
      current = i;
      buttons.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });
      bars.forEach(function (b, n) { b.classList.toggle('on', n <= i); });
      scope.textContent = p.tiers[i].scope;
      scope.classList.remove('pp-swap');
      void scope.offsetWidth;
      if (!reduceMotion) scope.classList.add('pp-swap');
      countTo(amount, from, to);
    }
    buttons.forEach(function (b, i) { b.addEventListener('click', function () { select(i); }); });

    countOnView(amount, p.tiers[0].price);
  }

  function rowHtml(p) {
    var multi = p.tiers.length > 1;
    return '<a class="pc-row" href="' + esc(p.url) + '">'
      + '<div><div class="pc-name">' + esc(p.name) + '</div><div class="pc-cat">' + esc(p.category) + '</div></div>'
      + '<p class="pc-summary">' + esc(p.summary) + '</p>'
      + '<div class="pc-price"><small>' + (multi ? 'From' : 'Fixed') + '</small><span class="pc-amt" data-to="' + minPrice(p) + '">' + money(minPrice(p)) + '</span></div>'
      + '<span class="pc-arrow" aria-hidden="true">&rarr;</span>'
      + '</a>';
  }

  function load() {
    return fetch('products.json').then(function (r) { return r.json(); });
  }

  window.PanoProducts = {
    mount: function (container) {
      injectCss();
      return load().then(function (list) {
        container.classList.add('pp-grid');
        container.innerHTML = list.map(cardHtml).join('');
        var cards = container.querySelectorAll('.pp-card');
        list.forEach(function (p, i) { wireCard(cards[i], p); });
      });
    },
    mountList: function (container) {
      injectCss();
      return load().then(function (list) {
        container.classList.add('pc-list');
        container.innerHTML = list.map(rowHtml).join('');
        container.querySelectorAll('.pc-amt').forEach(function (a) {
          countOnView(a, Number(a.getAttribute('data-to')));
        });
      });
    }
  };
})();

(function () {
  var D = window.PanoDiagnostic;
  var R = window.PanoRoutes;
  var mount = document.getElementById('dx-app');
  if (!D || !R || !mount) return;

  var KEY = 'pano.diagnostic.v1';
  var TOTAL = D.QUESTIONS.length;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Which Q1 answer an offer page pre-selects. This names the offer the visitor came from,
  // never anything they typed.
  var PRESELECT = { outreach: 'conversations', goldmine: 'crm', database: 'database', brief: 'prep', studio: 'campaign', architect: 'unknown' };

  function fresh() { return { answers: {}, step: 1, done: false }; }

  function load() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (s && typeof s === 'object' && s.answers && typeof s.step === 'number') return s;
    } catch (e) { /* storage unavailable: run without persistence */ }
    return null;
  }
  function save() {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function clear() {
    try { window.sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  var state = load() || fresh();

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] === true) n.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function answered(qid) {
    var q = D.question(qid);
    var a = state.answers[qid];
    return q.type === 'multi' ? Array.isArray(a) && a.length > 0 : !!D.option(qid, a);
  }
  function firstOpen() {
    for (var i = 0; i < TOTAL; i++) if (!answered('q' + (i + 1))) return i + 1;
    return TOTAL + 1;
  }
  function complete() { return firstOpen() > TOTAL; }

  function hashFor(step) { return step === 'result' ? '#result' : '#q' + step; }
  function announce(text) {
    var live = document.getElementById('dx-live');
    if (live) live.textContent = text;
  }

  function target(t) {
    var parts = t.split(':');
    return parts[0] === 'external' ? R.external[parts[1]] : R.pages[parts[1]];
  }

  function reset() {
    state = fresh();
    clear();
    go(1, true, true);
  }

  function go(step, push, focus) {
    if (step === 'result') { if (!complete()) step = firstOpen(); }
    else if (step > firstOpen()) step = firstOpen();
    state.step = step === 'result' ? TOTAL : step;
    state.done = step === 'result';
    save();
    var url = window.location.pathname + hashFor(step);
    if (push) window.history.pushState({ dx: 1 }, '', url);
    else window.history.replaceState({ dx: 1 }, '', url);
    render(focus);
  }

  function renderQuestion(n, focus) {
    var q = D.QUESTIONS[n - 1];
    var multi = q.type === 'multi';
    var current = state.answers[q.id];

    var progress = el('div', {
      class: 'dx-progress', role: 'progressbar', 'aria-label': 'Diagnostic progress',
      'aria-valuemin': '1', 'aria-valuemax': String(TOTAL), 'aria-valuenow': String(n), 'aria-valuetext': 'Question ' + n + ' of ' + TOTAL
    }, [el('span', { class: 'dx-progress__bar', style: 'width:' + Math.round((n / TOTAL) * 100) + '%' })]);

    var legend = el('legend', { tabindex: '-1', id: 'dx-legend', text: q.title });
    var fieldset = el('fieldset', multi ? { 'aria-describedby': 'dx-hint' } : {}, [legend]);
    if (multi) fieldset.appendChild(el('p', { class: 'dx-hint', id: 'dx-hint', text: 'Select all that apply.' }));

    var inputs = [];
    q.options.forEach(function (o) {
      var checked = multi ? Array.isArray(current) && current.indexOf(o.id) !== -1 : current === o.id;
      var input = el('input', { type: multi ? 'checkbox' : 'radio', name: q.id, value: o.id, checked: checked });
      inputs.push(input);
      fieldset.appendChild(el('label', { class: 'dx-opt' + (multi ? ' dx-opt--multi' : '') }, [
        input, el('span', { class: 'dx-opt__text', text: o.label })
      ]));
    });

    var error = el('p', { class: 'dx-error', role: 'alert', hidden: true, text: multi ? 'Choose at least one option to continue.' : 'Choose an answer to continue.' });
    var back = el('button', { type: 'button', class: 'btn', text: 'Back' });
    if (n === 1) back.hidden = true;
    var next = el('button', { type: 'submit', class: 'btn btn--primary', text: n === TOTAL ? 'See my result' : 'Next' });
    var startOver = el('button', { type: 'button', class: 'dx-link', text: 'Start over' });

    var form = el('form', { novalidate: true }, [fieldset, error, el('div', { class: 'dx-actions' }, [back, next])]);

    form.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || t.name !== q.id) return;
      if (multi) {
        if (t.value === 'none' && t.checked) inputs.forEach(function (i) { if (i.value !== 'none') i.checked = false; });
        else if (t.value !== 'none' && t.checked) inputs.forEach(function (i) { if (i.value === 'none') i.checked = false; });
        state.answers[q.id] = inputs.filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
      } else {
        state.answers[q.id] = t.value;
      }
      error.hidden = true;
      save();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!answered(q.id)) { error.hidden = false; inputs[0].focus(); return; }
      go(n === TOTAL ? 'result' : n + 1, true, true);
    });
    back.addEventListener('click', function () { go(n - 1, true, true); });
    startOver.addEventListener('click', reset);

    var card = el('div', { class: 'dx' }, [
      el('p', { class: 'dx-count', text: 'Question ' + n + ' of ' + TOTAL }),
      progress, form,
      el('p', { class: 'dx-reset' }, [startOver])
    ]);
    mount.replaceChildren(card, el('div', { id: 'dx-live', class: 'sr-only', 'aria-live': 'polite' }));
    announce('Question ' + n + ' of ' + TOTAL + '. ' + q.title);
    if (focus) legend.focus();
  }

  function renderResult(focus) {
    var r = D.recommend(state.answers);
    var offer = R.offers[r.route];
    var heading = el('h2', { tabindex: '-1', id: 'dx-result-h', text: r.title });

    var bestFit = el('a', { href: R.pages[offer.page], text: offer.name });
    var facts = el('dl', { class: 'dx-facts' }, [
      el('div', {}, [el('dt', { text: 'Start here' }), el('dd', { text: r.action })]),
      el('div', {}, [el('dt', { text: 'Best fit' }), el('dd', {}, [bestFit, document.createTextNode(' (' + offer.price + ')')])])
    ]);
    if (r.whyNow) facts.appendChild(el('div', {}, [el('dt', { text: 'Why now' }), el('dd', { text: r.whyNow })]));
    facts.appendChild(el('div', {}, [el('dt', { text: 'Before a build' }), el('dd', { text: r.readinessCopy })]));

    var href = target(r.cta.target);
    var external = r.cta.target.indexOf('external:') === 0;
    var cta = el('a', { class: 'btn btn--primary', href: href, text: r.cta.label });
    if (external) {
      cta.setAttribute('target', '_blank'); cta.setAttribute('rel', 'noopener');
      cta.appendChild(el('span', { class: 'sr-only', text: ' (opens in a new tab)' }));
    }
    var all = el('a', { class: 'cta-link', href: R.pages.services, text: 'See all services' });

    var change = el('button', { type: 'button', class: 'dx-link', text: 'Change my answers' });
    var startOver = el('button', { type: 'button', class: 'dx-link', text: 'Start over' });
    change.addEventListener('click', function () { go(TOTAL, true, true); });
    startOver.addEventListener('click', reset);

    var card = el('div', { class: 'dx dx-result' }, [
      el('p', { class: 'eyebrow', text: 'Your first fix' }),
      heading,
      el('p', { class: 'lead', text: r.explain }),
      facts,
      el('div', { class: 'btn-row' }, [cta, all]),
      el('p', { class: 'small', text: 'This is a routing recommendation, not a promise of commercial results.' }),
      el('p', { class: 'dx-reset' }, [change, document.createTextNode('  '), startOver])
    ]);
    mount.replaceChildren(card, el('div', { id: 'dx-live', class: 'sr-only', 'aria-live': 'polite' }));
    announce('Result ready. ' + r.title);
    if (focus) heading.focus();
  }

  function render(focus) {
    if (state.done && complete()) renderResult(focus);
    else renderQuestion(Math.min(state.step, firstOpen(), TOTAL), focus);
    if (focus) mount.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function fromHash() {
    var h = window.location.hash;
    if (h === '#result') return 'result';
    var m = /^#q([1-7])$/.exec(h);
    return m ? Number(m[1]) : null;
  }

  window.addEventListener('popstate', function () {
    var step = fromHash();
    if (step === null) step = state.step;
    state.done = step === 'result';
    if (step !== 'result') state.step = Math.min(step, firstOpen(), TOTAL);
    render(true);
  });

  // Entry: an offer page can pre-select the Q1 answer with ?from=<offer>. Only that offer name is read.
  var from = new URLSearchParams(window.location.search).get('from');
  if (from && PRESELECT[from]) {
    state = fresh();
    state.answers.q1 = PRESELECT[from];
    save();
    go(1, false, false);
  } else {
    var initial = fromHash();
    if (initial === null) initial = state.done && complete() ? 'result' : Math.min(state.step, firstOpen());
    go(initial, false, false);
  }
})();

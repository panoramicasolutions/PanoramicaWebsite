(function () {
  var script = document.currentScript;
  var active = script ? script.getAttribute('data-active') : '';
  var BOOK = 'https://meetings-eu1.hubspot.com/panoramica-solutions';
  var LINKS = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'what-we-fix.html', label: 'What we fix', key: 'marketplace' },
    { href: 'insights.html', label: 'Insights', key: 'insights' }
  ];
  var BARS = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  var CLOSE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var LOGO = '<svg viewBox="0 0 380.23 39.18" xmlns="http://www.w3.org/2000/svg" fill="currentColor" role="img" aria-label="Panoramica"><path d="M4.89,25.4v13.04H0V.86h15.42c1.82,0,3.5.31,5.03.93,1.53.62,2.85,1.47,3.95,2.56s1.97,2.39,2.58,3.9c.62,1.51.93,3.15.93,4.92s-.31,3.43-.93,4.92c-.62,1.49-1.47,2.78-2.57,3.87-1.1,1.09-2.4,1.93-3.91,2.54-1.51.61-3.17.91-4.97.91H4.89ZM15.31,21.11c1.11,0,2.13-.2,3.07-.61.94-.41,1.75-.96,2.45-1.67s1.23-1.55,1.62-2.51c.39-.97.58-2.02.58-3.16s-.2-2.17-.59-3.15c-.4-.98-.94-1.82-1.63-2.54s-1.51-1.28-2.46-1.7-1.98-.62-3.08-.62H4.89v15.97h10.42Z"/><path d="M103.21,38.44h-4.15l-23.13-28.99v28.99h-4.89V.86h4.12l23.16,29.04V.86h4.89v37.58Z"/><path d="M112.11,19.62c0-1.82.24-3.57.72-5.25.48-1.68,1.16-3.24,2.03-4.7.88-1.46,1.93-2.78,3.15-3.97,1.23-1.19,2.58-2.21,4.06-3.05,1.48-.85,3.08-1.5,4.79-1.96,1.71-.46,3.5-.69,5.36-.69s3.65.23,5.36.69c1.71.46,3.32,1.11,4.81,1.96,1.49.85,2.86,1.87,4.09,3.05,1.23,1.19,2.29,2.51,3.16,3.97.88,1.46,1.55,3.02,2.03,4.7.48,1.68.72,3.43.72,5.25s-.24,3.55-.72,5.22c-.48,1.68-1.16,3.24-2.03,4.68-.88,1.45-1.93,2.76-3.16,3.95-1.23,1.19-2.6,2.21-4.09,3.05s-3.09,1.5-4.81,1.96c-1.71.46-3.5.69-5.36.69s-3.65-.23-5.36-.69c-1.71-.46-3.31-1.11-4.79-1.96-1.48-.85-2.84-1.87-4.06-3.05-1.23-1.19-2.28-2.51-3.15-3.95s-1.55-3.01-2.03-4.68c-.48-1.68-.72-3.42-.72-5.22ZM117,19.62c0,1.44.18,2.81.54,4.12.36,1.31.87,2.53,1.53,3.66.66,1.13,1.46,2.16,2.39,3.08.93.92,1.96,1.71,3.08,2.36,1.12.65,2.34,1.16,3.63,1.52s2.65.54,4.05.54,2.78-.18,4.08-.54,2.51-.87,3.65-1.52c1.13-.65,2.16-1.44,3.09-2.36.93-.92,1.73-1.95,2.39-3.08.66-1.13,1.17-2.35,1.53-3.66.36-1.31.54-2.68.54-4.12,0-2.16-.4-4.17-1.2-6.04-.8-1.87-1.89-3.5-3.27-4.88s-3-2.46-4.85-3.25c-1.85-.78-3.84-1.17-5.96-1.17s-4.08.39-5.93,1.17c-1.85.78-3.46,1.87-4.84,3.25-1.37,1.38-2.46,3.01-3.26,4.88-.8,1.87-1.2,3.88-1.2,6.04Z"/><path d="M176.6,24.48h-10.42v13.96h-4.89V.86h15.97c1.82,0,3.5.28,5.02.84,1.52.56,2.83,1.36,3.94,2.4,1.11,1.04,1.97,2.29,2.58,3.74.62,1.46.93,3.07.93,4.84,0,1.4-.19,2.7-.58,3.91s-.93,2.28-1.63,3.23c-.7.95-1.55,1.77-2.54,2.46s-2.1,1.22-3.32,1.59l8.9,14.56h-5.66l-8.29-13.96ZM177.16,20.2c1.11,0,2.12-.18,3.05-.54.93-.36,1.74-.87,2.43-1.52.69-.65,1.23-1.44,1.62-2.36s.58-1.94.58-3.07-.2-2.15-.59-3.08-.94-1.73-1.63-2.39c-.69-.66-1.51-1.18-2.46-1.55s-1.98-.55-3.08-.55h-10.89v15.06h10.97Z"/><path d="M221.37,30.01h-19.01l-3.56,8.43h-5.2L209.51.86h4.7l15.92,37.58h-5.2l-3.56-8.43ZM204.15,25.75h15.42l-7.54-17.85-.17-.69-.17.69-7.54,17.85Z"/><path d="M254.5,26.14l-12.88-17.22v29.51h-4.89V.86h4.23l14.29,18.87,14.29-18.87h4.28v37.58h-4.89V8.95l-12.99,17.19h-1.44Z"/><path d="M284.59.86h4.89v37.58h-4.89V.86Z"/><path d="M332.07,12.74c-.61-1.31-1.38-2.48-2.32-3.52s-2-1.93-3.18-2.67c-1.18-.74-2.45-1.3-3.83-1.69s-2.79-.58-4.24-.58c-2.1,0-4.08.39-5.93,1.17-1.85.78-3.46,1.87-4.84,3.25-1.37,1.38-2.46,3.01-3.26,4.88-.8,1.87-1.2,3.88-1.2,6.04,0,1.44.18,2.81.54,4.12s.87,2.53,1.53,3.66,1.46,2.16,2.39,3.08c.93.92,1.96,1.71,3.08,2.36,1.12.65,2.34,1.16,3.63,1.52s2.65.54,4.05.54,2.87-.19,4.24-.58c1.37-.39,2.64-.94,3.81-1.66,1.17-.72,2.22-1.6,3.16-2.64s1.71-2.22,2.32-3.52h5.08c-.68,2.01-1.66,3.8-2.94,5.37-1.28,1.58-2.75,2.9-4.42,3.98-1.67,1.08-3.47,1.9-5.4,2.47-1.93.57-3.89.86-5.86.86-1.86,0-3.65-.23-5.36-.69-1.71-.46-3.31-1.11-4.79-1.96-1.48-.85-2.84-1.87-4.06-3.05-1.23-1.19-2.28-2.51-3.15-3.95s-1.55-3.01-2.03-4.68-.72-3.42-.72-5.22.24-3.57.72-5.25,1.16-3.24,2.03-4.7c.88-1.46,1.93-2.78,3.15-3.97,1.23-1.19,2.58-2.21,4.06-3.05,1.48-.85,3.08-1.5,4.79-1.96,1.71-.46,3.5-.69,5.36-.69,1.95,0,3.9.28,5.83.84,1.93.56,3.74,1.38,5.4,2.46,1.67,1.08,3.15,2.41,4.44,3.99,1.29,1.58,2.28,3.4,2.96,5.44h-5.06Z"/><path d="M351.27,38.44h-4.84l.06-37.58h5.17l28.57,37.58h-5.78l-6.25-8.15h-16.94v8.15ZM351.96,9.15l-.64-1.41h-.06v18.9h14.12l-13.43-17.49Z"/><path d="M56.87,30.29h-16.94s-6.25,8.15-6.25,8.15h-5.78S56.48.86,56.48.86h5.17s.06,37.58.06,37.58h-4.84v-8.15ZM42.75,26.64h14.12s0-18.9,0-18.9h-.06l-.64,1.41-13.43,17.49Z"/></svg>';

  var css = ''
    + '.pn-nav{position:fixed;top:0;left:0;right:0;z-index:1000;background:rgba(0,0,0,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid #222;font-family:Inter,system-ui,sans-serif;line-height:1.5}'
    + '.pn-bar{max-width:1280px;margin:0 auto;padding:0 24px;height:80px;display:flex;align-items:center;justify-content:space-between;position:relative}'
    + '.pn-logo{display:flex;align-items:center;color:#F2FFEB;position:relative;z-index:2}'
    + '.pn-logo svg{height:30px;width:auto;display:block}'
    + '.pn-links{position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:32px;font-size:14px;font-weight:500}'
    + '.pn-links a{color:#d1d5db;text-decoration:none;transition:color .15s}'
    + '.pn-links a:hover{color:#fff}'
    + '.pn-links a[aria-current=page]{color:#fff;font-weight:700}'
    + '.pn-actions{display:flex;align-items:center;gap:8px;position:relative;z-index:2}'
    + '.pn-cta{background:#DCEE6A;color:#000;font-weight:700;font-size:14px;padding:10px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;box-shadow:0 0 15px rgba(220,238,106,.4);transition:background .15s,box-shadow .15s}'
    + '.pn-cta:hover{background:#fff;box-shadow:0 0 20px rgba(220,238,106,.6)}'
    + '.pn-toggle{display:none;background:none;border:0;color:#fff;padding:8px;cursor:pointer;line-height:0;border-radius:6px}'
    + '.pn-toggle:focus-visible,.pn-links a:focus-visible,.pn-cta:focus-visible,.pn-menu a:focus-visible,.pn-logo:focus-visible{outline:2px solid #DCEE6A;outline-offset:3px}'
    + '.pn-menu{border-top:1px solid #222;background:#000;padding:4px 24px 20px}'
    + '.pn-menu[hidden]{display:none}'
    + '.pn-menu a{display:block;color:#d1d5db;padding:15px 0;border-bottom:1px solid #222;text-decoration:none;font-size:18px;text-align:center}'
    + '.pn-menu a[aria-current=page]{color:#DCEE6A;font-weight:700}'
    + '.pn-menu .pn-menu-cta{margin-top:16px;background:#DCEE6A;color:#000;font-weight:700;font-size:16px;padding:14px;border:0;border-radius:6px}'
    + '@media (max-width:767px){.pn-links{display:none}.pn-toggle{display:block;padding:6px}.pn-cta{font-size:12px;padding:8px 12px}.pn-bar{padding:0 16px}.pn-logo svg{height:20px}}'
    + '@media (max-width:374px){.pn-actions .pn-cta{display:none}}'
    + '@media (min-width:768px){.pn-menu{display:none!important}}';

  function link(l, cls) {
    return '<a href="' + l.href + '"' + (l.key === active ? ' aria-current="page"' : '') + '>' + l.label + '</a>';
  }
  var items = LINKS.map(link).join('');

  var html = ''
    + '<header class="pn-nav">'
    +   '<div class="pn-bar">'
    +     '<a class="pn-logo" href="index.html" aria-label="Panoramica home">' + LOGO + '</a>'
    +     '<nav class="pn-links" aria-label="Primary">' + items + '</nav>'
    +     '<div class="pn-actions">'
    +       '<a class="pn-cta" href="' + BOOK + '" target="_blank" rel="noopener">Book a call</a>'
    +       '<button class="pn-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="pn-menu">' + BARS + '</button>'
    +     '</div>'
    +   '</div>'
    +   '<nav class="pn-menu" id="pn-menu" aria-label="Mobile" hidden>' + items + '<a class="pn-menu-cta" href="' + BOOK + '" target="_blank" rel="noopener">Book a call</a></nav>'
    + '</header>';

  var style = document.createElement('style');
  style.id = 'pn-nav-css';
  style.textContent = css;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('afterbegin', html);

  var btn = document.querySelector('.pn-toggle');
  var menu = document.getElementById('pn-menu');
  function setOpen(open) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    btn.innerHTML = open ? CLOSE : BARS;
  }
  btn.addEventListener('click', function () { setOpen(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  window.matchMedia('(min-width:768px)').addEventListener('change', function (e) { if (e.matches) setOpen(false); });
})();

/* Testimonials render nothing unless an entry is fully authorized for the website.
   Add entries to testimonials.json only with the person's written permission for
   public website use. A quote approved for a private proposal is not approved here.
   Publish the exact approved wording and attribution, and nothing else.

   Entry shape:
   {
     "quote": "Exact approved wording",
     "name": "Full name",
     "title": "Job title",
     "company": "Company",
     "headshot": "assets/people/name.jpg",   optional: local asset or https URL
     "link": "https://example.com",          optional: https URL
     "permission": { "date": "YYYY-MM-DD", "source": "Where the permission is recorded" },
     "allowedChannels": ["website"]          must include "website"
   }
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PanoTestimonials = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var text = function (v) { return typeof v === 'string' && v.trim().length > 0; };
  var https = function (v) { return typeof v === 'string' && /^https:\/\/\S+$/.test(v); };
  var local = function (v) { return typeof v === 'string' && /^assets\/[\w\-./]+$/.test(v); };

  function isAuthorized(entry, channel) {
    if (!entry || typeof entry !== 'object') return false;
    if (!text(entry.quote) || !text(entry.name) || !text(entry.title) || !text(entry.company)) return false;
    var p = entry.permission;
    if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.date)) || !text(p.source)) return false;
    if (!Array.isArray(entry.allowedChannels) || entry.allowedChannels.indexOf(channel || 'website') === -1) return false;
    if (entry.headshot !== undefined && !(https(entry.headshot) || local(entry.headshot))) return false;
    if (entry.link !== undefined && !https(entry.link)) return false;
    return true;
  }

  function authorized(entries, channel) {
    return Array.isArray(entries) ? entries.filter(function (e) { return isAuthorized(e, channel); }) : [];
  }

  function render(container, entries) {
    var list = authorized(entries, 'website');
    if (!list.length) return 0;
    var wrap = document.createElement('div');
    wrap.className = 'testimonials';
    list.forEach(function (e) {
      var fig = document.createElement('figure');
      fig.className = 'testimonial';
      var bq = document.createElement('blockquote');
      var p = document.createElement('p');
      p.textContent = e.quote;
      bq.appendChild(p);
      var cap = document.createElement('figcaption');
      if (e.headshot) {
        var img = document.createElement('img');
        img.src = e.headshot; img.alt = ''; img.width = 48; img.height = 48; img.loading = 'lazy';
        cap.appendChild(img);
      }
      var who = document.createElement('span');
      var name = e.link ? document.createElement('a') : document.createElement('strong');
      name.textContent = e.name;
      if (e.link) { name.href = e.link; name.rel = 'noopener'; name.target = '_blank'; name.className = 'text-link'; }
      who.appendChild(name);
      who.appendChild(document.createElement('br'));
      who.appendChild(document.createTextNode(e.title + ', ' + e.company));
      cap.appendChild(who);
      fig.appendChild(bq); fig.appendChild(cap);
      wrap.appendChild(fig);
    });
    container.appendChild(wrap);
    container.hidden = false;
    return list.length;
  }

  function init() {
    var mount = document.querySelector('[data-testimonials]');
    if (!mount || typeof fetch !== 'function') return;
    fetch('testimonials.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (entries) { render(mount, entries); })
      .catch(function () {});
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  return { isAuthorized: isAuthorized, authorized: authorized, render: render };
});

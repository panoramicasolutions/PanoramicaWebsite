/* Single registry for routes and external destinations.
   Loaded in the browser (window.PanoRoutes) and required by the Node tools. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PanoRoutes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var site = 'https://www.panoramica.solutions';

  var pages = {
    home: 'index.html',
    services: 'services.html',
    outreach: 'email-outreach.html',
    goldmine: 'goldmine.html',
    database: 'database.html',
    brief: 'the-brief.html',
    discoveryengine: 'discovery-engine.html',
    architect: 'revenue-architect.html',
    studio: 'the-studio.html',
    custom: 'custom-builds.html',
    support: 'ongoing-support.html',
    diagnostic: 'diagnostic.html',
    about: 'index.html#about',
    insights: 'insights.html',
    article: 'article.html',
    privacy: 'privacy.html',
    terms: 'terms.html'
  };

  var external = {
    book: '/discovery',
    linkedin: 'https://www.linkedin.com/in/lorenzo-liviero/',
    architectApp: 'https://revenue-architect-one.vercel.app/chat.html',
    email: 'mailto:lorenzo@panoramica.solutions'
  };

  // Offer names, price labels and CTA labels. Pages and the diagnostic read from here.
  // `quote: true` means the price is not published: the page says so and offers an "Inquire about
  // pricing" button. Only a listed price (quote: false) may show a figure anywhere on the site.
  var offers = {
    outreach: { name: 'Email outreach infrastructure', page: 'outreach', price: 'Custom scope', quote: true, cta: 'Scope my outreach infrastructure' },
    database: { name: 'Data foundation', page: 'database', price: 'Custom scope', quote: true, cta: 'Scope my data foundation' },
    goldmine: { name: 'Goldmine', page: 'goldmine', price: 'Pricing on request', quote: true, cta: 'See Goldmine' },
    brief: { name: 'The Brief', page: 'brief', price: 'Pricing on request', quote: true, cta: 'See The Brief' },
    discovery: { name: 'Discovery Engine', page: 'discoveryengine', price: 'Pricing on request', quote: true, cta: 'See the Discovery Engine' },
    architect: { name: 'Revenue Architect', page: 'architect', price: '£149 self-serve', quote: false, cta: 'See Revenue Architect', live: false },
    studio: { name: 'Marketing Studio', page: 'studio', price: 'Pricing on request', quote: true, cta: 'See Marketing Studio' },
    custom: { name: 'Custom builds', page: 'custom', price: 'Pricing on request', quote: true, cta: 'Scope a custom build' },
    support: { name: 'Ongoing support', page: 'support', price: 'Pricing on request', quote: true, cta: 'See ongoing support' }
  };

  // `pages` holds the file behind each route. `href` is the public, extensionless URL for it:
  // every link, canonical and sitemap entry goes through here so ".html" never reaches a visitor.
  function href(key) {
    var p = pages[key];
    if (!p) return undefined;
    var i = p.indexOf('#');
    var file = i === -1 ? p : p.slice(0, i);
    var hash = i === -1 ? '' : p.slice(i);
    return (file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '')) + hash;
  }

  // The pricing-inquiry email for an offer, with the offer named in the subject.
  function inquire(key) {
    var o = offers[key];
    return external.email + '?subject=' + encodeURIComponent('Pricing inquiry: ' + (o ? o.name : key));
  }

  return { site: site, pages: pages, external: external, offers: offers, href: href, inquire: inquire };
});

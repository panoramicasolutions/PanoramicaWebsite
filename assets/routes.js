/* Single registry for routes and external destinations.
   Loaded in the browser (window.PanoRoutes) and required by the Node tools. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PanoRoutes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var site = 'https://www.panoramica.solutions';

  var pages = {
    home: 'index.html',
    marketplace: 'marketplace.html',
    outreach: 'email-outreach.html',
    goldmine: 'goldmine.html',
    database: 'database.html',
    brief: 'the-brief.html',
    architect: 'revenue-architect.html',
    studio: 'the-studio.html',
    diagnostic: 'diagnostic.html',
    about: 'index.html#about',
    insights: 'insights.html',
    article: 'article.html',
    privacy: 'privacy.html',
    terms: 'terms.html'
  };

  var external = {
    book: 'https://meetings-eu1.hubspot.com/panoramica-solutions',
    linkedin: 'https://www.linkedin.com/in/lorenzo-liviero/',
    architectApp: 'https://revenue-architect-one.vercel.app/chat.html',
    email: 'mailto:lorenzo@panoramica.solutions'
  };

  // Offer names, price labels and CTA labels. Pages and the diagnostic read from here.
  var offers = {
    outreach: { name: 'Email outreach infrastructure', page: 'outreach', price: 'Custom scope', cta: 'Scope my outreach infrastructure' },
    database: { name: 'Data foundation', page: 'database', price: 'Custom scope', cta: 'Scope my data foundation' },
    goldmine: { name: 'Goldmine', page: 'goldmine', price: '£6,000 / £8,500 / £11,000', cta: 'See Goldmine' },
    brief: { name: 'The Brief', page: 'brief', price: '£1,000 fixed setup', cta: 'See The Brief' },
    architect: { name: 'Revenue Architect', page: 'architect', price: '£149 self-serve', cta: 'See Revenue Architect', live: false },
    studio: { name: 'Marketing Studio', page: 'studio', price: '£7,500 fixed build', cta: 'See Marketing Studio' }
  };

  return { site: site, pages: pages, external: external, offers: offers };
});

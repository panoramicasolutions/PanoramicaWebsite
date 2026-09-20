/* Single registry for routes and external destinations.
   Loaded in the browser (window.PanoRoutes) and required by the Node tools. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PanoRoutes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var site = 'https://www.panoramica.solutions';

  var pages = {
    home: 'index.html',
    whatWeFix: 'what-we-fix.html',
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

  return { site: site, pages: pages, external: external };
});

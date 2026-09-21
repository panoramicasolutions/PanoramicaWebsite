// Offer pages and marketplace cards, generated from one data entry per offer.
// Every offer page has the same three blocks: hero, how it works, fit and price.
// Pages carry marker comments and tools/sync-shell.mjs stamps the generated HTML between them.
//   <!-- offer-page:brief -->...<!-- /offer-page:brief -->   the whole body of an offer page
//   <!-- cards:start -->...<!-- cards:end -->                the compact grid on the marketplace
import { routes } from './shell.mjs';
import { icon } from './icons.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEW_TAB = '<span class="sr-only"> (opens in a new tab)</span>';

// Order here is the order on the marketplace.
export const OFFER_ORDER = ['outreach', 'database', 'goldmine', 'brief', 'architect', 'studio'];

export const VISUALS = {
  outreach: {
    category: 'Pipeline',
    tagline: 'Personalized outreach, reviewed first.',
    h1: 'Outreach built around a real reason to write',
    lead: 'Research, personalization and message logic, with the Gmail workflow and CRM handoff built in.',
    facts: [['Built for', 'LPs, founders, target accounts'], ['Steps', '5, with review before send'], ['Sends from', 'Gmail on Google Workspace']],
    title: 'From audience to handoff',
    kind: 'chain',
    label: 'How email outreach infrastructure works, in five steps',
    nodes: [
      { icon: 'target', title: 'Define the audience', text: 'Persona and signals' },
      { icon: 'search', title: 'Research', text: 'Accounts and contacts' },
      { icon: 'pen', title: 'Draft', text: 'Personalization with evidence rules' },
      { icon: 'approve', title: 'Review', text: 'Exceptions and approval', tag: 'Nothing sends without agreed controls' },
      { icon: 'send', title: 'Send and hand off', text: 'Gmail on Google Workspace, then your CRM' }
    ],
    mini: ['target', 'search', 'pen', 'approve', 'send'],
    chipsLabel: 'Works with',
    chips: ['Gmail on Google Workspace', 'Your CRM'],
    metrics: [
      { dir: 'down', name: 'Research and drafting time' },
      { dir: 'up', name: 'Follow-up consistency' },
      { dir: 'up', name: 'Qualified conversations' }
    ],
    sample: {
      title: 'From research to a reviewable draft',
      rows: [
        ['Contact', 'Alex Example, partner at Example Capital (fictional)'],
        ['Evidence found', 'A public note on evergreen fund structures (fictional source, stored with the draft).', 'Sourced'],
        ['Draft opening', '"Hi Alex, I read your note on evergreen fund structures. [One sentence on why we are writing.]"'],
        ['Review state', 'Fact matched to its source. Not sent.', 'Awaiting approval', true]
      ]
    },
    fit: {
      good: ['A defined market and an important list', 'Founders, fundraising teams, small revenue teams', 'Weak research depth or inconsistent follow-up'],
      notYet: ['Contact data is missing: start with database work']
    },
    includes: ['Audience and signals', 'Account research', 'Evidence rules', 'Approval rules', 'Gmail setup', 'CRM handoff'],
    excludesLabel: 'Only if scoped',
    excludes: ['List procurement', 'Mailbox and domain setup', 'Deliverability fixes', 'Ongoing campaign operation', 'Guaranteed replies'],
    price: { label: 'Pricing', amount: 'Custom scope', scope: 'Priced after a short qualification.', plain: true }
  },
  database: {
    category: 'Data foundation',
    tagline: 'Clean records or a new market database.',
    h1: 'A database your team can trust',
    lead: 'Clean the records you have, or build a target-account database for a defined market.',
    facts: [['Starting points', '2: clean or create'], ['Agreed before quoting', '7 inputs'], ['Delivered with', 'Schema, import file, exception report']],
    title: 'From scattered records to a usable database',
    kind: 'diagram',
    label: 'How database cleanup or creation works: what goes in, what comes out',
    readsLabel: 'Starts from',
    reads: [
      { icon: 'table', text: 'Spreadsheets' },
      { icon: 'records', text: 'CRM records' },
      { icon: 'globe', text: 'A defined target market' }
    ],
    core: { title: 'The database work', sub: 'Audit, schema, deduplication, validation' },
    delivers: [
      { icon: 'records', text: 'A documented database' },
      { icon: 'file', text: 'CRM-ready import file' },
      { icon: 'shield', text: 'Exception report and source notes' }
    ],
    mini: ['table', 'records', 'shield', 'file'],
    chips: [],
    metrics: [
      { dir: 'down', name: 'Duplicate records' },
      { dir: 'up', name: 'Required-field completeness' },
      { dir: 'down', name: 'Time to route and segment' }
    ],
    sample: {
      title: 'One company, before and after',
      rows: [
        ['Before', 'Three records for "Acme Ltd" with different spellings and one missing country.', '3 records'],
        ['After', 'One merged record, country filled, validated against the schema.', '1 record', true],
        ['Exception report', 'One record needs a person to decide: two possible parent companies.', '1 flagged']
      ]
    },
    fit: {
      good: ['Duplicated, incomplete or scattered records', 'A defined market that needs a target-account database', 'A team that cannot route or report reliably'],
      notYet: ['No lawful, approved basis for the data']
    },
    includes: ['Source audit', 'Schema and required fields', 'Deduplication and validation', 'Enrichment rules', 'CRM-ready import file', 'Refresh guidance'],
    excludesLabel: 'Not included',
    excludes: ['Exhaustive coverage', 'Legal or compliance advice', 'CRM redesign', 'Ongoing enrichment'],
    price: { label: 'Pricing', amount: 'Custom scope', scope: 'Record volume, source quality and enrichment depth set the scope.', plain: true }
  },
  goldmine: {
    category: 'CRM intelligence',
    tagline: 'A prioritized queue from your CRM.',
    h1: 'Know who to contact next',
    lead: 'A prioritized working queue built from your CRM history, web research and call notes.',
    facts: [['Signals read', '3 sources'], ['Build depths', 'Core, Full Build, Extended'], ['Proven on', 'HubSpot']],
    title: 'From CRM history to a working queue',
    kind: 'diagram',
    label: 'How Goldmine works: what goes in, what comes out',
    reads: [
      { icon: 'records', text: 'CRM data' },
      { icon: 'globe', text: 'Web research' },
      { icon: 'phone', text: 'Calls and notes' }
    ],
    core: { title: 'Goldmine', sub: 'Scoring rules and record checks' },
    delivers: [
      { icon: 'queue', text: 'Your prioritized working queue' },
      { icon: 'send', text: 'Write-back to your CRM' }
    ],
    mini: ['records', 'globe', 'phone', 'queue'],
    chipsLabel: 'Example rules in the current build',
    chips: ['14-day hot decay', '30-day cold decay', '3-channel ghosting', 'Score floor and cap'],
    metrics: [
      { dir: 'up', name: 'Connectivity rate' },
      { dir: 'down', name: 'Deal cycle time' },
      { dir: 'up', name: 'Opportunities created' }
    ],
    sample: {
      title: 'Working queue, top three',
      rows: [
        ['1. Example Ltd', 'Replied two days ago. Next contact Thursday.', '92', true],
        ['2. Demo Inc', 'Call note says budget confirmed. Next contact Monday.', '88'],
        ['3. Sample Co', 'No reply on three channels, so the score is capped.', '61']
      ]
    },
    fit: {
      good: ['A sales or BD team of five or more', 'A CRM used daily but not fully trusted', 'Roughly 10,000 to 20,000+ contact and deal records'],
      notYet: ['A near-empty CRM: start with database work', 'Fewer than five reps']
    },
    includes: ['Prioritized queue', 'Readable scoring rules', 'Record checks', 'Write-back to your CRM'],
    excludesLabel: 'Not included',
    excludes: ['A net-new database build', 'Outcome promises', 'Other CRMs unless scoped'],
    price: { tiers: true }
  },
  brief: {
    category: 'Meeting intelligence',
    tagline: 'A brief in Gmail before every meeting.',
    h1: 'A brief in your inbox, before every call',
    lead: 'An account brief lands in Gmail before every external meeting.',
    facts: [['Per rep, per day', '2 emails'], ['Before each meeting', '30 minutes'], ['Live sources', '3, cross-checked']],
    title: 'Fires from your calendar, lands in Gmail',
    kind: 'diagram',
    label: 'How The Brief works: what goes in, what comes out',
    reads: [
      { icon: 'calendar', text: 'Your calendar' },
      { icon: 'records', text: 'CRM data' },
      { icon: 'phone', text: 'Call history' },
      { icon: 'transcript', text: 'Meeting transcripts' }
    ],
    core: { title: 'The Brief', sub: 'Triggered by each external meeting' },
    delivers: [
      { icon: 'mail', text: 'Morning overview at 08:00' },
      { icon: 'clock', text: 'Detailed brief 30 minutes before each meeting' },
      { icon: 'shield', text: 'Every fact checked against the record' }
    ],
    mini: ['calendar', 'records', 'mail', 'clock'],
    chipsLabel: 'Works with',
    chips: ['Google Calendar (required)', 'Gmail (required)', 'HubSpot (proven)', 'Aircall (proven)'],
    metrics: [
      { dir: 'down', name: 'Pre-call prep time' },
      { dir: 'down', name: 'New-rep ramp time' }
    ],
    sample: {
      title: 'Brief: intro call with Jordan Example (14:00)',
      rows: [
        ['Who', 'Jordan Example, head of operations at Example Ltd (fictional)'],
        ['From the CRM', 'Stage: discovery. Last activity: an email from the rep, no reply logged.'],
        ['From past calls', 'Asked how the tool connects to their existing CRM.'],
        ['Open items', 'Confirm the decision timeline. Send the pricing summary discussed last time.'],
        ['Checked', 'Each fact matched to a record before the brief was sent.', 'Verified', true]
      ]
    },
    fit: {
      good: ['Reps taking five or more calls a week', 'On Google Workspace (Calendar and Gmail)', 'A CRM and call history to draw from'],
      notYet: ['Not on Google Calendar or Gmail', 'No real pipeline in motion yet']
    },
    includes: ['First live brief', 'Morning overview at 08:00', 'Brief 30 minutes before', 'Record checks', 'Single-team setup'],
    excludesLabel: 'Not included',
    excludes: ['Other CRMs unless requested', 'LLM running costs'],
    price: { label: 'Fixed price', amount: '&pound;1,000 <small>fixed setup</small>', scope: 'Setup and first live brief, single team' }
  },
  architect: {
    category: 'Revenue diagnostic',
    tagline: 'Finds the real constraint on your growth.',
    h1: 'Finds the constraint you can\'t see from inside',
    lead: 'A guided diagnostic that turns the real revenue constraint into an action plan.',
    facts: [['Structure', '6 phases'], ['Checked against', '16 archetypes'], ['Before a report', '14+ exchanges']],
    title: 'Six phases, one constraint',
    kind: 'chain',
    label: 'The six phases of the Revenue Architect conversation',
    nodes: [
      { icon: 'chat', title: 'Open' },
      { icon: 'question', title: 'Challenge' },
      { icon: 'dig', title: 'Excavation' },
      { icon: 'pulse', title: 'Diagnosis' },
      { icon: 'gem', title: 'Crystallisation' },
      { icon: 'report', title: 'Your report' }
    ],
    mini: ['chat', 'question', 'dig', 'pulse', 'gem', 'report'],
    chipsLabel: 'Runs on',
    chips: ['Gemini', 'Tavily', 'Stripe', 'Resend'],
    metrics: [
      { dir: 'down', name: 'Time to a confident growth-priority decision' },
      { dir: 'down', name: 'Guesswork before committing budget' }
    ],
    sample: {
      title: 'One finding in the report',
      rows: [
        ['Symptom you named', 'Not enough leads.'],
        ['Constraint found', 'Slow follow-up after demos.', 'Constraint', true],
        ['Recommendation', 'Fix the follow-up handoff before buying more leads.']
      ]
    },
    fit: {
      good: ['You suspect the real problem is not what you think', 'You have real numbers: revenue, team size, pipeline', 'You have 20 minutes for a real conversation'],
      notYet: ['Pre-revenue, with nothing to benchmark', 'Already certain of the root cause']
    },
    includes: ['One diagnostic conversation', 'Benchmarked report', 'Operating model', 'Every recommendation traced to a finding'],
    excludesLabel: 'Not included',
    excludes: ['A bespoke build', 'A generic playbook'],
    price: { label: 'Fixed price', amount: '&pound;149 <small>self-serve</small>', scope: 'One diagnostic conversation and report' },
    note: 'Opens the Revenue Architect app on a separate site. Checkout is handled by Stripe.'
  },
  studio: {
    category: 'Marketing QA',
    tagline: 'Campaigns checked before sign-off.',
    h1: 'AI campaigns that pass QA before they publish',
    lead: 'Campaigns and landing pages checked against your compliance or brand rules, then held for approval.',
    facts: [['Pipeline', '4 agents'], ['QA findings', '2 severity tiers'], ['Before publishing', '1 human approval']],
    title: 'Four agents, one QA gate',
    kind: 'chain',
    label: 'How The Studio takes a campaign from research to a live page',
    nodes: [
      { icon: 'search', title: 'Research' },
      { icon: 'compass', title: 'Strategy' },
      { icon: 'pen', title: 'Copywriter' },
      { icon: 'shield', title: 'QA check', text: 'Banned terms block first. AI judges accuracy, clarity and brand.', tag: 'Proven on FCA COBS 4' },
      { icon: 'approved', title: 'Human approval', tag: 'Nothing publishes without it' },
      { icon: 'browser', title: 'Live page', text: 'On an isolated deploy' }
    ],
    mini: ['search', 'compass', 'pen', 'shield', 'approved', 'browser'],
    chipsLabel: 'Runs on',
    chips: ['Anthropic', 'Next.js', 'PostgreSQL', 'Vercel'],
    metrics: [
      { dir: 'down', name: 'Time from brief to a QA\'d, ready-to-publish campaign' },
      { dir: 'down', name: 'Review cycles before sign-off' }
    ],
    sample: {
      title: 'QA report for one landing page',
      rows: [
        ['Blocker', 'A banned term appears in the headline. Publication is held.', 'Rule', true],
        ['Warning', 'The claim in paragraph two is unclear.', 'AI pass'],
        ['Status', 'Waiting for human approval. Not published.', 'Held']
      ]
    },
    fit: {
      good: ['Outbound copy needs sign-off before it ships', 'A reviewer who reviews the copy today', 'Multiple brands, or a regulated one'],
      notYet: ['Nobody signs off outbound copy yet', 'Only one-off campaigns']
    },
    includes: ['Setup', 'First QA\'d campaign, live', 'Brand rules', 'Campaign calendar', 'Two severity tiers'],
    excludesLabel: 'Not included',
    excludes: ['Sending', 'Legal or compliance sign-off', 'Publishing without approval'],
    price: { label: 'Fixed price', amount: '&pound;7,500 <small>fixed build</small>', scope: 'Setup and first QA\'d campaign' }
  }
};

// The primary action on an offer page: a demo call, or the diagnostic for Revenue Architect.
const action = (id) => (id === 'architect'
  ? { label: 'Run the diagnostic', href: routes.external.architectApp }
  : { label: 'Book a demo call', href: routes.external.book });
const actionLink = (id, cls) => {
  const a = action(id);
  return `<a class="${cls}" href="${a.href}" target="_blank" rel="noopener">${a.label}${NEW_TAB}</a>`;
};

const li = (items) => items.map((t) => `<li>${esc(t)}</li>`).join('\n          ');
const chipRow = (items, cls = '') => `<ul class="viz__chips${cls}">\n          ${li(items)}\n        </ul>`;

// ---------- diagrams ----------

const chips = (v) => (v.chips && v.chips.length
  ? `\n    <div class="viz__foot">\n      <p class="viz__label">${esc(v.chipsLabel)}</p>\n      <ul class="viz__chips">\n        ${li(v.chips)}\n      </ul>\n    </div>`
  : '');

function chain(v) {
  const steps = v.nodes.map((n, i) => `<li class="chain__step">
        <span class="chain__node">${icon(n.icon)}</span>
        <span class="chain__num">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="chain__title">${esc(n.title)}</h3>${n.text ? `\n        <p class="chain__text">${esc(n.text)}</p>` : ''}${n.tag ? `\n        <span class="chain__tag">${esc(n.tag)}</span>` : ''}
      </li>`).join('\n      ');
  return `<div class="viz" role="group" aria-label="${esc(v.label)}">
    <ol class="chain" style="--n:${v.nodes.length}">
      ${steps}
    </ol>${chips(v)}
  </div>`;
}

function diagram(v) {
  const side = (label, items) => `<div class="diagram__side">
        <p class="diagram__label">${esc(label)}</p>
        <ul class="diagram__list">
          ${items.map((i) => `<li>${icon(i.icon)}<span>${esc(i.text)}</span></li>`).join('\n          ')}
        </ul>
      </div>`;
  return `<div class="viz" role="group" aria-label="${esc(v.label)}">
    <div class="diagram">
      ${side(v.readsLabel || 'Reads', v.reads)}
      <span class="diagram__link" aria-hidden="true"></span>
      <div class="diagram__core">
        <span class="emblem"><img src="assets/mark.svg" alt="" width="62" height="21"></span>
        <strong>${esc(v.core.title)}</strong>
        <span>${esc(v.core.sub)}</span>
      </div>
      <span class="diagram__link" aria-hidden="true"></span>
      ${side(v.deliversLabel || 'Delivers', v.delivers)}
    </div>${chips(v)}
  </div>`;
}

export const renderVisual = (id) => (VISUALS[id].kind === 'chain' ? chain(VISUALS[id]) : diagram(VISUALS[id]));

export function renderMetrics(id) {
  const v = VISUALS[id];
  return `<div class="metrics">
    <p class="metrics__title">Metrics it targets</p>
    <ul class="metrics__list">
      ${v.metrics.map((m) => `<li><span class="metrics__dir" aria-hidden="true">${icon(m.dir)}</span><span class="metrics__name">${esc(m.name)}</span><span class="sr-only"> (target: ${m.dir === 'down' ? 'lower' : 'higher'})</span></li>`).join('\n      ')}
    </ul>
  </div>`;
}

function renderSample(id) {
  const smp = VISUALS[id].sample;
  const row = ([k, val, badge, strong]) => `<div class="sample__row">
              <dt>${esc(k)}</dt>
              <dd>${badge ? `<span class="badge${strong ? ' badge--strong' : ''}">${esc(badge)}</span>` : ''}${esc(val)}</dd>
            </div>`;
  return `<div class="sample">
        <div class="example">
          <p class="example__label">Example - not client data.</p>
          <h3>${esc(smp.title)}</h3>
          <dl>
            ${smp.rows.map(row).join('\n            ')}
          </dl>
        </div>
      </div>`;
}

// ---------- the three blocks of an offer page ----------

function renderHero(id) {
  const v = VISUALS[id];
  const offer = routes.offers[id];
  return `<section class="hero hero--offer" aria-labelledby="hero-h">
    <div class="wrap">
      <p class="crumb"><a class="text-link" href="${routes.pages.marketplace}">&larr; Marketplace</a></p>
      <p class="eyebrow">${esc(offer.name)}</p>
      <h1 id="hero-h">${esc(v.h1)}</h1>
      <p class="lead">${esc(v.lead)}</p>
      <div class="price-line">
        <span class="chip chip--lime">${esc(offer.price)}</span>
        ${actionLink(id, 'btn btn--primary')}
      </div>
      <ul class="stats">
        ${v.facts.map(([l, val]) => `<li><span class="stats__label">${esc(l)}</span><span class="stats__value">${esc(val)}</span></li>`).join('\n        ')}
      </ul>
    </div>
    <div class="hero-art hero-art--side" aria-hidden="true">
      <img class="hero-mark" src="assets/mark.svg" alt="" width="229" height="77">
    </div>
  </section>`;
}

function renderHow(id) {
  const v = VISUALS[id];
  return `<section class="section" id="how" aria-labelledby="how-h">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">How it works</p>
        <h2 id="how-h">${esc(v.title)}</h2>
      </div>
      ${renderVisual(id)}
      <div class="how-row">
        ${renderSample(id)}
        ${renderMetrics(id)}
      </div>
    </div>
  </section>`;
}

const TIERS = `<div class="mk-price" data-tiers>
            <p class="mk-price__label">Fixed scope, priced by depth</p>
            <p class="mk-price__amount" data-amount aria-live="polite">&pound;6,000</p>
            <p class="mk-price__scope" data-scope>Scoring and write-back, single pipeline</p>
            <div class="tier-select">
              <div class="tier-select__meter" aria-hidden="true"><i class="on"></i><i></i><i></i></div>
              <div class="tier-select__buttons" role="group" aria-label="Choose a build depth">
                <button type="button" class="tier-btn" aria-pressed="true" data-price="6000" data-scope="Scoring and write-back, single pipeline"><span>Core</span><small>&pound;6,000</small></button>
                <button type="button" class="tier-btn" aria-pressed="false" data-price="8500" data-scope="Adds AI synthesis behind record checks, and multiple pipelines"><span>Full Build</span><small>&pound;8,500</small></button>
                <button type="button" class="tier-btn" aria-pressed="false" data-price="11000" data-scope="Adds custom signals and a reporting dashboard"><span>Extended</span><small>&pound;11,000</small></button>
              </div>
            </div>
          </div>
          <p class="mk-note">&pound;6,000 / &pound;8,500 / &pound;11,000 by depth. Prices apply to HubSpot.</p>`;

function priceBlock(v) {
  if (v.price.tiers) return TIERS;
  return `<div class="mk-price">
            <p class="mk-price__label">${esc(v.price.label)}</p>
            <p class="mk-price__amount">${v.price.amount}</p>
            <p class="mk-price__scope${v.price.plain ? ' mk-price__scope--plain' : ''}">${esc(v.price.scope)}</p>
          </div>`;
}

function renderFit(id) {
  const v = VISUALS[id];
  return `<section class="section section--tint" id="fit" aria-labelledby="fit-h">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Before you book</p>
        <h2 id="fit-h">Fit, scope and price</h2>
      </div>
      <div class="fit-grid">
        <article class="fitcard">
          <h3>Fit</h3>
          <ul class="checks">
            ${li(v.fit.good)}
          </ul>
          <p class="fitcard__label">Not yet</p>
          <ul class="crosses">
            ${li(v.fit.notYet)}
          </ul>
        </article>
        <article class="fitcard">
          <h3>Scope</h3>
          <p class="fitcard__label">Includes</p>
          ${chipRow(v.includes)}
          <p class="fitcard__label">${esc(v.excludesLabel)}</p>
          ${chipRow(v.excludes, ' viz__chips--out')}
        </article>
        <article class="fitcard fitcard--price">
          <h3>Price</h3>
          ${priceBlock(v)}
          ${actionLink(id, 'btn btn--primary')}
          ${v.note ? `<p class="small">${esc(v.note)}</p>` : `<p class="small">Or <a class="text-link" href="${routes.external.email}">email us</a>.</p>`}
        </article>
      </div>
    </div>
  </section>`;
}

function renderBar(id) {
  const offer = routes.offers[id];
  return `<div class="offer-bar" data-offer-bar>
    <div class="wrap offer-bar__inner">
      <p class="offer-bar__id"><strong>${esc(offer.name)}</strong><span>${esc(offer.price)}</span></p>
      ${actionLink(id, 'btn btn--primary btn--sm')}
    </div>
  </div>`;
}

export const renderOfferPage = (id) => [renderHero(id), renderHow(id), renderFit(id), renderBar(id)].join('\n\n  ');

// ---------- marketplace cards ----------

function renderCard(id) {
  const v = VISUALS[id];
  const offer = routes.offers[id];
  const href = routes.pages[offer.page];
  return `      <article class="card card--link mkt-card">
        <div class="mkt-card__top">
          <span class="emblem emblem--sm"><img src="assets/mark.svg" alt="" width="62" height="21"></span>
          <p class="mkt-card__cat">${esc(v.category)}</p>
        </div>
        <h3 class="mkt-card__name"><a class="card__link" href="${href}">${esc(offer.name)}</a></h3>
        <p class="mkt-card__line">${esc(v.tagline)}</p>
        <span class="mini" aria-hidden="true">${v.mini.map((i) => `<span class="mini__dot">${icon(i)}</span>`).join('')}</span>
        <p class="mkt-card__price"><span>${esc(offer.price)}</span><span class="mkt-card__go" aria-hidden="true">&rarr;</span></p>
      </article>`;
}

export function renderCards() {
  return `<!-- cards:start -->\n${OFFER_ORDER.map(renderCard).join('\n')}\n      <!-- cards:end -->`;
}

const cardsBlock = /<!-- cards:start -->[\s\S]*?<!-- cards:end -->/;
const pageBlock = /<!-- offer-page:([a-z]+) -->[\s\S]*?<!-- \/offer-page:\1 -->/g;

export const hasVisuals = (html) => cardsBlock.test(html) || /<!-- offer-page:[a-z]+ -->/.test(html);

export function applyVisuals(html) {
  return html
    .replace(cardsBlock, () => renderCards())
    .replace(pageBlock, (_all, id) => `<!-- offer-page:${id} -->\n  ${renderOfferPage(id)}\n  <!-- /offer-page:${id} -->`);
}

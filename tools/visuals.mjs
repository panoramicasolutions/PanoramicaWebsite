// Offer pages and marketplace cards, generated from one data entry per offer.
// Every offer page has the same three blocks, written from the client's side:
//   1. the result (hero: outcome, what it is built to move, three selling points)
//   2. how it works (a signature visual of the offer's main selling point)
//   3. is it right for you (fit, scope, price)
// Pages carry marker comments and tools/sync-shell.mjs stamps the generated HTML between them.
//   <!-- offer-page:brief -->...<!-- /offer-page:brief -->   the whole body of an offer page
//   <!-- cards:start -->...<!-- cards:end -->                the compact grid on the marketplace
import { routes } from './shell.mjs';
import { icon } from './icons.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEW_TAB = '<span class="sr-only"> (opens in a new tab)</span>';
const LABEL = '<p class="example__label">Example - not client data.</p>';
const BAR = (title, meta) => `<div class="mock__bar"><span class="mock__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="mock__title">${title}</span><span class="mock__meta">${meta}</span></div>`;

// Order here is the order on the marketplace.
export const OFFER_ORDER = ['outreach', 'database', 'goldmine', 'brief', 'architect', 'studio'];

// ---------- signature visuals: the main selling point of each offer, shown as the product ----------

const SIG = {
  brief: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Inbox', '13:30, 30 minutes before the call')}
          <div class="mock__body">
            <p class="mail__subject">Brief: intro call with Jordan Example (14:00)</p>
            <p class="mail__from">From The Brief, to Sam Rep (example)</p>
            <p class="built"><span class="built__label">Built from</span><span class="tag">CRM</span><span class="tag">Past calls</span><span class="tag">Meeting transcripts</span><span class="tag">Calendar</span></p>
            <div class="sig__cols">
              <div class="pane">
                <p class="pane__title">The facts</p>
                <dl class="kv">
                  <dt>Who</dt><dd>Jordan Example, head of operations at Example Ltd (fictional)</dd>
                  <dt>CRM</dt><dd>Stage: discovery. Last activity: an email from the rep, no reply logged.</dd>
                  <dt>Last call</dt><dd>Asked how the tool connects to their existing CRM.</dd>
                  <dt>Open items</dt><dd>Confirm the decision timeline. Send the pricing summary discussed last time.</dd>
                </dl>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">Behavioral profile</p>
                <dl class="kv">
                  <dt>Decides</dt><dd>Analytical. Wants proof before committing.</dd>
                  <dt>Communicates</dt><dd>Short and direct. Prefers written follow-up.</dd>
                  <dt>Cares about</dt><dd>Integration risk and timeline.</dd>
                  <dt>Watch for</dt><dd>A second stakeholder who has not been on a call.</dd>
                </dl>
                <p class="pane__basis">Based on 2 calls and 6 emails.</p>
              </div>
            </div>
            <div class="pane pane--advice">
              <p class="pane__title">Advice for the call</p>
              <ol class="advice">
                <li>Open with how the tool connects to their CRM. They asked last time.</li>
                <li>Send the written timeline before the pricing summary.</li>
                <li>Skip the feature tour. Ask who else signs off.</li>
              </ol>
            </div>
            <p class="verified"><span class="tag tag--ok">Verified</span>Each fact matched to a record before the brief was sent.</p>
          </div>
        </div>
      </div>`,

  goldmine: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Working queue', 'New business pipeline, synced to your CRM')}
          <div class="mock__body">
            <ol class="queue">
              <li class="queue__row queue__row--open">
                <div class="queue__main">
                  <span class="queue__rank">1</span>
                  <div class="queue__who"><p class="queue__name">Example Ltd</p><p class="queue__note">Next contact: Thursday, taken from the call transcript</p></div>
                  <div class="score"><span class="score__num">92</span><span class="meter"><i style="--v:92%"></i></span></div>
                </div>
                <ul class="why">
                  <li><span class="why__sign" aria-hidden="true">&uarr;</span>Replied two days ago <span class="tag">14-day hot decay</span></li>
                  <li><span class="why__sign" aria-hidden="true">&uarr;</span>Budget confirmed on the last call</li>
                  <li><span class="why__sign" aria-hidden="true">&uarr;</span>Next contact date set in the transcript</li>
                  <li class="why__neg"><span class="why__sign" aria-hidden="true">&darr;</span>Only 1 of 3 channels has answered</li>
                </ul>
              </li>
              <li class="queue__row">
                <div class="queue__main">
                  <span class="queue__rank">2</span>
                  <div class="queue__who"><p class="queue__name">Demo Inc</p><p class="queue__note">Call note says budget confirmed. Next contact Monday.</p></div>
                  <div class="score"><span class="score__num">88</span><span class="meter"><i style="--v:88%"></i></span></div>
                </div>
              </li>
              <li class="queue__row">
                <div class="queue__main">
                  <span class="queue__rank">3</span>
                  <div class="queue__who"><p class="queue__name">Sample Co <span class="tag tag--warn">3-channel ghosting</span></p><p class="queue__note">No reply on three channels, so the score is capped.</p></div>
                  <div class="score"><span class="score__num">61</span><span class="meter"><i style="--v:61%"></i></span></div>
                </div>
              </li>
            </ol>
            <p class="verified"><span class="tag tag--ok">Checked</span>Scores are checked against the CRM record before anyone sees them.</p>
          </div>
        </div>
      </div>`,

  outreach: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Draft for Alex Example', 'Awaiting approval')}
          <div class="mock__body">
            <div class="sig__cols">
              <div class="pane">
                <p class="pane__title">The draft</p>
                <p class="draft">Hi Alex,</p>
                <p class="draft">I read your note on evergreen fund structures<sup class="cite">1</sup> and saw that Example Capital opened a new vehicle in March<sup class="cite">2</sup>. [One sentence on why we are writing.]</p>
                <p class="pane__basis">Alex Example, partner at Example Capital (fictional)</p>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">Evidence, stored with the draft</p>
                <ol class="sources">
                  <li><span class="cite cite--n">1</span><p>Public note on evergreen fund structures</p><span class="tag tag--ok">Matched</span></li>
                  <li><span class="cite cite--n">2</span><p>Example Capital press release, 4 March</p><span class="tag tag--ok">Matched</span></li>
                </ol>
                <p class="pane__basis">Rule: only use a fact the contact has published.</p>
              </div>
            </div>
            <ul class="status">
              <li><span class="tag tag--ok">Evidence matched</span></li>
              <li><span class="tag tag--warn">Awaiting approval</span></li>
              <li><span class="tag">Not sent</span></li>
              <li><span class="tag">CRM handoff ready</span></li>
            </ul>
          </div>
        </div>
      </div>`,

  database: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Database audit', 'Company: Acme Ltd')}
          <div class="mock__body">
            <div class="sig__cols">
              <div class="pane">
                <p class="pane__title">Before: 3 records</p>
                <table class="dtable">
                  <thead><tr><th scope="col">Company</th><th scope="col">Country</th><th scope="col">Email</th></tr></thead>
                  <tbody>
                    <tr><td>Acme Ltd</td><td class="blank">missing</td><td>jdoe@acme.example</td></tr>
                    <tr><td>ACME limited</td><td>UK</td><td>jdoe@acme.example</td></tr>
                    <tr><td>Acme Ltd.</td><td>United Kingdom</td><td class="blank">missing</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">After: 1 record</p>
                <table class="dtable">
                  <thead><tr><th scope="col">Company</th><th scope="col">Country</th><th scope="col">Email</th></tr></thead>
                  <tbody><tr><td>Acme Ltd</td><td>United Kingdom</td><td>jdoe@acme.example</td></tr></tbody>
                </table>
                <ul class="status">
                  <li><span class="tag tag--ok">Merged 3 to 1</span></li>
                  <li><span class="tag tag--ok">Country filled</span></li>
                  <li><span class="tag tag--ok">Email validated</span></li>
                </ul>
                <p class="pane__basis">Source and validation status stored on the record.</p>
              </div>
            </div>
            <div class="pane pane--advice">
              <p class="pane__title">Exception report</p>
              <p class="pane__text"><span class="tag tag--warn">1 flagged</span>One record needs a person to decide: two possible parent companies.</p>
            </div>
          </div>
        </div>
      </div>`,

  architect: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Revenue Architect', 'Phase 4 of 6: Diagnosis')}
          <div class="phases" aria-hidden="true"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></div>
          <div class="mock__body">
            <div class="sig__cols">
              <div class="chat">
                <p class="bubble bubble--you"><span>You</span>We need more leads.</p>
                <p class="bubble bubble--ai"><span>Architect</span>Your pipeline coverage is 3.1x, at the benchmark for your stage. Leads may not be the constraint. How fast do reps follow up after a demo?</p>
                <p class="bubble bubble--you"><span>You</span>Same day, always.</p>
                <p class="bubble bubble--ai"><span>Architect</span>Your CRM shows a median of three days. Which is right? <span class="tag tag--warn">Contradiction flagged</span></p>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">Your report, one finding</p>
                <dl class="kv">
                  <dt>You named</dt><dd>Not enough leads</dd>
                  <dt>Constraint</dt><dd>Follow-up speed after demos</dd>
                  <dt>Evidence</dt><dd>Median follow-up of three days in your CRM. Coverage at benchmark.</dd>
                  <dt>Do this</dt><dd>Fix the handoff before buying more leads.</dd>
                </dl>
                <p class="pane__basis">Traced to findings 2 and 3.</p>
              </div>
            </div>
          </div>
        </div>
      </div>`,

  studio: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('QA gate', 'Landing page draft, Brand A')}
          <div class="mock__body">
            <div class="sig__cols">
              <div class="pane">
                <p class="pane__title">The draft</p>
                <p class="draft draft--h">The <mark class="hit hit--block">guaranteed returns</mark> every investor wants</p>
                <p class="draft">Our platform is <mark class="hit hit--warn">the fastest way to grow your money</mark>. Start today.</p>
              </div>
              <ol class="gate">
                <li class="gate__step gate__step--block"><p class="gate__name">1. Rules run first <span class="tag tag--block">1 blocker</span></p><p>A banned term is in the headline. Publication is held.</p></li>
                <li class="gate__step"><p class="gate__name">2. AI pass <span class="tag tag--warn">1 warning</span></p><p>The claim in paragraph two is unclear.</p></li>
                <li class="gate__step"><p class="gate__name">3. Human approval <span class="tag">Waiting</span></p><p>A person decides. Nothing has been published.</p></li>
              </ol>
            </div>
          </div>
        </div>
      </div>`
};

// ---------- per-offer data ----------

export const VISUALS = {
  outreach: {
    category: 'Pipeline',
    tagline: 'Outreach where every line has a source.',
    cardMetrics: [{ dir: 'up', name: 'Qualified conversations' }, { dir: 'down', name: 'Drafting time' }],
    h1: 'Outreach built around a real reason to write',
    lead: 'Every message is drafted from research the contact has published, and reviewed by a person before it sends.',
    moves: [{ dir: 'down', name: 'Research and drafting time' }, { dir: 'up', name: 'Follow-up consistency' }, { dir: 'up', name: 'Qualified conversations' }],
    points: [
      ['link', 'Every line has a source', 'Only facts the contact has published, stored next to the draft.'],
      ['approve', 'A person approves', 'Nothing sends without agreed controls.'],
      ['mail', 'Fits your workflow', 'Drafts in Gmail on Google Workspace, with a clear CRM handoff.']
    ],
    howTitle: 'Every claim traced to its source',
    howLead: 'Built for LP and capital outreach, founder-led outreach and targeted lead generation.',
    chipsLabel: 'Works with',
    chips: ['Gmail on Google Workspace', 'Your CRM'],
    fit: {
      yes: ['You have a defined market and an important list', 'You are a founder, fundraising team or small revenue team', 'Research, drafting and follow-up take too much of your week'],
      no: ['Your contact data is missing: start with database work', 'You need list procurement or mailbox setup: scoped separately']
    },
    includes: ['Audience and signal definition', 'Account and contact research', 'Personalization and evidence rules', 'Approval rules and Gmail setup', 'CRM handoff and documentation'],
    excludes: ['Guaranteed replies, meetings or revenue', 'Ongoing campaign operation, unless scoped', 'Deliverability fixes, unless scoped'],
    steps: ['Book a demo call', 'We check the fit against your audience and setup', 'You get a scope and price before any build'],
    price: { label: 'Pricing', amount: 'Custom scope', scope: 'Priced after a short qualification.', plain: true }
  },
  database: {
    category: 'Data foundation',
    tagline: 'Data your team can route and report on.',
    cardMetrics: [{ dir: 'down', name: 'Duplicate records' }, { dir: 'up', name: 'Field completeness' }],
    h1: 'A database your team can trust',
    lead: 'One clean record per company and contact, with the source and validation status behind each field.',
    moves: [{ dir: 'down', name: 'Duplicate records' }, { dir: 'up', name: 'Required-field completeness' }, { dir: 'down', name: 'Time to route and segment' }],
    points: [
      ['merge', 'One record per entity', 'Duplicates merged and fields normalized.'],
      ['link', 'Every field traceable', 'Source and validation status sit on the record.'],
      ['file', 'Ready to import', 'A CRM-ready file, plus an exception report for what needs a person.']
    ],
    howTitle: 'One clean record, with its source attached',
    howLead: 'Clean the records you have, or build a target-account database for a defined market.',
    chipsLabel: '',
    chips: [],
    fit: {
      yes: ['Your records are duplicated, incomplete or spread across tools', 'You need a target-account database for a defined market', 'You cannot route, segment or report reliably today'],
      no: ['You have no lawful, approved basis for the data', 'You need CRM redesign or ongoing enrichment: scoped separately']
    },
    includes: ['Source audit and schema', 'Deduplication and validation', 'Enrichment rules and provenance', 'CRM-ready import file and exception report', 'Refresh guidance'],
    excludes: ['Exhaustive coverage', 'Legal or compliance advice', 'Outreach execution'],
    steps: ['Book a demo call', 'We agree the scoping inputs: geography, volume, fields, sources', 'You get a scope and price before any build'],
    price: { label: 'Pricing', amount: 'Custom scope', scope: 'Record volume, source quality and enrichment depth set the scope.', plain: true }
  },
  goldmine: {
    category: 'CRM intelligence',
    tagline: 'Know who to call next, and why.',
    cardMetrics: [{ dir: 'up', name: 'Connectivity rate' }, { dir: 'down', name: 'Deal cycle time' }],
    h1: 'Know who to contact next',
    lead: 'A ranked working queue built from your CRM history, with the reasons behind every rank.',
    moves: [{ dir: 'up', name: 'Connectivity rate' }, { dir: 'down', name: 'Deal cycle time' }, { dir: 'up', name: 'Opportunities created' }],
    points: [
      ['queue', 'A queue reps act on', 'Every lead ranked across your pipeline.'],
      ['eye', 'Reasons you can read', 'Scoring rules written so your team can check them.'],
      ['records', 'Stays in your CRM', 'Scores write back after checks against the record.']
    ],
    howTitle: 'Every lead ranked, with the reasons shown',
    howLead: 'Built from your CRM data, web research, and call and note context.',
    chipsLabel: 'Example rules in the current build',
    chips: ['14-day hot decay', '30-day cold decay', '3-channel ghosting', 'Score floor and cap'],
    fit: {
      yes: ['Your sales or BD team has five or more reps', 'Your CRM is used daily but not fully trusted', 'You have roughly 10,000 to 20,000+ contact and deal records'],
      no: ['Your CRM is new or nearly empty: start with database work', 'You have fewer than five reps']
    },
    includes: ['A prioritized working queue', 'Readable scoring rules', 'Record checks before anyone sees output', 'Write-back to your CRM'],
    excludes: ['A net-new database build', 'Outcome promises', 'Other CRMs, unless scoped'],
    steps: ['Book a demo call', 'We look at your CRM history and tell you whether it fits', 'You choose a depth and get a fixed scope'],
    price: { tiers: true }
  },
  brief: {
    category: 'Meeting intelligence',
    tagline: 'A profile and advice before every call.',
    cardMetrics: [{ dir: 'down', name: 'Prep time' }, { dir: 'down', name: 'New-rep ramp' }],
    h1: 'Know who you are talking to, before every call',
    lead: 'A brief lands in Gmail before every external meeting: the facts, a behavioral profile of the person, and advice for the call.',
    moves: [{ dir: 'down', name: 'Pre-call prep time' }, { dir: 'down', name: 'New-rep ramp time' }],
    points: [
      ['user', 'A behavioral profile', 'How each contact decides and communicates, built from your data.'],
      ['bulb', 'Advice for the call', 'How to open, what to lead with and what to avoid.'],
      ['shield', 'Every fact checked', 'Matched to the record before a rep sees it.']
    ],
    howTitle: 'Walk in knowing the person behind the account',
    howLead: 'An overview at 08:00 and a full brief 30 minutes before each meeting, built from your calendar, CRM, calls and transcripts.',
    chipsLabel: 'Works with',
    chips: ['Google Calendar (required)', 'Gmail (required)', 'HubSpot (proven)', 'Aircall (proven)'],
    fit: {
      yes: ['Your reps take five or more calls a week', 'You work on Google Workspace (Calendar and Gmail)', 'You have a CRM and call history to draw from'],
      no: ['You are not on Google Calendar or Gmail', 'You have no real pipeline in motion yet']
    },
    includes: ['Setup and your first live brief', 'A morning overview at 08:00', 'A detailed brief 30 minutes before each meeting', 'Record checks on every fact'],
    excludes: ['Other CRMs, unless requested', 'LLM running costs, confirmed before launch'],
    steps: ['Book a demo call', 'We check your calendar, CRM and call history', 'You get a fixed setup and a first live brief'],
    price: { label: 'Fixed price', amount: '&pound;1,000 <small>fixed setup</small>', scope: 'Setup and first live brief, single team' }
  },
  architect: {
    category: 'Revenue diagnostic',
    tagline: 'Find the constraint before you spend.',
    cardMetrics: [{ dir: 'down', name: 'Guesswork' }, { dir: 'down', name: 'Time to decision' }],
    h1: 'Find the constraint you can\'t see from inside',
    lead: 'A guided diagnostic that argues with your first answer, then hands you an action plan.',
    moves: [{ dir: 'down', name: 'Time to a confident growth-priority decision' }, { dir: 'down', name: 'Guesswork before committing budget' }],
    points: [
      ['question', 'It argues back', 'Challenges your first answer before it recommends anything.'],
      ['pulse', 'Benchmarked', 'Against SaaS-stage data across four growth stages.'],
      ['link', 'Traced to findings', 'Every recommendation points to the finding behind it.']
    ],
    howTitle: 'A diagnosis that argues back',
    howLead: 'Six phases and at least 14 exchanges before a report, checked against 16 founder and operating archetypes.',
    chipsLabel: 'Runs on',
    chips: ['Gemini', 'Tavily', 'Stripe', 'Resend'],
    fit: {
      yes: ['You suspect the real problem is not what you think', 'You have real numbers to bring: revenue, team size, pipeline', 'You have 20 minutes for a real conversation'],
      no: ['You are pre-revenue, with nothing to benchmark', 'You are already certain of the root cause']
    },
    includes: ['One diagnostic conversation', 'A benchmarked report', 'An operating model', 'Recommendations traced to findings'],
    excludes: ['A bespoke build', 'A generic playbook'],
    steps: ['Run the diagnostic and check out', 'Have the conversation, about 20 minutes', 'Get your report by email'],
    price: { label: 'Fixed price', amount: '&pound;149 <small>self-serve</small>', scope: 'One diagnostic conversation and report' },
    note: 'Opens the Revenue Architect app on a separate site. Checkout is handled by Stripe.'
  },
  studio: {
    category: 'Marketing QA',
    tagline: 'Campaigns that pass QA before they publish.',
    cardMetrics: [{ dir: 'down', name: 'Review cycles' }, { dir: 'down', name: 'Time to publish' }],
    h1: 'AI campaigns that pass QA before they publish',
    lead: 'Every line is checked against your compliance or brand rules, and nothing goes live without a person approving it.',
    moves: [{ dir: 'down', name: 'Time from brief to a QA\'d campaign' }, { dir: 'down', name: 'Review cycles before sign-off' }],
    points: [
      ['shield', 'Rules run first', 'Banned terms block before any AI judgment.'],
      ['approved', 'A person signs off', 'Nothing publishes without human approval.'],
      ['layers', 'Brands stay separate', 'Voice, colours and QA rules live on the brand.']
    ],
    howTitle: 'Nothing goes live unchecked',
    howLead: 'Four agents draft the campaign and its landing pages. One QA gate decides what reaches a person. Proven on FCA COBS 4.',
    chipsLabel: 'Runs on',
    chips: ['Anthropic', 'Next.js', 'PostgreSQL', 'Vercel'],
    fit: {
      yes: ['Your outbound copy needs sign-off before it ships', 'A reviewer reviews the copy today', 'You run multiple brands, or a regulated one'],
      no: ['Nobody signs off outbound copy yet', 'You only run one-off campaigns']
    },
    includes: ['Setup and your first QA\'d campaign, live', 'Brand rules and two severity tiers', 'A campaign calendar', 'Landing pages, email and one-pagers from templates'],
    excludes: ['Sending: it stays in your email tool', 'Legal or compliance sign-off', 'Publishing without approval'],
    steps: ['Book a demo call', 'We review your rules and how copy gets signed off', 'You get a fixed build and a first live campaign'],
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

const li = (items) => items.map((t) => `<li>${esc(t)}</li>`).join('\n            ');
const dirWord = (dir) => (dir === 'down' ? 'lower' : 'higher');
const moveItem = (m) => `<li><span class="moves__dir" aria-hidden="true">${icon(m.dir)}</span>${esc(m.name)}<span class="sr-only"> (target: ${dirWord(m.dir)})</span></li>`;

// ---------- the three blocks of an offer page ----------

function renderHero(id) {
  const v = VISUALS[id];
  const offer = routes.offers[id];
  return `<section class="hero hero--offer" aria-labelledby="hero-h">
    <div class="wrap">
      <p class="crumb"><a class="text-link" href="${routes.pages.marketplace}">&larr; Marketplace</a></p>
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${esc(offer.name)}</p>
          <h1 id="hero-h">${esc(v.h1)}</h1>
          <p class="lead">${esc(v.lead)}</p>
          <div class="moves">
            <p class="moves__label">Built to move</p>
            <ul class="moves__list">
              ${v.moves.map(moveItem).join('\n              ')}
            </ul>
          </div>
          <div class="price-line">
            <span class="chip chip--lime">${esc(offer.price)}</span>
            ${actionLink(id, 'btn btn--primary')}
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <img class="hero-mark" src="assets/mark.svg" alt="" width="229" height="77">
        </div>
      </div>
      <ul class="points">
        ${v.points.map(([ic, t, x]) => `<li><span class="points__icon">${icon(ic)}</span><strong>${esc(t)}</strong><span>${esc(x)}</span></li>`).join('\n        ')}
      </ul>
    </div>
  </section>`;
}

function renderHow(id) {
  const v = VISUALS[id];
  const foot = v.chips.length
    ? `\n      <div class="sig__foot">\n        <p class="sig__label">${esc(v.chipsLabel)}</p>\n        <ul class="sig__chips">\n          ${li(v.chips)}\n        </ul>\n      </div>`
    : '';
  return `<section class="section" id="how" aria-labelledby="how-h">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">How it works</p>
        <h2 id="how-h">${esc(v.howTitle)}</h2>
        <p class="lead">${esc(v.howLead)}</p>
      </div>
      <div class="sig">
      ${SIG[id]}${foot}
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
        <h2 id="fit-h">Is it right for you?</h2>
      </div>
      <div class="fit-layout">
        <div class="fit-grid">
          <article class="fbox fbox--yes">
            <h3>Right for you if</h3>
            <ul class="checks">
            ${li(v.fit.yes)}
            </ul>
          </article>
          <article class="fbox fbox--no">
            <h3>Not yet if</h3>
            <ul class="crosses">
            ${li(v.fit.no)}
            </ul>
          </article>
          <article class="fbox">
            <h3>Included</h3>
            <ul class="checks">
            ${li(v.includes)}
            </ul>
          </article>
          <article class="fbox">
            <h3>Not included</h3>
            <ul class="crosses">
            ${li(v.excludes)}
            </ul>
          </article>
        </div>
        <article class="fitcard fitcard--price">
          <h3>Price</h3>
          ${priceBlock(v)}
          ${actionLink(id, 'btn btn--primary')}
          <div class="start">
            <p class="start__label">How it starts</p>
            <ol class="start__list">
              ${li(v.steps)}
            </ol>
          </div>
          ${v.note ? `<p class="small">${esc(v.note)}</p>` : ''}
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
        <ul class="mkt-card__moves">
          ${v.cardMetrics.map(moveItem).join('\n          ')}
        </ul>
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

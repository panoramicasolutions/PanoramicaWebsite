// Offer visuals: one data entry per offer feeds its diagram, its metrics and its marketplace showcase.
// Pages carry marker comments and tools/sync-shell.mjs stamps the generated HTML between them.
//   <!-- offer-section:brief -->...<!-- /offer-section:brief -->   diagram + metrics section on the offer page
//   <!-- showcases:start -->...<!-- showcases:end -->              every offer, on the marketplace
import { routes } from './shell.mjs';
import { icon } from './icons.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Order here is the order on the marketplace.
export const OFFER_ORDER = ['outreach', 'database', 'goldmine', 'brief', 'architect', 'studio'];

export const VISUALS = {
  outreach: {
    category: 'Pipeline',
    does: 'Hyper-personalized outreach for LPs, founders and target accounts, built on research and reviewed before it sends.',
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
    chips: [],
    metrics: [
      { dir: 'down', name: 'Research and drafting time' },
      { dir: 'up', name: 'Follow-up consistency' },
      { dir: 'up', name: 'Qualified conversations' }
    ],
    price: { label: 'Pricing', amount: 'Custom scope', scope: 'Priced after a short qualification.', plain: true }
  },
  database: {
    category: 'Data foundation',
    does: 'Clean and document the records you have, or build a target-account database for a defined market.',
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
    chips: ['No promise of exhaustive coverage'],
    metrics: [
      { dir: 'down', name: 'Duplicate records' },
      { dir: 'up', name: 'Required-field completeness' },
      { dir: 'down', name: 'Time to route and segment' }
    ],
    price: { label: 'Pricing', amount: 'Custom scope', scope: 'Record volume, source quality and enrichment depth set the scope.', plain: true }
  },
  goldmine: {
    category: 'CRM intelligence',
    does: 'Turns CRM history into a prioritized working queue, with rules your team can read and check.',
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
    chips: ['14-day hot decay', '30-day cold decay', '3-channel ghosting', 'Score floor and cap', 'Checked against the CRM record first'],
    metrics: [
      { dir: 'up', name: 'Connectivity rate' },
      { dir: 'down', name: 'Deal cycle time' },
      { dir: 'up', name: 'Opportunities created' }
    ],
    price: { tiers: true }
  },
  brief: {
    category: 'Meeting intelligence',
    does: 'An account brief in Gmail before every external meeting, built from your calendar, CRM and call history.',
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
      { icon: 'clock', text: 'Detailed brief 30 minutes before each meeting' }
    ],
    chips: ['Checked against the record before a rep sees it', 'Needs Google Workspace'],
    metrics: [
      { dir: 'down', name: 'Pre-call prep time' },
      { dir: 'down', name: 'New-rep ramp time' }
    ],
    price: { label: 'Fixed price', amount: '&pound;1,000 <small>fixed setup</small>', scope: 'Setup and first live brief, single team' }
  },
  architect: {
    category: 'Revenue diagnostic',
    does: 'A guided diagnostic that finds the real constraint on your growth and hands you a report built around it.',
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
    chips: ['Benchmarked across four growth stages', 'Checked against 16 archetypes', 'At least 14 exchanges before a report', 'Self-serve, on a separate site'],
    metrics: [
      { dir: 'down', name: 'Time to a confident growth-priority decision' },
      { dir: 'down', name: 'Guesswork before committing budget' }
    ],
    price: { label: 'Fixed price', amount: '&pound;149 <small>self-serve</small>', scope: 'One diagnostic conversation and report' }
  },
  studio: {
    category: 'Marketing QA',
    does: 'Campaigns created and checked against your rules before sign-off.',
    title: 'Four agents, one QA gate',
    kind: 'chain',
    label: 'How The Studio takes a campaign from research to a live page',
    nodes: [
      { icon: 'search', title: 'Research' },
      { icon: 'compass', title: 'Strategy' },
      { icon: 'pen', title: 'Copywriter' },
      { icon: 'shield', title: 'QA check', text: 'Banned terms block first. AI judges accuracy, clarity and brand.' },
      { icon: 'approved', title: 'Human approval', tag: 'Nothing publishes without it' },
      { icon: 'browser', title: 'Live page', text: 'On an isolated deploy' }
    ],
    chips: ['Proven on FCA COBS 4', 'Rule set swappable for your own', 'It does not send anything'],
    metrics: [
      { dir: 'down', name: 'Time from brief to a QA\'d, ready-to-publish campaign' },
      { dir: 'down', name: 'Review cycles before sign-off' }
    ],
    price: { label: 'Fixed price', amount: '&pound;7,500 <small>fixed build</small>', scope: 'Setup and first QA\'d campaign' }
  }
};

const chips = (v) => (v.chips && v.chips.length
  ? `\n    <ul class="viz__chips">\n      ${v.chips.map((c) => `<li>${esc(c)}</li>`).join('\n      ')}\n    </ul>`
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
    <p class="metrics__note">Targets only. Results depend on your data.</p>
  </div>`;
}

export function renderOfferSection(id) {
  const v = VISUALS[id];
  return `<section class="section" id="how" aria-labelledby="mech-h">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">How it works</p>
        <h2 id="mech-h">${esc(v.title)}</h2>
      </div>
      ${renderVisual(id)}
      ${renderMetrics(id)}
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

export function renderShowcase(id) {
  const v = VISUALS[id];
  const offer = routes.offers[id];
  const href = routes.pages[offer.page];
  return `      <article class="showcase" id="${id}">
        <header class="showcase__head">
          <span class="emblem emblem--lg"><img src="assets/mark.svg" alt="" width="62" height="21"></span>
          <div class="showcase__id">
            <p class="showcase__cat">${esc(v.category)}</p>
            <h3 class="showcase__name"><a href="${href}">${esc(offer.name)}</a></h3>
            <p class="showcase__does">${esc(v.does)}</p>
          </div>
          <div class="showcase__price">
        ${priceBlock(v)}
          </div>
        </header>
        ${renderVisual(id)}
        <div class="showcase__foot">
          ${renderMetrics(id)}
          <a class="btn btn--primary" href="${href}">View the offer<span class="sr-only">: ${esc(offer.name)}</span></a>
        </div>
      </article>`;
}

export function renderShowcases() {
  return `<!-- showcases:start -->\n${OFFER_ORDER.map(renderShowcase).join('\n')}\n      <!-- showcases:end -->`;
}

const showcaseBlock = /<!-- showcases:start -->[\s\S]*?<!-- showcases:end -->/;
const sectionBlock = /<!-- offer-section:([a-z]+) -->[\s\S]*?<!-- \/offer-section:\1 -->/g;

export const hasVisuals = (html) => showcaseBlock.test(html) || /<!-- offer-section:[a-z]+ -->/.test(html);

export function applyVisuals(html) {
  return html
    .replace(showcaseBlock, () => renderShowcases())
    .replace(sectionBlock, (_all, id) => `<!-- offer-section:${id} -->\n  ${renderOfferSection(id)}\n  <!-- /offer-section:${id} -->`);
}

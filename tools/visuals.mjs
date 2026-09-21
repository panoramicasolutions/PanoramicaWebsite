// Offer pages and service cards, generated from one data entry per offer.
// Every offer page has the same four blocks, written from the client's side:
//   1. the result (hero: outcome, what it is built to move, three selling points)
//   2. how it works (a direct visual explanation that is specific to the offer)
//   3. what we build (a build map: inputs, engine, outputs, controls; then what we need and what is excluded)
//   4. does it fit (a short tick-list check with a verdict, plus price and how it starts)
//   then a short FAQ and Service and FAQPage structured data
// Pages carry marker comments and tools/sync-shell.mjs stamps the generated HTML between them.
//   <!-- offer-page:brief -->...<!-- /offer-page:brief -->   the whole body of an offer page
//   <!-- cards:start -->...<!-- cards:end -->                the compact grid on the services page
import { routes } from './shell.mjs';
import { icon } from './icons.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const NEW_TAB = '<span class="sr-only"> (opens in a new tab)</span>';
const LABEL = '<p class="example__label">Example - not client data.</p>';
const BAR = (title, meta) => `<div class="mock__bar"><span class="mock__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="mock__title">${title}</span><span class="mock__meta">${meta}</span></div>`;
const N = (n) => `<span class="cite cite--n" aria-label="from field ${n}">${n}</span>`;

// Order here is the order on the services page.
export const OFFER_ORDER = ['outreach', 'database', 'goldmine', 'brief', 'architect', 'studio'];

// ---------- direct visual explanations: one per offer, each drawn differently ----------

const SIG = {
  // Many datapoints in, one ranked list out.
  goldmine: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Goldmine, daily run', 'Your CRM plus outside research')}
          <div class="mock__body">
            <div class="xflow">
              <div class="xcol">
                <p class="pane__title">1. Datapoints crossed</p>
                <ul class="sigs">
                  <li>${icon('records')}<span><strong>CRM history</strong>Status, deals, activity</span></li>
                  <li>${icon('phone')}<span><strong>Calls and emails</strong>Connects, replies, ignored sends</span></li>
                  <li>${icon('transcript')}<span><strong>Notes and transcripts</strong>Sentiment, next-contact dates</span></li>
                  <li>${icon('search')}<span><strong>Outside research</strong>Web and news on the person</span></li>
                </ul>
              </div>
              <div class="xarrow" aria-hidden="true"></div>
              <div class="xcol xcol--engine">
                <p class="pane__title">2. Scored</p>
                <p class="bignum"><span>20+</span> signals per lead</p>
                <ul class="rules">
                  <li><span class="why__sign" aria-hidden="true">&uarr;</span>Recent activity counts more than old</li>
                  <li class="why__neg"><span class="why__sign" aria-hidden="true">&darr;</span>Silence on every channel caps the score</li>
                  <li><span class="why__sign" aria-hidden="true">&uarr;</span>A live pursuit holds a floor</li>
                </ul>
                <p class="pane__basis">Then one read per lead: why now, two openers, the main objection.</p>
              </div>
              <div class="xarrow" aria-hidden="true"></div>
              <div class="xcol">
                <p class="pane__title">3. Delivered daily</p>
                <ol class="queue">
                  <li class="queue__row queue__row--open">
                    <div class="queue__main">
                      <span class="queue__rank">1</span>
                      <div class="queue__who"><p class="queue__name">Example Ltd</p></div>
                      <div class="score"><span class="score__num">92</span><span class="meter"><i style="--v:92%"></i></span></div>
                    </div>
                    <p class="queue__why"><strong>Why now</strong>Replied two days ago. Budget confirmed on the last call.</p>
                    <p class="queue__why"><strong>Open with</strong>The integration question they asked.</p>
                  </li>
                  <li class="queue__row">
                    <div class="queue__main">
                      <span class="queue__rank">2</span>
                      <div class="queue__who"><p class="queue__name">Demo Inc</p></div>
                      <div class="score"><span class="score__num">88</span><span class="meter"><i style="--v:88%"></i></span></div>
                    </div>
                  </li>
                  <li class="queue__row">
                    <div class="queue__main">
                      <span class="queue__rank">3</span>
                      <div class="queue__who"><p class="queue__name">Sample Co</p></div>
                      <div class="score"><span class="score__num">61</span><span class="meter"><i style="--v:61%"></i></span></div>
                    </div>
                    <p class="queue__why"><span class="tag tag--warn">Three channels silent</span></p>
                  </li>
                </ol>
              </div>
            </div>
            <p class="verified"><span class="tag tag--ok">Checked</span>Every score is checked against the CRM record before anyone sees it.</p>
          </div>
        </div>
      </div>`,

  // One database row becomes one email; each sentence is tied to a field.
  outreach: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Draft for Alex Example', 'Written from one database row')}
          <div class="mock__body">
            <div class="sig__cols">
              <div class="pane">
                <p class="pane__title">The database row</p>
                <ol class="fields">
                  <li>${N(1)}<span class="fields__k">Role</span><span>Head of partnerships</span></li>
                  <li>${N(2)}<span class="fields__k">Specialty</span><span>Payments infrastructure</span></li>
                  <li>${N(3)}<span class="fields__k">Size tier</span><span>Small (11 to 50)</span></li>
                  <li>${N(4)}<span class="fields__k">Peer proof</span><span>Example Peer Ltd, confirmed</span></li>
                  <li>${N(5)}<span class="fields__k">Buying role</span><span>Decision-maker</span></li>
                </ol>
                <p class="pane__basis">When a field is unknown, the email leaves it out instead of guessing.</p>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">The email it becomes</p>
                <p class="draft">Hi Alex,</p>
                <p class="draft">Most <span class="hitn"><mark class="hit hit--field">heads of partnerships</mark>${N(1)}</span> in <span class="hitn"><mark class="hit hit--field">payments infrastructure</mark>${N(2)}</span> still handle this by hand. <span class="hitn"><mark class="hit hit--field">Example Peer Ltd</mark>${N(4)}</span> has already moved.</p>
                <p class="draft">For <span class="hitn"><mark class="hit hit--field">a team your size</mark>${N(3)}</span>, it is worth doing once, properly. <span class="hitn"><mark class="hit hit--field">Worth a quick call this week</mark>${N(5)}</span> to see if it is relevant for Example Ltd?</p>
              </div>
            </div>
            <ol class="rail">
              <li>${icon('pen')}<strong>Written</strong><span>One model call per contact</span></li>
              <li>${icon('shield')}<strong>Checked</strong><span>Length, banned phrases, required details</span></li>
              <li>${icon('approve')}<strong>Reviewed</strong><span>A person approves before it sends</span></li>
              <li>${icon('send')}<strong>Sent</strong><span>From domains you own, paced by warm-up</span></li>
              <li>${icon('pulse')}<strong>Followed</strong><span>A reply stops the sequence</span></li>
            </ol>
          </div>
        </div>
      </div>`,

  // A name becomes a record ready to convert, built up in four steps.
  database: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Data foundation', 'One record, built up')}
          <div class="mock__body">
            <ol class="recs">
              <li class="rec">
                <p class="rec__step"><span>1</span>Sourced</p>
                <dl class="rec__rows">
                  <dt>Company</dt><dd class="rec__new">Example Ltd</dd>
                  <dt>Industry</dt><dd class="rec__empty">empty</dd>
                  <dt>HQ</dt><dd class="rec__empty">empty</dd>
                  <dt>Size</dt><dd class="rec__empty">empty</dd>
                  <dt>Role</dt><dd class="rec__empty">empty</dd>
                  <dt>Tier</dt><dd class="rec__empty">empty</dd>
                </dl>
                <p class="rec__note">Found because it matches your ideal customer.</p>
              </li>
              <li class="rec">
                <p class="rec__step"><span>2</span>Enriched</p>
                <dl class="rec__rows">
                  <dt>Company</dt><dd>Example Ltd</dd>
                  <dt>Industry</dt><dd class="rec__new">Payments</dd>
                  <dt>HQ</dt><dd class="rec__new">Ireland</dd>
                  <dt>Size</dt><dd class="rec__new">11 to 50</dd>
                  <dt>Role</dt><dd class="rec__empty">empty</dd>
                  <dt>Tier</dt><dd class="rec__empty">empty</dd>
                </dl>
                <p class="rec__note">Fields set by your strategy.</p>
              </li>
              <li class="rec">
                <p class="rec__step"><span>3</span>Verified</p>
                <dl class="rec__rows">
                  <dt>Company</dt><dd>Example Ltd</dd>
                  <dt>Industry</dt><dd>Payments</dd>
                  <dt>HQ</dt><dd>Ireland</dd>
                  <dt>Size</dt><dd>11 to 50 <span class="tag tag--ok">2 sources agree</span></dd>
                  <dt>Role</dt><dd class="rec__empty">empty</dd>
                  <dt>Tier</dt><dd class="rec__empty">empty</dd>
                </dl>
                <p class="rec__note">Where sources disagree, the field stays blank.</p>
              </li>
              <li class="rec rec--done">
                <p class="rec__step"><span>4</span>Ready to convert</p>
                <dl class="rec__rows">
                  <dt>Company</dt><dd>Example Ltd</dd>
                  <dt>Industry</dt><dd>Payments</dd>
                  <dt>HQ</dt><dd>Ireland</dd>
                  <dt>Size</dt><dd>11 to 50</dd>
                  <dt>Role</dt><dd class="rec__new">Decision-maker</dd>
                  <dt>Tier</dt><dd class="rec__new">High</dd>
                </dl>
                <p class="rec__note"><span class="tag tag--ok">Deduplicated</span> <span class="tag tag--ok">Loaded to CRM</span></p>
              </li>
            </ol>
          </div>
        </div>
      </div>`,

  // What the rep gets, and when.
  brief: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Inbox', 'Two emails a day, per rep')}
          <div class="mock__body">
            <ol class="timeline">
              <li><span class="timeline__time">08:00</span><span>Overview of every meeting today</span></li>
              <li><span class="timeline__time">13:30</span><span>Full brief for the 14:00 call</span></li>
              <li><span class="timeline__time">14:00</span><span>The call, with the profile in hand</span></li>
            </ol>
            <p class="mail__subject">Brief: intro call with Jordan Example (14:00)</p>
            <p class="built"><span class="built__label">Built from</span><span class="tag">CRM</span><span class="tag">Past calls</span><span class="tag">Transcripts</span><span class="tag">Calendar</span><span class="tag">Company news</span></p>
            <div class="bgrid">
              <div class="pane">
                <p class="pane__title">Who</p>
                <p class="pane__text">Jordan Example, head of operations at Example Ltd (fictional). In discovery. Last call: asked how it connects to their CRM.</p>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">Profile</p>
                <p class="pane__text">Analytical. Wants proof before committing. Short and direct, prefers written follow-up.</p>
                <p class="pane__basis">Based on 2 calls and 6 emails.</p>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">The play</p>
                <p class="pane__text">Open with the CRM connection. Send the written timeline before pricing.</p>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">The words</p>
                <p class="pane__text">Say: "Here is exactly how it connects." Skip the feature tour.</p>
              </div>
              <div class="pane">
                <p class="pane__title">Objections</p>
                <p class="pane__text">Integration risk: show the steps. A second signer has not been on a call: ask who else decides.</p>
              </div>
              <div class="pane">
                <p class="pane__title">One goal</p>
                <p class="pane__text">Agree the decision timeline.</p>
              </div>
            </div>
            <p class="verified"><span class="tag tag--ok">Verified</span>Each fact is matched to a record. Thin data gets a short brief instead of a guess.</p>
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

  // One brief becomes a campaign kit, checked and held for approval.
  studio: `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Marketing Studio', 'One brief, one campaign kit')}
          <div class="mock__body">
            <div class="studio">
              <div class="pane">
                <p class="pane__title">The brief</p>
                <dl class="kv kv--tight">
                  <dt>Channel</dt><dd>LinkedIn</dd>
                  <dt>Audience</dt><dd>Enterprise leads</dd>
                  <dt>Goal</dt><dd>Download the guide</dd>
                  <dt>Length</dt><dd>4 weeks, 2 posts a week</dd>
                  <dt>Brand</dt><dd>Brand A voice and colours</dd>
                </dl>
              </div>
              <ul class="kit">
                <li><span class="thumb thumb--card" aria-hidden="true"><i class="t-line t-line--s"></i><i class="t-line t-line--h"></i><i class="t-line t-line--h t-line--m"></i><b class="t-block"></b></span><span class="kit__name">Social images</span></li>
                <li><span class="thumb thumb--stack" aria-hidden="true"><b></b><b></b><b></b></span><span class="kit__name">Carousels</span></li>
                <li><span class="thumb thumb--page" aria-hidden="true"><i class="t-line t-line--h"></i><i class="t-line"></i><i class="t-line"></i><b class="t-chart"><i></i><i></i><i></i><i></i></b></span><span class="kit__name">PDFs and one-pagers</span></li>
                <li><span class="thumb thumb--web" aria-hidden="true"><em><i></i><i></i><i></i></em><i class="t-line t-line--h"></i><i class="t-line t-line--m"></i><b class="t-btn"></b></span><span class="kit__name">Landing pages</span></li>
                <li><span class="thumb thumb--mail" aria-hidden="true"><i class="t-line t-line--s"></i><i class="t-line"></i><i class="t-line"></i><i class="t-line t-line--m"></i><b class="t-btn"></b></span><span class="kit__name">Emails</span></li>
                <li><span class="thumb thumb--cal" aria-hidden="true"><i></i><i></i><i class="on"></i><i></i><i></i><i class="on"></i><i></i><i></i><i></i><i class="on"></i><i></i><i></i><i class="on"></i><i></i><i></i><i></i><i class="on"></i><i></i><i></i><i class="on"></i><i></i><i></i><i></i><i class="on"></i><i></i><i></i><i class="on"></i><i></i></span><span class="kit__name">Campaign calendar</span></li>
              </ul>
            </div>
            <ol class="gate gate--row">
              <li class="gate__step gate__step--block"><p class="gate__name">1. Rules run first <span class="tag tag--block">1 held</span></p><p>A banned term is held before any AI judgment.</p></li>
              <li class="gate__step"><p class="gate__name">2. AI pass <span class="tag tag--warn">1 flag</span></p><p>Claims that read as unclear are flagged.</p></li>
              <li class="gate__step"><p class="gate__name">3. A person approves <span class="tag">Waiting</span></p><p>Nothing publishes until someone signs off.</p></li>
            </ol>
          </div>
        </div>
      </div>`
};

// ---------- per-offer data ----------

const VERDICT = ['Tick the ones that apply to see a verdict.', 'Possible. Book a call and we will check the rest.', 'Likely a fit. A demo call will confirm it.', 'A strong fit. Book a demo call.'];
const VERDICT_SOON = ['Tick the ones that apply to see a verdict.', 'Possible. It opens soon.', 'Likely a fit. It opens soon.', 'A strong fit. It opens soon.'];

export const VISUALS = {
  outreach: {
    category: 'Pipeline',
    tagline: 'Every email written from your own data.',
    cardMetrics: [{ dir: 'up', name: 'Qualified conversations' }, { dir: 'down', name: 'Drafting time' }],
    h1: 'Outreach that reads like it was written for one person',
    lead: 'A model writes each email from what your database knows about the contact, and sends it from domains and accounts you own.',
    moves: [{ dir: 'down', name: 'Research and drafting time' }, { dir: 'up', name: 'Follow-up consistency' }, { dir: 'up', name: 'Qualified conversations' }],
    points: [
      ['records', 'Personalized from your data', 'Every sentence ties back to a field in the database.'],
      ['cloud', 'Owned infrastructure', 'It runs on your domains, accounts and cloud, not a shared outreach tool.'],
      ['shield', 'Checked before it sends', 'Rules catch banned phrases and wrong lengths. A person reviews.']
    ],
    howTitle: 'Every sentence comes from a field in your data',
    howLead: 'The database sets what we know about each person. A model writes the email from it, and your own domains send it.',
    chipsLabel: 'Works with',
    chips: ['Gmail on Google Workspace', 'Your CRM'],
    buildLead: 'Built on the data foundation, run on infrastructure you own.',
    build: {
      inputs: [['records', 'Your database', 'Fields from the data foundation'], ['pen', 'Your offer and voice', 'What you say, and how'], ['shield', 'Your exclusions', 'Suppression and do-not-contact lists']],
      engine: [['pen', 'One model call per contact', 'Written from that contact\'s fields'], ['shield', 'Quality rules', 'Length, banned phrases, required details, retries'], ['clock', 'Sequence logic', 'Follow-ups on a schedule you set']],
      outputs: [['approve', 'Drafts to approve', 'Reviewed before anything sends'], ['send', 'Paced sending', 'Weekday windows, warm-up per domain'], ['pulse', 'Replies and intent', 'Replies stop the sequence, opens reach your CRM']],
      controls: [['cloud', 'Your infrastructure', 'Your domains, accounts and cloud'], ['approve', 'A person approves', 'Before the first send'], ['lock', 'Stop rules', 'Repliers never get another email']]
    },
    needs: ['A database, or the data foundation first', 'Sending domains and DNS access', 'A Google Workspace mailbox for replies', 'Your offer, proof points and examples of your tone'],
    excludes: ['Guaranteed replies, meetings or revenue', 'Buying lists on your behalf', 'Ongoing operation, unless scoped', 'Deliverability fixes, unless scoped'],
    fit: {
      statements: ['You have a defined market and a list worth writing to', 'You are a founder, fundraising team or small revenue team', 'Research, drafting and follow-up take too much of your week'],
      notYet: 'Not yet if your contact data is thin. Start with the data foundation.'
    },
    steps: ['Book a demo call', 'We check the fit against your audience and setup', 'You get a scope and price before any build'],
    price: { label: 'Pricing', amount: 'Custom scope', scope: 'Priced after a short qualification.', plain: true }
  },
  database: {
    category: 'Data foundation',
    tagline: 'A client pool, built and ready to convert.',
    cardMetrics: [{ dir: 'down', name: 'Duplicate records' }, { dir: 'up', name: 'Field completeness' }],
    h1: 'A client pool, built and ready to convert',
    lead: 'We define who you sell to, then source, enrich, verify, deduplicate and score the companies and contacts, and load them into your CRM.',
    moves: [{ dir: 'down', name: 'Duplicate records' }, { dir: 'up', name: 'Required-field completeness' }, { dir: 'down', name: 'Time to route and segment' }],
    points: [
      ['dig', 'Built, not just cleaned', 'New companies and contacts, sourced against your ideal customer.'],
      ['layers', 'Enriched to your strategy', 'The fields we add depend on how you sell.'],
      ['shield', 'Verified, not guessed', 'A value is recorded only when sources agree. Otherwise it stays blank.']
    ],
    howTitle: 'From a name to a record ready to convert',
    howLead: 'We define who you sell to, find them, and build each record up until it is safe to route and write to.',
    chipsLabel: '',
    chips: [],
    buildLead: 'Start from nothing, or from the data you already have.',
    build: {
      inputs: [['target', 'Your ideal customer', 'Who you sell to, and who buys'], ['records', 'Your current data', 'CRM exports, lists, spreadsheets'], ['globe', 'Public sources', 'Web research and data providers']],
      engine: [['dig', 'Sourcing', 'New companies and contacts that match'], ['layers', 'Enrichment', 'Fields set by your strategy'], ['merge', 'Verify and deduplicate', 'Values kept only when sources agree']],
      outputs: [['funnel', 'A scored pool', 'Tiers, buying roles, segments'], ['file', 'A CRM-ready import', 'Loaded into your CRM'], ['report', 'An exception report', 'What needs a person to decide']],
      controls: [['link', 'Source on every field', 'Provenance kept on the record'], ['shield', 'Your exclusions', 'Do-not-contact lists applied'], ['clock', 'Refresh guidance', 'How to keep the pool current']]
    },
    needs: ['Your ideal customer profile, or a session to define it', 'Your current data and exports', 'Do-not-contact and customer lists', 'CRM access for the load'],
    excludes: ['Exhaustive market coverage', 'Legal or compliance advice', 'Outreach execution', 'Ongoing enrichment, unless scoped'],
    fit: {
      statements: ['Your records are duplicated, incomplete or spread across tools', 'You need a target-account list for a defined market', 'You cannot route, segment or report reliably today'],
      notYet: 'Not yet if you have no lawful basis for the data you want to hold.'
    },
    steps: ['Book a demo call', 'We agree the scoping inputs: geography, volume, fields, sources', 'You get a scope and price before any build'],
    price: { label: 'Pricing', amount: 'Custom scope', scope: 'Record volume, source quality and enrichment depth set the scope.', plain: true }
  },
  goldmine: {
    category: 'CRM intelligence',
    tagline: 'A ranked call list, every day.',
    cardMetrics: [{ dir: 'up', name: 'Connectivity rate' }, { dir: 'down', name: 'Deal cycle time' }],
    h1: 'Know who to call next, and why',
    lead: 'Goldmine cross-references your CRM history, calls, emails and notes on every lead, adds outside research, and delivers a ranked queue every day.',
    moves: [{ dir: 'up', name: 'Connectivity rate' }, { dir: 'down', name: 'Deal cycle time' }, { dir: 'up', name: 'Opportunities created' }],
    points: [
      ['layers', 'Datapoints no team can hold', '20+ signals per lead, crossed automatically.'],
      ['search', 'Research done for you', 'Outside research runs in the background and feeds the score.'],
      ['clock', 'Delivered daily', 'A fresh ranked queue, with the reasons and an opener.']
    ],
    howTitle: 'More signals than a person can hold, crossed for you',
    howLead: 'Every lead is scored across your CRM, calls, emails, notes and outside research. The ranked list arrives every day.',
    chipsLabel: 'Example rules in the current build',
    chips: ['14-day hot decay', '30-day cold decay', '3-channel ghosting', 'Score floor and cap'],
    buildLead: 'It reads your CRM, scores on rules your team can read, and writes the result back.',
    build: {
      inputs: [['records', 'Your CRM', 'Deals, contacts, stages, notes'], ['phone', 'Calls and emails', 'Outcomes, replies, ignored sends'], ['transcript', 'Notes and transcripts', 'Sentiment, next-contact dates'], ['search', 'Outside research', 'Web and news. Full Build and up']],
      engine: [['layers', 'Signal scoring', '0 to 100, with decay, floors and caps'], ['clock', 'Ghosting rules', 'Silence on every channel caps the score'], ['bulb', 'One AI read per lead', 'Why now, openers, objection. Full Build and up']],
      outputs: [['queue', 'A ranked daily queue', 'Every lead, in order'], ['chat', 'Why now, what to say', 'The angle and the openers'], ['records', 'Scores in your CRM', 'Written back after record checks']],
      controls: [['eye', 'Rules you can read', 'Written so your team can check them'], ['shield', 'Record checks', 'Each score verified before anyone sees it'], ['sliders', 'Depth you choose', 'Core, Full Build or Extended']]
    },
    needs: ['Read and write access to your CRM (HubSpot)', 'A sales lead who owns the pipeline and agrees the scoring rules', 'Call and email history logged in the CRM'],
    excludes: ['A net-new database build', 'Outcome promises', 'Other CRMs, unless scoped'],
    fit: {
      statements: ['Your sales team has five or more reps', 'You use your CRM daily but do not fully trust it', 'You hold roughly 10,000 or more contact and deal records'],
      notYet: 'Not yet if your CRM is new or nearly empty, or you have fewer than five reps.'
    },
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
      ['user', 'A behavioral profile', 'How each contact decides, communicates and objects.'],
      ['bulb', 'The play and the words', 'How to open, what to say and what to avoid.'],
      ['shield', 'Every fact checked', 'Matched to the record before a rep sees it.']
    ],
    howTitle: 'Walk in knowing the person behind the account',
    howLead: 'An overview at 08:00 and a full brief 30 minutes before each meeting, built from your calendar, CRM, calls and transcripts.',
    chipsLabel: 'Works with',
    chips: ['Google Calendar (required)', 'Gmail (required)', 'HubSpot (proven)', 'Aircall (proven)'],
    buildLead: 'Built from your calendar, CRM and calls, delivered to your reps in Gmail.',
    build: {
      inputs: [['calendar', 'Google Calendar', 'Which external meetings are coming'], ['records', 'Your CRM', 'HubSpot records and deal stage'], ['phone', 'Calls and transcripts', 'Aircall history, Meet transcripts, notes'], ['globe', 'Company research', 'Their site and recent news']],
      engine: [['user', 'Behavioral profile', 'How they decide, communicate and object'], ['layers', 'Source weighting', 'Transcripts count above notes, notes above emails'], ['bulb', 'The play and the words', 'What to lead with, say and avoid']],
      outputs: [['mail', '08:00 overview', 'Every meeting that day, one email'], ['clock', 'Brief 30 minutes before', 'Six sections, in Gmail'], ['target', 'One goal per call', 'A single outcome to aim for']],
      controls: [['shield', 'Facts checked', 'Matched to the record before sending'], ['eye', 'Thin data, short brief', 'No profile is invented'], ['lock', 'For your rep only', 'Never sent to the contact']]
    },
    needs: ['Google Workspace: Calendar and Gmail', 'CRM and call access (HubSpot and Aircall proven)', 'A rep to review the first live brief'],
    excludes: ['Other CRMs, unless requested', 'LLM running costs, confirmed before launch'],
    fit: {
      statements: ['Your reps take five or more calls a week', 'You work on Google Workspace: Calendar and Gmail', 'You have a CRM and call history to draw from'],
      notYet: 'Not yet if you are not on Google Workspace, or have no pipeline in motion.'
    },
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
    buildLead: 'A self-serve conversation that ends in a report you can act on.',
    build: {
      inputs: [['chat', 'Your answers', 'A guided conversation'], ['table', 'Your numbers', 'Revenue, team size, pipeline'], ['search', 'Live research', 'Checked against the web']],
      engine: [['question', 'Six phases', 'At least 14 exchanges'], ['pulse', 'A challenge layer', 'Flags where your answers disagree'], ['compass', 'Benchmarks', 'Four growth stages, 16 archetypes']],
      outputs: [['report', 'A diagnosis report', 'The constraint, named'], ['layers', 'An operating model', 'How the fix fits together'], ['link', 'Traced recommendations', 'Each linked to its finding']],
      controls: [['link', 'Traced to findings', 'Every recommendation shows its evidence'], ['approved', 'Contradictions shown', 'Flagged, not smoothed over'], ['mail', 'Sent by email', 'The report goes to your inbox']]
    },
    needs: ['About 20 minutes of your time', 'Real numbers to hand: revenue, team size, pipeline'],
    excludes: ['A bespoke build', 'A generic playbook'],
    fit: {
      statements: ['You suspect the real problem is not what you think', 'You have real numbers to bring: revenue, team size, pipeline', 'You have 20 minutes for a real conversation'],
      notYet: 'Not yet if you are pre-revenue, or already certain of the root cause.'
    },
    steps: ['Start the diagnostic and check out', 'Have the conversation, about 20 minutes', 'Get your report by email'],
    price: { label: 'Fixed price', amount: '&pound;149 <small>self-serve</small>', scope: 'One diagnostic conversation and report' },
    note: 'Live soon. It will open on a separate site, with checkout handled by Stripe.'
  },
  studio: {
    category: 'Marketing studio',
    tagline: 'Campaign assets, in your brand.',
    cardMetrics: [{ dir: 'down', name: 'Time to publish' }, { dir: 'down', name: 'Review cycles' }],
    h1: 'A campaign kit in your brand, ready to approve',
    lead: 'Social images, carousels, PDFs, one-pagers, landing pages and emails, planned as a campaign and held for your approval.',
    moves: [{ dir: 'down', name: 'Time from brief to a finished campaign' }, { dir: 'down', name: 'Review cycles before sign-off' }],
    points: [
      ['image', 'Every format from one brief', 'Images, PDFs, one-pagers, pages and emails in your brand.'],
      ['calendar', 'Planned as a campaign', 'A plan across weeks, scheduled on a calendar.'],
      ['shield', 'Checked, then approved', 'Your rules run first. A person signs off.']
    ],
    howTitle: 'One brief, a whole campaign kit',
    howLead: 'Images, PDFs, one-pagers, landing pages and emails, planned across weeks and checked before anyone sees them.',
    chipsLabel: 'Runs on',
    chips: ['Anthropic', 'Next.js', 'PostgreSQL', 'Vercel'],
    buildLead: 'Your brand and your rules go in. Approved, scheduled campaign assets come out.',
    build: {
      inputs: [['pen', 'Your brand', 'Voice, colours, fonts, logo'], ['question', 'The brief', 'Channel, audience, purpose, cadence'], ['report', 'Your evidence', 'Reports, metrics, case studies'], ['image', 'Your designs', 'Upload a design, get a template']],
      engine: [['compass', 'Strategy', 'Plans the campaign across weeks'], ['pen', 'Copy per touchpoint', 'Written in your brand voice'], ['layers', 'Design', 'Fills your templates to size']],
      outputs: [['image', 'Images and carousels', 'Social cards in every ratio'], ['file', 'PDFs, one-pagers, emails', 'Ready to share'], ['browser', 'Landing pages', 'Hosted apart from your site'], ['calendar', 'A campaign calendar', 'Every touchpoint scheduled']],
      controls: [['shield', 'Rules run first', 'Banned terms block before AI review'], ['approved', 'A person approves', 'Nothing publishes on its own'], ['layers', 'Brands stay separate', 'Rules and voice live on the brand']]
    },
    needs: ['Your brand assets and tone', 'The rules that must block publication', 'Who approves, and how', 'Designs you like, as images'],
    excludes: ['Sending: it stays in your email tool', 'Legal or compliance sign-off', 'Publishing without approval'],
    fit: {
      statements: ['Your marketing copy needs sign-off before it ships', 'You produce images, PDFs or pages for campaigns regularly', 'You run more than one brand, or a regulated one'],
      notYet: 'Not yet if nobody signs off marketing copy, or you only run one-off campaigns.'
    },
    steps: ['Book a demo call', 'We review your rules and how copy gets signed off', 'You get a fixed build and a first live campaign'],
    price: { label: 'Fixed price', amount: '&pound;7,500 <small>fixed build</small>', scope: 'Setup and first campaign, checked and approved' }
  }
};

// Questions asked before booking. Every answer restates what the offer page already says.
const FAQ = {
  outreach: [
    ['Where do the emails send from?', 'From domains and accounts you own. Your outreach does not run through a shared tool.'],
    ['Does a person check the emails?', 'Yes. Rules check each draft for length, banned phrases and required details. A person approves before the first send.'],
    ['Do you guarantee replies or meetings?', 'No. Guaranteed replies, meetings or revenue are not included.'],
    ['What if my contact data is thin?', 'Personalization comes from the database, so thin data means thin emails. When a field is unknown, the email leaves it out instead of guessing. If the data is thin, start with the data foundation.']
  ],
  database: [
    ['Do you build a list from scratch or clean mine?', 'Either. You can start from nothing or from the data you already hold. We define the ideal customer with you, then source, enrich, verify, deduplicate and score.'],
    ['What happens to data you cannot confirm?', 'A value is recorded only when sources agree. Otherwise it stays blank, and anything that needs a person goes on an exception report.'],
    ['How is it priced?', 'Custom scope. Record volume, source quality and enrichment depth set the price, and you get it before any build.'],
    ['Do you cover the whole market?', 'No. Exhaustive market coverage is not promised, and legal or compliance advice is not included.']
  ],
  goldmine: [
    ['Which CRM does it work with?', 'Pricing applies to HubSpot. Other CRMs are scoped separately.'],
    ['What do the three depths change?', 'Core is scoring and write-back on a single pipeline, at £6,000. Full Build adds AI synthesis behind record checks and multiple pipelines, at £8,500. Extended adds custom signals and a reporting dashboard, at £11,000.'],
    ['How do I know why a lead ranks where it does?', 'Every rank shows the signals behind it, and the scoring rules are written so your team can read and check them.'],
    ['How many records do I need?', 'Roughly 10,000 or more contact and deal records, in a CRM your team uses daily. A new or nearly empty CRM is not a fit yet.']
  ],
  brief: [
    ['Which tools does it need?', 'Google Workspace (Calendar and Gmail) is required. HubSpot and Aircall are proven. Other CRMs are scoped on request.'],
    ['Who receives the brief?', 'Your rep only. Nothing is sent to the contact.'],
    ['What if there is little data on a contact?', 'The brief is shorter. No profile is invented.'],
    ['Are there running costs?', 'LLM running costs are not part of the setup fee. We confirm them before launch.']
  ],
  architect: [
    ['Is it available yet?', 'Not yet. Revenue Architect is live soon.'],
    ['How long does it take?', 'About 20 minutes for the conversation, across six phases. The report arrives by email.'],
    ['What do I need to bring?', 'Real numbers to hand: revenue, team size and pipeline.'],
    ['Is this a bespoke build?', 'No. It is a self-serve diagnostic that ends in a benchmarked report. A bespoke build and a generic playbook are not included.']
  ],
  studio: [
    ['Can it send the campaigns?', 'No. Sending stays in your email tool. The studio produces, checks and schedules the assets.'],
    ['Does anything publish without approval?', 'No. Your rules run first, and a person approves before anything is published.'],
    ['Can it use my own designs?', 'Yes. Upload an image of a design you like and the studio turns it into a reusable template.'],
    ['Does it work for regulated firms?', 'Yes. The rules layer has been proven on FCA COBS 4, and your own brand or compliance rules are set up during the build.']
  ]
};

// Numeric prices for structured data. An offer with no entry is Custom scope and states no price.
const LD_PRICE = {
  goldmine: { low: 6000, high: 11000 },
  brief: { fixed: 1000 },
  architect: { fixed: 149 },
  studio: { fixed: 7500 }
};

// The primary action on an offer page: a demo call. An offer that is not live yet shows "Live soon" instead.
const isSoon = (id) => routes.offers[id].live === false;
const actionLink = (id, cls) => (isSoon(id)
  ? `<span class="${cls} btn--soon">Live soon</span>`
  : `<a class="${cls}" href="${routes.external.book}" target="_blank" rel="noopener">Book a demo call${NEW_TAB}</a>`);

const li = (items) => items.map((t) => `<li>${esc(t)}</li>`).join('\n              ');
const dirWord = (dir) => (dir === 'down' ? 'lower' : 'higher');
const moveItem = (m) => `<li><span class="moves__dir" aria-hidden="true">${icon(m.dir)}</span>${esc(m.name)}<span class="sr-only"> (target: ${dirWord(m.dir)})</span></li>`;

// ---------- the four blocks of an offer page ----------

function renderHero(id) {
  const v = VISUALS[id];
  const offer = routes.offers[id];
  return `<section class="hero hero--offer" aria-labelledby="hero-h">
    <div class="wrap">
      <p class="crumb"><a class="text-link" href="${routes.pages.services}">&larr; Services</a></p>
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

const tile = ([ic, label, sub]) => `<li class="btile"><span class="btile__icon">${icon(ic)}</span><span class="btile__text"><strong>${esc(label)}</strong><span>${esc(sub)}</span></span></li>`;
const lane = (cls, title, items) => `<div class="lane ${cls}">
          <h3 class="lane__title">${title}</h3>
          <ul class="btiles">
            ${items.map(tile).join('\n            ')}
          </ul>
        </div>`;

function renderBuild(id) {
  const v = VISUALS[id];
  const b = v.build;
  return `<section class="section section--tint" id="build" aria-labelledby="build-h">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">What we build</p>
        <h2 id="build-h">The build, at a glance</h2>
        <p class="lead">${esc(v.buildLead)}</p>
      </div>
      <div class="bmap">
        <div class="bmap__flow">
        ${lane('lane--in', 'Inputs', b.inputs)}
        ${lane('lane--engine', 'Engine', b.engine)}
        ${lane('lane--out', 'Outputs', b.outputs)}
        </div>
        ${lane('lane--controls', 'Controls', b.controls)}
      </div>
      <div class="tabs" data-tabs>
        <div class="tabs__list" role="tablist" aria-label="More about the build">
          <button type="button" class="tabs__tab" role="tab" id="tab-needs-${id}" aria-controls="panel-needs-${id}" aria-selected="true">What we need from you</button>
          <button type="button" class="tabs__tab" role="tab" id="tab-not-${id}" aria-controls="panel-not-${id}" aria-selected="false" tabindex="-1">Not included</button>
        </div>
        <div class="tabs__panel" role="tabpanel" id="panel-needs-${id}" aria-labelledby="tab-needs-${id}">
          <h3 class="tabs__h">What we need from you</h3>
          <ul class="checks">
            ${li(v.needs)}
          </ul>
        </div>
        <div class="tabs__panel" role="tabpanel" id="panel-not-${id}" aria-labelledby="tab-not-${id}">
          <h3 class="tabs__h">Not included</h3>
          <ul class="crosses">
            ${li(v.excludes)}
          </ul>
        </div>
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
  const verdicts = isSoon(id) ? VERDICT_SOON : VERDICT;
  const attrs = verdicts.map((t, i) => `data-v${i}="${escAttr(t)}"`).join(' ');
  return `<section class="section" id="fit" aria-labelledby="fit-h">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Before you book</p>
        <h2 id="fit-h">Does it fit?</h2>
      </div>
      <div class="fit-layout">
        <div class="fitcheck" data-fit data-count="0" ${attrs}>
          <fieldset class="fitcheck__set">
            <legend class="fitcheck__legend">Which of these are true for you?</legend>
            ${v.fit.statements.map((t) => `<label class="tick"><input type="checkbox"><span class="tick__text">${esc(t)}</span></label>`).join('\n            ')}
          </fieldset>
          <div class="fitcheck__result">
            <div class="fitmeter" aria-hidden="true"><i></i><i></i><i></i></div>
            <p class="fitcheck__verdict" data-verdict aria-live="polite">${esc(verdicts[0])}</p>
            <p class="fitcheck__hint">${esc(v.fit.notYet)}</p>
            ${actionLink(id, 'btn btn--primary')}
          </div>
        </div>
        <article class="fitcard fitcard--price">
          <h3>Price</h3>
          ${priceBlock(v)}
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

function renderFaq(id) {
  return `<section class="section section--tint" id="faq" aria-labelledby="faq-h">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Questions</p>
        <h2 id="faq-h">Common questions</h2>
      </div>
      <div class="faq">
        ${FAQ[id].map(([q, a]) => `<details>
          <summary>${esc(q)}</summary>
          <p>${esc(a)}</p>
        </details>`).join('\n        ')}
      </div>
    </div>
  </section>`;
}

const SITE = 'https://www.panoramica.solutions';
const ldSafe = (o) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');

// Service and FAQ structured data for the offer, so search and AI answers can read the page.
function renderLd(id) {
  const v = VISUALS[id];
  const offer = routes.offers[id];
  const url = `${SITE}/${routes.pages[offer.page]}`;
  const service = {
    '@type': 'Service',
    name: offer.name,
    description: v.lead,
    url,
    provider: { '@type': 'Organization', name: 'Panoramica Solutions', url: `${SITE}/` }
  };
  const p = LD_PRICE[id];
  if (p && p.fixed) service.offers = { '@type': 'Offer', price: String(p.fixed), priceCurrency: 'GBP', url };
  if (p && p.low) service.offers = { '@type': 'AggregateOffer', lowPrice: String(p.low), highPrice: String(p.high), priceCurrency: 'GBP', url };
  const faq = {
    '@type': 'FAQPage',
    mainEntity: FAQ[id].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
  };
  return `<script type="application/ld+json">\n${ldSafe({ '@context': 'https://schema.org', '@graph': [service, faq] })}\n  </script>`;
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

export const renderOfferPage = (id) => [renderHero(id), renderHow(id), renderBuild(id), renderFit(id), renderFaq(id), renderLd(id), renderBar(id)].join('\n\n  ');

// ---------- service cards ----------

function renderCard(id) {
  const v = VISUALS[id];
  const offer = routes.offers[id];
  const href = routes.pages[offer.page];
  const soon = isSoon(id) ? '<span class="tag tag--soon">Live soon</span>' : '';
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
        <p class="mkt-card__price"><span>${esc(offer.price)}</span><span class="mkt-card__end">${soon}<span class="mkt-card__go" aria-hidden="true">&rarr;</span></span></p>
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

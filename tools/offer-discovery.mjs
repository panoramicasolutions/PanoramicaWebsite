// The Discovery Engine offer: its visual, page data and FAQ. Imported into tools/visuals.mjs.

export const DISCOVERY_SIG = (LABEL, BAR) => `<div class="example">
        ${LABEL}
        <div class="mock">
          ${BAR('Discovery', 'Before the first real meeting')}
          <div class="mock__body">
            <ol class="timeline">
              <li><span class="timeline__time">Mon</span><span>Client books a call and gets a private link</span></li>
              <li><span class="timeline__time">Tue</span><span>They answer in about 15 minutes, with a colleague</span></li>
              <li><span class="timeline__time">Tue</span><span>The brief is written and waiting for you</span></li>
            </ol>
            <p class="mail__subject">Brief: Example Ltd, business process and systems overview</p>
            <p class="built"><span class="built__label">Built from</span><span class="tag">Their answers</span><span class="tag">Uploaded documents</span><span class="tag">Your call notes</span></p>
            <div class="bgrid">
              <div class="pane">
                <p class="pane__title">Current reality</p>
                <p class="pane__text">Example Ltd (fictional). Inbound sales, 2 to 3 people selling, quotes take 3 to 5 days.</p>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">Where it hurts</p>
                <p class="pane__text">Quote creation and revisions. Follow-ups slip while waiting on client information.</p>
              </div>
              <div class="pane pane--accent">
                <p class="pane__title">Working assessment</p>
                <p class="pane__text">Demand outstrips capacity. Stated as a hypothesis.</p>
              </div>
              <div class="pane">
                <p class="pane__title">Questions for the meeting</p>
                <p class="pane__text">Walk us through the last quote that needed three revisions.</p>
              </div>
            </div>
            <p class="verified"><span class="tag tag--ok">Sourced</span>Nothing is invented. Gaps are listed as missing information.</p>
          </div>
        </div>
      </div>`;

export const DISCOVERY_VISUAL = {
  category: 'Client discovery',
  // A product demo plays in the hero in place of the brand mark.
  video: { src: 'assets/video/discovery-engine.mp4', poster: 'assets/video/discovery-engine.jpg', label: 'A 30 second demo of the Discovery Engine' },
  tagline: 'Clients brief you before the first meeting.',
  cardMetrics: [{ dir: 'down', name: 'Discovery calls' }, { dir: 'down', name: 'Prep time' }],
  h1: 'Start every engagement already knowing the client',
  lead: 'Your client answers an adaptive questionnaire before you meet. You get a written brief of how their business works, where it hurts and what to ask.',
  moves: [{ dir: 'down', name: 'Calls spent on background' }, { dir: 'down', name: 'Pre-meeting prep time' }],
  points: [
    ['sliders', 'Questions that adapt', 'To the client’s business type and the areas they pick.'],
    ['report', 'A written brief', 'Current reality, bottlenecks and questions for the meeting.'],
    ['image', 'In your brand', 'Your logo, your questions, your domain.']
  ],
  howTitle: 'The client does the discovery before you arrive',
  howLead: 'They book a call, get a private link and answer in about 15 minutes. The brief is written when they submit.',
  chipsLabel: 'Works with',
  chips: ['Google Calendar booking', 'Your own domain', 'PDF and Markdown export'],
  buildLead: 'Built around your discovery questions, delivered to you as a brief per client.',
  build: {
    inputs: [['calendar', 'Booking', 'The client picks a time and gets their link'], ['question', 'Adaptive questionnaire', 'Mostly taps, with dictation for longer answers'], ['file', 'Their documents', 'Proposals, price lists, process docs'], ['pen', 'Your call notes', 'Added privately, never shown to the client']],
    engine: [['funnel', 'Branching by business', 'E-commerce, services, SaaS, manufacturing and more'], ['layers', 'Core and deeper questions', 'Depth where the client has it, no dead ends'], ['bulb', 'Brief written from the answers', 'Facts separated from hypotheses']],
    outputs: [['report', 'A brief per client', 'The same structure every time'], ['target', 'Questions for the meeting', 'The ones that unlock a recommendation'], ['mail', 'Emails from your address', 'Invite, copy of answers, notification to you']],
    controls: [['lock', 'A private link per client', 'Only they and you can see their answers'], ['eye', 'Nothing invented', 'Unknowns are listed as missing information'], ['shield', 'Files kept private', 'Uploads are not publicly reachable']]
  },
  needs: ['Your discovery questions, or ours as a starting point', 'A booking calendar', 'Your logo and domain'],
  excludes: ['LLM running costs, confirmed before launch', 'CRM integration, unless requested'],
  fit: {
    statements: ['You run discovery with every new client', 'Your first meetings go on background questions', 'You want the same quality of preparation for every client'],
    notYet: 'Not yet if you take on fewer than a handful of new clients a year.'
  },
  steps: ['Book a demo call', 'We go through your current discovery questions', 'You get a fixed setup on your own domain'],
  price: { label: 'Fixed price', amount: 'Pricing on request', scope: 'Setup on your domain, with your questions and brand', text: true }
};

export const DISCOVERY_FAQ = [
  ['Who is it for?', 'Consultants and agencies who run discovery with every new client.'],
  ['How long does it take a client?', 'About 15 minutes. Answers save as they go, and they can share the link with a colleague.'],
  ['Can I change the questions?', 'Yes. The questions, the sections and the structure of the brief are set up around how you work.'],
  ['Who can see a client’s answers?', 'The client, through their private link, and you. Uploaded files are not publicly reachable.'],
  ['How is it priced?', 'A fixed price for the setup on your domain. Inquire about pricing to get the figure.'],
  ['Are there running costs?', 'LLM running costs are not part of the setup fee. We confirm them before launch.']
];

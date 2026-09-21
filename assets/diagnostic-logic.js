/* Deterministic routing for the free diagnostic. No network, no AI, no personal data.
   Loaded in the browser (window.PanoDiagnostic) and required by the Node tests.

   Decisions where the brief is ambiguous:
   - Q4 has a scoring line for "fragmented tools" but no matching answer option. The option
     "A CRM or spreadsheets with incomplete/duplicated records" already scores database +3,
     so no separate line is needed.
   - "Top explicit route" (Q6) is the leader after Q1 to Q4, before any Q5 or Q6 points,
     using the standard tie-break chain. It may be the architect route.
   - Q5 is applied after Q1 to Q4 and Q6. "One-off or changing" adds architect +2 at that stage.
   - The architect override (Q1 unknown and architect within 2 points of the leader) is
     evaluated on the final scores. A final tie that nothing else resolves falls back to the
     fixed route order below, never to price. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PanoDiagnostic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var ROUTES = ['outreach', 'goldmine', 'database', 'brief', 'studio', 'architect'];

  var QUESTIONS = [
    {
      id: 'q1', type: 'single', title: 'What is the biggest revenue problem right now?',
      options: [
        { id: 'conversations', label: 'We need more relevant conversations.', route: 'outreach', points: 5 },
        { id: 'prep', label: 'Reps are underprepared for calls.', route: 'brief', points: 5 },
        { id: 'crm', label: 'Our existing CRM has history, but reps do not know what to act on.', route: 'goldmine', points: 5 },
        { id: 'database', label: 'Our database is missing, duplicated or unreliable.', route: 'database', points: 5 },
        { id: 'campaign', label: 'Campaign creation and review take too long.', route: 'studio', points: 5 },
        { id: 'unknown', label: 'We do not know the real constraint.', route: 'architect', points: 5 }
      ]
    },
    {
      id: 'q2', type: 'single', title: 'Where does the team spend the most manual time?',
      options: [
        { id: 'research', label: 'Researching accounts and contacts.', route: 'outreach', points: 4 },
        { id: 'context', label: 'Pulling context before meetings.', route: 'brief', points: 4 },
        { id: 'prioritise', label: 'Prioritizing old CRM records and follow-ups.', route: 'goldmine', points: 4 },
        { id: 'data', label: 'Cleaning, normalizing or creating account/contact data.', route: 'database', points: 4 },
        { id: 'drafting', label: 'Drafting, checking and approving campaigns.', route: 'studio', points: 4 },
        { id: 'reporting', label: 'Building reports and debating what the numbers mean.', route: 'architect', points: 4 }
      ]
    },
    {
      id: 'q3', type: 'single', title: 'Which outcome matters in the next 90 days?',
      options: [
        { id: 'conversations', label: 'Start more qualified conversations.', route: 'outreach', points: 4 },
        { id: 'prep', label: 'Improve meeting preparation and follow-up.', route: 'brief', points: 4 },
        { id: 'queue', label: 'Turn existing CRM history into a prioritized working queue.', route: 'goldmine', points: 4 },
        { id: 'database', label: 'Build a trustworthy database for routing, reporting or outreach.', route: 'database', points: 4 },
        { id: 'campaigns', label: 'Ship campaigns faster without losing control.', route: 'studio', points: 4 },
        { id: 'first', label: 'Agree on the first problem worth fixing.', route: 'architect', points: 4 }
      ]
    },
    {
      id: 'q4', type: 'single', title: 'What best describes the current setup?',
      options: [
        { id: 'working', label: 'Gmail/Google Workspace and a working CRM.', scores: { outreach: 1, brief: 1 } },
        { id: 'patchy', label: 'Gmail/Google Workspace, but the CRM is patchy.', scores: { outreach: 1, database: 2 } },
        { id: 'history', label: 'A CRM with meaningful history, but weak prioritization.', scores: { goldmine: 3 } },
        { id: 'incomplete', label: 'A CRM or spreadsheets with incomplete/duplicated records.', scores: { database: 3 } },
        { id: 'spreadsheets', label: 'Mostly spreadsheets/manual processes.', scores: { database: 2, architect: 1 } },
        { id: 'unsure', label: 'Not sure.', scores: { architect: 2 } }
      ]
    },
    {
      id: 'q5', type: 'single', title: 'How repeatable is the workflow?',
      options: [
        { id: 'daily', label: 'It happens daily.', bonus: 3 },
        { id: 'weekly', label: 'It happens several times a week.', bonus: 2 },
        { id: 'monthly', label: 'It happens a few times a month.', bonus: 1 },
        { id: 'oneoff', label: 'It is a one-off or still changing.', scores: { architect: 2 } }
      ]
    },
    {
      id: 'q6', type: 'single', title: 'How soon do you need a first working version?',
      options: [
        { id: 'twoweeks', label: 'Within 2 weeks.', lift: 1 },
        { id: 'month', label: 'This month.', lift: 1 },
        { id: 'quarter', label: 'This quarter.', lift: 0 },
        { id: 'exploring', label: 'I am exploring.', lift: 0 }
      ]
    },
    {
      id: 'q7', type: 'multi', title: 'What are you ready to provide?',
      options: [
        { id: 'owner', label: 'One owner for decisions.', ready: true },
        { id: 'access', label: 'Access to the relevant systems/data.', ready: true },
        { id: 'examples', label: 'Examples of the current workflow.', ready: true },
        { id: 'time', label: 'Time for review and testing.', ready: true },
        { id: 'none', label: 'None of these yet.', exclusive: true }
      ]
    }
  ];

  var RESULTS = {
    outreach: {
      title: 'Start with email outreach infrastructure',
      action: 'Choose one audience and define the evidence that makes a contact worth writing to.',
      cta: { label: 'Scope my outreach infrastructure', target: 'external:book' }
    },
    goldmine: {
      title: 'Start with Goldmine',
      action: 'Choose one pipeline and compare current scores with last meaningful activity, next-contact evidence and unanswered touches.',
      cta: { label: 'Check if my CRM is ready', target: 'external:book' }
    },
    database: {
      title: 'Start with the data foundation',
      action: 'Define the records, required fields, sources and validation standard the team needs to operate.',
      cta: { label: 'Scope my data foundation', target: 'external:book' }
    },
    brief: {
      title: 'Start with The Brief',
      action: 'Pick one recurring external meeting type and list the context a rep needs before it.',
      cta: { label: 'See The Brief - £1,000 fixed setup', target: 'page:brief' }
    },
    studio: {
      title: 'Start with the campaign approval workflow',
      action: 'Write down the rules that must block publication and the decisions that still need a person.',
      cta: { label: 'See Marketing Studio', target: 'page:studio' }
    },
    architect: {
      title: 'Start with Revenue Architect',
      action: 'Use the diagnostic to separate the visible symptom from the operating constraint.',
      cta: { label: 'See Revenue Architect - live soon', target: 'page:architect' }
    }
  };

  var READINESS = {
    ready: 'You appear ready to scope a build. Bring one owner, access to the workflow and two real examples.',
    prepare: 'Before scoping, collect two examples of the current workflow and name one decision owner.',
    early: 'Do not buy a build yet. First choose an owner and document one real workflow from start to finish.'
  };

  var FREQUENCY = {
    daily: 'this workflow happens daily',
    weekly: 'this workflow happens several times a week',
    monthly: 'this workflow happens a few times a month',
    oneoff: 'this workflow is a one-off or still changing'
  };
  var TIMELINE = {
    twoweeks: 'you want a first working version within 2 weeks',
    month: 'you want a first working version this month',
    quarter: 'you want a first working version this quarter'
  };

  function question(id) { return QUESTIONS.filter(function (q) { return q.id === id; })[0]; }
  function option(qid, oid) {
    var q = question(qid);
    return q ? q.options.filter(function (o) { return o.id === oid; })[0] || null : null;
  }
  function emptyScores() {
    var s = {};
    ROUTES.forEach(function (r) { s[r] = 0; });
    return s;
  }
  function copy(s) { var c = {}; ROUTES.forEach(function (r) { c[r] = s[r]; }); return c; }

  // First candidate named by Q1, then Q2, then Q3; otherwise the fixed route order. Never price.
  function chooseAmong(candidates, ctx) {
    if (candidates.length === 1) return candidates[0];
    var order = [ctx.q1Route, ctx.q2Route, ctx.q3Route];
    for (var i = 0; i < order.length; i++) {
      if (order[i] && candidates.indexOf(order[i]) !== -1) return order[i];
    }
    return ROUTES.filter(function (r) { return candidates.indexOf(r) !== -1; })[0];
  }

  function leaders(scores, exclude) {
    var pool = ROUTES.filter(function (r) { return !exclude || exclude.indexOf(r) === -1; });
    var max = Math.max.apply(null, pool.map(function (r) { return scores[r]; }));
    return pool.filter(function (r) { return scores[r] === max; });
  }

  function pickWinner(scores, ctx) {
    var lead = Math.max.apply(null, ROUTES.map(function (r) { return scores[r]; }));
    if (ctx.q1Route === 'architect' && lead - scores.architect <= 2) return 'architect';
    return chooseAmong(leaders(scores), ctx);
  }

  function missing(answers) {
    var out = [];
    ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].forEach(function (id) { if (!option(id, answers[id])) out.push(id); });
    if (!Array.isArray(answers.q7) || answers.q7.length === 0) out.push('q7');
    return out;
  }

  function readiness(q7) {
    var picks = Array.isArray(q7) ? q7 : [];
    if (picks.indexOf('none') !== -1) return { level: 'early', count: 0 };
    var count = picks.filter(function (id) {
      var o = option('q7', id);
      return o && o.ready;
    }).length;
    return { level: count >= 3 ? 'ready' : count >= 1 ? 'prepare' : 'early', count: count };
  }

  function strip(label) { return label.replace(/\.$/, ''); }

  function whyNow(a) {
    var freq = FREQUENCY[a.q5];
    var time = TIMELINE[a.q6];
    if (!freq && !time) return '';
    var text = 'You said ' + (freq || '') + (freq && time ? ' and ' : '') + (!freq ? time : time || '');
    return text + '.';
  }

  function recommend(answers) {
    answers = answers || {};
    var gaps = missing(answers);
    if (gaps.length) return { complete: false, missing: gaps };

    var o1 = option('q1', answers.q1), o2 = option('q2', answers.q2), o3 = option('q3', answers.q3), o4 = option('q4', answers.q4);
    var ctx = { q1Route: o1.route, q2Route: o2.route, q3Route: o3.route };

    var s = emptyScores();
    s[o1.route] += o1.points;
    s[o2.route] += o2.points;
    s[o3.route] += o3.points;
    Object.keys(o4.scores).forEach(function (r) { s[r] += o4.scores[r]; });

    var topExplicit = chooseAmong(leaders(s), ctx);
    var o6 = option('q6', answers.q6);
    if (o6.lift) s[topExplicit] += o6.lift;

    var o5 = option('q5', answers.q5);
    var q5Target = null;
    if (o5.scores) {
      Object.keys(o5.scores).forEach(function (r) { s[r] += o5.scores[r]; });
    } else {
      q5Target = chooseAmong(leaders(s, ['architect']), ctx);
      s[q5Target] += o5.bonus;
    }

    var route = pickWinner(s, ctx);
    var ready = readiness(answers.q7);

    return {
      complete: true,
      route: route,
      scores: copy(s),
      topExplicit: topExplicit,
      q5Target: q5Target,
      readiness: ready.level,
      readinessCount: ready.count,
      readinessCopy: READINESS[ready.level],
      explain: 'Your answers point here: you named "' + strip(o1.label) + '" as the biggest problem and "' + strip(o2.label) + '" as where the manual time goes.',
      action: RESULTS[route].action,
      title: RESULTS[route].title,
      cta: RESULTS[route].cta,
      whyNow: whyNow(answers)
    };
  }

  return {
    ROUTES: ROUTES,
    QUESTIONS: QUESTIONS,
    RESULTS: RESULTS,
    READINESS: READINESS,
    option: option,
    question: question,
    pickWinner: pickWinner,
    chooseAmong: chooseAmong,
    recommend: recommend,
    readiness: readiness,
    missing: missing
  };
});

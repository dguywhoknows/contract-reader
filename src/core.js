/* core.js — clause segmentation, risk patterns, readability, retrieval, key-term extraction, version comparison and coverage checklists (pure, unit-tested). Educational, not legal advice. */

var RISKS = [
  { id: 'autorenew', sev: 'high', label: 'Automatic renewal', re: /\b(automatically renew\w*|auto-?renew\w*|renews? automatically|continuous subscription)\b/i, why: 'You will keep being charged unless you cancel in time.' },
  { id: 'arbitration', sev: 'high', label: 'Forced arbitration', re: /\b(binding arbitration|arbitrat\w+ (shall|will) be (final|binding)|waive[^.]{0,40}(jury|court))\b/i, why: 'Disputes go to a private arbitrator instead of a court.' },
  { id: 'classaction', sev: 'high', label: 'Class-action waiver', re: /\b(class action|class-wide|representative (action|proceeding))\b/i, why: 'You can’t join with others to sue, even for small widespread harms.' },
  { id: 'unilateral', sev: 'high', label: 'They can change terms anytime', re: /\b(may (modify|change|amend|update) (these|this|the) (terms|agreement)|at any time[^.]{0,60}(modify|change|amend)|sole discretion)\b/i, why: 'The deal can change without your explicit agreement.' },
  { id: 'datashare', sev: 'high', label: 'Data sharing / selling', re: /\b(sell|share|disclose|transfer)\b[^.]{0,60}\b(personal (data|information)|your (data|information))\b[^.]{0,60}\b(third part\w+|partners|affiliates|advertis\w+)/i, why: 'Your personal data may be passed to other companies.' },
  { id: 'license', sev: 'high', label: 'Broad license to your content', re: /\b(perpetual|irrevocable|worldwide)\b[^.]{0,80}\b(license|licence|right)\b[^.]{0,80}\b(content|uploads?|materials?|submissions?)/i, why: 'They can use what you upload, possibly forever, without paying you.' },
  { id: 'liability', sev: 'med', label: 'Liability capped', re: /\b(limitation of liability|in no event shall|shall not be liable|aggregate liability|liability[^.]{0,40}(exceed|limited to))\b/i, why: 'If things go wrong, what you can recover is tiny.' },
  { id: 'warranty', sev: 'low', label: 'No warranty ("as is")', re: /\b(as is|as available|disclaim\w* (all )?warrant\w*)\b/i, why: 'No promise that the service works or is fit for your purpose.' },
  { id: 'termination', sev: 'med', label: 'They can terminate you anytime', re: /\b(terminate|suspend)\b[^.]{0,60}\b(at any time|for any reason|without (prior )?notice)\b/i, why: 'You could lose access (and data) without warning.' },
  { id: 'fees', sev: 'med', label: 'Fees, penalties or price increases', re: /\b(early termination fee|cancellation fee|late fee|interest of|price (increase|change)s?|prices may change|fees? (may|are subject to) change|non-?refundable)\b/i, why: 'Extra or changing costs you might not expect.' },
  { id: 'indemnify', sev: 'med', label: 'You indemnify them', re: /\b(you (agree to |shall |will )?indemnif\w+|hold (us |company )?harmless)\b/i, why: 'You could be on the hook for their legal costs.' },
  { id: 'noncompete', sev: 'high', label: 'Non-compete / non-solicit', re: /\b(non-?compet\w*|shall not (compete|solicit)|not (engage|work) for any competitor)\b/i, why: 'Restricts where you can work or do business later.' },
  { id: 'jurisdiction', sev: 'low', label: 'Far-away jurisdiction', re: /\b(governed by the laws of|exclusive jurisdiction|venue shall be)\b/i, why: 'Any dispute may have to happen in their home courts.' },
  { id: 'tracking', sev: 'med', label: 'Tracking & profiling', re: /\b(cookies|tracking technolog\w+|behavioral advertising|profil(e|ing) (you|users))\b/i, why: 'Your behavior may be tracked for ads or profiling.' },
];
var SEV_WEIGHT = { high: 3, med: 2, low: 1 };
var LEGALESE = /\b(notwithstanding|hereinafter|hereto|hereby|herein|thereof|therein|whereas|pursuant to|indemnif\w*|aforementioned|forthwith|heretofore|inter alia|mutatis mutandis|in witness whereof)\b/gi;

/* ---------- segmentation ---------- */
function syllables(w) { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); return Math.max(1, (w.match(/[aeiouy]{1,2}/g) || []).length); }
function analyzeClause(c) {
  var words = c.text.match(/[A-Za-z']+/g) || [], sents = c.text.split(/[.;!?]+/).filter(function (s) { return s.trim().split(/\s+/).length > 2; });
  var sy = words.reduce(function (a, w) { return a + syllables(w); }, 0);
  c.grade = Math.max(0, 0.39 * (words.length / Math.max(1, sents.length)) + 11.8 * (sy / Math.max(1, words.length)) - 15.59);
  c.longest = sents.reduce(function (a, s) { return Math.max(a, s.trim().split(/\s+/).length); }, 0);
  c.legalese = (c.text.match(LEGALESE) || []).length;
  c.passive = (c.text.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi) || []).length;
  c.words = words.length;
  c.risks = RISKS.filter(function (r) { return r.re.test(c.text); });
  return c;
}
/* Split on numbered headings ("3.", "Section 4", "2.1)") or short ALL-CAPS headings; inline "Title. Body" headings are separated. */
function segment(text) {
  var lines = String(text).replace(/\r/g, '').split('\n'), out = [], cur = null;
  var numbered = /^\s*((?:section|article|clause)\s+\d+[\w.]*|\d+(?:\.\d+)*[.)])\s+(.*)$/i, capsHead = /^\s*[A-Z][A-Z0-9 &,'()-]{3,70}$/;
  lines.forEach(function (l) {
    var t = l.trim();
    if (!t) { if (cur && cur.text.length > 600) { out.push(cur); cur = null; } return; }
    var m = t.match(numbered);
    if (m) {
      if (cur) out.push(cur);
      var inline = m[2].match(/^([^.:]{2,60})[.:]\s+(.+)$/);
      cur = inline ? { title: m[1] + ' ' + inline[1], text: inline[2] + ' ' } : t.length < 90 ? { title: t.replace(/[.:]$/, ''), text: '' } : { title: m[1], text: m[2] + ' ' };
    } else if (capsHead.test(t) && t.split(/\s+/).length <= 10) {
      if (cur && cur.text.trim()) out.push(cur);
      cur = { title: t.replace(/[.:]$/, ''), text: '' };
    } else { if (!cur) cur = { title: 'Preamble', text: '' }; cur.text += t + ' '; }
  });
  if (cur) out.push(cur);
  var letter = 0;
  return out.filter(function (c) { return c.text.trim().length > 20; }).map(function (c, i) {
    var num = (c.title.match(/^(?:section|article|clause)?\s*(\d+(?:\.\d+)*)/i) || [])[1];
    return analyzeClause({ title: c.title, text: c.text.trim(), i: i, ref: num || String.fromCharCode(65 + letter++) });
  });
}
function cleanTitle(t) { return String(t).replace(/^(?:(?:section|article|clause)\s+)?\d+(?:\.\d+)*[.)]?\s*/i, '').trim(); }
/* Overall risk score (0-100) and flags grouped by pattern. */
function riskReport(clauses) {
  var groups = {}, score = 0;
  clauses.forEach(function (c) { c.risks.forEach(function (r) { (groups[r.id] = groups[r.id] || { r: r, refs: [] }).refs.push(c.ref); score += SEV_WEIGHT[r.sev] * 6; }); });
  var words = clauses.reduce(function (a, c) { return a + c.words; }, 0);
  return {
    score: Math.min(100, score), words: words, minutes: Math.ceil(words / 230),
    grade: clauses.reduce(function (a, c) { return a + c.grade * c.words; }, 0) / Math.max(1, words),
    flags: Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return SEV_WEIGHT[b.r.sev] - SEV_WEIGHT[a.r.sev] || a.r.label.localeCompare(b.r.label); }),
  };
}

/* ---------- retrieval ---------- */
var STOPWORDS = /^(the|and|you|your|for|are|any|with|that|this|can|may|will|our|not|all|from|have|has|its|such|shall|use|who|what|how|does|did|they|them|their|i)$/;
var EXPANSIONS = { sue: 'dispute arbitration court class jury lawsuit', cancel: 'cancel terminate termination renew renewal refund', data: 'personal information privacy share partner advertiser cookie', sell: 'share partner advertiser third', own: 'ownership content license upload retain', file: 'content upload delete', refund: 'refund non-refundable fee', price: 'price fee change renewal', delete: 'delete termination content', quit: 'terminate termination notice resign', notice: 'notice days written terminate', pay: 'fee payment invoice billed price' };
function tokenize(s) { return (String(s).toLowerCase().match(/[a-z]{3,}/g) || []).filter(function (w) { return !STOPWORDS.test(w); }).map(function (w) { return w.replace(/(ing|ed|es|s)$/, ''); }); }
/* TF-IDF cosine over clauses with a small synonym expansion for everyday questions. */
function retrieve(clauses, q, k) {
  var docs = clauses.map(function (c) { return tokenize(c.title + ' ' + c.text); }), df = {};
  docs.forEach(function (d) { d.filter(function (w, i) { return d.indexOf(w) === i; }).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
  var vec = function (ws) { var tf = {}, v = {}; ws.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; }); Object.keys(tf).forEach(function (w) { v[w] = tf[w] * Math.log(1 + docs.length / (df[w] || 1)); }); return v; };
  var qt = tokenize(q);
  qt.slice().forEach(function (w) { Object.keys(EXPANSIONS).forEach(function (key) { if (w.indexOf(key.replace(/s$/, '')) === 0) qt = qt.concat(tokenize(EXPANSIONS[key])); }); });
  var qv = vec(qt);
  var cos = function (a, b) { var d = 0, na = 0, nb = 0; Object.keys(a).forEach(function (w) { na += a[w] * a[w]; if (b[w]) d += a[w] * b[w]; }); Object.keys(b).forEach(function (w) { nb += b[w] * b[w]; }); return d / (Math.sqrt(na * nb) || 1); };
  return docs.map(function (d, i) { return { c: clauses[i], s: cos(qv, vec(d)) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, k || 4).filter(function (x) { return x.s > 0; });
}

/* ---------- key terms ---------- */
var NUMWORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fourteen: 14, fifteen: 15, thirty: 30, sixty: 60, ninety: 90, twelve: 12 };
function extractTerms(clauses) {
  var money = [], durations = [], dates = [], defined = [], you = [], them = [], seen = {};
  var once = function (arr, key, item) { if (!seen[key]) { seen[key] = 1; arr.push(item); } };
  clauses.forEach(function (c) {
    var t = c.text;
    (t.match(/(?:[$€£]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|thousand|k))?|\b\d[\d,]*(?:\.\d+)?\s?(?:dollars|USD|EUR|euros|GBP))/gi) || []).forEach(function (m) { once(money, 'm' + m + c.ref, { value: m.trim(), ref: c.ref }); });
    var dre = /\b(?:(\d+)|(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|fifteen|thirty|sixty|ninety))(?:\s*\(\d+\))?\s+(business days?|days?|weeks?|months?|years?)\b/gi, m;
    while ((m = dre.exec(t))) { var n = m[1] ? +m[1] : NUMWORDS[m[2].toLowerCase()]; once(durations, 'd' + n + m[3] + c.ref, { value: n + ' ' + m[3].toLowerCase(), n: n, unit: m[3].toLowerCase().replace(/s$/, ''), ref: c.ref, context: t.slice(Math.max(0, m.index - 50), m.index + m[0].length + 30).trim() }); }
    (t.match(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/gi) || []).forEach(function (d) { once(dates, 'D' + d, { value: d, ref: c.ref }); });
    (t.match(/\((?:the\s+)?["“]([A-Z][\w ]{1,30})["”]\)/g) || []).forEach(function (d) { var name = d.replace(/^\((?:the\s+)?["“]|["”]\)$/g, ''); once(defined, 'T' + name, { term: name, ref: c.ref }); });
    t.split(/(?<=[.;])\s+/).forEach(function (s) {
      if (/\byou (must|shall|agree to|will|are responsible|are required)\b/i.test(s)) once(you, 'y' + s, { text: s.trim(), ref: c.ref });
      if (/\b([Ww]e|[Tt]he [Cc]ompany|[A-Z][a-zA-Z]+) may (?!be\b)/.test(s) && !/\byou may\b/i.test(s)) once(them, 't' + s, { text: s.trim(), ref: c.ref });
    });
  });
  return { money: money, durations: durations, dates: dates, defined: defined, obligations: you, theirRights: them };
}

/* ---------- version comparison ---------- */
function diffWords(a, b) {
  var A = String(a).split(/(\s+)/).filter(Boolean), B = String(b).split(/(\s+)/).filter(Boolean), n = A.length, m = B.length;
  var L = []; for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
  for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  var out = [], push = function (op, s) { if (out.length && out[out.length - 1].op === op) out[out.length - 1].text += s; else out.push({ op: op, text: s }); };
  i = 0; j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { push('same', A[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) { push('del', A[i]); i++; } else { push('add', B[j]); j++; } }
  while (i < n) push('del', A[i++]);
  while (j < m) push('add', B[j++]);
  return out;
}
function similarity(a, b) { var x = tokenize(a), y = tokenize(b); if (!x.length || !y.length) return 0; var inter = x.filter(function (w, i) { return x.indexOf(w) === i && y.indexOf(w) >= 0; }).length, uni = x.concat(y).filter(function (w, i, arr) { return arr.indexOf(w) === i; }).length; return inter / uni; }
/* Pair clauses by title, then by content similarity; report added, removed and changed clauses with risk deltas. */
function compareContracts(A, B) {
  var usedB = {}, pairs = [];
  A.forEach(function (a) {
    var best = null;
    B.forEach(function (b, j) { if (usedB[j]) return; var s = (cleanTitle(a.title).toLowerCase() === cleanTitle(b.title).toLowerCase() ? 1 : 0) + similarity(a.text, b.text); if (s > 0.35 && (!best || s > best.s)) best = { j: j, s: s }; });
    if (best) { usedB[best.j] = 1; pairs.push({ a: a, b: B[best.j] }); } else pairs.push({ a: a, b: null });
  });
  B.forEach(function (b, j) { if (!usedB[j]) pairs.push({ a: null, b: b }); });
  return pairs.map(function (p) {
    var ra = p.a ? p.a.risks.map(function (r) { return r.id; }) : [], rb = p.b ? p.b.risks.map(function (r) { return r.id; }) : [];
    var status = !p.a ? 'added' : !p.b ? 'removed' : p.a.text === p.b.text ? 'same' : 'changed';
    return { status: status, a: p.a, b: p.b, diff: status === 'changed' ? diffWords(p.a.text, p.b.text) : null, riskAdded: rb.filter(function (x) { return ra.indexOf(x) < 0; }), riskRemoved: ra.filter(function (x) { return rb.indexOf(x) < 0; }) };
  });
}

/* ---------- checklists ---------- */
var CHECKLISTS = {
  'Terms of service': [['How do I cancel?', 'cancel terminate account'], ['Are there refunds?', 'refund non-refundable fee'], ['Who owns what I upload?', 'content license ownership upload'], ['Is my data shared or sold?', 'personal information share partners advertisers'], ['How are disputes handled?', 'dispute arbitration court jurisdiction'], ['Can they change the terms?', 'modify change terms notice']],
  Lease: [['Rent amount and due date', 'rent due payment month'], ['Security deposit and return', 'deposit return refund damage'], ['Who pays for repairs?', 'repair maintenance landlord tenant'], ['Ending the lease early', 'terminate early notice break'], ['Rent increases', 'increase rent notice adjust'], ['Pets, guests and subletting', 'pets guests sublet assign']],
  Employment: [['Salary and pay schedule', 'salary compensation pay paid'], ['Working hours and overtime', 'hours overtime schedule'], ['Notice period to resign', 'notice terminate resign weeks'], ['Non-compete or non-solicit', 'compete solicit competitor'], ['Who owns your work?', 'intellectual property inventions work product assign'], ['Benefits and paid leave', 'benefits vacation leave holiday']],
  Freelance: [['Scope of work', 'services scope deliverables'], ['Rates, invoicing and late payment', 'fee rate invoice payment late'], ['Revisions and acceptance', 'revision changes acceptance approve'], ['Who owns the deliverables?', 'intellectual property ownership license deliverables'], ['Ending the contract', 'terminate notice cancel'], ['Liability limits', 'liability damages indemnify']],
};
function checklistCoverage(clauses, type) {
  return (CHECKLISTS[type] || []).map(function (item) { var hit = retrieve(clauses, item[0] + ' ' + item[1], 1)[0]; return { question: item[0], covered: !!hit && hit.s >= 0.12, clause: hit ? hit.c : null, score: hit ? hit.s : 0 }; });
}
function citeRefs(text) { var out = [], m, re = /§(\d+(?:\.\d+)*|[A-Z]\b)/g; while ((m = re.exec(text))) out.push(m[1]); return out; }

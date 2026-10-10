const C = () => segment(SAMPLE_TOS);
const byRef = (cs, r) => cs.find((c) => c.ref === r);

test('segment splits numbered and heading clauses', () => {
  const cs = C();
  assert.deepEq(cs.map((c) => c.ref), ['A', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
  assert.eq(cleanTitle(byRef(cs, '3').title), 'Subscriptions and Billing');
  assert.ok(byRef(cs, '3').text.startsWith('Paid plans are billed in advance.'));
  const s = segment('Section 1 Payment\nYou pay monthly by card on the first day of each month.\n\nARTICLE TWO\nBoth sides may end this agreement with notice in writing.');
  assert.deepEq(s.map((c) => c.ref), ['1', 'A']);
});

test('risk patterns flag the expected clauses', () => {
  const cs = C(), ids = (r) => byRef(cs, r).risks.map((x) => x.id).sort();
  assert.deepEq(ids('2'), ['unilateral']);
  assert.deepEq(ids('3'), ['autorenew', 'fees']);
  assert.deepEq(ids('4'), ['license']);
  assert.deepEq(ids('5'), ['datashare', 'tracking']);
  assert.deepEq(ids('10'), ['arbitration', 'classaction']);
  assert.deepEq(ids('1'), []);
  const rep = riskReport(cs);
  assert.eq(rep.score, 100);
  assert.eq(rep.flags.length, 13);
  assert.eq(rep.flags[0].r.sev, 'high');
});

test('readability metrics', () => {
  const simple = analyzeClause({ text: 'You can stop at any time. We will send you a note. It is free.' });
  const dense = analyzeClause({ text: 'Notwithstanding the aforementioned provisions, the indemnifying party shall, pursuant to the obligations hereinafter enumerated, compensate the indemnified party for consequential, incidental and exemplary damages arising thereof.' });
  assert.ok(simple.grade < 6 && dense.grade > 16, `${simple.grade} ${dense.grade}`);
  assert.ok(dense.legalese >= 4);
  assert.eq(syllables('agreement'), 3);
});

test('retrieve answers everyday questions from the right clause', () => {
  const cs = C(), top = (q) => retrieve(cs, q, 1)[0].c.ref;
  assert.ok(['3', '6'].includes(top('Can I cancel anytime?')));
  assert.eq(top('Do they sell my data?'), '5');
  assert.eq(top('Who owns my files?'), '4');
  assert.eq(top('Can I sue them?'), '10');
  assert.eq(retrieve(cs, 'xyzzy plugh').length, 0);
});

test('extractTerms finds money, deadlines, dates, defined terms and obligations', () => {
  const t = extractTerms(C());
  assert.deepEq(t.money.map((m) => [m.value, m.ref]), [['$50', '8']]);
  assert.deepEq(t.durations.map((d) => [d.n, d.unit, d.ref]), [[30, 'day', '3'], [3, 'month', '8']]);
  assert.deepEq(t.dates.map((d) => d.value), ['March 1, 2026']);
  assert.deepEq(t.defined.map((d) => d.term), ['Services', 'Content']);
  assert.ok(t.obligations.some((o) => o.ref === '9'));
  assert.deepEq(t.theirRights.map((r) => r.ref), ['2', '3', '5', '6'], 'includes "Prices may change"');
});

test('diffWords marks additions and deletions', () => {
  assert.deepEq(diffWords('the cat sat', 'the dog sat'), [{ op: 'same', text: 'the ' }, { op: 'del', text: 'cat' }, { op: 'add', text: 'dog' }, { op: 'same', text: ' sat' }]);
  assert.deepEq(diffWords('a', 'a'), [{ op: 'same', text: 'a' }]);
});

test('compareContracts aligns clauses and reports risk changes', () => {
  const r = compareContracts(segment(SAMPLE_TOS), segment(SAMPLE_TOS_V2));
  const by = (s) => r.filter((x) => x.status === s);
  assert.deepEq(by('added').map((x) => cleanTitle(x.b.title)), ['Account Security']);
  assert.eq(by('removed').length, 0);
  assert.deepEq(by('changed').map((x) => x.a.ref).sort(), ['3', '4', 'A']);
  const lic = r.find((x) => x.a && x.a.ref === '4');
  assert.deepEq(lic.riskRemoved, ['license']);
  assert.ok(lic.diff.some((d) => d.op === 'add' && /limited/.test(d.text)));
  assert.ok(r.some((x) => x.status === 'same' && cleanTitle(x.a.title) === 'Indemnification'), 'renumbered clause still matches');
  assert.ok(by('changed').find((x) => x.a.ref === '3').diff.some((d) => d.op === 'add' && /sixty/.test(d.text)));
});

test('checklist coverage and citations', () => {
  const cs = C();
  const tos = checklistCoverage(cs, 'Terms of service');
  assert.eq(tos.length, 6);
  assert.ok(tos.filter((x) => x.covered).length >= 5);
  assert.eq(tos.find((x) => /disputes/.test(x.question)).clause.ref, '10');
  assert.ok(checklistCoverage(cs, 'Employment').filter((x) => x.covered).length < tos.filter((x) => x.covered).length);
  assert.deepEq(citeRefs('See §3, §10.2 and §A.'), ['3', '10.2', 'A']);
});

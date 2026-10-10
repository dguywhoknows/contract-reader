const { $, $$, h, esc, busy, toast, md, store } = Kit;
const uid = () => Math.random().toString(36).slice(2, 9);
let docs = store.get('docs', null) || [{ id: uid(), name: 'CloudNest terms (sample)', text: SAMPLE_TOS, t: Date.now() }];
let curId = store.get('current', docs[0].id);
let clauses = [];
const saveDocs = () => { store.set('docs', docs); store.set('current', curId); };
const cur = () => docs.find((d) => d.id === curId) || docs[0];
const sevTag = (s) => (s === 'high' ? 'bad' : s === 'med' ? 'warn' : '');

/* ================= review ================= */
function openDoc(d) { curId = d.id; $('#doc').value = d.text; $('#docName').value = d.name; clauses = segment(d.text); saveDocs(); render(); }
function render() {
  const rep = riskReport(clauses);
  $('#tiles').innerHTML = [['Clauses', clauses.length], ['Words', rep.words.toLocaleString()], ['Reading time', rep.minutes + ' min'], ['Reading level', `grade ${rep.grade.toFixed(1)}`], ['Red flags', rep.flags.filter((f) => f.r.sev === 'high').length], ['Risk score', `${rep.score}/100`]]
    .map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v" style="font-size:19px">${v}</div></div>`).join('');
  $('#risks').innerHTML = rep.flags.map((f) => `<div class="risk" data-r="${f.refs[0]}"><span class="sev ${f.r.sev}">${f.r.sev}</span><div><b>${esc(f.r.label)}</b> <span class="small muted">in ${f.refs.map((r) => `§${r}`).join(', ')}</span><div class="small muted">${esc(f.r.why)}</div></div></div>`).join('') || '<div class="empty">No common risk patterns found.</div>';
  $$('#risks .risk').forEach((e) => (e.onclick = () => jump(e.dataset.r)));
  const mx = Math.max(16, ...clauses.map((c) => c.grade));
  $('#read').innerHTML = clauses.map((c) => `<div class="rb" data-r="${c.ref}" title="${esc(c.title)}"><span class="mono">§${c.ref}</span><div class="bar"><span style="width:${(100 * c.grade) / mx}%;background:${c.grade > 16 ? 'var(--bad)' : c.grade > 12 ? 'var(--warn)' : 'var(--good)'}"></span></div><span class="mono">${c.grade.toFixed(0)}</span></div>`).join('') + '<p class="small muted">Flesch-Kincaid grade level: 8 is plain English, 16+ is graduate-level legalese.</p>';
  $$('.rb').forEach((e) => (e.onclick = () => jump(e.dataset.r)));
  renderClauses();
}
function renderClauses() {
  const box = $('#clauses');
  box.innerHTML = '';
  clauses.filter((c) => !$('#filter').value || c.risks.length).forEach((c) => {
    let t = esc(c.text);
    c.risks.forEach((r) => { t = t.replace(new RegExp(r.re.source, 'gi'), (m) => `<mark title="${esc(r.label)}">${m}</mark>`); });
    const plain = h('div', { class: c.plain ? 'plain' : 'plain hidden' });
    if (c.plain) plain.innerHTML = md(c.plain);
    const orig = h('div', { class: 'orig' });
    orig.innerHTML = t;
    box.append(h('div', { class: 'clause', id: 'cl' + c.ref.replace(/\W/g, '_') },
      h('h3', {}, `§${c.ref} · ${cleanTitle(c.title)}`, ...c.risks.map((r) => h('span', { class: 'tag ' + sevTag(r.sev) }, r.label)), h('span', { class: 'tag' }, `grade ${c.grade.toFixed(0)}`), c.legalese ? h('span', { class: 'tag' }, `${c.legalese} legalese terms`) : ''),
      orig, h('div', { class: 'row', style: 'margin-top:6px' }, h('button', { class: 'btn sm', onclick: (e) => busy(e.currentTarget, () => explain(c, plain)) }, 'Plain English')), plain));
  });
}
function jump(ref) {
  Router.go('review');
  if (!$('#cl' + ref.replace(/\W/g, '_'))) { $('#filter').value = ''; renderClauses(); }
  const el = $('#cl' + ref.replace(/\W/g, '_'));
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $$('.clause').forEach((x) => x.classList.toggle('hl', x === el));
}
async function explain(c, el) {
  c.plain = await AI.chat([
    { role: 'system', content: 'Rewrite this contract clause in plain English at a grade-7 reading level: 1-3 short sentences, then "**What it means for you:**" with one concrete sentence. Do not add facts that are not in the clause. Not legal advice.' },
    { role: 'user', content: `${c.title}\n${c.text}` },
  ], { temperature: 0.2, demo: () => `${c.risks.length ? c.risks.map((r) => r.why).join(' ') : 'This section sets out general rules for how the agreement works.'}\n\n**What it means for you:** ${c.risks[0] ? `watch for "${c.risks[0].label.toLowerCase()}" here.` : 'nothing unusual; this is standard wording.'}` });
  el.innerHTML = md(c.plain);
  el.classList.remove('hidden');
}
const cite = (s) => s.replace(/§(\d+(?:\.\d+)*|[A-Z]\b)/g, '<span class="cite" data-r="$1">§$1</span>');
function bindCites(root) { root.querySelectorAll('.cite').forEach((e) => (e.onclick = () => jump(e.dataset.r))); }
$('#sumBtn').onclick = (e) => busy(e.currentTarget, async () => {
  const flags = clauses.flatMap((c) => c.risks.map((r) => `§${c.ref} ${r.label} (${r.sev})`));
  const out = await AI.chat([
    { role: 'system', content: 'You explain contracts to non-lawyers. Use the full text and the locally detected flags (verify them, do not just repeat). Cite clauses as §N. Return JSON {"tldr":"2 sentences","you_agree_to":["5-7 bullets, plain English, with §refs"],"red_flags":[{"issue":"","clause":"§N","severity":"high|med|low","why":""}],"questions_to_ask":["3-4 questions to ask before signing"],"fairness":"one sentence overall verdict"}. Not legal advice.' },
    { role: 'user', content: `Local flags: ${flags.join('; ') || 'none'}\n\n${clauses.map((c) => `§${c.ref} ${c.title}: ${c.text}`).join('\n\n').slice(0, 22000)}` },
  ], { json: true, temperature: 0.2, maxTokens: 2000, demo: () => (cur().text === SAMPLE_TOS ? DEMO_SUM : (() => { const rep = riskReport(clauses); return { tldr: `${rep.flags.length} common risk pattern${rep.flags.length === 1 ? '' : 's'} found across ${clauses.length} clauses, with a risk score of ${rep.score}/100.`, you_agree_to: extractTerms(clauses).obligations.slice(0, 6).map((o) => `${o.text} (§${o.ref})`), red_flags: rep.flags.map((f) => ({ issue: f.r.label, clause: '§' + f.refs[0], severity: f.r.sev, why: f.r.why })), questions_to_ask: checklistCoverage(clauses, 'Terms of service').filter((x) => !x.covered).map((x) => x.question), fairness: rep.score >= 60 ? 'Leans heavily toward the other side.' : rep.score >= 30 ? 'Some one-sided terms worth checking.' : 'No major red flags were detected.' }; })()) });
  const ul = (xs) => `<ul>${(xs || []).map((x) => `<li>${cite(esc(x))}</li>`).join('')}</ul>`;
  $('#summary').innerHTML = `<p><b>In short:</b> ${cite(esc(out.tldr || ''))}</p><div class="sum-cols"><div class="stat"><div class="k">You agree to</div>${ul(out.you_agree_to)}</div><div class="stat"><div class="k">Ask before signing</div>${ul(out.questions_to_ask)}</div></div><h3 style="margin-top:12px">Red flags</h3>${(out.red_flags || []).map((f) => `<div class="risk"><span class="sev ${esc(f.severity)}">${esc(f.severity)}</span><div><b>${esc(f.issue)}</b> ${cite(esc(f.clause || ''))}<div class="small muted">${esc(f.why)}</div></div></div>`).join('')}<p class="small" style="margin-top:10px"><b>Verdict:</b> ${esc(out.fairness || '')}</p>`;
  bindCites($('#summary'));
});
$('#ask').onclick = (e) => busy(e.currentTarget, async () => {
  const q = $('#q').value.trim();
  if (!q) return;
  const hits = retrieve(clauses, q);
  const text = await AI.chat([
    { role: 'system', content: 'Answer the question using ONLY the provided clauses. Start with a direct answer (Yes / No / It depends) in plain English, then 1-3 sentences of explanation citing clauses as §N. If the clauses don’t answer it, say so. Not legal advice.' },
    { role: 'user', content: `Question: ${q}\n\n${hits.map((x) => `§${x.c.ref} ${x.c.title}: ${x.c.text}`).join('\n\n')}` },
  ], { temperature: 0.1, demo: () => (hits.length ? `**Most relevant: §${hits[0].c.ref}.** It says: "${hits[0].c.text.slice(0, 200)}${hits[0].c.text.length > 200 ? '…' : ''}" ${hits[0].c.risks.map((r) => r.why).join(' ')}` : 'No clause in this document seems to cover that.') });
  $('#answer').innerHTML = `<div class="prose">${cite(md(text))}</div><div class="small muted" style="margin-top:6px">Retrieved: ${hits.map((x) => `<span class="cite" data-r="${x.c.ref}">§${x.c.ref}</span> ${(x.s * 100).toFixed(0)}%`).join(' · ') || 'nothing relevant'}</div>`;
  bindCites($('#answer'));
});
['Can I cancel anytime?', 'Do they sell my data?', 'Who owns my files?', 'Can I sue them?'].forEach((q) => $('#suggest').append(h('button', { class: 'btn sm ghost', onclick: () => { $('#q').value = q; $('#ask').click(); } }, q)));
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#ask').click(); });
$('#filter').onchange = renderClauses;
$('#scan').onclick = () => {
  const text = $('#doc').value;
  if (!segment(text).length) return toast('Paste a contract first', 'err');
  let d = cur();
  if (!d || (d.text !== text && d.name !== ($('#docName').value.trim() || d.name))) { d = { id: uid(), name: '', text, t: Date.now() }; docs.unshift(d); }
  d.text = text; d.name = $('#docName').value.trim() || d.name || `Document ${docs.length}`; d.t = Date.now();
  openDoc(d);
  toast('Saved to your library');
};
$('#sampleBtn').onclick = () => { let d = docs.find((x) => x.text === SAMPLE_TOS); if (!d) { d = { id: uid(), name: 'CloudNest terms (sample)', text: SAMPLE_TOS, t: Date.now() }; docs.unshift(d); } openDoc(d); };
$('#file').onchange = async (e) => { const f = e.target.files[0]; if (f) { const d = { id: uid(), name: f.name.replace(/\.\w+$/, ''), text: await f.text(), t: Date.now() }; docs.unshift(d); openDoc(d); } e.target.value = ''; };

/* ================= key terms ================= */
function renderTerms() {
  const t = extractTerms(clauses), refBtn = (r) => `<span class="cite" data-r="${r}">§${r}</span>`;
  const rows = (arr, f) => arr.map(f).join('') || '<div class="empty">None found.</div>';
  $('#tMoney').innerHTML = rows(t.money, (m) => `<div class="term-row"><b class="mono">${esc(m.value)}</b>${refBtn(m.ref)}</div>`);
  $('#tDur').innerHTML = rows(t.durations, (d) => `<div class="term-row"><b>${esc(d.value)}</b>${refBtn(d.ref)}<div class="ctx">…${esc(d.context)}…</div></div>`);
  $('#tDates').innerHTML = rows(t.dates, (d) => `<div class="term-row"><b>${esc(d.value)}</b>${refBtn(d.ref)}</div>`) + (t.defined.length ? `<h3 style="margin-top:12px">Defined terms</h3>${t.defined.map((d) => `<div class="term-row"><span>"${esc(d.term)}"</span>${refBtn(d.ref)}</div>`).join('')}` : '');
  $('#tYou').innerHTML = rows(t.obligations, (o) => `<div class="term-row"><span>${esc(o.text)}</span>${refBtn(o.ref)}</div>`);
  $('#tThem').innerHTML = rows(t.theirRights, (o) => `<div class="term-row"><span>${esc(o.text)}</span>${refBtn(o.ref)}</div>`);
  bindCites($('[data-page=terms]'));
}

/* ================= compare ================= */
function fillCompareSelects() {
  const opts = docs.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  ['#cmpA', '#cmpB'].forEach((s, i) => { const keep = $(s).value; $(s).innerHTML = opts; $(s).value = docs.some((d) => d.id === keep) ? keep : (docs[i] || docs[0]).id; });
}
function renderCompare() {
  fillCompareSelects();
  const A = docs.find((d) => d.id === $('#cmpA').value), B = docs.find((d) => d.id === $('#cmpB').value);
  if (!A || !B || A === B) { $('#cmpTiles').innerHTML = ''; $('#cmpList').innerHTML = '<div class="card empty">Pick two different documents, or load the revised sample.</div>'; return; }
  const r = compareContracts(segment(A.text), segment(B.text)), cnt = (s) => r.filter((x) => x.status === s).length;
  const added = r.flatMap((x) => x.riskAdded), removed = r.flatMap((x) => x.riskRemoved);
  const label = (id) => RISKS.find((x) => x.id === id)?.label || id;
  $('#cmpTiles').innerHTML = [['Changed', cnt('changed')], ['Added', cnt('added')], ['Removed', cnt('removed')], ['Unchanged', cnt('same')], ['New risk flags', added.length], ['Risk flags gone', removed.length]]
    .map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  const box = $('#cmpList');
  box.innerHTML = '';
  r.filter((x) => x.status !== 'same' || $('#cmpSame').checked).forEach((x) => {
    const c = x.b || x.a, body = h('div', { class: 'diff' });
    if (x.status === 'changed') body.innerHTML = x.diff.map((d) => (d.op === 'same' ? esc(d.text) : d.op === 'add' ? `<ins>${esc(d.text)}</ins>` : `<del>${esc(d.text)}</del>`)).join('');
    else if (x.status === 'added') body.innerHTML = `<ins>${esc(x.b.text)}</ins>`;
    else if (x.status === 'removed') body.innerHTML = `<del>${esc(x.a.text)}</del>`;
    else body.textContent = x.a.text;
    box.append(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', {}, `${x.a ? '§' + x.a.ref : ''}${x.a && x.b && x.a.ref !== x.b.ref ? ' → ' : ''}${x.b && (!x.a || x.a.ref !== x.b.ref) ? '§' + x.b.ref : ''} ${cleanTitle(c.title)}`),
      h('div', { class: 'row' }, h('span', { class: 'tag ' + (x.status === 'added' ? 'good' : x.status === 'removed' ? 'bad' : x.status === 'changed' ? 'warn' : '') }, x.status), ...x.riskAdded.map((id) => h('span', { class: 'tag bad' }, '+ ' + label(id))), ...x.riskRemoved.map((id) => h('span', { class: 'tag good' }, '− ' + label(id))))), body));
  });
}
$('#cmpA').onchange = renderCompare;
$('#cmpB').onchange = renderCompare;
$('#cmpSame').onchange = renderCompare;
$('#cmpSample').onclick = () => {
  let a = docs.find((d) => d.text === SAMPLE_TOS), b = docs.find((d) => d.text === SAMPLE_TOS_V2);
  if (!a) { a = { id: uid(), name: 'CloudNest terms (sample)', text: SAMPLE_TOS, t: Date.now() }; docs.push(a); }
  if (!b) { b = { id: uid(), name: 'CloudNest terms, September revision (sample)', text: SAMPLE_TOS_V2, t: Date.now() }; docs.push(b); }
  saveDocs(); fillCompareSelects(); $('#cmpA').value = a.id; $('#cmpB').value = b.id; renderCompare();
};

/* ================= checklist ================= */
Object.keys(CHECKLISTS).forEach((k) => $('#ckType').append(h('option', { value: k }, k)));
function renderChecklist() {
  const items = checklistCoverage(clauses, $('#ckType').value), box = $('#ckList');
  box.innerHTML = '';
  box.append(h('div', { class: 'small muted' }, `${items.filter((x) => x.covered).length} of ${items.length} addressed in "${cur().name}"`));
  items.forEach((x) => box.append(h('div', { class: 'card ck' }, h('span', { class: 'mark ' + (x.covered ? 'yes' : 'no') }, x.covered ? 'Yes' : '?'),
    h('div', {}, h('b', {}, x.question), x.covered ? h('div', { class: 'small' }, 'Covered in ', h('span', { class: 'cite', onclick: () => jump(x.clause.ref) }, `§${x.clause.ref}`), ` ${cleanTitle(x.clause.title)}: `, h('span', { class: 'muted' }, x.clause.text.slice(0, 160) + (x.clause.text.length > 160 ? '…' : ''))) : h('div', { class: 'small muted' }, 'Not clearly addressed. Ask about it before signing.')))));
}
$('#ckType').onchange = renderChecklist;

/* ================= library ================= */
function renderLibrary() {
  $('#libSummary').textContent = `${docs.length} document${docs.length === 1 ? '' : 's'} saved in this browser`;
  const box = $('#libList');
  box.innerHTML = '';
  docs.forEach((d) => {
    const cs = segment(d.text), rep = riskReport(cs);
    box.append(h('div', { class: 'card doc-card' + (d.id === curId ? ' cur' : '') }, h('b', {}, d.name), h('div', { class: 'small muted' }, `${cs.length} clauses · ${rep.words.toLocaleString()} words · saved ${new Date(d.t).toLocaleDateString()}`),
      h('div', { class: 'row' }, h('span', { class: 'tag ' + (rep.score >= 60 ? 'bad' : rep.score >= 30 ? 'warn' : 'good') }, `risk ${rep.score}/100`), ...rep.flags.filter((f) => f.r.sev === 'high').slice(0, 3).map((f) => h('span', { class: 'tag' }, f.r.label))),
      h('div', { class: 'row' }, h('button', { class: 'btn sm primary', onclick: () => { openDoc(d); Router.go('review'); } }, 'Open'), h('button', { class: 'btn sm ghost danger', onclick: () => { if (docs.length === 1) return toast('Keep at least one document', 'err'); if (!confirm(`Delete "${d.name}"?`)) return; docs = docs.filter((x) => x !== d); if (curId === d.id) openDoc(docs[0]); saveDocs(); renderLibrary(); } }, 'Delete'))));
  });
}

/* ================= boot ================= */
Router.on('terms', renderTerms);
Router.on('compare', renderCompare);
Router.on('checklist', renderChecklist);
Router.on('library', renderLibrary);
openDoc(cur());

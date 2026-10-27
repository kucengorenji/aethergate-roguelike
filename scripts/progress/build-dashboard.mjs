// Generates docs/progress/dashboard.html from the repo's own docs, git and the
// last recorded verify run. Never edit the HTML by hand: change the sources.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bullets, parseDocHeader, parseLog, parseMilestones, sections, table } from './parse.mjs';

const OUT = 'docs/progress/dashboard.html';
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

// ---------- data ----------

const { milestones, risks } = parseMilestones(read('docs/milestones.md'));
const log = parseLog(read('docs/progress/log.md'));
const current = milestones.find((m) => m.status !== 'done') ?? milestones.at(-1);
const allTasks = milestones.reduce((n, m) => n + m.total, 0);
const doneTasks = milestones.reduce((n, m) => n + m.done, 0);

const docsIn = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => /^\d{4}-.*\.md$/.test(f))
        .sort()
        .map((f) => ({ num: f.slice(0, 4), file: f, ...parseDocHeader(read(join(dir, f))) }))
    : [];
const plans = docsIn('docs/plans');
const specs = docsIn('docs/specs').map((s) => ({
  ...s,
  plan: plans.find((p) => p.num === s.num) ?? null,
}));
const adrs = docsIn('docs/decisions');

const design = sections(read('docs/design/game-design.md'));
const pillars = bullets(design['Pillars'] ?? '');
const controls = table(design['Camera and controls'] ?? '').rows;
const keyDecisions = bullets(
  sections(read('docs/decisions/0002-tps-roguelike-scope.md'))['Decision'] ?? '',
);
const commands = table(sections(read('AGENTS.md'))['Commands'] ?? '').rows;
const phases = table(sections(read('docs/workflows/sdlc.md'))['Phases'] ?? '').rows;
const budget = JSON.parse(read('perf-budget.json') || '{}');

// lefthook.yml: top-level hook names and the command names under them.
const hooks = [];
for (const line of read('lefthook.yml').split('\n')) {
  const hook = /^([a-z-]+):\s*$/.exec(line);
  const cmd = /^ {4}([a-z-]+):\s*$/.exec(line);
  if (hook) hooks.push({ name: hook[1], commands: [] });
  else if (cmd && hooks.length) hooks.at(-1).commands.push(cmd[1]);
}

const verify = existsSync('docs/progress/verify.json')
  ? JSON.parse(read('docs/progress/verify.json'))
  : null;

// A verify result is stale when code or config changed after it was recorded.
function newestMtime(paths) {
  let newest = 0;
  const walk = (p) => {
    if (!existsSync(p)) return;
    const st = statSync(p);
    if (st.isDirectory()) for (const f of readdirSync(p)) walk(join(p, f));
    else newest = Math.max(newest, st.mtimeMs);
  };
  paths.forEach(walk);
  return newest;
}
const codeChangedAt = newestMtime([
  'src',
  'tests',
  'scripts',
  'index.html',
  'package.json',
  'perf-budget.json',
  'vite.config.ts',
  'playwright.config.ts',
]);
const verifyStale = verify ? codeChangedAt > Date.parse(verify.at) : false;

const branch = git('rev-parse --abbrev-ref HEAD') || git('symbolic-ref --short HEAD');
const head = git('rev-parse --short HEAD');
const dirty = git('status --porcelain').split('\n').filter(Boolean).length;
const commits = head
  ? git('log -10 --date=short --pretty=format:%h%x09%ad%x09%s')
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split('\t'))
  : [];

// ---------- rendering helpers ----------

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\bspec (\d{4})\b/g, (m, num) => {
      const spec = specs.find((s) => s.num === num);
      return spec ? `<a href="../specs/${esc(spec.file)}">${m}</a>` : m;
    });
}

const fmtTime = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const ICON = { done: '✓', active: '◐', todo: '○' };
const LABEL = { done: 'done', active: 'in progress', planned: 'planned' };

const bar = (value, max, cls = '') =>
  `<span class="bar ${cls}"><i style="width:${Math.min(100, pct(value, max))}%"></i></span>`;

const statusChip = (status) => {
  const s = status.toLowerCase();
  const cls = /done|accepted|approved|pass/.test(s)
    ? 'ok'
    : /progress|active|draft/.test(s)
      ? 'warn'
      : /fail|reject|superseded/.test(s)
        ? 'bad'
        : 'mute';
  return `<span class="chip ${cls}">${esc(status || '?')}</span>`;
};

const taskList = (m) =>
  `<ul class="tasks">${m.tasks
    .map(
      (t) =>
        `<li class="${t.state}"><span class="ic">${ICON[t.state]}</span><span>${inline(t.text)}</span></li>`,
    )
    .join('')}${
    m.exit
      ? `<li class="${m.exit.state} exit"><span class="ic">${ICON[m.exit.state]}</span><span><b>Exit</b> ${inline(m.exit.text)}</span></li>`
      : ''
  }</ul>`;

const panel = (title, body, extra = '') =>
  `<section class="panel ${extra}"><h2>${title}</h2>${body}</section>`;

// ---------- sections ----------

const verifyBadge = verify
  ? `<span class="chip ${verify.ok ? (verifyStale ? 'warn' : 'ok') : 'bad'}">${verify.ok ? 'pass' : 'FAIL'}${verifyStale ? ' · stale' : ''}</span>`
  : '<span class="chip mute">not recorded</span>';

const header = `<header class="top">
  <div class="brand"><b>Aethergate</b><span>dev progress</span></div>
  <div class="kpi"><label>Current</label><span><b>${esc(current.id)}</b> ${esc(current.title)} · ${current.done}/${current.total}</span></div>
  <div class="kpi"><label>MVP</label><span>${bar(doneTasks, allTasks, 'gold')} ${doneTasks}/${allTasks} tasks · ${pct(doneTasks, allTasks)}%</span></div>
  <div class="kpi"><label>Verify</label><span>${verifyBadge}${verify ? ` <small>${fmtTime(verify.at)}</small>` : ''}</span></div>
  <div class="kpi"><label>Git</label><span><code>${esc(branch || 'no branch')}</code> ${head ? `<code>${esc(head)}</code>` : '<span class="chip warn">no commits</span>'} <small>${dirty} uncommitted</small></span></div>
  <div class="kpi right"><label>Generated</label><span><small>${fmtTime(new Date().toISOString())} · <code>pnpm progress</code></small></span></div>
</header>`;

const timeline = `<nav class="timeline">${milestones
  .map(
    (m) => `<a href="#${m.id}" class="ms ${m.status}${m === current ? ' current' : ''}">
    <div class="ms-top"><b>${esc(m.id)}</b><small>${esc(m.weeks ? `wk ${m.weeks}` : '')}</small></div>
    <div class="ms-title">${esc(m.title)}</div>
    <div class="ms-bot">${bar(m.done, m.total, m.status)}<small>${m.done}/${m.total}</small></div>
  </a>`,
  )
  .join('')}</nav>`;

const currentPanel = panel(
  `Now: ${esc(current.id)} ${esc(current.title)} ${statusChip(LABEL[current.status])}`,
  `${current.notes.map((n) => `<p class="note">${inline(n)}</p>`).join('')}${taskList(current)}`,
  'current-panel',
);

const allMilestones = panel(
  'Milestones',
  milestones
    .map(
      (m) => `<details id="${m.id}">
      <summary><b>${esc(m.id)}</b> ${esc(m.title)} <small>${esc(m.weeks ? `wk ${m.weeks}` : '')}</small><span class="sp"></span>${bar(m.done, m.total, m.status)}<small class="num">${m.done}/${m.total}</small></summary>
      ${taskList(m)}
    </details>`,
    )
    .join(''),
);

const activity = panel(
  `Activity <small>${log.length} entries · docs/progress/log.md</small>`,
  log.length
    ? `<ul class="log">${log
        .slice(0, 14)
        .map(
          (e, i) =>
            `<li>${i === 0 || log[i - 1].date !== e.date ? `<time>${esc(e.date.slice(5))}</time>` : '<time></time>'}<span class="tag">${esc(e.milestone ?? '--')}</span><span>${inline(e.text)}</span></li>`,
        )
        .join('')}</ul>`
    : '<p class="empty">No entries yet.</p>',
);

const specsPanel = panel(
  'Specs and plans',
  specs.length
    ? `<table><tr><th>#</th><th>Spec</th><th>Status</th><th>Plan</th></tr>${specs
        .map(
          (s) =>
            `<tr><td class="num">${s.num}</td><td><a href="../specs/${esc(s.file)}">${esc(s.title.replace(/^\d{4}: /, ''))}</a></td><td>${statusChip(s.status)}</td><td>${
              s.plan
                ? `<a href="../plans/${esc(s.plan.file)}">plan</a>`
                : '<span class="muted">none</span>'
            }</td></tr>`,
        )
        .join('')}</table>`
    : '<p class="empty">No specs yet.</p>',
);

const commitsPanel = panel(
  'Commits',
  commits.length
    ? `<ul class="log">${commits
        .map(
          ([h, d, s]) =>
            `<li><time>${esc(d.slice(5))}</time><code>${esc(h)}</code><span>${esc(s)}</span></li>`,
        )
        .join('')}</ul>`
    : '<p class="empty">No commits yet.</p>',
);

const decisionsPanel = panel(
  'Decisions',
  `<ul class="plain">${adrs
    .map(
      (a) =>
        `<li><a href="../decisions/${esc(a.file)}">${esc(a.title.replace(/^ADR /, ''))}</a> ${statusChip(a.status)}</li>`,
    )
    .join(
      '',
    )}</ul><ul class="dense">${keyDecisions.map((d) => `<li>${inline(d)}</li>`).join('')}</ul>`,
);

const metric = (label, value, max, unit) =>
  value === null || value === undefined || max === undefined
    ? `<div class="metric"><label>${label}</label><span class="muted">n/a</span></div>`
    : `<div class="metric"><label>${label}</label>${bar(value, max, value > max ? 'bad' : 'done')}<span class="num">${value}${unit} / ${max}${unit}</span></div>`;

const healthPanel = panel(
  'Health',
  verify
    ? `<div class="verify-row">${verifyBadge}<small>${fmtTime(verify.at)} · ${verify.durationSec}s · ${verify.head ? `<code>${esc(verify.head)}</code>` : 'no commit'}${
        verify.failedStep ? ` · failed at <code>${esc(verify.failedStep)}</code>` : ''
      }${verifyStale ? ' · code changed since, re-run <code>pnpm progress:verify</code>' : ''}</small></div>
      ${metric('Entry JS', verify.entryKB, budget.bundle?.maxEntryGzipKB, ' KB')}
      ${metric('Total JS', verify.totalKB, budget.bundle?.maxTotalGzipKB, ' KB')}
      ${metric('Step avg', verify.stepAvgMs, budget.frame?.maxAvgStepMs, ' ms')}
      ${metric('Step p95', verify.stepP95Ms, budget.frame?.maxP95StepMs, ' ms')}
      <div class="metric"><label>Tests</label><span class="num wide">${verify.unitTests ?? '?'} unit · ${verify.e2eTests ?? '?'} e2e</span></div>`
    : '<p class="empty">Run <code>pnpm progress:verify</code> to record a verify result.</p>',
);

const flowPanel = panel(
  'Workflow',
  `<ol class="flow">${phases
    .map(
      ([phase, , output, approves]) =>
        `<li><b>${esc(phase)}</b><span>${inline(output)}</span><small>${inline(approves)}</small></li>`,
    )
    .join(
      '',
    )}<li class="prog"><b>Progress</b><span>tick <code>docs/milestones.md</code>, log entry, <code>pnpm progress</code></span><small>every step</small></li></ol>
    <p class="note">Trivial fixes may skip Spec and Plan, never Verify. Specs live in <code>docs/specs</code>, plans in <code>docs/plans</code>.</p>`,
);

const gatePanel = panel(
  'Quality gate',
  `<ul class="dense">${hooks
    .map(
      (h) =>
        `<li><b>${esc(h.name)}</b> ${h.commands.map((c) => `<code>${esc(c)}</code>`).join(' ')}</li>`,
    )
    .join(
      '',
    )}<li><b>pnpm verify</b> format, lint, typecheck, unit, e2e + visual, bundle + CPU budget</li></ul>`,
);

const commandsPanel = panel(
  'Commands',
  `<table class="cmds">${commands
    .map(([cmd, what]) => `<tr><td>${inline(cmd)}</td><td>${inline(what)}</td></tr>`)
    .join('')}</table>`,
);

const designPanel = panel(
  'Design',
  `<ol class="dense">${pillars.map((p) => `<li>${inline(p)}</li>`).join('')}</ol>
   <table class="ctl">${controls.map(([k, a]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(a)}</td></tr>`).join('')}</table>
   <p class="note"><a href="../design/game-design.md">game-design.md</a></p>`,
);

const risksPanel = panel(
  'Risks',
  `<table>${risks.map(([r, m]) => `<tr><td>${esc(r)}</td><td class="muted">${esc(m)}</td></tr>`).join('')}</table>`,
);

// ---------- page ----------

const css = `
:root{--bg:#0e1014;--panel:#151920;--line:#252b35;--text:#d6dbe3;--muted:#8a93a2;--gold:#d8a548;--ok:#4fae78;--warn:#d8a548;--bad:#df5f59;--info:#6b9fdc;--code:#1d222b}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#f4f2ee;--panel:#fff;--line:#e2ddd4;--text:#24272d;--muted:#6c7280;--gold:#a87414;--ok:#2f8a57;--warn:#a87414;--bad:#c13d37;--info:#3a6fb0;--code:#f1eee8}}
*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;padding:8px 12px 16px;background:var(--bg);color:var(--text);font:12.5px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--info);text-decoration:none}a:hover{text-decoration:underline}
code,kbd,.num{font-family:ui-monospace,"JetBrains Mono",Consolas,monospace;font-size:11.5px}
code{background:var(--code);padding:0 3px;border-radius:3px}
kbd{border:1px solid var(--line);border-bottom-width:2px;border-radius:3px;padding:0 4px;white-space:nowrap}
small{color:var(--muted);font-size:11px}
.muted{color:var(--muted)}
.top{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:4px 0 8px;border-bottom:1px solid var(--line)}
.brand b{color:var(--gold);font-size:15px;letter-spacing:.02em}.brand span{color:var(--muted);margin-left:6px}
.kpi{display:flex;align-items:center;gap:6px}.kpi label{color:var(--muted);font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}
.kpi.right{margin-left:auto}
.bar{display:inline-block;width:64px;height:5px;border-radius:3px;background:var(--line);vertical-align:middle;overflow:hidden}
.bar i{display:block;height:100%;background:var(--muted)}
.bar.gold i,.bar.active i{background:var(--gold)}.bar.done i{background:var(--ok)}.bar.bad i{background:var(--bad)}
.chip{display:inline-block;padding:0 6px;border-radius:9px;font-size:10.5px;line-height:16px;border:1px solid currentColor;white-space:nowrap}
.chip.ok{color:var(--ok)}.chip.warn{color:var(--warn)}.chip.bad{color:var(--bad)}.chip.mute{color:var(--muted)}
.timeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin:8px 0}
.ms{display:block;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:5px 7px}
.ms:hover{text-decoration:none;border-color:var(--muted)}
.ms.current{border-color:var(--gold);box-shadow:inset 0 2px 0 var(--gold)}
.ms.done{opacity:.75}
.ms-top{display:flex;justify-content:space-between}.ms-title{font-size:11.5px;margin:1px 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ms-bot{display:flex;align-items:center;gap:5px}.ms-bot .bar{flex:1;width:auto}
.grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:start}
.col{display:grid;gap:8px;min-width:0}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px 9px 8px;min-width:0}
.panel h2{margin:0 0 5px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.panel h2 small{text-transform:none;letter-spacing:0;font-weight:400}
.current-panel{border-color:var(--gold)}.current-panel h2{color:var(--gold)}
.note{margin:0 0 4px;color:var(--muted)}
.empty{margin:0;color:var(--muted)}
ul,ol{margin:0;padding:0;list-style:none}
.tasks li{display:flex;gap:6px;padding:1.5px 0}
.tasks .ic{width:12px;flex:none;text-align:center;color:var(--muted)}
.tasks .done{color:var(--muted)}.tasks .done .ic{color:var(--ok)}
.tasks .active .ic{color:var(--gold)}.tasks .active{font-weight:500}
.tasks .exit{border-top:1px dashed var(--line);margin-top:3px;padding-top:3px}
details{border-top:1px solid var(--line)}details:first-of-type{border-top:0}
summary{display:flex;align-items:center;gap:6px;padding:3px 0;cursor:pointer;list-style:none}
summary::-webkit-details-marker{display:none}
summary::before{content:"▸";color:var(--muted);font-size:10px;width:10px}details[open] summary::before{content:"▾"}
.sp{flex:1}
details .tasks{padding:0 0 5px 16px}
.log li{display:grid;grid-template-columns:38px auto 1fr;gap:6px;padding:1.5px 0;align-items:baseline}
.log time{color:var(--muted);font-size:11px;font-family:ui-monospace,Consolas,monospace}
.tag{font-size:10px;color:var(--gold);font-family:ui-monospace,Consolas,monospace}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-weight:500;color:var(--muted);font-size:10.5px}
td,th{padding:2px 6px 2px 0;border-top:1px solid var(--line);vertical-align:top}
tr:first-child td,tr:first-child th{border-top:0}
.cmds td:first-child{width:38%;overflow-wrap:anywhere}.cmds td{overflow-wrap:anywhere}
.ctl td:first-child{width:90px}
.plain li{padding:1.5px 0}
.dense{margin-top:4px}.dense li{padding:1.5px 0 1.5px 10px;position:relative}
.dense li::before{content:"";position:absolute;left:0;top:8px;width:4px;height:1px;background:var(--muted)}
ol.dense{counter-reset:n}ol.dense li::before{counter-increment:n;content:counter(n);background:none;top:1.5px;width:auto;height:auto;color:var(--gold);font-size:10.5px}
ol.dense li{padding-left:14px}
.flow{display:grid;gap:3px;counter-reset:f}
.flow li{display:grid;grid-template-columns:62px 1fr auto;gap:6px;align-items:baseline;padding:2px 0 2px 6px;border-left:2px solid var(--line)}
.flow li.prog{border-left-color:var(--gold)}
.flow small{white-space:nowrap}
.verify-row{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px}
.metric{display:grid;grid-template-columns:62px 70px 1fr;gap:6px;align-items:center;padding:1.5px 0}
.metric label{color:var(--muted);font-size:11px}.metric .wide{grid-column:2/-1}.metric .bar{width:100%}
@media (max-width:1180px){.grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.col3{grid-column:1/-1;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}}
@media (max-width:720px){body{padding:8px 16px 16px}.grid{grid-template-columns:minmax(0,1fr)}.col3{grid-template-columns:minmax(0,1fr)}.kpi.right{margin-left:0}.flow li{grid-template-columns:56px 1fr}.flow small{display:none}}
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aethergate Progress</title>
<!-- Generated by scripts/progress/build-dashboard.mjs. Do not edit; run pnpm progress. -->
<style>${css}</style>
</head>
<body>
${header}
${timeline}
<main class="grid">
  <div class="col">${currentPanel}${allMilestones}${designPanel}</div>
  <div class="col">${activity}${specsPanel}${commitsPanel}${decisionsPanel}${risksPanel}</div>
  <div class="col col3">${healthPanel}${flowPanel}${gatePanel}${commandsPanel}</div>
</main>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(
  `Wrote ${OUT}: ${current.id} ${current.done}/${current.total}, MVP ${doneTasks}/${allTasks} tasks, verify ${verify ? (verify.ok ? 'pass' : 'FAIL') : 'not recorded'}${verifyStale ? ' (stale)' : ''}.`,
);

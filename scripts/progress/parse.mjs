// Parsers for the Markdown files the progress dashboard is built from.
// They are deliberately small and strict about the formats documented in
// docs/workflows/progress.md, so a malformed edit shows up as a test failure.

const STATES = { x: 'done', '~': 'active', ' ': 'todo' };

/** Splits Markdown into `{ heading: body }` for headings of one level. */
export function sections(md, level = 2) {
  const marker = `${'#'.repeat(level)} `;
  const out = {};
  let current = null;
  for (const line of md.split('\n')) {
    if (line.startsWith(marker)) {
      current = line.slice(marker.length).trim();
      out[current] = [];
    } else if (current !== null) {
      out[current].push(line);
    }
  }
  for (const key of Object.keys(out)) out[key] = out[key].join('\n').trim();
  return out;
}

/** First Markdown table in `md` as `{ header, rows }`, cells trimmed. */
export function table(md) {
  const lines = md.split('\n').filter((l) => l.trim().startsWith('|'));
  const cells = (l) =>
    l
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
  const [head, , ...body] = lines;
  return { header: head ? cells(head) : [], rows: body.map(cells) };
}

/** Top-level `- item` or `1. item` lines. */
export function bullets(md) {
  return md
    .split('\n')
    .map((l) => /^(?:-|\d+\.) (.*)$/.exec(l)?.[1])
    .filter((x) => x !== undefined);
}

function statusOf(items) {
  if (items.every((t) => t.state === 'done')) return 'done';
  if (items.some((t) => t.state !== 'todo')) return 'active';
  return 'planned';
}

/** docs/milestones.md -> milestones with tasks, exit check and derived status, plus risks. */
export function parseMilestones(md) {
  const milestones = [];
  let risks = [];
  for (const [heading, body] of Object.entries(sections(md))) {
    const m = /^(M\d+): (.+)$/.exec(heading);
    if (!m) {
      if (heading === 'Main risks') risks = table(body).rows;
      continue;
    }
    const tasks = [];
    let exit = null;
    const notes = [];
    let weeks = '';
    for (const line of body.split('\n')) {
      const task = /^- \[([x~ ])\] (.*)$/.exec(line);
      if (task) {
        const item = { state: STATES[task[1]], text: task[2] };
        const exitText = /^\*\*Exit:\*\* (.*)$/.exec(item.text);
        if (exitText) exit = { state: item.state, text: exitText[1] };
        else tasks.push(item);
      } else if (line.startsWith('Weeks: ')) {
        weeks = line.slice('Weeks: '.length).trim();
      } else if (line.trim()) {
        notes.push(line.trim());
      }
    }
    const all = exit ? [...tasks, exit] : tasks;
    milestones.push({
      id: m[1],
      title: m[2],
      weeks,
      notes,
      tasks,
      exit,
      done: all.filter((t) => t.state === 'done').length,
      total: all.length,
      status: all.length ? statusOf(all) : 'planned',
    });
  }
  return { milestones, risks };
}

/** docs/progress/log.md -> entries, in file order (newest first). */
export function parseLog(md) {
  const entries = [];
  for (const [date, body] of Object.entries(sections(md))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    for (const line of body.split('\n')) {
      const e = /^- (M\d+|--): (.*)$/.exec(line);
      if (e) entries.push({ date, milestone: e[1] === '--' ? null : e[1], text: e[2] });
    }
  }
  return entries;
}

/** Title and `Status:` line of a spec, plan or ADR. */
export function parseDocHeader(md) {
  return {
    title: /^# (.*)$/m.exec(md)?.[1].trim() ?? '',
    status: /^Status: (.*)$/m.exec(md)?.[1].trim() ?? '',
  };
}

/** Pulls the numbers the dashboard shows out of `pnpm verify` output. */
export function parseVerifyOutput(text) {
  const num = (re) => {
    const v = re.exec(text)?.[1];
    return v === undefined ? null : Number(v);
  };
  return {
    entryKB: num(/entry ([\d.]+) KB \//),
    totalKB: num(/total ([\d.]+) KB \//),
    stepAvgMs: num(/step ms: avg ([\d.]+)/),
    stepP95Ms: num(/step ms: avg [\d.]+, p95 ([\d.]+)/),
    unitTests: num(/Tests\s+(\d+) passed/),
    e2eTests: num(/^\s*(\d+) passed/m),
  };
}

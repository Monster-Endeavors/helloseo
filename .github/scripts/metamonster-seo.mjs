// Grades the Markdown pages a pull request changes with MetaMonster's
// pre-publish analysis and fails the job when any page's gate is "fail".
// No dependencies: Node 20+.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'

const API = process.env.METAMONSTER_API_URL || 'https://new.metamonster.ai/api/v1'
const { METAMONSTER_API_KEY: key, METAMONSTER_SITE_ID: siteId, BASE_SHA, HEAD_SHA, EXTERNAL_REF, PR_TITLE } = process.env
if (!key || !siteId) throw new Error('Set the METAMONSTER_API_KEY secret and the METAMONSTER_SITE_ID variable.')

// "src/content/blog/=/blog/,src/content/docs/=/docs/"
const routes = (process.env.CONTENT_ROUTES || 'src/content/blog/=/blog/').split(',').map(r => r.split('='))

function urlFor(file) {
  for (const [dir, prefix] of routes) {
    if (!file.startsWith(dir)) continue
    const slug = file.slice(dir.length).replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '')
    const trailing = process.env.TRAILING_SLASH !== 'false' && slug ? '/' : ''
    return `${prefix}${slug}${trailing}`.replace(/\/+/g, '/')
  }
  return null
}

const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=AMR', `${BASE_SHA}...${HEAD_SHA}`], { encoding: 'utf8' })
  .split('\n').filter(f => /\.mdx?$/.test(f) && existsSync(f))
const frontmatterTitle = (text) => {
  const fm = text.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? ''
  const t = fm.match(/^title:\s*(.+)$/m)?.[1]?.trim()
  return t ? t.replace(/^(['"])(.*)\1$/, '$2') : null
}
const pages = changed.map(f => ({ file: f, url: urlFor(f), title: frontmatterTitle(readFileSync(f, 'utf8')) })).filter(p => p.url)
  .filter(p => !/^draft:\s*true\s*$/m.test(readFileSync(p.file, 'utf8').split(/^---\s*$/m)[1] ?? ''))

if (pages.length === 0) { console.log('No published content pages changed.'); process.exit(0) }

async function evaluate(batch) {
  const res = await fetch(`${API}/sites/${siteId}/proposals/evaluate`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      external_ref: EXTERNAL_REF,
      title: PR_TITLE?.slice(0, 300),
      revision_label: HEAD_SHA.slice(0, 12),
      depth: 'fast',
      pages: batch.map(p => ({ url: p.url, markdown: readFileSync(p.file, 'utf8') })),
    }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`MetaMonster ${res.status}: ${body?.error?.code ?? ''} ${body?.error?.message ?? ''}`)
  return body.data
}

let proposal = null
const results = []
for (let i = 0; i < pages.length; i += 20) {
  const data = await evaluate(pages.slice(i, i + 20))
  proposal = data.proposal
  results.push(...data.pages)
}

// ---- Report -------------------------------------------------------------

const GATE = { pass: '✅ Pass', warn: '⚠️ Warn', fail: '❌ Fail', pending: '⏳ Pending' }
const ICON = { pass: '✅', warn: '⚠️', fail: '❌', pending: '⏳' }
const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
// Older API responses carry plain check keys; newer ones carry labels and areas.
const named = x => (typeof x === 'string' ? { check: x, label: x, factor_label: null } : { ...x, label: x.label ?? x.check, factor_label: x.factor_label ?? null })

/** "57% (target ≥ 90%)" for a numeric measurement with a min/max target, else ''. */
function measure(e) {
  if (typeof e.value !== 'number' || !e.target) return ''
  const u = e.check === 'image_alt_text' ? '%' : ''
  const t = e.target
  const target = t.min !== undefined && t.max !== undefined ? `${t.min}–${t.max}${u}` : t.min !== undefined ? `≥ ${t.min}${u}` : `≤ ${t.max}${u}`
  return `${e.value}${u} (target ${target})`
}

/** One factor per line: icon, name, the measurement when there is one, and what to fix. */
function factorLines(list, icon) {
  return list.map(named).map((e) => {
    const m = measure(e)
    let line = `${icon} **${e.label}**${m ? ` · ${m}` : ''}${e.message && icon !== ICON.pass ? ` — ${e.message}` : ''}`
    if (e.missing_alt?.length) line += `<br>&nbsp;&nbsp;&nbsp;&nbsp;<sub>Missing alt: ${e.missing_alt.slice(0, 5).map(src => `\`${src}\``).join(', ')}${e.missing_alt.length > 5 ? ` +${e.missing_alt.length - 5} more` : ''}</sub>`
    return line
  }).join('<br>\n')
}

const count = (p, k) => p.diff?.[k]?.length ?? 0
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const postTitle = p => pages.find(x => x.url === p.url)?.title ?? p.url
const RANK = { fail: 0, pending: 1, warn: 2, pass: 3 }
results.sort((a, b) => (RANK[a.gate_result] ?? 1) - (RANK[b.gate_result] ?? 1) || postTitle(a).localeCompare(postTitle(b)))
const overall = results.some(p => p.gate_result === 'fail') ? 'fail' : results.some(p => p.gate_result === 'warn') ? 'warn' : 'pass'

const lines = [
  '<!-- metamonster-seo -->',
  '## MetaMonster SEO check',
  '',
  `**${GATE[overall]}** · ${plural(results.length, 'page')} graded. ${
    overall === 'fail' ? 'Fix the failing factors below and push again.'
      : overall === 'warn' ? 'Nothing is failing; the warnings are worth a look.' : 'Every graded factor passes.'}`,
  '',
]
if (results.length > 1) {
  lines.push('| Post | Result | Failing | Warnings | Passed |', '| --- | --- | :---: | :---: | :---: |',
    ...results.map(p => `| ${cell(postTitle(p))} | ${GATE[p.gate_result] ?? p.gate_result} | ${count(p, 'failing')} | ${count(p, 'warnings')} | ${count(p, 'passing')} |`), '')
}

for (const p of results) {
  const file = pages.find(x => x.url === p.url)?.file ?? p.url
  const d = p.diff ?? { failing: [], warnings: [], passing: [], not_evaluated: [] }
  const collapse = results.length > 1 && p.gate_result === 'pass'
  if (collapse) lines.push(`<details><summary>${ICON.pass} <b>${cell(postTitle(p))}</b> passes (${plural(count(p, 'passing'), 'factor')})</summary>`, '')
  else lines.push('---', '', `### ${ICON[p.gate_result] ?? '⏳'} ${postTitle(p)}`, '')
  const meta = [`URL \`${p.url}\``, `File \`${file}\``]
  if (p.keyword !== undefined) meta.push(`Keyword **${p.keyword ?? 'none'}**`)
  lines.push(meta.join(' · '), '')
  const issues = [factorLines(d.failing ?? [], ICON.fail), factorLines(d.warnings ?? [], ICON.warn)].filter(Boolean).join('<br>\n')
  if (issues) lines.push(issues, '')
  // A collapsed passing post already hides its list; don't nest a second dropdown.
  if (d.passing?.length && collapse) lines.push(factorLines(d.passing, ICON.pass), '')
  else if (d.passing?.length) lines.push(`<details><summary>${ICON.pass} ${plural(d.passing.length, 'factor')} passed</summary>`, '', factorLines(d.passing, ICON.pass), '', '</details>', '')
  if (d.not_evaluated?.length) {
    lines.push(`<details><summary>➖ ${plural(d.not_evaluated.length, 'factor')} not evaluated</summary>`, '',
      '_These need something the Markdown file doesn\'t contain, such as schema or a canonical tag your layout adds._', '',
      factorLines(d.not_evaluated, '➖'), '', '</details>', '')
  }
  if (collapse) lines.push('</details>', '')
}

lines.push('---', `<sub>Graded by MetaMonster pre-publish analysis${proposal ? ` · proposal #${proposal.id}${proposal.revision ? `, revision ${proposal.revision}` : ''}` : ''} · commit \`${HEAD_SHA.slice(0, 7)}\`</sub>`)
const report = lines.join('\n')
// GitHub caps a comment at 65,536 characters; past that, the comment keeps the summary and links the job summary.
const LIMIT = 60000
const runUrl = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null
const summaryEnd = lines.indexOf('---')
const comment = report.length <= LIMIT ? report
  : [...lines.slice(0, summaryEnd === -1 ? lines.length : summaryEnd), '', `_The full report is too long for a comment.${runUrl ? ` See the [job summary](${runUrl}).` : ''}_`].join('\n')
writeFileSync('metamonster-report.md', comment)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report)
console.log(report)

if (overall === 'fail') { console.error('A page failed the MetaMonster gate.'); process.exit(1) }

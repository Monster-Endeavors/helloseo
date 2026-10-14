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
const pages = changed.map(f => ({ file: f, url: urlFor(f) })).filter(p => p.url)
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

const results = []
for (let i = 0; i < pages.length; i += 20) results.push(...(await evaluate(pages.slice(i, i + 20))).pages)

const ICON = { pass: '✅', warn: '⚠️', fail: '❌' }
const measure = (e) => {
  if (typeof e.value !== 'number' || !e.target) return ''
  const u = e.check === 'image_alt_text' ? '%' : ''
  return ` ${e.value}${u} (target ${e.target.min !== undefined ? `≥ ${e.target.min}${u}` : `≤ ${e.target.max}${u}`})`
}
const lines = ['## MetaMonster SEO check', '']
for (const p of results) {
  const file = pages.find(x => x.url === p.url)?.file ?? p.url
  lines.push(`### ${ICON[p.gate_result] ?? '⏳'} \`${file}\` → ${p.url} · **${p.gate_result}**`)
  if (p.keyword !== undefined) lines.push(`Graded on keyword: ${p.keyword ? `"${p.keyword}"` : 'none'}`, '')
  const d = p.diff ?? { failing: [], warnings: [], not_evaluated: [] }
  for (const [label, list] of [['Failing', d.failing], ['Warnings', d.warnings]]) {
    if (!list?.length) continue
    lines.push(`**${label} (${list.length})**`)
    for (const e of list) {
      lines.push(`- \`${e.check}\`${measure(e)}: ${e.message}`)
      if (e.missing_alt?.length) lines.push(`  - missing alt: ${e.missing_alt.slice(0, 5).join(', ')}`)
    }
    lines.push('')
  }
  if (d.not_evaluated?.length) lines.push(`<sub>Not evaluated: ${d.not_evaluated.join(', ')}</sub>`, '')
}
const report = lines.join('\n')
writeFileSync('metamonster-report.md', report)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report)
console.log(report)

if (results.some(p => p.gate_result === 'fail')) { console.error('A page failed the MetaMonster gate.'); process.exit(1) }

/* eslint-disable no-console, n/no-process-exit */
/**
 * JSDoc completeness ratchet (G2 of the auto-update guarantee).
 *
 * For every Cn* SFC, scores the JSDoc coverage on its props, events, and
 * named slots, then compares against a per-component baseline committed
 * at scripts/.jsdoc-baselines.json. CI fails when any component's score
 * regresses below baseline; new components (no baseline entry) must
 * score 100%.
 *
 * Spec: openspec/changes/unify-component-docs/specs/component-reference/
 *       spec.md "Requirement: JSDoc completeness ratchet"
 *
 * Modes:
 *   node scripts/check-jsdoc.js           Verify against baseline (CI mode)
 *   node scripts/check-jsdoc.js --update  Regenerate baseline file
 *   node scripts/check-jsdoc.js --json    Emit raw scores as JSON
 *
 * Why we resolve vue-docgen-api from docusaurus/node_modules:
 *   The package is already installed there as a transitive dep of
 *   vue-docgen-cli. Adding it as a separate root devdep would duplicate
 *   the install and complicate the lockfile. The script is a developer
 *   tool, not part of the published library bundle.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const COMPONENTS_DIR = path.join(ROOT, 'src/components')
const BASELINE_FILE = path.join(__dirname, '.jsdoc-baselines.json')
const DOCGEN_API_PATH = path.join(ROOT, 'docusaurus/node_modules/vue-docgen-api')

// Resolve vue-docgen-api from the docusaurus install. If it's missing, the
// dev hasn't run `cd docusaurus && npm install` yet — give a clear hint.
let parse
try {
	parse = require(DOCGEN_API_PATH).parse
} catch (err) {
	console.error(
		'[check-jsdoc] Failed to load vue-docgen-api from docusaurus/node_modules.\n'
		+ '             Run `cd docusaurus && npm install --legacy-peer-deps` first.',
	)
	process.exit(2)
}

const args = process.argv.slice(2)
const UPDATE_MODE = args.includes('--update')
const JSON_MODE = args.includes('--json')

/**
 * @returns {string[]} Absolute paths to every `CnFoo/CnFoo.vue` SFC.
 */
function findCnSfcs() {
	const dirs = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true })
		.filter(d => d.isDirectory() && d.name.startsWith('Cn'))
	return dirs
		.map(d => path.join(COMPONENTS_DIR, d.name, `${d.name}.vue`))
		.filter(p => fs.existsSync(p))
}

/**
 * Score one component. A documented item counts 1; an undocumented item
 * counts 0. The score is documented / total. Components with no
 * props/events/slots score 1.0 (vacuously documented).
 *
 * Documentation rules (per spec):
 *  - Prop: non-empty description.
 *  - Event: non-empty description (incl. JSDoc on $emit site).
 *  - Slot: non-empty description.
 *
 * @returns {{component, score, total, documented, missing}}
 */
async function scoreSfc(sfcPath) {
	const componentName = path.basename(sfcPath, '.vue')
	const doc = await parse(sfcPath)

	const items = []

	for (const p of doc.props || []) {
		items.push({
			kind: 'prop',
			name: p.name,
			documented: Boolean((p.description || '').trim()),
		})
	}

	// vue-docgen-api emits each $emit site separately AND any @event JSDoc
	// tag, so the same logical event can appear twice. Dedupe by name and
	// take the richest description.
	const eventByName = new Map()
	for (const e of doc.events || []) {
		const m = e.name.match(/^([\w-]+)\s+(.+)$/s)
		const cleanName = m ? m[1] : e.name
		const inferredDesc = m ? m[2].trim() : ''
		const desc = ((e.description || '').trim() || inferredDesc).trim()
		const existing = eventByName.get(cleanName)
		if (!existing || desc.length > existing.length) {
			eventByName.set(cleanName, desc)
		}
	}
	for (const [name, desc] of eventByName) {
		items.push({ kind: 'event', name, documented: Boolean(desc) })
	}

	for (const s of doc.slots || []) {
		items.push({
			kind: 'slot',
			name: s.name,
			documented: Boolean((s.description || '').trim()),
		})
	}

	const total = items.length
	const documented = items.filter(i => i.documented).length
	const score = total === 0 ? 1.0 : documented / total
	const missing = items.filter(i => !i.documented).map(i => `${i.kind}:${i.name}`)

	return { component: componentName, score, total, documented, missing }
}

/**
 * Round to 2 decimals so baseline diffs are stable across reruns.
 */
function round(n) {
	return Math.round(n * 100) / 100
}

async function main() {
	const sfcs = findCnSfcs()
	const results = []
	for (const sfc of sfcs) {
		try {
			results.push(await scoreSfc(sfc))
		} catch (err) {
			console.error(`[check-jsdoc] Failed to parse ${path.relative(ROOT, sfc)}: ${err.message}`)
			process.exit(2)
		}
	}
	results.sort((a, b) => a.component.localeCompare(b.component))

	if (JSON_MODE) {
		console.log(JSON.stringify(results, null, 2))
		return
	}

	if (UPDATE_MODE) {
		const baseline = {}
		for (const r of results) baseline[r.component] = round(r.score)
		baseline.__schema__ = {
			generatedBy: 'scripts/check-jsdoc.js --update',
			rule: 'CI fails if any component score < baseline. New components require 1.0.',
		}
		fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + '\n')
		console.log(`[check-jsdoc] Wrote baseline for ${results.length} components → ${path.relative(ROOT, BASELINE_FILE)}`)
		return
	}

	let baseline = {}
	if (fs.existsSync(BASELINE_FILE)) {
		baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
	}

	const failures = []
	for (const r of results) {
		const key = r.component
		const observed = round(r.score)
		const expected = key in baseline ? baseline[key] : 1.0
		const isNew = !(key in baseline)
		if (observed < expected) {
			failures.push({ ...r, observed, expected, isNew })
		}
	}

	// Pretty print: per-component score table.
	const longestName = Math.max(0, ...results.map(r => r.component.length))
	console.log('\nJSDoc completeness scores (Cn* components):')
	console.log('─'.repeat(longestName + 30))
	for (const r of results) {
		const pct = (r.score * 100).toFixed(0).padStart(3) + '%'
		const baselineMark = r.component in baseline
			? `(baseline ${(baseline[r.component] * 100).toFixed(0)}%)`
			: '(NEW — must be 100%)'
		console.log(`  ${r.component.padEnd(longestName)}  ${pct}  ${r.documented}/${r.total}  ${baselineMark}`)
	}
	console.log('─'.repeat(longestName + 30))

	if (failures.length === 0) {
		console.log(`✓ All ${results.length} components meet their JSDoc baseline.`)
		console.log('  Tip: improve coverage in a PR, then `npm run jsdoc-baselines:update` to bump the bar.\n')
		return
	}

	console.error('\n✗ JSDoc completeness regression(s):\n')
	for (const f of failures) {
		const expectedPct = (f.expected * 100).toFixed(0)
		const observedPct = (f.observed * 100).toFixed(0)
		const lead = f.isNew
			? `${f.component} is a new component and MUST score 100%`
			: `${f.component} score dropped from baseline ${expectedPct}% to ${observedPct}%`
		console.error(`  • ${lead}`)
		console.error(`    File: src/components/${f.component}/${f.component}.vue`)
		console.error(`    Missing JSDoc on:`)
		for (const m of f.missing) {
			console.error(`      - ${m}`)
		}
		console.error('')
	}
	console.error('How to fix:')
	console.error('  1. Add the missing JSDoc to the SFC (see CLAUDE.md "Documenting components").')
	console.error('  2. Re-run `npm run check:jsdoc` to confirm.')
	console.error('  3. If you intentionally improved coverage, run `npm run jsdoc-baselines:update`')
	console.error('     and commit the bumped baseline.\n')
	process.exit(1)
}

main().catch(err => {
	console.error(err)
	process.exit(2)
})

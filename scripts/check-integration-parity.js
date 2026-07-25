#!/usr/bin/env node

/**
 * Integration registry parity gate.
 *
 * Per AD-11/AD-13 of the `pluggable-integration-registry` umbrella,
 * every registered integration must declare BOTH a sidebar `tab`
 * component AND a `widget` component (the widget can be a thin shell
 * around the tab's data for MVP parity, but it must exist). The
 * registry throws at `register()` time when one is missing — this
 * gate catches the same condition statically, before merge, for the
 * descriptors shipped in this repo's `src/integrations/`. This is the
 * HARD half of the gate (exit 1 on failure).
 *
 * ADR-066 extension — server↔JS leaf parity (WARN-only, bake-in epoch).
 * A leaf has two faces (see OpenRegister `LeafDescriptor`): a server-side
 * descriptor contributed via `RegisterLeafProvidersEvent` (discoverable in
 * the `openregister.integrations.leaves` capability) and a JS
 * `registerIntegration({ id })` that mounts the tab + widget on
 * `window.OCA.OpenRegister.integrations`. The descriptor `id` MUST equal
 * the JS registration id (ADR-019 parity). When only one side exists you
 * get a PHANTOM render surface: a `render-surface` descriptor discoverable
 * server-side whose JS widget never registered (renders nothing), or a JS
 * registration with no server descriptor (invisible to the capability).
 * This gate cross-references the two WITHIN the repo it runs against
 * (`process.cwd()`), flagging orphans both ways. It is WARN-only: it never
 * changes the exit code, matching the fleet's gate-introduction pattern
 * (introduce as a warning, promote to blocking after a bake-in epoch once
 * the fleet is clean). See the deferred follow-up notes in
 * {@link crossReferenceServerLeaves}.
 *
 * Run via `npm run check:integration-parity` (wired into the
 * Code Quality CI workflow and the pre-commit hook). The cross-ref phase
 * only activates when the repo it runs against carries server-side leaf
 * descriptors (a `lib/**` PHP `new LeafDescriptor(...)`), so it is a no-op
 * for this JS-only library's own CI and only speaks up inside a consuming
 * app repo (hermiq, openconnector, …) that ships both faces.
 *
 * Exit codes:
 *   0 — every descriptor is parity-complete (WARN-only cross-ref findings
 *       do NOT change this)
 *   1 — at least one descriptor is missing `tab` or `widget`, or
 *       carries a malformed `id` / `label`
 */

'use strict'

const path = require('path')
const fs = require('fs')

/**
 * Run the parity gate: the HARD tab/widget check on this repo's built-in
 * descriptors, then the WARN-only ADR-066 server↔JS cross-ref against the
 * target repo (`process.cwd()`). Calls `process.exit()` with the HARD
 * result — the cross-ref findings never change it.
 *
 * @return {void}
 */
function main() {
	// --- HARD half: tab/widget parity on THIS repo's built-in descriptors. --
	const failures = []

	// The built-in registrations are the only descriptors that live in
	// this repo. Leaf changes in other repos register their own and run
	// their own copy of this gate (and the hydra quality gate enforces it
	// cross-repo). Importing the module gives us the normalised array
	// without spinning up Vue.
	let builtinIntegrations
	try {
		// eslint-disable-next-line global-require, import/no-unresolved
		builtinIntegrations = require(path.resolve(__dirname, '../src/integrations/builtin/index.js')).builtinIntegrations
	} catch (e) {
		// Fall back to a source scan if the module can't be required in
		// this environment (e.g. ESM-only toolchains). We look for the
		// per-id descriptor files and verify each names a `tab:` and
		// `widget:` key. This is coarser but never throws.
		const dir = path.resolve(__dirname, '../src/integrations/builtin')
		for (const file of fs.readdirSync(dir)) {
			if (file === 'index.js' || !file.endsWith('.js')) {
				continue
			}
			const src = fs.readFileSync(path.join(dir, file), 'utf8')
			if (!/\btab\s*:/.test(src)) {
				failures.push(`${file}: no \`tab:\` key found`)
			}
			if (!/\bwidget\s*:/.test(src)) {
				failures.push(`${file}: no \`widget:\` key found`)
			}
		}
	}

	if (Array.isArray(builtinIntegrations)) {
		for (const d of builtinIntegrations) {
			const label = d && typeof d.id === 'string' && d.id !== '' ? d.id : '(unknown)'
			if (typeof d.id !== 'string' || d.id === '') {
				failures.push(`${label}: missing or empty \`id\``)
			}
			if (typeof d.label !== 'string' || d.label === '') {
				failures.push(`${label}: missing or empty \`label\``)
			}
			if (d.tab === undefined || d.tab === null) {
				failures.push(`${label}: missing required \`tab\` component`)
			}
			if (d.widget === undefined || d.widget === null) {
				failures.push(`${label}: missing required \`widget\` component`)
			}
		}
	}

	report(failures)

	// --- WARN half (ADR-066): server↔JS leaf parity on the target repo. -----
	// Never changes the exit code (bake-in epoch). Runs against process.cwd()
	// so the hydra gate — which cd's into the app repo before invoking this
	// check via the app's wrapper — picks up the app's own PHP + JS.
	try {
		const { warnings, ran } = crossReferenceServerLeaves(process.cwd())
		reportCrossRef(warnings, ran)
	} catch (e) {
		// A cross-ref scan must NEVER break the gate — it is advisory. Surface
		// the reason and carry on with the hard-check exit code.
		// eslint-disable-next-line no-console
		console.error(`  (server↔JS leaf cross-ref skipped: ${e && e.message})`)
	}

	process.exit(failures.length === 0 ? 0 : 1)
}

/**
 * Recursively collect files under `root` that match `test(filename)`, up to
 * `maxDepth` levels deep. Skips `node_modules`, `vendor`, `.git`, and `dist`.
 * Returns [] when `root` does not exist. Never throws on an unreadable dir.
 *
 * @param {string} root The directory to walk.
 * @param {(name: string) => boolean} test Filename predicate.
 * @param {number} [maxDepth] Maximum recursion depth (default 6).
 *
 * @return {string[]} Absolute paths of matching files.
 */
function collectFiles(root, test, maxDepth = 6) {
	const out = []
	if (!fs.existsSync(root)) {
		return out
	}
	const skip = new Set(['node_modules', 'vendor', '.git', 'dist', 'build'])
	const walk = (dir, depth) => {
		if (depth > maxDepth) {
			return
		}
		let entries
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true })
		} catch (e) {
			return
		}
		for (const ent of entries) {
			if (ent.isDirectory()) {
				if (!skip.has(ent.name)) {
					walk(path.join(dir, ent.name), depth + 1)
				}
			} else if (ent.isFile() && test(ent.name)) {
				out.push(path.join(dir, ent.name))
			}
		}
	}
	walk(root, 0)
	return out
}

/**
 * Extract the server-side render-surface leaf descriptors declared in a
 * repo's PHP (`lib/**`). Finds every `new LeafDescriptor( … )` constructor
 * call, reads its `id:` argument (a string literal, or a `self::CONST`
 * resolved from a `const CONST = '...'` in the same file), and records
 * whether the descriptor's `kinds:` array contains `KIND_RENDER_SURFACE`
 * (either the `LeafDescriptor::KIND_RENDER_SURFACE` constant or the
 * literal `'render-surface'`).
 *
 * Deliberately regex-based: this must run in a plain Node CI step with no
 * PHP toolchain. It is a static heuristic, hence WARN-only.
 *
 * @param {string} repoRoot The repo root to scan.
 *
 * @return {Array<{id: string, renderSurface: boolean, file: string}>} The
 *   discovered descriptors.
 */
function collectServerDescriptors(repoRoot) {
	const descriptors = []
	const phpFiles = collectFiles(path.join(repoRoot, 'lib'), (n) => n.endsWith('.php'))
	// The `id:` value inside a `new LeafDescriptor(` argument list — a
	// single/double-quoted literal or a `self::CONST` / `static::CONST`.
	const idRe = /\bid:\s*(?:'([^']+)'|"([^"]+)"|(?:self|static)::([A-Z0-9_]+))/
	for (const file of phpFiles) {
		let src
		try {
			src = fs.readFileSync(file, 'utf8')
		} catch (e) {
			continue
		}
		if (!src.includes('new LeafDescriptor(')) {
			continue
		}
		// Constant table for `self::CONST` id resolution within the file.
		const consts = {}
		const constRe = /\bconst\s+([A-Z0-9_]+)\s*=\s*(?:'([^']+)'|"([^"]+)")/g
		let cm
		while ((cm = constRe.exec(src)) !== null) {
			consts[cm[1]] = cm[2] || cm[3]
		}
		// Walk each constructor call as a bounded window (the argument list
		// up to a reasonable length — descriptors are short value objects).
		let idx = 0
		while ((idx = src.indexOf('new LeafDescriptor(', idx)) !== -1) {
			const window = src.slice(idx, idx + 1200)
			const m = idRe.exec(window)
			let id = null
			if (m) {
				id = m[1] || m[2] || (m[3] ? consts[m[3]] : null)
			}
			const renderSurface = /KIND_RENDER_SURFACE/.test(window)
				|| /'render-surface'|"render-surface"/.test(window)
			if (id) {
				descriptors.push({ id, renderSurface, file: path.relative(repoRoot, file) })
			}
			idx += 'new LeafDescriptor('.length
		}
	}
	return descriptors
}

/**
 * Extract the JS integration registration ids declared in a repo's
 * `src/**` — every `registerIntegration({ id: '...' })` CALL site (the
 * `export function registerIntegration` DEFINITION in the shared library is
 * excluded). These are the ids mounted on `window.OCA.OpenRegister.integrations`.
 *
 * @param {string} repoRoot The repo root to scan.
 *
 * @return {Array<{id: string, file: string}>} The discovered registrations.
 */
function collectJsRegistrations(repoRoot) {
	const regs = []
	const jsFiles = collectFiles(
		path.join(repoRoot, 'src'),
		(n) => n.endsWith('.js') || n.endsWith('.ts') || n.endsWith('.vue'),
	)
	// `registerIntegration(` followed (within a small window) by `id: '...'`.
	// The negative lookbehind on `function ` excludes the library definition.
	const callRe = /registerIntegration\s*\(/g
	const idRe = /\bid:\s*(?:'([^']+)'|"([^"]+)"|`([^`]+)`)/
	for (const file of jsFiles) {
		let src
		try {
			src = fs.readFileSync(file, 'utf8')
		} catch (e) {
			continue
		}
		let cm
		while ((cm = callRe.exec(src)) !== null) {
			const before = src.slice(Math.max(0, cm.index - 20), cm.index)
			if (/function\s+$/.test(before)) {
				continue // the `export function registerIntegration(` definition
			}
			const window = src.slice(cm.index, cm.index + 400)
			const m = idRe.exec(window)
			const id = m ? (m[1] || m[2] || m[3]) : null
			if (id) {
				regs.push({ id, file: path.relative(repoRoot, file) })
			}
		}
	}
	return regs
}

/**
 * Cross-reference server-side render-surface leaf descriptors against JS
 * `registerIntegration` ids within one repo, producing advisory warnings
 * for orphans both ways (ADR-066).
 *
 * Scoped pragmatically (WARN-first): the cross-ref only runs when the repo
 * carries at least one server-side `LeafDescriptor` (i.e. it is a consuming
 * app repo that ships both faces, not this JS-only library). This keeps the
 * check silent for the nextcloud-vue library's own CI (whose built-in
 * registrations correlate to PHP descriptors that live in the consuming
 * apps, not here) and avoids false positives on repos that only own one
 * face.
 *
 * DEFERRED (documented follow-up, not implemented in this pass):
 *   - Correlating this library's own `builtinIntegrations` against the PHP
 *     descriptors that live in EACH consuming app (a true cross-repo join);
 *     today each app runs this gate against its own tree.
 *   - Reading the `openregister.integrations.leaves` capability payload at
 *     runtime and asserting it against the JS registry live (this static
 *     pass approximates it from the PHP source).
 *   - Promoting the WARN findings to a hard failure once the fleet bakes in
 *     clean (flip `reportCrossRef` to push into `failures`).
 *
 * @param {string} repoRoot The repo root to scan (usually `process.cwd()`).
 *
 * @return {{ran: boolean, warnings: string[]}} Whether the cross-ref ran
 *   (server descriptors present) and any advisory warnings.
 */
function crossReferenceServerLeaves(repoRoot) {
	const descriptors = collectServerDescriptors(repoRoot)
	if (descriptors.length === 0) {
		// No server-side leaf face in this repo — nothing to correlate.
		return { ran: false, warnings: [] }
	}
	const registrations = collectJsRegistrations(repoRoot)
	const jsIds = new Set(registrations.map((r) => r.id))
	const phpIds = new Set(descriptors.map((d) => d.id))
	const warnings = []

	// Phantom render surface: a render-surface descriptor discoverable in the
	// capability whose JS widget never registered.
	for (const d of descriptors) {
		if (d.renderSurface && !jsIds.has(d.id)) {
			warnings.push(
				`render-surface leaf descriptor "${d.id}" (${d.file}) has NO matching `
				+ 'registerIntegration({ id }) in src/** — phantom render surface (the '
				+ 'capability advertises a tab/widget that never mounts).',
			)
		}
	}
	// Orphan JS: a registration with no server descriptor of any kind — the
	// widget mounts but the leaf is invisible to the capability.
	for (const r of registrations) {
		if (!phpIds.has(r.id)) {
			warnings.push(
				`registerIntegration id "${r.id}" (${r.file}) has NO matching server-side `
				+ 'LeafDescriptor in lib/** — orphan JS registration (mounts on '
				+ 'window.OCA.OpenRegister.integrations but is not discoverable via the '
				+ 'openregister.integrations.leaves capability).',
			)
		}
	}
	return { ran: true, warnings }
}

/**
 * Print the hard-check result to stdout/stderr.
 *
 * @param {string[]} list Failure messages (empty when all good).
 *
 * @return {void}
 */
function report(list) {
	if (list.length === 0) {
		// eslint-disable-next-line no-console
		console.log('✓ integration parity: every registered integration has both a tab and a widget')
		return
	}
	// eslint-disable-next-line no-console
	console.error('✗ integration parity gate failed:')
	for (const f of list) {
		// eslint-disable-next-line no-console
		console.error(`  - ${f}`)
	}
	// eslint-disable-next-line no-console
	console.error('\nEvery integration registered on window.OCA.OpenRegister.integrations')
	// eslint-disable-next-line no-console
	console.error('must declare BOTH a `tab` and a `widget` component (AD-11/AD-13).')
}

/**
 * Print the WARN-only server↔JS cross-ref result. Never fails the build.
 *
 * @param {string[]} warnings Advisory warning messages.
 * @param {boolean} ran Whether the cross-ref actually ran (server leaves present).
 *
 * @return {void}
 */
function reportCrossRef(warnings, ran) {
	if (!ran) {
		return
	}
	if (warnings.length === 0) {
		// eslint-disable-next-line no-console
		console.log('✓ server↔JS leaf parity (ADR-066): every render-surface descriptor has a JS registration and vice-versa')
		return
	}
	// eslint-disable-next-line no-console
	console.warn('⚠ server↔JS leaf parity (ADR-066) — advisory (WARN-only, does not fail the gate):')
	for (const w of warnings) {
		// eslint-disable-next-line no-console
		console.warn(`  - ${w}`)
	}
	// eslint-disable-next-line no-console
	console.warn('\nThe server LeafDescriptor id MUST equal the JS registerIntegration id (ADR-019 / ADR-066).')
}

// Run the gate only on direct invocation (`node check-integration-parity.js`),
// never on `require()` — so unit tests can import the helpers below without the
// CLI calling process.exit() and killing the test runner.
if (require.main === module) {
	main()
}

// Exported for unit testing.
module.exports = {
	collectServerDescriptors,
	collectJsRegistrations,
	crossReferenceServerLeaves,
}

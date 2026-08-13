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
 * A leaf has two faces. The SERVER face is declared in one of two shapes:
 *   - a `new LeafDescriptor( … )` contributed via `RegisterLeafProvidersEvent`
 *     (hermiq's agent leaf, procest, …), or
 *   - an `IntegrationProvider` CLASS with a `getId()` — openregister's 28
 *     providers under `lib/Service/Integration/{Providers,BuiltinProviders}/`.
 * The JS face is a `registerIntegration({ id })` or
 * `integrations.register({ id })` call that mounts the tab + widget on
 * `window.OCA.OpenRegister.integrations` — or, for a leaf whose JS face this
 * library owns, a `registerBuiltinIntegrations()` / `registerLeafIntegrations()`
 * call in the app's bootstrap. The server id MUST equal the JS registration id
 * (ADR-019 parity). When only one side exists you get a PHANTOM render
 * surface: a render-surface descriptor discoverable server-side whose JS
 * widget never registered (renders nothing), or a JS registration with no
 * server descriptor (invisible to the capability). This gate cross-references
 * the two WITHIN the repo it runs against (`process.cwd()`), flagging orphans
 * both ways. It is WARN-only: it never changes the exit code, matching the
 * fleet's gate-introduction pattern (introduce as a warning, promote to
 * blocking after a bake-in epoch once the fleet is clean). See the deferred
 * follow-up notes in {@link crossReferenceServerLeaves}.
 *
 * Run via `npm run check:integration-parity` (wired into the
 * Code Quality CI workflow and the pre-commit hook). The cross-ref phase can
 * only correlate when the repo it runs against carries a server-side leaf
 * face, so it stays a no-op for this JS-only library's own CI and speaks up
 * inside a consuming app repo (openregister, hermiq, openconnector, …) that
 * ships both faces. WHEN IT CANNOT CORRELATE IT SAYS SO — see
 * {@link reportCrossRef}. A silent cross-ref phase used to be
 * indistinguishable from a clean one, and openregister sat in that state.
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
			// A mount-mode descriptor satisfies parity via mount+unmount
			// instead of tab+widget (openregister#2127).
			if (/renderMode\s*:\s*['"]mount['"]/.test(src)) {
				if (!/\bmount\s*:/.test(src)) {
					failures.push(`${file}: renderMode 'mount' but no \`mount:\` key found`)
				}
				if (!/\bunmount\s*:/.test(src)) {
					failures.push(`${file}: renderMode 'mount' but no \`unmount:\` key found`)
				}
				continue
			}
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
			// Parity now accepts either render pair (openregister#2127, ADR-066):
			// a `mount` descriptor is complete with mount+unmount; a `component`
			// (default) descriptor keeps the tab+widget requirement.
			if (d && d.renderMode === 'mount') {
				if (typeof d.mount !== 'function') {
					failures.push(`${label}: renderMode 'mount' missing required \`mount\` function`)
				}
				if (typeof d.unmount !== 'function') {
					failures.push(`${label}: renderMode 'mount' missing required \`unmount\` function`)
				}
			} else {
				if (d.tab === undefined || d.tab === null) {
					failures.push(`${label}: missing required \`tab\` component`)
				}
				if (d.widget === undefined || d.widget === null) {
					failures.push(`${label}: missing required \`widget\` component`)
				}
			}
		}
	}

	// --- HARD half, part 2: barrel-export completeness. --------------------
	// A parity-complete descriptor that no consumer can import is still dead.
	// `flowIntegration` shipped for months in `builtinIntegrations[]`, with a
	// bespoke tab and card, and was exported from neither `src/integrations/
	// index.js` nor `src/index.js` — so `import { flowIntegration } from
	// '@conduction/nextcloud-vue'` yielded `undefined` and registering it was a
	// silent no-op. Nothing threw at any layer. This check makes that state a
	// build failure instead of a support ticket.
	failures.push(...checkBarrelExports())

	report(failures)

	// --- WARN half (ADR-066): server↔JS leaf parity on the target repo. -----
	// Never changes the exit code (bake-in epoch). Runs against process.cwd()
	// so the hydra gate — which cd's into the app repo before invoking this
	// check via the app's wrapper — picks up the app's own PHP + JS.
	try {
		reportCrossRef(crossReferenceServerLeaves(process.cwd()))
	} catch (e) {
		// A cross-ref scan must NEVER break the gate — it is advisory. But a
		// crash means NOTHING was correlated, so say that in the same words the
		// not-run path uses; the previous "(… skipped: …)" note read as a
		// harmless aside next to a `✓` hard-check line.
		// eslint-disable-next-line no-console
		console.error(
			'⚠ server↔JS leaf parity (ADR-066): the cross-reference CRASHED and correlated NOTHING '
			+ `— this is NOT a pass: ${e && e.message}`,
		)
	}

	process.exit(failures.length === 0 ? 0 : 1)
}

/**
 * Verify that every descriptor listed in `builtinIntegrations[]` is also a
 * named export of BOTH public barrels — `src/integrations/index.js` and the
 * package root `src/index.js`.
 *
 * The identifiers are read from the array literal in
 * `src/integrations/builtin/index.js` rather than from the required module,
 * because the array holds descriptor *objects* at runtime and the binding
 * names (which are what a consumer imports) are only visible in the source.
 *
 * @return {string[]} One failure string per descriptor missing from a barrel.
 */
function checkBarrelExports() {
	const failures = []
	const root = path.resolve(__dirname, '..')
	const builtinIndex = path.join(root, 'src', 'integrations', 'builtin', 'index.js')

	let source
	try {
		source = fs.readFileSync(builtinIndex, 'utf8')
	} catch {
		// Nothing to check against — never turn a missing file into a false
		// "everything is fine"; say so and let the tab/widget half stand.
		return ['src/integrations/builtin/index.js is unreadable — barrel-export check skipped']
	}

	const arrayMatch = source.match(/export\s+const\s+builtinIntegrations\s*=\s*\[([\s\S]*?)\]/)
	if (!arrayMatch) {
		return ['could not locate the `builtinIntegrations` array literal — barrel-export check skipped']
	}

	const names = arrayMatch[1]
		.split('\n')
		.map((line) => line.replace(/\/\/.*$/, '').trim().replace(/,$/, ''))
		.filter((name) => /^[A-Za-z_$][\w$]*$/.test(name))

	if (names.length === 0) {
		return ['`builtinIntegrations` array parsed as empty — barrel-export check skipped']
	}

	const barrels = [
		['src/integrations/index.js', path.join(root, 'src', 'integrations', 'index.js')],
		['src/index.js', path.join(root, 'src', 'index.js')],
	]

	for (const [label, file] of barrels) {
		let barrel
		try {
			barrel = fs.readFileSync(file, 'utf8')
		} catch {
			failures.push(`${label} is unreadable — cannot verify integration exports`)
			continue
		}
		// Strip comments BEFORE matching. The first cut of this check searched
		// the raw file and passed while `flowIntegration` was absent from every
		// export statement — the docblock explaining the bug mentioned the name,
		// and a bare substring search cannot tell prose from an export. Prose
		// restating a symbol is not the symbol.
		const code = barrel
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/(^|[^:])\/\/.*$/gm, '$1')
		for (const name of names) {
			if (!new RegExp(`\\b${name}\\b`).test(code)) {
				failures.push(
					`${name} is in builtinIntegrations[] but is not exported from ${label} — `
					+ 'consumers importing it get `undefined` and register nothing, silently',
				)
			}
		}
	}

	return failures
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
 * Strip block, line and hash comments from PHP source before matching in it.
 *
 * A COMMENT PUSHED THE DECLARATION OUT OF THE WINDOW.
 * --------------------------------------------------
 * The descriptor scan reads a bounded window after `new LeafDescriptor(`,
 * because it has no PHP parser. hermiq's descriptor carries ~40 lines of
 * explanatory comment INSIDE its argument list, which pushed the trailing
 * `renderMode: LeafDescriptor::RENDER_MODE_MOUNT` past the window — so the
 * scan read `component` (the default) for a descriptor that plainly declares
 * `mount`. It then agreed with a JS side that was ALSO misread as `component`
 * for the same reason, and the renderMode rule printed `✓`. Two wrong reads
 * cancelling is not a correlation.
 *
 * `#` is only treated as a comment at the start of a line, so PHP 8
 * attributes (`#[NoAdminRequired]`) survive; the `[^:]` guard keeps `://`
 * inside a string literal from eating the rest of the line.
 *
 * @param {string} src The PHP source.
 *
 * @return {string} The source with comments blanked out.
 */
function stripPhpComments(src) {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|[^:])\/\/.*$/gm, '$1')
		.replace(/^([ \t]*)#(?!\[).*$/gm, '$1')
}

/**
 * Build the `const NAME = 'value'` table of a PHP source file, used to
 * resolve `self::NAME` / `static::NAME` references back to their literal.
 *
 * @param {string} src The PHP source.
 *
 * @return {{[key: string]: string}} Constant name → literal value.
 */
function readClassConstants(src) {
	const consts = {}
	const constRe = /\bconst\s+([A-Z0-9_]+)\s*=\s*(?:'([^']+)'|"([^"]+)")/g
	let cm
	while ((cm = constRe.exec(src)) !== null) {
		consts[cm[1]] = cm[2] || cm[3]
	}
	return consts
}

/**
 * Extract the leaf descriptors declared by `new LeafDescriptor( … )` calls in
 * one PHP source. Reads the `id:` argument (a string literal, or a
 * `self::CONST` resolved from the file's own constant table), whether the
 * `kinds:` array contains `KIND_RENDER_SURFACE` (either the
 * `LeafDescriptor::KIND_RENDER_SURFACE` constant or the literal
 * `'render-surface'`), and the declared `renderMode`.
 *
 * @param {string} src The PHP source.
 * @param {string} rel The repo-relative path (for messages).
 * @param {{[key: string]: string}} consts The file's constant table.
 *
 * @return {Array<object>} The discovered descriptors.
 */
function collectLeafDescriptorFaces(src, rel, consts) {
	const out = []
	if (!src.includes('new LeafDescriptor(')) {
		return out
	}
	// The `id:` value inside a `new LeafDescriptor(` argument list — a
	// single/double-quoted literal or a `self::CONST` / `static::CONST`.
	const idRe = /\bid:\s*(?:'([^']+)'|"([^"]+)"|(?:self|static)::([A-Z0-9_]+))/
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
		// renderMode carried on the descriptor (openregister#2127): a
		// `RENDER_MODE_MOUNT` constant or a `renderMode: 'mount'` literal.
		const renderMode = /RENDER_MODE_MOUNT/.test(window)
			|| /renderMode\s*:\s*'mount'|renderMode\s*:\s*"mount"/.test(window)
			? 'mount'
			: 'component'
		if (id) {
			out.push({ id, renderSurface, renderMode, face: 'LeafDescriptor', file: rel })
		}
		idx += 'new LeafDescriptor('.length
	}
	return out
}

/**
 * Extract the leaf descriptors declared as `IntegrationProvider` CLASSES in
 * one PHP source — OpenRegister's other, and by volume dominant, server-side
 * leaf face.
 *
 * THE SECOND FACE THIS GATE COULD NOT SEE.
 * ---------------------------------------
 * `new LeafDescriptor(...)` is not how most server-side leaves are declared.
 * OpenRegister's 28 leaves are CLASSES under
 * `lib/Service/Integration/Providers/` (+ `BuiltinProviders/`) that extend
 * `AbstractIntegrationProvider` (which `implements IntegrationProvider`) and
 * carry their id in a method, not a constructor argument:
 *
 *     class XwikiProvider extends AbstractIntegrationProvider
 *     {
 *         public function getId(): string
 *         {
 *             return 'xwiki';
 *         }//end getId()
 *
 * A `new LeafDescriptor(`-only scan therefore collected ZERO descriptors in
 * the repo that owns the integration registry, `crossReferenceServerLeaves()`
 * returned `{ ran: false }`, and `reportCrossRef()` printed nothing at all —
 * so "correlated nothing" was indistinguishable from "correlated, all good".
 *
 * WHAT THIS SHAPE DOES AND DOES NOT CARRY (measured, not assumed — read
 * `openregister/lib/Service/Integration/IntegrationProvider.php`):
 *   - `getId(): string` — the leaf id. All 28 return a literal; one
 *     (`lib/Service/Integration/TimeProvider.php`) returns `self::ID`, so
 *     the constant table is resolved here too.
 *   - The interface has NO `kinds:` and NO `surfaces:` member, so a provider
 *     cannot declare itself a render surface the way a `LeafDescriptor` can.
 *     Every provider IS one by construction: it is served over
 *     `/api/objects/{register}/{schema}/{id}/integrations/{providerId}` and
 *     drawn by the generic `CnIntegrationTab` / `CnIntegrationCard`. So
 *     `renderSurface` is set `true` and marked `surfaceSource: 'implicit'`
 *     — a property of the SHAPE, not a value read from the source.
 *   - The interface has NO `renderMode` member. `renderMode` is therefore
 *     `null` — NOT `'component'`. Defaulting it to `'component'` would let
 *     the cross-layer renderMode rule invent a mismatch against a JS
 *     registration that legitimately declares `'mount'`; a null is skipped
 *     by that rule instead.
 *
 * Recognised class faces: `extends [Abstract]IntegrationProvider` or
 * `implements … IntegrationProvider`. `abstract class` declarations are not
 * matched (the base class is not a leaf). A class whose base is named
 * something else is NOT recognised — and that is visible, because the
 * descriptor count is printed on every run.
 *
 * @param {string} src The PHP source.
 * @param {string} rel The repo-relative path (for messages).
 * @param {{[key: string]: string}} consts The file's constant table.
 *
 * @return {Array<object>} The discovered descriptors.
 */
function collectIntegrationProviderFaces(src, rel, consts) {
	const out = []
	// Class declaration line: optional `final`, a name, an optional
	// `extends`, an optional `implements` list. `abstract class` is excluded
	// by omission — `AbstractIntegrationProvider` itself is not a leaf.
	const classRe = /^[ \t]*(?:final[ \t]+)?class[ \t]+(\w+)[ \t]*(?:extends[ \t]+([\w\\]+)[ \t]*)?(?:implements[ \t]+([^{\r\n]+))?/gm
	// The id literal returned by `getId(): string`. Accepts `?string` and a
	// `self::CONST` / `static::CONST` return.
	const getIdRe = /function\s+getId\s*\(\s*\)\s*:\s*\??string[\s\S]{0,400}?\breturn\s+(?:'([^']*)'|"([^"]*)"|(?:self|static)::([A-Z0-9_]+))\s*;/
	let m
	while ((m = classRe.exec(src)) !== null) {
		const parent = m[2] || ''
		const interfaces = (m[3] || '').split(',').map((s) => s.trim())
		const isProvider = /(?:^|\\)(?:Abstract)?IntegrationProvider$/.test(parent)
			|| interfaces.some((i) => /(?:^|\\)IntegrationProvider$/.test(i))
		if (!isProvider) {
			continue
		}
		const body = src.slice(m.index)
		const g = getIdRe.exec(body)
		if (g === null) {
			continue
		}
		const id = g[1] || g[2] || (g[3] ? consts[g[3]] : null)
		if (!id) {
			continue
		}
		out.push({
			id,
			// See the docblock: the IntegrationProvider contract carries no
			// kinds/surfaces array. Every provider is exposed on the object
			// detail integration surface, so this is a shape constant.
			renderSurface: true,
			surfaceSource: 'implicit',
			// The contract carries no renderMode. `null` means NOT DECLARED,
			// which the cross-layer renderMode rule skips rather than guesses.
			renderMode: null,
			face: 'IntegrationProvider',
			file: rel,
		})
	}
	return out
}

/**
 * Extract the server-side leaf descriptors declared in a repo's PHP
 * (`lib/**`), across BOTH supported faces:
 *
 *   1. `new LeafDescriptor( … )` constructor calls (hermiq, procest, …).
 *   2. `IntegrationProvider` classes with a `getId()` (openregister's 28
 *      providers) — see {@link collectIntegrationProviderFaces}.
 *
 * Deliberately regex-based: this must run in a plain Node CI step with no
 * PHP toolchain. It is a static heuristic, hence WARN-only.
 *
 * @param {string} repoRoot The repo root to scan.
 *
 * @return {Array<{id: string, renderSurface: boolean, renderMode: ?string, face: string, file: string}>} The
 *   discovered descriptors. `renderMode` is `'mount'`, `'component'`, or
 *   `null` when the declaring shape does not carry one.
 */
function collectServerDescriptors(repoRoot) {
	const descriptors = []
	const phpFiles = collectFiles(path.join(repoRoot, 'lib'), (n) => n.endsWith('.php'))
	for (const file of phpFiles) {
		let src
		try {
			src = stripPhpComments(fs.readFileSync(file, 'utf8'))
		} catch (e) {
			continue
		}
		const rel = path.relative(repoRoot, file)
		// Constant table for `self::CONST` id resolution within the file.
		const consts = readClassConstants(src)
		descriptors.push(...collectLeafDescriptorFaces(src, rel, consts))
		descriptors.push(...collectIntegrationProviderFaces(src, rel, consts))
	}
	return descriptors
}

/**
 * Strip block and line comments from JS/TS/Vue source before matching call
 * sites in it.
 *
 * PROSE RESTATING A SYMBOL IS NOT THE SYMBOL — the same trap `checkBarrelExports`
 * already documents. Measured while building this pass: the library's own
 * `src/integrations/builtin/files.js` carries a docblock reading
 * "`files` integration descriptor — pass to `integrations.register()`."
 * directly above `export const filesIntegration = { id: 'files', … }`. Without
 * this strip, the registration probe matched the SENTENCE, then found the
 * `id:` of the descriptor below it, and reported a JS registration of `files`
 * that no code performs.
 *
 * The `[^:]` guard on the line-comment form keeps `https://…` inside a string
 * from eating the rest of the line.
 *
 * @param {string} src The source text.
 *
 * @return {string} The source with comments blanked out.
 */
function stripJsComments(src) {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/**
 * Extract the JS integration registration ids declared in a repo's
 * `src/**` — every CALL site of EITHER supported registration API (the
 * `export function registerIntegration` DEFINITION in the shared library is
 * excluded). These are the ids mounted on `window.OCA.OpenRegister.integrations`.
 *
 * THE JS PROBE MUST MATCH BOTH SUPPORTED REGISTRATION APIs, NOT ONE.
 * -----------------------------------------------------------------
 * `registerIntegration(descriptor)` is the convenience wrapper exported from
 * this package (`src/integrations/registry.js`). The registry object it wraps
 * is equally canonical and is called directly as
 * `window.OCA.OpenRegister.integrations.register(descriptor)` — which is what
 * openregister's own `src/main.js` uses for `xwiki`, and decidesk for
 * `decidesk-decisions`.
 *
 * Probing for only the wrapper made this collector produce a FALSE ABSENCE:
 * an id registered through the direct form was reported as a PHANTOM render
 * surface (server descriptor with "no" JS registration) while that very id
 * was live in the registry. The hydra gate-24 shell probe was fixed for
 * exactly this; this copy had not been.
 *
 * `integrations\s*\.\s*register` cannot collide with `unregister(` (`.register`
 * requires the dot immediately before `register`) nor with
 * `registerIntegrationIcons(` (the `\(` anchors the wrapper form).
 *
 * KNOWN GAP, deliberately not widened: a third spelling exists in the wild —
 * `<localVar>.register({ id })`, e.g. openregister's
 * `src/integrations/builtin/bookmarks.js` calling `registry.register(...)` on
 * a registry handed in as a parameter. Matching any `.register(` would sweep
 * in unrelated registries (routers, icon maps, widget registries) and
 * manufacture ORPHAN findings, so only the two named APIs are matched — the
 * same two the hydra gate probes.
 *
 * @param {string} repoRoot The repo root to scan.
 *
 * @return {{resolved: Array<{id: string, renderMode: string, file: string}>, unresolved: Array<{file: string, snippet: string}>}}
 *   The registrations whose id could be read (`renderMode` is `'mount'` or
 *   `'component'`), and the call sites whose id could not be — those are
 *   REPORTED, never silently dropped.
 */
function collectJsRegistrationSites(repoRoot) {
	const resolved = []
	const unresolved = []
	const jsFiles = collectFiles(
		path.join(repoRoot, 'src'),
		(n) => n.endsWith('.js') || n.endsWith('.ts') || n.endsWith('.vue'),
	)
	const idRe = /\bid:\s*(?:'([^']+)'|"([^"]+)"|`([^`]+)`|([A-Za-z_$][\w$]*))/
	for (const file of jsFiles) {
		let src
		try {
			src = stripJsComments(fs.readFileSync(file, 'utf8'))
		} catch (e) {
			continue
		}
		const rel = path.relative(repoRoot, file)
		// Skip the registry IMPLEMENTATION module. Its internal
		// `integrations.register(descriptor)` / `(queued)` forwards are the API
		// itself, not registrations of any particular leaf — counting them
		// would report three permanently-unresolvable "registrations" in this
		// library's own CI, every run, forever. Same reasoning as the existing
		// `function registerIntegration(` definition-site exclusion, widened
		// from the call site to the module that exports the API.
		if (/export\s+function\s+(?:registerIntegration|createIntegrationRegistry|installIntegrationRegistry)\s*\(/.test(src)) {
			continue
		}
		// Module-level `const NAME = 'literal'` table, so an `id:` written as a
		// named constant still resolves — decidesk declares
		// `const DECISIONS_INTEGRATION_ID = 'decidesk-decisions'` and its
		// descriptor says `id: DECISIONS_INTEGRATION_ID`.
		const jsConsts = {}
		const jsConstRe = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g
		let jc
		while ((jc = jsConstRe.exec(src)) !== null) {
			jsConsts[jc[1]] = jc[2] !== undefined ? jc[2] : (jc[3] !== undefined ? jc[3] : jc[4])
		}
		// Either registration API, followed (within a small window) by `id: …`.
		// Constructed per file: a `g`-flagged regex hoisted out of the loop
		// carries `lastIndex` from the previous file and silently skips matches
		// that sit before it.
		const callRe = /\bregisterIntegration\s*\(|\bintegrations\s*\.\s*register\s*\(/g
		let cm
		while ((cm = callRe.exec(src)) !== null) {
			const before = src.slice(Math.max(0, cm.index - 20), cm.index)
			if (/function\s+$/.test(before)) {
				continue // the `export function registerIntegration(` definition
			}
			let window = src.slice(cm.index, cm.index + 400)
			// A DESCRIPTOR PASSED BY NAME IS STILL A REGISTRATION.
			//
			// decidesk writes
			//   target.OCA.OpenRegister.integrations.register(decisionsLeafDescriptor)
			// with the object declared above as `export const
			// decisionsLeafDescriptor = { id: DECISIONS_INTEGRATION_ID, … }`. An
			// inline-literal-only probe finds no `id:` in the call window, drops
			// the registration, and the repo then reports "no JS integration
			// registration at all" — a false ABSENCE claim about a leaf that is
			// live in the registry. Resolve a bare identifier argument against
			// its declaration in the same file.
			const byName = /^\(\s*([A-Za-z_$][\w$]*)\s*[),]/.exec(
				src.slice(cm.index + cm[0].length - 1, cm.index + cm[0].length + 80),
			)
			if (byName !== null) {
				const declRe = new RegExp(`\\b(?:const|let|var)\\s+${byName[1]}\\s*=\\s*\\{`)
				const dm = declRe.exec(src)
				if (dm !== null) {
					window = src.slice(dm.index, dm.index + 800)
				}
			}
			const m = idRe.exec(window)
			let id = null
			if (m !== null) {
				id = m[1] || m[2] || m[3] || (m[4] !== undefined ? jsConsts[m[4]] : undefined) || null
			}
			// renderMode declared on the JS registration (openregister#2127).
			const renderMode = /renderMode\s*:\s*'mount'|renderMode\s*:\s*"mount"|renderMode\s*:\s*`mount`/.test(window)
				? 'mount'
				: 'component'
			if (id) {
				resolved.push({ id, renderMode, file: rel })
				continue
			}
			// A CALL SITE WHOSE ID CANNOT BE READ IS NOT AN ABSENT REGISTRATION.
			//
			// procest registers with `registerIntegration({ ...fieldInspectionIntegration,
			// offlineConfig: { … } })` — the id arrives by object spread from an
			// imported library descriptor and no `id:` appears at the call site at
			// all. Dropping it made the repo report "no JS integration registration
			// under src/**", which is false. It cannot be correlated, but it CAN be
			// counted and named, and the reporter says so.
			unresolved.push({ file: rel, snippet: window.split('\n')[0].trim().slice(0, 80) })
		}
	}
	return { resolved, unresolved }
}

/**
 * The JS registrations whose id could be resolved statically.
 *
 * @param {string} repoRoot The repo root to scan.
 *
 * @return {Array<{id: string, renderMode: string, file: string}>} The registrations.
 */
function collectJsRegistrations(repoRoot) {
	return collectJsRegistrationSites(repoRoot).resolved
}

/**
 * Parse the identifiers listed inside an exported array literal, e.g. the
 * `builtinIntegrations` list in `src/integrations/builtin/index.js`.
 *
 * @param {string} source The module source.
 * @param {string} name The exported array's name.
 *
 * @return {?string[]} The identifiers, or `null` when the array is not found.
 */
function parseArrayIdentifiers(source, name) {
	const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\n\\]`))
	if (match === null) {
		return null
	}
	return match[1]
		.split('\n')
		.map((line) => line.replace(/\/\/.*$/, '').trim().replace(/,$/, ''))
		.filter((entry) => /^[A-Za-z_$][\w$]*$/.test(entry))
}

/**
 * Resolve the leaf ids that @conduction/nextcloud-vue registers on a
 * consuming app's behalf.
 *
 * WHY THIS EXISTS — WITHOUT IT, THE FIX WOULD HAVE MANUFACTURED ~24 PHANTOMS.
 * --------------------------------------------------------------------------
 * A leaf's JS face does not have to live in the app repo. openregister's
 * bootstrap (`src/integrations/bootstrap.js`) registers its leaves by calling
 * TWO helpers exported from this library:
 *
 *     registerBuiltinIntegrations(registry)   // builtin/index.js
 *     registerLeafIntegrations(registry)      // builtin/leaves.js
 *
 * Those helpers install ~26 + 18 descriptors — real, mounted tab/widget pairs
 * — for ids whose `id:` literal appears nowhere in openregister's own `src/`.
 * A strictly within-repo correlation would call every one of them a PHANTOM
 * render surface: a large, confident, WRONG finding set on the repo that owns
 * the registry. So a library-contributed registration counts as a JS face.
 *
 * Deliberately ASYMMETRIC, and this is the judgement call:
 *   - Library ids DO satisfy the phantom direction (server descriptor → a JS
 *     face exists, therefore it is not a phantom). That is simply true at
 *     runtime.
 *   - Library ids are NOT reported in the orphan direction. An orphan finding
 *     names a defect its repo can fix; a library descriptor with no server
 *     provider (`version-history`, `field-inspection` today) is this library's
 *     business, and reporting it in all 18 consuming app repos would be noise
 *     pointing at a file the app does not own.
 * The counts for both are printed on every run, so neither is silent.
 *
 * The library source is read from THIS script's own package (`../src/...`),
 * which resolves whether the script is run from the library checkout or from
 * `node_modules/@conduction/nextcloud-vue/scripts/` in a consuming app —
 * `package.json#files` ships both `src/` and `scripts/`.
 *
 * @param {string} repoRoot The target repo root (to see whether it calls the
 *   helpers at all).
 *
 * @return {{ids: string[], helpers: string[], problems: string[]}} The ids the
 *   library contributes to THIS repo (empty when it calls neither helper), the
 *   helper names it calls, and any resolution problems worth printing.
 */
function collectLibraryRegistrations(repoRoot) {
	// Which helpers does the target repo actually call? A repo that never
	// calls them gets nothing from the library (hermiq, openconnector, …), so
	// their behaviour is completely unchanged by this collector.
	const helperSources = [
		['registerBuiltinIntegrations', 'index.js', 'builtinIntegrations'],
		['registerLeafIntegrations', 'leaves.js', 'leafIntegrations'],
	]
	const jsFiles = collectFiles(
		path.join(repoRoot, 'src'),
		(n) => n.endsWith('.js') || n.endsWith('.ts') || n.endsWith('.vue'),
	)
	const called = new Set()
	for (const file of jsFiles) {
		let src
		try {
			// Comments stripped: several library docblocks name these helpers
			// with parentheses ("registerLeafIntegrations() in OpenRegister's
			// bootstrap"), and a mention is not a call.
			src = stripJsComments(fs.readFileSync(file, 'utf8'))
		} catch (e) {
			continue
		}
		for (const [helper] of helperSources) {
			const callRe = new RegExp(`\\b${helper}\\s*\\(`, 'g')
			let cm
			while ((cm = callRe.exec(src)) !== null) {
				const before = src.slice(Math.max(0, cm.index - 20), cm.index)
				if (/function\s+$/.test(before)) {
					continue // the library's own `export function` definition
				}
				called.add(helper)
			}
		}
	}
	if (called.size === 0) {
		return { ids: [], helpers: [], problems: [] }
	}

	const builtinDir = path.resolve(__dirname, '..', 'src', 'integrations', 'builtin')
	const ids = new Set()
	const problems = []

	// Descriptor-name → id map, read from `export const xIntegration = { id: … }`
	// across the library's builtin descriptor modules.
	const nameToId = {}
	for (const file of collectFiles(builtinDir, (n) => n.endsWith('.js'), 2)) {
		let src
		try {
			src = fs.readFileSync(file, 'utf8')
		} catch (e) {
			continue
		}
		const declRe = /export\s+const\s+(\w+)\s*=\s*\{/g
		let dm
		while ((dm = declRe.exec(src)) !== null) {
			const window = src.slice(dm.index, dm.index + 400)
			const im = /\bid:\s*(?:'([^']+)'|"([^"]+)")/.exec(window)
			if (im !== null) {
				nameToId[dm[1]] = im[1] || im[2]
			}
		}
	}

	for (const [helper, fileName, arrayName] of helperSources) {
		if (!called.has(helper)) {
			continue
		}
		const abs = path.join(builtinDir, fileName)
		let source
		try {
			source = fs.readFileSync(abs, 'utf8')
		} catch (e) {
			problems.push(
				`this repo calls ${helper}() but the library's src/integrations/builtin/${fileName} `
				+ 'could not be read, so the ids it registers are UNKNOWN — every server descriptor '
				+ 'whose only JS face comes from that helper will be reported as a phantom below.',
			)
			continue
		}
		if (fileName === 'leaves.js') {
			// leaves.js declares its descriptors inline: `leaf({ id: '…', … })`.
			const arrayMatch = source.match(/export\s+const\s+leafIntegrations\s*=\s*\[([\s\S]*?)\n\]/)
			if (arrayMatch === null) {
				problems.push(`could not locate the library's \`leafIntegrations\` array — ${helper}() ids are UNKNOWN.`)
				continue
			}
			const idRe = /\bid:\s*(?:'([^']+)'|"([^"]+)")/g
			let lm
			let found = 0
			while ((lm = idRe.exec(arrayMatch[1])) !== null) {
				ids.add(lm[1] || lm[2])
				found += 1
			}
			if (found === 0) {
				problems.push(`the library's \`leafIntegrations\` array parsed as empty — ${helper}() ids are UNKNOWN.`)
			}
			continue
		}
		// index.js lists descriptor BINDINGS; resolve each to its id.
		const names = parseArrayIdentifiers(source, arrayName)
		if (names === null || names.length === 0) {
			problems.push(`could not parse the library's \`${arrayName}\` array — ${helper}() ids are UNKNOWN.`)
			continue
		}
		const unresolved = []
		for (const name of names) {
			if (nameToId[name] === undefined) {
				unresolved.push(name)
				continue
			}
			ids.add(nameToId[name])
		}
		if (unresolved.length > 0) {
			problems.push(
				`${unresolved.length} descriptor(s) in the library's \`${arrayName}\` could not be resolved to an id `
				+ `(${unresolved.join(', ')}) — a server descriptor matching one of them may be reported as a phantom below.`,
			)
		}
	}

	return { ids: [...ids], helpers: [...called].sort(), problems }
}

/**
 * Cross-reference server-side render-surface leaf descriptors against JS
 * registration ids within one repo, producing advisory warnings for orphans
 * both ways (ADR-066).
 *
 * Scoped pragmatically (WARN-first): the correlation only runs when the repo
 * carries at least one server-side leaf face — a `new LeafDescriptor(` OR an
 * `IntegrationProvider` class. When it cannot run, the result carries a
 * `notRun` explanation and {@link reportCrossRef} SAYS SO OUT LOUD; the
 * caller must be able to tell "correlated, all good" from "correlated
 * nothing". Every result also carries a `summary` with the denominators, so
 * "no warnings" is never reported without the coverage behind it.
 *
 * DEFERRED (documented follow-up, not implemented in this pass):
 *   - Correlating this library's own `builtinIntegrations` against the PHP
 *     descriptors that live in EACH consuming app (a true cross-repo join);
 *     today each app runs this gate against its own tree, with the library's
 *     contribution folded in via {@link collectLibraryRegistrations}.
 *   - Reading the `openregister.integrations.leaves` capability payload at
 *     runtime and asserting it against the JS registry live (this static
 *     pass approximates it from the PHP source).
 *   - Promoting the WARN findings to a hard failure once the fleet bakes in
 *     clean (flip `reportCrossRef` to push into `failures`).
 *
 * @param {string} repoRoot The repo root to scan (usually `process.cwd()`).
 *
 * @return {{ran: boolean, warnings: string[], summary: object, notRun: ?object}}
 *   Whether the correlation ran, the advisory warnings, the coverage summary,
 *   and — when it did not run — why, with the numbers behind that claim.
 */
function crossReferenceServerLeaves(repoRoot) {
	const descriptors = collectServerDescriptors(repoRoot)
	const sites = collectJsRegistrationSites(repoRoot)
	const registrations = sites.resolved
	const library = collectLibraryRegistrations(repoRoot)

	const summary = {
		serverDescriptors: descriptors.length,
		leafDescriptorFaces: descriptors.filter((d) => d.face === 'LeafDescriptor').length,
		integrationProviderFaces: descriptors.filter((d) => d.face === 'IntegrationProvider').length,
		jsRegistrations: registrations.length,
		unresolvedJsSites: sites.unresolved,
		libraryRegistrations: library.ids.length,
		libraryHelpers: library.helpers,
		libraryProblems: library.problems,
		correlatedIds: 0,
	}

	if (descriptors.length === 0) {
		// NOT A PASS — this used to `return { ran: false }` and print nothing,
		// which read exactly like a clean correlation. Hand the reporter the
		// numbers so it can say what went uncorrelated.
		return {
			ran: false,
			warnings: [],
			summary,
			notRun: {
				reason: 'no server-side leaf face found under lib/**',
				jsIds: registrations.map((r) => r.id),
			},
		}
	}

	const jsIds = new Set(registrations.map((r) => r.id))
	// A leaf's JS face may be contributed by @conduction/nextcloud-vue on this
	// repo's behalf — see collectLibraryRegistrations for why that counts.
	const allJsIds = new Set([...jsIds, ...library.ids])
	const phpIds = new Set(descriptors.map((d) => d.id))
	const jsModeById = new Map(registrations.map((r) => [r.id, r.renderMode]))
	const warnings = []

	summary.correlatedIds = [...phpIds].filter((id) => allJsIds.has(id)).length

	// renderMode cross-layer correlation (openregister#2127 / ADR-066): for a
	// render-surface leaf present on both sides, the server descriptor's
	// renderMode MUST equal the JS registration's under the shared id.
	//
	// A descriptor whose shape carries NO renderMode (`null` — every
	// `IntegrationProvider` class, whose interface has no such member) is
	// skipped: asserting a value nobody declared would invent a mismatch
	// against a JS registration that legitimately says 'mount'. Library-
	// contributed faces are skipped for the same reason — their renderMode is
	// not read here.
	for (const d of descriptors) {
		if (!d.renderSurface || d.renderMode === null || !jsModeById.has(d.id)) {
			continue
		}
		const jsMode = jsModeById.get(d.id)
		if (d.renderMode !== jsMode) {
			warnings.push(
				`render-surface leaf "${d.id}" (${d.file}) declares renderMode `
				+ `"${d.renderMode}" server-side but "${jsMode}" in its JS `
				+ 'registration — renderMode MUST match across layers (ADR-066).',
			)
		}
	}

	// Phantom render surface: a render-surface descriptor discoverable in the
	// capability whose JS widget never registered — in this repo's src/** OR
	// via a library helper this repo calls.
	for (const d of descriptors) {
		if (d.renderSurface && !allJsIds.has(d.id)) {
			warnings.push(
				`render-surface leaf ${d.face} "${d.id}" (${d.file}) has NO matching JS `
				+ 'registration — neither registerIntegration({ id }) nor '
				+ 'integrations.register({ id }) in src/**, and no descriptor of that id '
				+ 'contributed by @conduction/nextcloud-vue. Phantom render surface: the '
				+ 'capability advertises a tab/widget that never mounts.',
			)
		}
	}
	// Orphan JS: a registration with no server descriptor of any kind — the
	// widget mounts but the leaf is invisible to the capability. Only THIS
	// repo's own registrations are reported; a library-contributed id with no
	// server face is the library's defect, not this repo's (see
	// collectLibraryRegistrations).
	for (const r of registrations) {
		if (!phpIds.has(r.id)) {
			warnings.push(
				`JS registration id "${r.id}" (${r.file}) has NO matching server-side leaf `
				+ 'face in lib/** — neither a `new LeafDescriptor(` nor an IntegrationProvider '
				+ 'class with that getId(). Orphan JS registration (mounts on '
				+ 'window.OCA.OpenRegister.integrations but is not discoverable via the '
				+ 'openregister.integrations.leaves capability).',
			)
		}
	}
	return { ran: true, warnings, summary, notRun: null }
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
 * Render the one-line coverage statement behind a cross-ref verdict — the
 * denominators, always. "No warnings" without this line is the shape that let
 * a correlation over nothing read as a pass.
 *
 * @param {object} summary The summary block from {@link crossReferenceServerLeaves}.
 *
 * @return {string} The coverage line.
 */
function coverageLine(summary) {
	const lib = summary.libraryRegistrations > 0
		? ` + ${summary.libraryRegistrations} contributed by @conduction/nextcloud-vue `
			+ `(${summary.libraryHelpers.join(', ')})`
		: ''
	return `  correlated ${summary.serverDescriptors} server-side leaf face(s) `
		+ `[${summary.leafDescriptorFaces} new LeafDescriptor(, ${summary.integrationProviderFaces} IntegrationProvider class] `
		+ `against ${summary.jsRegistrations} JS registration(s) in src/**${lib}; `
		+ `${summary.correlatedIds} server id(s) matched a JS face.`
}

/**
 * Print the WARN-only server↔JS cross-ref result. Never fails the build — but
 * it is never SILENT either.
 *
 * A CORRELATION THAT DID NOT RUN LOOKS EXACTLY LIKE ONE THAT PASSED.
 * -----------------------------------------------------------------
 * This function used to open with `if (!ran) { return }`, so on a repo where
 * the descriptor scan found nothing it printed neither a `✓` nor a warning.
 * openregister — which owns the integration registry and ships 28 server-side
 * leaves — landed in exactly that branch, because the descriptor scan only
 * knew `new LeafDescriptor(`. The gate above it read the missing output as a
 * pass. Now the not-run path says what could not be correlated and why, and
 * the ran path always prints its coverage denominators.
 *
 * @param {object} result The result of {@link crossReferenceServerLeaves}.
 *
 * @return {void}
 */
function reportCrossRef(result) {
	const { warnings, ran, summary, notRun } = result

	// Call sites that ARE registrations but whose id no static read can
	// recover. Printed on every path — a correlation that skipped one of these
	// has a hole in it, and the hole is named.
	if (summary.unresolvedJsSites.length > 0) {
		// eslint-disable-next-line no-console
		console.warn(
			`⚠ server↔JS leaf parity (ADR-066): ${summary.unresolvedJsSites.length} JS registration call site(s) `
			+ 'whose id could not be read statically (spread from an imported descriptor, or a computed id). '
			+ 'They are registrations, they are NOT correlated by this run, and they are NOT counted as absent:',
		)
		for (const u of summary.unresolvedJsSites) {
			// eslint-disable-next-line no-console
			console.warn(`  - ${u.file}: ${u.snippet}`)
		}
	}

	if (!ran) {
		if (summary.jsRegistrations === 0 && summary.unresolvedJsSites.length === 0) {
			// Both sides empty: genuinely not applicable, and said so rather
			// than left blank. Mirrors hydra gate-24's `na` classification.
			// eslint-disable-next-line no-console
			console.log(
				'i server↔JS leaf parity (ADR-066): NOT APPLICABLE — this repo declares no server-side '
				+ 'leaf face under lib/** (no `new LeafDescriptor(` and no IntegrationProvider class with '
				+ 'a getId()) and no JS integration registration under src/**. There is no server↔JS pair '
				+ 'to correlate.',
			)
			if (path.resolve(process.cwd()) === path.resolve(__dirname, '..')) {
				// Do not let the library's own CI read that as "the descriptors
				// in src/integrations/ are verified". They are not verified
				// HERE — their server faces live in the consuming app repos.
				// eslint-disable-next-line no-console
				console.log(
					'  This is @conduction/nextcloud-vue itself. The built-in and leaf descriptors it '
					+ 'DEFINES are correlated against a server face inside each consuming app repo, not '
					+ 'here; the cross-repo join is a documented ADR-066 follow-up (see '
					+ 'crossReferenceServerLeaves).',
				)
			}
			return
		}
		// One side present, the other empty: NOTHING was correlated, and that
		// is not a pass. Mirrors hydra gate-24's `structural` classification.
		// eslint-disable-next-line no-console
		console.warn('⚠ server↔JS leaf parity (ADR-066): NOTHING was correlated — this is NOT a pass.')
		// eslint-disable-next-line no-console
		console.warn(`  - ${notRun.reason}: 0 found under lib/** (looked for \`new LeafDescriptor(\` and for classes extending/implementing IntegrationProvider with a getId()).`)
		const named = notRun.jsIds.length > 0 ? `: ${notRun.jsIds.join(', ')}` : ''
		// eslint-disable-next-line no-console
		console.warn(
			`  - ${summary.jsRegistrations} JS registration(s) with a readable id${named}`
			+ `, plus ${summary.unresolvedJsSites.length} call site(s) listed above, went UNVERIFIED.`,
		)
		// eslint-disable-next-line no-console
		console.warn('  An orphan JS registration (a widget that mounts with no server face) is invisible to this run, and no phantom render surface can be detected either.')
		return
	}

	if (summary.libraryProblems.length > 0) {
		for (const p of summary.libraryProblems) {
			// eslint-disable-next-line no-console
			console.warn(`⚠ server↔JS leaf parity (ADR-066): ${p}`)
		}
	}

	if (warnings.length === 0) {
		// eslint-disable-next-line no-console
		console.log('✓ server↔JS leaf parity (ADR-066): every render-surface descriptor has a JS registration and vice-versa')
		// eslint-disable-next-line no-console
		console.log(coverageLine(summary))
		return
	}
	// eslint-disable-next-line no-console
	console.warn('⚠ server↔JS leaf parity (ADR-066) — advisory (WARN-only, does not fail the gate):')
	for (const w of warnings) {
		// eslint-disable-next-line no-console
		console.warn(`  - ${w}`)
	}
	// eslint-disable-next-line no-console
	console.warn(coverageLine(summary))
	// eslint-disable-next-line no-console
	console.warn('\nThe server leaf id (LeafDescriptor `id:` or IntegrationProvider `getId()`) MUST equal the JS registration id (ADR-019 / ADR-066).')
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
	collectJsRegistrationSites,
	collectLibraryRegistrations,
	crossReferenceServerLeaves,
	reportCrossRef,
}

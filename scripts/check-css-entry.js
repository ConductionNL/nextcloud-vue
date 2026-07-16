#!/usr/bin/env node

/**
 * Published-CSS-entry gate.
 *
 * THE BUG THIS GUARDS AGAINST
 * ---------------------------
 * `css/index.css` — the entry every consumer app imports — used to re-export
 * `../src/css/index.css`, which holds only the UNSCOPED globals. Every
 * component's scoped SFC style block lives exclusively in the built
 * `dist/nextcloud-vue.css`, and the only reference to that file was the
 * `import './nextcloud-vue.css'` banner atop `dist/esm/index.js`. webpack
 * treats that barrel as side-effect-free (it is absent from
 * package.json#sideEffects), so it skips the module — and the CSS import with
 * it — whenever a consumer imports named components instead of the namespace.
 *
 * Net effect: dist-consuming apps rendered components carrying `data-v-*`
 * scope attributes for which no rule was ever shipped. Nothing errored; the
 * elements just silently lost every scoped declaration, so flex containers
 * fell back to `display: block`. Observed on pipelinq, where the dashboard
 * header stacked its action buttons underneath the title and 11 nc-vue
 * components rendered entirely unstyled.
 *
 * WHAT THIS DOES
 * --------------
 * Follows the @import chain out of `css/index.css` exactly as a consumer's
 * css-loader would, then asserts the invariant that was violated: EVERY
 * `data-v-*` scope id baked into the built JS has at least one matching rule
 * in the CSS reachable from that entry. Vue only emits a scope id for a
 * component that actually has a scoped <style> block, so an id with no rules
 * always means its styles were dropped somewhere between rollup and the
 * published entry point.
 *
 * Runs after `npm run build` (dist/ must exist).
 *
 * Exit codes:
 *   0 — every scope id rendered by the built JS is styled by the CSS entry
 *   1 — at least one scope id would ship unstyled
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const entry = path.join(root, 'css', 'index.css')

const SCOPE_ID = /data-v-[0-9a-f]{8}/g

/**
 * Resolve a stylesheet and everything it @imports, css-loader style.
 *
 * @param {string} file Absolute path to a CSS file.
 * @param {Set<string>} seen Guard against @import cycles.
 * @return {string} The concatenated CSS of `file` and its transitive imports.
 */
function readWithImports(file, seen = new Set()) {
	if (seen.has(file)) {
		return ''
	}
	seen.add(file)

	if (!fs.existsSync(file)) {
		console.error(`✗ CSS entry points at a file that does not exist: ${path.relative(root, file)}`)
		console.error('  Did `npm run build` run first? dist/ is gitignored and built by rollup.')
		process.exit(1)
	}

	const css = fs.readFileSync(file, 'utf8')
	const imports = [...css.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((m) => m[1])

	return imports.reduce(
		(acc, spec) => acc + readWithImports(path.resolve(path.dirname(file), spec), seen),
		css,
	)
}

/**
 * Collect every scope id the built JS will stamp onto rendered elements.
 *
 * @return {Set<string>} Scope ids such as `data-v-5266112e`.
 */
function scopeIdsInBuiltJs() {
	const ids = new Set()
	const walk = (dir) => {
		for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, dirent.name)
			if (dirent.isDirectory()) {
				walk(full)
			} else if (dirent.name.endsWith('.js')) {
				for (const id of fs.readFileSync(full, 'utf8').match(SCOPE_ID) || []) {
					ids.add(id)
				}
			}
		}
	}
	walk(path.join(root, 'dist'))
	return ids
}

const css = readWithImports(entry)
const styled = new Set(css.match(SCOPE_ID) || [])
const rendered = scopeIdsInBuiltJs()
const unstyled = [...rendered].filter((id) => !styled.has(id)).sort()

if (unstyled.length > 0) {
	console.error(`✗ ${unstyled.length} scope id(s) are rendered by the built JS but carry no rule in css/index.css:`)
	for (const id of unstyled) {
		console.error(`    ${id}`)
	}
	console.error('')
	console.error('  Consumers importing @conduction/nextcloud-vue/css/index.css would render')
	console.error('  these components with every scoped declaration missing (silently — no error).')
	console.error('  css/index.css must @import the BUILT stylesheet (dist/nextcloud-vue.css),')
	console.error('  which carries the scoped SFC styles as well as the unscoped globals.')
	process.exit(1)
}

console.log(`✓ css/index.css styles all ${rendered.size} scope ids rendered by the built JS`)

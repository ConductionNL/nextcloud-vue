/* eslint-disable no-console, n/no-process-exit */
/**
 * Verifies that every public export of @conduction/nextcloud-vue has
 * corresponding documentation under docs/.
 *
 * The source of truth for "public / user-reachable" is src/index.js.
 * Every named export there is classified and checked against docs/:
 *
 *   - Components (Cn*)        → docs/components/<kebab>.md
 *   - Composables (use*)      → docs/utilities/composables/<kebab>.md
 *   - Store factories         → docs/store/<stem>.md
 *       useObjectStore, createObjectStore  → object-store.md
 *       createCrudStore                    → crud-store.md
 *       createSubResourcePlugin            → sub-resource-plugin.md
 *   - Store plugins (*Plugin) → docs/store/plugins/<kebab>.md
 *   - Store constants/helpers → mentioned by name in an existing docs/store/*.md
 *       SEARCH_TYPE, emptyPaginated, getRegisterApiUrl, getSchemaApiUrl
 *   - Utilities (everything else from utils) → docs/utilities/<kebab>.md
 *
 * Exempt exports are allow-listed in EXEMPT (e.g. registerIcons).
 *
 * Phase 1 — existence: exits 1 when any export lacks a doc file.
 * Phase 2 — accuracy: for every Component export, verifies that each prop
 *   name and each static named-slot from the SFC appears somewhere in the
 *   component's doc file. Exits 1 when any are missing.
 *
 * All categories are reported in a single run so CI surfaces every gap at once.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const INDEX_FILE = path.join(ROOT, 'src', 'index.js')
const DOCS_DIR = path.join(ROOT, 'docs')

/**
 * Exports that don't need a dedicated doc page. classify() short-circuits
 * to `category: 'Exempt'` for anything listed here, and the main loop
 * skips exempt items entirely (not counted toward any category's totals).
 *
 * Use sparingly — reserved for lifecycle/bootstrap helpers that are
 * covered by another doc (e.g. `registerIcons` is described in
 * docs/getting-started.md as part of the install flow, not as a
 * standalone API).
 */
const EXEMPT = new Set([
	'registerIcons',
	'registerTranslations',
])

/**
 * Store factory/helper identifiers → their expected doc filename stem
 * under docs/store/. Needed because the default kebab-case rule would
 * produce e.g. 'use-object-store', but the established convention strips
 * the leading verb (`use`/`create`) so the docs read as 'object-store',
 * 'crud-store', etc.
 *
 * Multiple identifiers may map to the same stem when they're part of
 * one API surface — `useObjectStore` and `createObjectStore` both point
 * at docs/store/object-store.md because a single page documents the
 * singleton hook and its factory together.
 */
const STORE_FACTORY_STEMS = {
	useObjectStore: 'object-store',
	createObjectStore: 'object-store',
	createCrudStore: 'crud-store',
	createSubResourcePlugin: 'sub-resource-plugin',
}

/**
 * Exports that don't warrant their own .md file but MUST be mentioned
 * by name in an existing doc. Keys are the export names; values are
 * paths (relative to docs/store/) of the file that's expected to
 * reference them.
 *
 * Used for constants and small helpers that belong with a larger API:
 * `SEARCH_TYPE` only makes sense alongside `searchPlugin`, so it's
 * checked inside plugins/search.md rather than getting a standalone
 * 'search-type.md'. Coverage passes when the file exists and a plain
 * substring match for the symbol name is found.
 */
const STORE_MENTION_ONLY = {
	SEARCH_TYPE: 'plugins/search.md',
	emptyPaginated: 'sub-resource-plugin.md',
	getRegisterApiUrl: 'plugins.md',
	getSchemaApiUrl: 'plugins.md',
}

// ---------------------------------------------------------------------------
// JS source helpers (used by Phase 2 accuracy check — non-component exports)
// ---------------------------------------------------------------------------

/**
 * @param names that should be skipped during the accuracy check because they
 * are either generic containers ('options', 'params') or too short to carry
 * meaningful signal ('e', 'err'). The check would produce too many false
 * positives if it required every doc to spell out these placeholder names.
 */
const SKIP_PARAMS = new Set(['options', 'params', 'e', 'err', 'error', 'cb', 'fn', 'response'])

/**
 * Find the JS source file that contains the definition of a given export.
 * Returns null when the file cannot be determined (e.g. store constants that
 * live in the same file as a plugin — those are covered by mention-only checks
 * in Phase 1 and don't need an accuracy check).
 * @param {string} exportName identifier from src/index.js
 * @param {string} category classification returned by classify()
 * @return {string|null} absolute path to the source file, or null
 */
function findSourceFile(exportName, category) {
	if (category === 'Composables') {
		return path.join(ROOT, 'src', 'composables', `${exportName}.js`)
	}
	if (category === 'Store plugins') {
		// e.g. 'auditTrailsPlugin' → 'auditTrails.js'
		const stem = exportName.slice(0, -'Plugin'.length)
		return path.join(ROOT, 'src', 'store', 'plugins', `${stem}.js`)
	}
	if (category === 'Store factories') {
		const map = {
			useObjectStore: path.join(ROOT, 'src', 'store', 'index.js'),
			createObjectStore: path.join(ROOT, 'src', 'store', 'index.js'),
			createCrudStore: path.join(ROOT, 'src', 'store', 'createCrudStore.js'),
			createSubResourcePlugin: path.join(ROOT, 'src', 'store', 'createSubResourcePlugin.js'),
		}
		return map[exportName] || null
	}
	if (category === 'Utilities') {
		// Search every utils/*.js file (excluding the barrel) for this export
		const utilDir = path.join(ROOT, 'src', 'utils')
		for (const file of fs.readdirSync(utilDir)) {
			if (!file.endsWith('.js') || file === 'index.js') continue
			const filePath = path.join(utilDir, file)
			const content = fs.readFileSync(filePath, 'utf8')
			const funcRe = new RegExp(`export\\s+(?:async\\s+)?function\\s+${exportName}\\b`)
			const constRe = new RegExp(`export\\s+const\\s+${exportName}\\b`)
			if (funcRe.test(content) || constRe.test(content)) return filePath
		}
		return null
	}
	return null
}

/**
 * Extract @param names from the JSDoc block immediately preceding the named
 * export declaration in a JS file. Only looks at the JSDoc for that specific
 * function so params from sibling exports don't pollute results.
 * @param {string} filePath absolute path to the .js source file
 * @param {string} exportName identifier to look up (function or const name)
 * @return {string[]} @param identifiers (may include 'options.subKey' dotted forms)
 */
function extractFunctionParams(filePath, exportName) {
	if (!filePath || !fs.existsSync(filePath)) return []
	const source = fs.readFileSync(filePath, 'utf8')

	// Locate the export declaration for this specific function
	const funcRe = new RegExp(
		`export\\s+(?:async\\s+)?function\\s+${exportName}\\b|export\\s+const\\s+${exportName}\\s*=`,
	)
	const funcMatch = funcRe.exec(source)
	if (!funcMatch) return []

	// Find the last /** ... */ JSDoc block that sits before this declaration
	const before = source.slice(0, funcMatch.index)
	const jsdocRe = /\/\*\*[\s\S]*?\*\//g
	let lastJsdoc = null
	let jsdocMatch
	while ((jsdocMatch = jsdocRe.exec(before)) !== null) {
		lastJsdoc = jsdocMatch[0]
	}
	if (!lastJsdoc) return []

	// Pull out every @param identifier (handles both plain and [optional] forms)
	const paramRe = /@param\s+\{[^}]+\}\s+\[?([a-zA-Z][a-zA-Z0-9._]*)\]?/g
	const params = new Set()
	let m
	while ((m = paramRe.exec(lastJsdoc)) !== null) {
		params.add(m[1])
	}
	return [...params]
}

/**
 * Accuracy check for a non-component JS export: verifies that every
 * meaningful @param name from the JSDoc appears in the export's doc file
 * (by exact match or, for `options.subKey` dotted paths, by the leaf name).
 * @param {string} exportName identifier from src/index.js
 * @param {string|null} srcPath absolute path to the source file
 * @param {string} docPath absolute path to the expected .md doc file
 * @return {string[]} plain-English issue strings (empty when all covered)
 */
function checkJsAccuracy(exportName, srcPath, docPath) {
	if (!srcPath || !fs.existsSync(srcPath) || !fs.existsSync(docPath)) return []

	const params = extractFunctionParams(srcPath, exportName)
	if (params.length === 0) return []

	const docContent = fs.readFileSync(docPath, 'utf8')
	const issues = []

	for (const param of params) {
		const parts = param.split('.')
		const leaf = parts[parts.length - 1]

		// Skip generic placeholder names
		if (SKIP_PARAMS.has(leaf) || SKIP_PARAMS.has(param)) continue
		// Skip single-character params and dual-form implementation names
		if (leaf.length <= 1 || param.endsWith('OrOptions') || param.endsWith('OrString')) continue

		// Check: the exact param name OR (for dotted paths) just the leaf must appear in the doc
		if (!docContent.includes(param) && !docContent.includes(leaf)) {
			issues.push(`param \`${param}\` not mentioned in doc`)
		}
	}

	return issues
}

// ---------------------------------------------------------------------------
// SFC parsing helpers (used by Phase 2 accuracy check — Component exports)
// ---------------------------------------------------------------------------

/**
 * Extract prop names from a Vue SFC's script-block `props:` definition.
 * Handles both object form (`props: { name: { ... } }`) and array form
 * (`props: ['name1', 'name2']`). Uses brace-depth tracking so prop option
 * keys (type, default, required, validator) are not mistaken for prop names.
 * @param {string} sfcPath absolute path to the .vue file
 * @return {string[]} camelCase prop names, or empty array when none found
 */
function extractSfcProps(sfcPath) {
	if (!fs.existsSync(sfcPath)) return []
	const source = fs.readFileSync(sfcPath, 'utf8')
	const scriptMatch = source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/m)
	if (!scriptMatch) return []
	const script = scriptMatch[1]

	const propsIdx = script.search(/\bprops\s*:/)
	if (propsIdx === -1) return []
	const afterProps = script.slice(propsIdx)

	// Array form: props: ['a', 'b']
	const arrMatch = afterProps.match(/^props\s*:\s*\[([^\]]*)\]/)
	if (arrMatch) {
		const names = []
		const re = /['"]([^'"]+)['"]/g
		let m
		while ((m = re.exec(arrMatch[1])) !== null) names.push(m[1])
		return names
	}

	// Object form: walk characters tracking brace depth.
	// Keys are captured at depth 1 (direct children of the props object):
	//   - Right before a `{` opens a sub-object (e.g. `title: {`)
	//   - At end of line for flat props (e.g. `name: String,`)
	const braceIdx = afterProps.indexOf('{')
	if (braceIdx === -1) return []

	const propNames = []
	let depth = 0
	let lineText = ''

	for (let i = braceIdx; i < afterProps.length; i++) {
		const ch = afterProps[i]
		if (ch === '{') {
			// Capture key immediately before its options object opens
			if (depth === 1) {
				const key = lineText.match(/^\s+([a-zA-Z][a-zA-Z0-9]*)\s*:/)
				if (key) propNames.push(key[1])
			}
			depth++
		} else if (ch === '}') {
			depth--
			if (depth === 0) break
		} else if (ch === '\n') {
			// Capture flat prop (no sub-object) at end of its line
			if (depth === 1) {
				const key = lineText.match(/^\s+([a-zA-Z][a-zA-Z0-9]*)\s*:/)
				if (key) propNames.push(key[1])
			}
			lineText = ''
			continue
		}
		lineText += ch
	}

	return [...new Set(propNames)]
}

/**
 * Extract names of all statically-named `<slot>` elements from a Vue SFC
 * template. Dynamic `:name="..."` bindings are intentionally skipped since
 * the slot name is only known at runtime and cannot be literally checked.
 * @param {string} sfcPath absolute path to the .vue file
 * @return {string[]} static slot names (the implicit default slot is excluded)
 */
function extractSfcNamedSlots(sfcPath) {
	if (!fs.existsSync(sfcPath)) return []
	const source = fs.readFileSync(sfcPath, 'utf8')
	const templateMatch = source.match(/<template\b[^>]*>([\s\S]*?)<\/template>/m)
	if (!templateMatch) return []

	const slots = new Set()
	const slotRe = /<slot\b([^>]*?)(?:\s*\/?>)/g
	let m
	while ((m = slotRe.exec(templateMatch[1])) !== null) {
		const attrs = m[1]
		if (attrs.includes(':name=')) continue // skip dynamic slot names
		const nameM = attrs.match(/\bname="([^"]+)"/)
		if (nameM) slots.add(nameM[1])
	}
	return [...slots]
}

/**
 * Accuracy check for one Component export: verifies that every prop name and
 * every static named slot defined in the SFC is mentioned at least once in
 * the component's doc file (by camelCase or kebab-case name).
 * @param {string} componentName PascalCase name (e.g. 'CnWidgetWrapper')
 * @param {string} docPath absolute path to the component's .md file
 * @return {string[]} plain-English issue strings (empty when all covered)
 */
function checkComponentDetail(componentName, docPath) {
	const sfcPath = path.join(ROOT, 'src', 'components', componentName, `${componentName}.vue`)
	if (!fs.existsSync(sfcPath) || !fs.existsSync(docPath)) return []

	const docContent = fs.readFileSync(docPath, 'utf8')
	const issues = []

	for (const prop of extractSfcProps(sfcPath)) {
		const kebab = toKebab(prop)
		if (!docContent.includes(prop) && !docContent.includes(kebab)) {
			issues.push(`prop \`${prop}\` (${kebab}) not mentioned in doc`)
		}
	}

	for (const slot of extractSfcNamedSlots(sfcPath)) {
		if (!docContent.includes(slot)) {
			issues.push(`slot \`${slot}\` not mentioned in doc`)
		}
	}

	return issues
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/**
 * Convert PascalCase, camelCase, or SCREAMING_SNAKE_CASE to kebab-case.
 *
 * SCREAMING_SNAKE_CASE detection — when the name contains an underscore we
 * treat it as snake-cased and just lowercase + replace `_` with `-`. Without
 * this branch, `SAFE_MARKDOWN_DOMPURIFY_CONFIG` would become
 * `s-a-f-e_-m-a-r-k-d-o-w-n_...` because the per-uppercase-character regex
 * would insert a dash before every capital. Constants like
 * `SAFE_MARKDOWN_DOMPURIFY_CONFIG` and `ROADMAP_LABEL_BLOCKLIST` map cleanly
 * to `safe-markdown-dompurify-config.md` / `roadmap-label-blocklist.md` this
 * way.
 *
 * @param {string} name identifier to convert
 * @return {string} kebab-cased form
 */
function toKebab(name) {
	if (name.includes('_')) {
		return name.toLowerCase().replace(/_/g, '-')
	}
	return name.replace(/([A-Z])/g, (m, l, i) => (i === 0 ? '' : '-') + l.toLowerCase())
}

/**
 * Collect all .md file stems under a directory. By default recurses into
 * subdirectories; pass { recursive: false } to limit to the immediate dir.
 * @param {string} dir absolute directory to walk
 * @param {object} [options] options bag
 * @param {boolean} [options.recursive] when false, only read the top level
 * @return {Set<string>} set of markdown file stems (filename without extension)
 */
function collectDocStems(dir, { recursive = true } = {}) {
	const stems = new Set()
	if (!fs.existsSync(dir)) {
		return stems
	}
	function walk(current) {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name)
			if (entry.isDirectory()) {
				if (recursive) {
					walk(full)
				}
			} else if (entry.isFile() && entry.name.endsWith('.md')) {
				stems.add(path.basename(entry.name, '.md'))
			}
		}
	}
	walk(dir)
	return stems
}

/**
 * Extract all identifiers re-exported from src/index.js. Handles both
 *   export { a, b } from '...'
 *   export { a } from '...'
 * forms (with optional trailing commas and newlines inside the braces).
 * @param {string} filePath absolute path to the barrel file
 * @return {string[]} deduped list of re-exported identifiers
 */
function parsePublicExports(filePath) {
	const source = fs.readFileSync(filePath, 'utf8')
	const names = new Set()
	const re = /export\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g
	let match
	while ((match = re.exec(source)) !== null) {
		for (const raw of match[1].split(',')) {
			const name = raw.trim().split(/\s+as\s+/)[0].trim()
			if (name) {
				names.add(name)
			}
		}
	}
	return [...names]
}

/**
 * Categorize a public export name and return how to satisfy its doc requirement.
 * @param {string} name identifier from src/index.js
 * @return {object} category descriptor used by isCovered()
 */
function classify(name) {
	if (EXEMPT.has(name)) {
		return { category: 'Exempt' }
	}
	if (name in STORE_FACTORY_STEMS) {
		const stem = STORE_FACTORY_STEMS[name]
		return {
			category: 'Store factories',
			expectedStem: stem,
			searchDir: path.join(DOCS_DIR, 'store'),
			expectedPath: `docs/store/${stem}.md`,
		}
	}
	if (name in STORE_MENTION_ONLY) {
		const file = STORE_MENTION_ONLY[name]
		return {
			category: 'Store constants',
			mentionFile: path.join(DOCS_DIR, 'store', file),
			mentionSymbol: name,
			expectedPath: `docs/store/${file} (must mention \`${name}\`)`,
		}
	}
	if (/^Cn[A-Z]/.test(name)) {
		const stem = toKebab(name)
		return {
			category: 'Components',
			expectedStem: stem,
			searchDir: path.join(DOCS_DIR, 'components'),
			expectedPath: `docs/components/${stem}.md`,
		}
	}
	if (name.endsWith('Plugin')) {
		const stem = toKebab(name.slice(0, -'Plugin'.length))
		return {
			category: 'Store plugins',
			expectedStem: stem,
			searchDir: path.join(DOCS_DIR, 'store', 'plugins'),
			expectedPath: `docs/store/plugins/${stem}.md`,
		}
	}
	if (/^use[A-Z]/.test(name)) {
		const stem = toKebab(name)
		return {
			category: 'Composables',
			expectedStem: stem,
			searchDir: path.join(DOCS_DIR, 'utilities', 'composables'),
			expectedPath: `docs/utilities/composables/${stem}.md`,
		}
	}
	const stem = toKebab(name)
	return {
		category: 'Utilities',
		expectedStem: stem,
		searchDir: path.join(DOCS_DIR, 'utilities'),
		expectedPath: `docs/utilities/${stem}.md`,
	}
}

/**
 * Verify coverage for a single classified export. Returns true when covered.
 * @param {object} info classify() result
 * @return {boolean} whether the export's documentation requirement is satisfied
 */
function isCovered(info) {
	if (info.category === 'Exempt') {
		return true
	}
	if (info.mentionFile) {
		if (!fs.existsSync(info.mentionFile)) {
			return false
		}
		const contents = fs.readFileSync(info.mentionFile, 'utf8')
		return contents.includes(info.mentionSymbol)
	}
	const stems = collectDocStems(info.searchDir)
	return stems.has(info.expectedStem)
}

// ---------------------------------------------------------------------------
// Phase 1: existence check
// ---------------------------------------------------------------------------

const exports_ = parsePublicExports(INDEX_FILE)

const categories = new Map()
const componentExports = [] // collected for Phase 2a (SFC prop/slot check)

// Categories that get a Phase 2b @param accuracy check (must have their own
// doc file — Store constants use mention-only and are skipped).
const JS_ACCURACY_CATEGORIES = new Set(['Composables', 'Utilities', 'Store factories', 'Store plugins'])
const jsExports = [] // { name, category, docPath } collected for Phase 2b

for (const name of exports_) {
	const info = classify(name)
	if (info.category === 'Exempt') {
		continue
	}
	if (info.category === 'Components') {
		componentExports.push(name)
	}
	// Collect JS exports that have a dedicated doc file for the @param check
	if (JS_ACCURACY_CATEGORIES.has(info.category) && !info.mentionFile && info.searchDir && info.expectedStem) {
		const docPath = path.join(info.searchDir, `${info.expectedStem}.md`)
		jsExports.push({ name, category: info.category, docPath })
	}
	if (!categories.has(info.category)) {
		categories.set(info.category, { checked: 0, missing: [] })
	}
	const bucket = categories.get(info.category)
	bucket.checked += 1
	if (!isCovered(info)) {
		bucket.missing.push({ name, expectedPath: info.expectedPath })
	}
}

const ORDER = ['Components', 'Composables', 'Store factories', 'Store plugins', 'Store constants', 'Utilities']
const ordered = [...categories.entries()].sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b))

let totalChecked = 0
let totalMissing = 0

console.log('Documentation coverage by category:\n')
for (const [category, { checked, missing }] of ordered) {
	totalChecked += checked
	totalMissing += missing.length
	const covered = checked - missing.length
	const mark = missing.length === 0 ? '✓' : '✗'
	console.log(`  ${mark} ${category}: ${covered}/${checked}`)
}

if (totalMissing > 0) {
	console.error(`\n✗ ${totalMissing} export(s) are missing documentation:\n`)
	for (const [category, { missing }] of ordered) {
		if (missing.length === 0) {
			continue
		}
		console.error(`${category}:`)
		for (const { name, expectedPath } of missing) {
			console.error(`  - ${name}  →  ${expectedPath}`)
		}
		console.error('')
	}
	console.error('Create the missing files (or add the missing mention) so every public export is documented.')
	process.exit(1)
}

console.log(`\n✓ All ${totalChecked} public exports are documented.`)

// ---------------------------------------------------------------------------
// Phase 2a: accuracy check — every SFC prop and named slot must appear in doc
// ---------------------------------------------------------------------------

console.log('\nChecking component doc accuracy (props and slots):\n')

const detailFailures = []

for (const name of componentExports) {
	const kebab = toKebab(name)
	const fileIssues = []

	// docs/components/ reference doc (formal props/slots tables)
	const docsPath = path.join(DOCS_DIR, 'components', `${kebab}.md`)
	const docsIssues = checkComponentDetail(name, docsPath)
	if (docsIssues.length > 0) {
		fileIssues.push({ file: `docs/components/${kebab}.md`, issues: docsIssues })
	}

	// co-located styleguide example (takes priority in the styleguide renderer)
	const colocatedPath = path.join(ROOT, 'src', 'components', name, `${name}.md`)
	const colocatedIssues = checkComponentDetail(name, colocatedPath)
	if (colocatedIssues.length > 0) {
		fileIssues.push({ file: `src/components/${name}/${name}.md`, issues: colocatedIssues })
	}

	if (fileIssues.length > 0) {
		detailFailures.push({ name, fileIssues })
	}
}

const detailChecked = componentExports.length
const detailFailed = detailFailures.length

if (detailFailed === 0) {
	console.log(`  ✓ All ${detailChecked} component docs cover their props and slots.`)
} else {
	console.log(`  ✓ ${detailChecked - detailFailed}/${detailChecked} component docs cover their props and slots.`)
	console.error(`\n✗ ${detailFailed} component doc(s) are missing prop or slot coverage:\n`)
	for (const { name, fileIssues } of detailFailures) {
		console.error(`${name}:`)
		for (const { file, issues } of fileIssues) {
			console.error(`  ${file}:`)
			for (const issue of issues) {
				console.error(`    - ${issue}`)
			}
		}
		console.error('')
	}
}

// ---------------------------------------------------------------------------
// Phase 2b: accuracy check — every JSDoc @param must appear in the doc
// ---------------------------------------------------------------------------

console.log('\nChecking JS export doc accuracy (JSDoc @param names):\n')

// Accumulate results per category so we can print a Phase-1-style summary
const jsDetailByCategory = new Map()
for (const cat of JS_ACCURACY_CATEGORIES) {
	jsDetailByCategory.set(cat, { checked: 0, failures: [] })
}

for (const { name, category, docPath } of jsExports) {
	const bucket = jsDetailByCategory.get(category)
	bucket.checked += 1
	const srcPath = findSourceFile(name, category)
	const issues = checkJsAccuracy(name, srcPath, docPath)
	if (issues.length > 0) {
		bucket.failures.push({ name, issues, docPath })
	}
}

const JS_ORDER = ['Composables', 'Store factories', 'Store plugins', 'Utilities']
let jsDetailFailed = 0

for (const cat of JS_ORDER) {
	const { checked, failures } = jsDetailByCategory.get(cat)
	const covered = checked - failures.length
	const mark = failures.length === 0 ? '✓' : '✗'
	console.log(`  ${mark} ${cat}: ${covered}/${checked}`)
	jsDetailFailed += failures.length
}

if (jsDetailFailed > 0) {
	console.error(`\n✗ ${jsDetailFailed} JS export doc(s) are missing @param coverage:\n`)
	for (const cat of JS_ORDER) {
		const { failures } = jsDetailByCategory.get(cat)
		if (failures.length === 0) continue
		console.error(`${cat}:`)
		for (const { name, issues, docPath } of failures) {
			const rel = path.relative(ROOT, docPath).replace(/\\/g, '/')
			console.error(`  ${name}  (${rel}):`)
			for (const issue of issues) {
				console.error(`    - ${issue}`)
			}
		}
		console.error('')
	}
	console.error('Add the missing @param names to the doc so every JSDoc parameter is covered.')
}

// ---------------------------------------------------------------------------
// Final exit
// ---------------------------------------------------------------------------

if (detailFailed > 0 || jsDetailFailed > 0) {
	process.exit(1)
}
console.log('\n✓ All accuracy checks passed.')
process.exit(0)

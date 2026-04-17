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
 * Exits 1 when any export lacks coverage. All categories are reported in
 * a single run so CI surfaces every gap at once.
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

/**
 * Convert PascalCase or camelCase to kebab-case.
 * @param {string} name identifier to convert
 * @return {string} kebab-cased form
 */
function toKebab(name) {
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

const exports_ = parsePublicExports(INDEX_FILE)

const categories = new Map()
for (const name of exports_) {
	const info = classify(name)
	if (info.category === 'Exempt') {
		continue
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

if (totalMissing === 0) {
	console.log(`\n✓ All ${totalChecked} public exports are documented.`)
	process.exit(0)
}

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

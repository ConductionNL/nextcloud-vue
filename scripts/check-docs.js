/**
 * Verifies that every component in src/components/ has a corresponding
 * .md documentation file somewhere under docs/.
 *
 * Naming convention: CnActionsBar → cn-actions-bar.md
 * Exit code 1 when any component is missing docs (CI-friendly).
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const COMPONENTS_DIR = path.join(ROOT, 'src', 'components')
const DOCS_DIR = path.join(ROOT, 'docs')

/**
 * Convert PascalCase component name to kebab-case filename stem.
 * @param name
 */
function toKebab(name) {
	return name.replace(/([A-Z])/g, (m, l, i) => (i === 0 ? '' : '-') + l.toLowerCase())
}

/**
 * Recursively collect all .md file stems under a directory.
 * @param dir
 */
function collectDocStems(dir) {
	const stems = new Set()
	function walk(current) {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name)
			if (entry.isDirectory()) {
				walk(full)
			} else if (entry.isFile() && entry.name.endsWith('.md')) {
				stems.add(path.basename(entry.name, '.md'))
			}
		}
	}
	walk(dir)
	return stems
}

/**
 * Return all component directory names from src/components/.
 * @param dir
 */
function getComponentNames(dir) {
	return fs.readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.sort()
}

const docStems = collectDocStems(DOCS_DIR)
const componentNames = getComponentNames(COMPONENTS_DIR)

const missing = componentNames.filter((name) => {
	const stem = toKebab(name)
	return !docStems.has(stem)
})

const documented = componentNames.length - missing.length

if (missing.length === 0) {
	console.log(`✓ All ${componentNames.length} components have documentation.`)
	process.exit(0)
} else {
	console.log(`Documentation coverage: ${documented}/${componentNames.length} components\n`)
	console.error(`✗ ${missing.length} component(s) are missing a docs .md file:\n`)
	for (const name of missing) {
		console.error(`  - ${name}  →  docs/components/${toKebab(name)}.md`)
	}
	console.error('\nCreate the missing files or move existing docs so the filename matches the component name.')
	process.exit(1)
}

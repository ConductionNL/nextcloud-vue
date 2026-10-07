/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Scores every component under src/components on how much it relies on
 * OpenRegister and writes the result to docs/components/_generated/reliance.json
 * for the documentation site.
 *
 * Two numbers per component:
 *   - direct: lines inside the component's own directory that reference
 *     OpenRegister (store imports, API paths, composables, the register and
 *     schema selector).
 *   - transitive: files outside the directory, reached by following the actual
 *     import statements, that carry such a reference. A wrapper with no
 *     reference of its own still counts the children it cannot render without,
 *     while importing the widget registry alone does not drag in every widget.
 *
 * The tier follows the sum: none (0), light (1 to 3), medium (4 to 10) and
 * heavy (11 and more). A component with tier none does not touch OpenRegister
 * itself nor through anything it imports.
 *
 * Usage: node scripts/openregister-reliance.js
 */

const fs = require('fs')
const path = require('path')

/** Patterns that mark a direct OpenRegister reliance; each hit counts once per line. */
const DIRECT_MARKERS = [
	/\/apps\/openregister/,
	/\bopenregister\b/i,
	/useObjectStore|useRegisterStore|useSchemaStore|createObjectStore|createCrudStore/,
	/from '[^']*\/store(\/index\.js)?'/,
	/from '[^']*\/store\/[^']+'/,
	/objectService|ObjectService/,
	/CnRegisterSchemaSelect/,
]

const SOURCE_FILE = /\.(vue|js|ts|mjs)$/
const TEST_FILE = /\.(spec|test)\./

/**
 * @param {string} dir directory to walk
 * @return {string[]} source files below it, tests excluded
 */
function walk(dir) {
	const files = []
	for (const entry of fs.readdirSync(dir)) {
		const full = path.join(dir, entry)
		if (fs.statSync(full).isDirectory()) {
			if (entry !== 'node_modules' && entry !== '__tests__') {
				files.push(...walk(full))
			}
		} else if (SOURCE_FILE.test(entry) && !TEST_FILE.test(entry)) {
			files.push(full)
		}
	}
	return files
}

/**
 * @param {string} source file contents
 * @return {number} lines with a direct marker, comments excluded
 */
function countDirect(source) {
	let count = 0
	for (const line of source.split('\n')) {
		const trimmed = line.trimStart()
		if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
			continue
		}
		if (DIRECT_MARKERS.some((marker) => marker.test(line))) {
			count++
		}
	}
	return count
}

/**
 * Resolves a relative import to a file on disk the way the bundler does.
 *
 * @param {string} fromFile importing file
 * @param {string} specifier the relative import path
 * @return {string|null}
 */
function resolveImport(fromFile, specifier) {
	const base = path.resolve(path.dirname(fromFile), specifier)
	const candidates = [base, base + '.js', base + '.mjs', base + '.ts', base + '.vue', path.join(base, 'index.js'), path.join(base, 'index.mjs'), path.join(base, 'index.ts')]
	return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null
}

/**
 * @param {string} source file contents
 * @return {string[]} relative import specifiers, static and dynamic
 */
function relativeImports(source) {
	return [...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)'(\.{1,2}\/[^']+)'/g)].map((match) => match[1])
}

/**
 * @param {number} score direct lines plus transitive files
 * @return {'none'|'light'|'medium'|'heavy'}
 */
function tierOf(score) {
	if (score === 0) {
		return 'none'
	}
	if (score <= 3) {
		return 'light'
	}
	if (score <= 10) {
		return 'medium'
	}
	return 'heavy'
}

/**
 * @param {string} componentName e.g. CnDeleteDialog
 * @return {string} the docs page slug, e.g. cn-delete-dialog
 */
function pageSlug(componentName) {
	return componentName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * @param {string} srcDir the src directory holding components/
 * @param {string|null} docsComponentsDir where the component pages live, to link only existing pages
 * @return {Record<string, {direct: number, transitive: number, tier: string, via: string[], page: string|null}>}
 */
function computeReliance(srcDir, docsComponentsDir = null) {
	const componentsDir = path.join(srcDir, 'components')
	const files = new Map()
	for (const file of walk(srcDir)) {
		const source = fs.readFileSync(file, 'utf8')
		files.set(file, {
			direct: countDirect(source),
			imports: relativeImports(source).map((specifier) => resolveImport(file, specifier)).filter(Boolean),
		})
	}

	const reachable = (startFiles) => {
		const own = new Set(startFiles)
		const seen = new Set()
		const queue = [...startFiles]
		while (queue.length > 0) {
			const file = queue.pop()
			for (const next of (files.get(file) ?? { imports: [] }).imports) {
				if (!own.has(next) && !seen.has(next)) {
					seen.add(next)
					queue.push(next)
				}
			}
		}
		return [...seen]
	}

	const result = {}
	for (const entry of fs.readdirSync(componentsDir).sort()) {
		const dir = path.join(componentsDir, entry)
		if (!fs.statSync(dir).isDirectory() || !/^Cn[A-Z]/.test(entry)) {
			continue
		}
		const ownFiles = walk(dir)
		const direct = ownFiles.reduce((sum, file) => sum + (files.get(file)?.direct ?? 0), 0)
		const relyingFiles = reachable(ownFiles).filter((file) => (files.get(file)?.direct ?? 0) > 0)
		const via = new Set(relyingFiles
			.filter((file) => file.startsWith(componentsDir + path.sep))
			.map((file) => file.slice(componentsDir.length + 1).split(path.sep)[0])
			.filter((name) => name !== entry))
		const slug = pageSlug(entry)
		const hasPage = docsComponentsDir !== null && fs.existsSync(path.join(docsComponentsDir, slug + '.md'))
		result[entry] = {
			direct,
			transitive: relyingFiles.length,
			tier: tierOf(direct + relyingFiles.length),
			via: [...via].sort(),
			page: hasPage ? slug : null,
		}
	}
	return result
}

/**
 * @param {string} repoRoot the repository root
 * @return {{outFile: string, components: object}}
 */
function writeReliance(repoRoot) {
	const components = computeReliance(path.join(repoRoot, 'src'), path.join(repoRoot, 'docs/components'))
	const outFile = path.join(repoRoot, 'docs/components/_generated/reliance.json')
	fs.mkdirSync(path.dirname(outFile), { recursive: true })
	fs.writeFileSync(outFile, JSON.stringify({ generatedBy: 'scripts/openregister-reliance.js', components }, null, '\t') + '\n')
	return { outFile, components }
}

module.exports = { computeReliance, countDirect, tierOf, pageSlug, writeReliance }

if (require.main === module) {
	const { outFile, components } = writeReliance(path.resolve(__dirname, '..'))
	const tiers = {}
	for (const item of Object.values(components)) {
		tiers[item.tier] = (tiers[item.tier] ?? 0) + 1
	}
	console.log(`wrote ${path.relative(process.cwd(), outFile)}: ${Object.keys(components).length} components`, tiers)
}

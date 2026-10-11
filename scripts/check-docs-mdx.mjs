/**
 * Compiles every page under docs/ the way the Docusaurus site does (MDX 3,
 * GFM, directives), and fails on the first class of error that breaks the
 * site build: a `<word>` read as a JSX tag, a `{` read as an expression, an
 * unclosed code span inside a table cell.
 *
 * Why this exists: `check:docs` and `check:docs-fresh` read the pages as
 * text, so a page that MDX cannot compile passed both and only failed in the
 * "Deploy Documentation" run after the push to beta (docs/components/
 * cn-actions-bar.md and cn-workspace-filter-widget.md, 11 Oct 2026). The full
 * `docusaurus build` takes minutes; this compiles the same pages in seconds.
 *
 * Needs the docusaurus/ dependencies (`cd docusaurus && npm ci`), which every
 * code-quality check leg already installs.
 *
 * Usage: node scripts/check-docs-mdx.mjs
 */

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS_DIR = path.join(ROOT, 'docs')
const SITE_REQUIRE = createRequire(path.join(ROOT, 'docusaurus', 'package.json'))

/**
 * Imports an ESM package from docusaurus/node_modules.
 *
 * @param {string} name package name
 * @return {Promise<object>} the module namespace
 */
async function importFromSite(name) {
	let resolved
	try {
		resolved = SITE_REQUIRE.resolve(name)
	} catch {
		console.error(`check:docs-mdx: cannot resolve ${name} from docusaurus/. Run \`cd docusaurus && npm ci\` first.`)
		process.exit(2)
	}
	return import(pathToFileURL(resolved).href)
}

/**
 * @param {string} dir directory to walk
 * @return {string[]} every .md / .mdx file below it
 */
function listPages(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			out.push(...listPages(full))
		} else if (/\.mdx?$/.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

const { compile } = await importFromSite('@mdx-js/mdx')
const remarkFrontmatter = (await importFromSite('remark-frontmatter')).default
const remarkComment = (await importFromSite('@slorber/remark-comment')).default
const remarkGfm = (await importFromSite('remark-gfm')).default
const remarkDirective = (await importFromSite('remark-directive')).default
const { unwrapMdxCodeBlocks, escapeMarkdownHeadingIds } = SITE_REQUIRE('@docusaurus/utils')

// The syntax extensions the site's MDX processor parses with
// (@docusaurus/mdx-loader lib/processor.js, mdx1Compat defaults on): front
// matter, HTML comments, GFM tables, admonition directives. A parse error is
// what breaks the build, so these are the ones that matter here.
const REMARK_PLUGINS = [remarkFrontmatter, remarkComment, remarkGfm, remarkDirective]

/**
 * Applies the string preprocessing @docusaurus/mdx-loader runs before MDX
 * (lib/preprocessor.js): unwrap mdx-code-block fences and escape custom
 * heading ids.
 *
 * @param {string} source page source
 * @return {string} the source MDX actually sees
 */
function preprocess(source) {
	return escapeMarkdownHeadingIds(unwrapMdxCodeBlocks(source))
}

const pages = listPages(DOCS_DIR)
const failures = []
for (const page of pages) {
	const source = preprocess(fs.readFileSync(page, 'utf8'))
	try {
		await compile(source, { remarkPlugins: REMARK_PLUGINS })
	} catch (error) {
		const where = error.line ? `:${error.line}:${error.column ?? 1}` : ''
		failures.push(`${path.relative(ROOT, page)}${where}  ${error.reason ?? error.message}`)
	}
}

if (failures.length > 0) {
	console.error(`check:docs-mdx: ${failures.length} of ${pages.length} page(s) do not compile as MDX:\n`)
	for (const line of failures) {
		console.error(`  ${line}`)
	}
	console.error('\nEscape a literal `<word>` or `{` with a backslash, or put it in a code span.')
	process.exit(1)
}

console.log(`check:docs-mdx: all ${pages.length} pages compile as MDX.`)

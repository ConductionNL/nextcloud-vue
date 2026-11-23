#!/usr/bin/env node
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The comparison half of `npm run check:docs-fresh`. The regeneration half
 * (`vue-docgen` in docusaurus/) runs first and rewrites
 * docs/components/_generated/; this script fails when the result differs from
 * what git tracks.
 *
 * It reads `git status --porcelain`, not `git diff`. `git diff` ignores
 * untracked files, so a page the generator wrote for the first time never
 * showed up: CnGuardianHome shipped without its page and the check stayed
 * green (nextcloud-vue#1272). Porcelain lists modified, deleted AND untracked
 * paths, so a new component without a committed page now fails too.
 */

const { execFileSync } = require('child_process')

const GENERATED = 'docs/components/_generated/'

/**
 * The generated pages that differ from what git tracks, one porcelain line each.
 *
 * @param {string} cwd The repo root.
 * @param {string} dir The generated directory, relative to the root.
 * @return {string[]} Lines such as `?? docs/components/_generated/CnX.md`.
 */
function staleGeneratedPages(cwd = process.cwd(), dir = GENERATED) {
	const out = execFileSync(
		'git',
		['status', '--porcelain', '--untracked-files=all', '--', dir],
		{ cwd, encoding: 'utf8' },
	)
	return out.split('\n').filter((line) => line.trim() !== '')
}

if (require.main === module) {
	const stale = staleGeneratedPages()
	if (stale.length === 0) {
		console.log(`check:docs-fresh: ${GENERATED} matches the regenerated pages`)
		process.exit(0)
	}
	console.error(`check:docs-fresh: ${stale.length} generated page(s) differ from what git tracks:`)
	for (const line of stale) {
		console.error(`  ${line}`)
	}
	console.error('Run `cd docusaurus && npm run prebuild:docs` and commit docs/components/_generated/. A line starting with ?? is a page git does not track yet.')
	process.exit(1)
}

module.exports = { staleGeneratedPages }

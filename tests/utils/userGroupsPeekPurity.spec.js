/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The filter-token resolver and `visibleWhen` run on public pages and in
 * node, so they must not pull in `@nextcloud/axios`. In 2.80.0 they did,
 * through `resolveFilterTokens -> widgetVisibility`: a public site bundle
 * broke its size budget and node specs crashed on axios' import-time read of
 * the request token. The group peek now lives in `userGroupsPeek.js`, which
 * imports no `@nextcloud/*` package and loads `widgetVisibility.js` lazily.
 *
 * @spec openspec/changes/nextcloud-group-surfaces/specs/schema-utilities/spec.md#requirement-mygroups-resolves-to-the-current-users-group-ids
 */
const fs = require('fs')
const path = require('path')

const UTILS = path.resolve(__dirname, '../../src/utils')

/**
 * Walk the STATIC import graph of a module (`import ... from` and bare
 * `import '...'`; a dynamic `import()` is not followed, it is lazy).
 *
 * @param {string} entry absolute path of the entry module
 * @return {{ files: string[], packages: string[] }} local files reached and bare package specifiers imported
 */
function staticGraph(entry) {
	const files = new Set()
	const packages = new Set()
	const visit = (file) => {
		if (files.has(file)) {
			return
		}
		files.add(file)
		const source = fs.readFileSync(file, 'utf8')
		const re = /^\s*(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm
		for (const match of source.matchAll(re)) {
			const spec = match[1] || match[2]
			if (!spec.startsWith('.')) {
				packages.add(spec)
				continue
			}
			let resolved = path.resolve(path.dirname(file), spec)
			if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
				resolved = [resolved + '.js', path.join(resolved, 'index.js')].find((c) => fs.existsSync(c))
			}
			if (resolved) {
				visit(resolved)
			}
		}
	}
	visit(entry)
	return { files: [...files].map((f) => path.relative(UTILS, f)), packages: [...packages] }
}

describe('userGroupsPeek stays free of @nextcloud runtime', () => {
	it('userGroupsPeek.js imports no @nextcloud/* package, directly or through anything it imports', () => {
		const { packages } = staticGraph(path.join(UTILS, 'userGroupsPeek.js'))
		expect(packages.filter((p) => p.startsWith('@nextcloud/'))).toEqual([])
	})

	it.each(['resolveFilterTokens.js', 'visibleWhen.js'])('%s does not reach @nextcloud/axios or widgetVisibility.js statically', (entry) => {
		const { files, packages } = staticGraph(path.join(UTILS, entry))
		expect(packages).not.toContain('@nextcloud/axios')
		expect(files).not.toContain('widgetVisibility.js')
	})

	it('loading the resolver and resolving tokens never evaluates @nextcloud/axios', () => {
		jest.isolateModules(() => {
			const axiosFactory = jest.fn(() => ({ __esModule: true, default: { get: jest.fn() } }))
			jest.doMock('@nextcloud/axios', axiosFactory)
			window.OC = undefined
			const { resolveFilterTokens } = require('../../src/utils/resolveFilterTokens.js')
			expect(resolveFilterTokens({ status: 'open', team: '@myGroups' })).toEqual({ status: 'open', team: '@myGroups' })
			expect(axiosFactory).not.toHaveBeenCalled()
		})
	})

	it('keeps the public API: widgetVisibility re-exports the same peek and user-id read', () => {
		const peek = require('../../src/utils/userGroupsPeek.js')
		const visibility = require('../../src/utils/widgetVisibility.js')
		expect(visibility.peekCurrentUserGroups).toBe(peek.peekCurrentUserGroups)
		expect(visibility.getCurrentUserId).toBe(peek.getCurrentUserId)
	})
})

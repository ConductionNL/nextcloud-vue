/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every page component the renderer can mount is a named export of the
 * library entry.
 *
 * `CnReportsPage` was mounted for `type: "reports"` and exported from the
 * components barrel, but not from `src/index.js`. A host that imported it got
 * `undefined`, and Vue renders `undefined` as nothing, with no error. This
 * test reads `pageTypes.js` and `src/index.js` as text, so a page type added
 * to one and forgotten in the other fails here.
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', '..')
const pageTypes = fs.readFileSync(path.join(root, 'src/components/CnPageRenderer/pageTypes.js'), 'utf8')
const entry = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8')
const barrel = fs.readFileSync(path.join(root, 'src/components/index.js'), 'utf8')

/** The component file every `defaultPageTypes` entry imports. */
const mounted = [...pageTypes.matchAll(/^\t'?([a-z-]+)'?: defineAsyncComponent\(\(\) => import\('\.\.\/[^']*\/(Cn[A-Za-z]+)\.vue'\)/gm)]
	.map((match) => ({ type: match[1], component: match[2] }))

/** Names inside every `export { ... } from './components/index.js'` block of the entry. */
const exported = new Set([...entry.matchAll(/export \{([^}]*)\} from '\.\/components\/index\.js'/g)]
	.flatMap((match) => match[1].split(','))
	.map((name) => name.trim())
	.filter(Boolean))

describe('page components the renderer mounts', () => {
	it('finds the page types, so the checks below are not vacuous', () => {
		expect(mounted.length).toBeGreaterThanOrEqual(15)
		expect(mounted.map((entry) => entry.type)).toEqual(expect.arrayContaining(['index', 'detail', 'reports', 'links']))
		expect(exported.size).toBeGreaterThan(100)
	})

	it.each(mounted)('exports $component (type "$type") from the library entry', ({ component }) => {
		expect(exported.has(component)).toBe(true)
	})

	it.each(mounted)('exports $component from the components barrel the entry re-exports', ({ component }) => {
		expect(new RegExp(`\\b${component}\\b`).test(barrel)).toBe(true)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The journey renderer loads on demand. Only the barrel wrappers may name the
 * SFCs, and only through a dynamic import(), so a page that shows no journey
 * never pulls the journey code in. (Transferred-bytes measurement needs a
 * built bundle and a browser; this guards the structure that makes it pass.)
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-5
 */
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../../src')

function walk(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const p = path.join(dir, e.name)
		return e.isDirectory() ? walk(p) : [p]
	})
}

describe('journey renderer is route-split', () => {
	it('no module outside the journey folders statically imports CnJourney or CnJourneyDialog', () => {
		const offenders = walk(SRC)
			.filter((f) => /\.(js|vue)$/.test(f))
			.filter((f) => !/CnJourney(Dialog)?\//.test(f))
			.filter((f) => /^\s*import[^\n]*['"][^'"]*CnJourney(Dialog)?(\.vue|\/index\.js)?['"]/m.test(fs.readFileSync(f, 'utf8')))
		expect(offenders.map((f) => path.relative(SRC, f))).toEqual([])
	})

	it('the wrappers load the SFC through import()', () => {
		for (const name of ['CnJourney', 'CnJourneyDialog']) {
			const index = fs.readFileSync(path.join(SRC, 'components', name, 'index.js'), 'utf8')
			expect(index).toMatch(/defineAsyncComponent\(\(\) => import\(/)
			expect(index).not.toMatch(/^import .*\.vue/m)
		}
	})
})

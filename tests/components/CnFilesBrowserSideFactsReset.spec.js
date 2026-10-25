/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A file side card's facts undo core's dt/dd rules (inline-block, a fixed
 * end-aligned dt, padding), DqDocumentenBeheer. Read from the style block.
 *
 * @spec openspec/changes/files-side-facts-core-dl/specs/files-side-facts-core-dl/spec.md
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'), 'utf8')
const style = source.slice(source.indexOf('<style'))

describe('CnFilesBrowser side facts', () => {
	it('set dt and dd as start-aligned blocks without width or padding', () => {
		const selector = '.cn-files-browser__side-facts dt,\n.cn-files-browser__side-facts dd {'
		const at = style.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = style.slice(at, style.indexOf('}', at))
		for (const decl of ['display: block;', 'width: auto;', 'padding: 0;', 'text-align: start;', 'white-space: normal;']) {
			expect(body).toContain(decl)
		}
	})
})

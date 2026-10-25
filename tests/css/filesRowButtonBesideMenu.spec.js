/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A file row's button ("Beoordelen") and its row menu stand side by side, not
 * stacked (DqZaakDocumenten r26c: rows 91 high where the board draws 61).
 * Read from CnFilesBrowser's style block.
 *
 * @spec openspec/changes/files-row-button-beside-menu/specs/files-row-button-beside-menu/spec.md
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'), 'utf8')
const css = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('CnFilesBrowser: the row button beside the row menu', () => {
	it('draws both inline on one line', () => {
		expect(bodyOf('.cn-files-browser__col-actions > .cn-files-browser__row-button')).toMatch(/display:\s*inline-flex/)
		expect(bodyOf('.cn-files-browser__col-actions > .cn-files-browser__row-menu')).toMatch(/display:\s*inline-flex/)
	})

	it('puts 14px between them', () => {
		expect(bodyOf('.cn-files-browser__col-actions > .cn-files-browser__row-button + .cn-files-browser__row-menu')).toMatch(/margin-inline-start:\s*14px/)
	})
})

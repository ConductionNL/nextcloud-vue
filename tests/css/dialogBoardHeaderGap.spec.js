/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every Dq dialog board puts its body 22px under the header text (header
 * padding 4px, body padding 18px), and sets a choice legend at 14px/600 on
 * the normal line height (DqDocumentGenereren r26a: 4px short). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-dialog-header-gap/specs/board-dialog-header-gap/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('dialog.css: the board dialog header and legend', () => {
	it('leaves 22px between the header text and the body (4px under the header, the body\'s 18px gap)', () => {
		expect(bodyOf('.cn-dialog-board .dialog__content > .cn-dialog-header')).toMatch(/margin-bottom:\s*4px/)
	})

	it('sets a choice legend at 14px/600 on the normal line height', () => {
		const legend = bodyOf('.cn-dialog-board .cn-choice-cards__legend')
		expect(legend).toMatch(/font-size:\s*14px/)
		expect(legend).toMatch(/font-weight:\s*600/)
		expect(legend).toMatch(/line-height:\s*normal/)
	})
})

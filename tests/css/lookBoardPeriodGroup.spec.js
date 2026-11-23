/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's compact segmented group (the period and statistic switches on
 * DqDoorlooptijd, DqTermijnen and DqProcesanalyse): 14px of padding beside a
 * label, the options not chosen in the soft ink and the chosen one in the
 * main ink. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-period-group-soft-ink/specs/board-period-group-soft-ink/spec.md#requirement-a-board-period-group-draws-the-options-not-chosen-in-the-soft-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule listing an exact selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations, or ''.
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

const GROUP = '.cn-look-board .cn-segmented-control.cn-segmented-control--compact'
const NOT_NC = ':not(.cn-look-nextcloud *)'

describe('look-board.css: the board period group', () => {
	it('pads a label 14px on each side and draws it in the soft ink', () => {
		const body = bodyOf(`${GROUP} .cn-segmented-control__option${NOT_NC}`)
		expect(body).toMatch(/padding: 0 14px;/)
		expect(body).toMatch(/(^|[\s;])color: var\(--cn-board-text-soft\);/)
	})

	it('keeps the chosen option in the main ink', () => {
		const body = bodyOf(`${GROUP} .cn-segmented-control__option--checked${NOT_NC}`)
		expect(body).toMatch(/(^|[\s;])color: var\(--color-main-text\);/)
	})

	it('keeps an icon-only option square', () => {
		const body = bodyOf(`${GROUP} .cn-segmented-control__option--icon-only${NOT_NC}`)
		expect(body).toMatch(/padding: 0;/)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An app's own list that rules above its first row marks itself with
 * `cn-board-ruled-rows`, and the card's title then stands 6px above that rule,
 * as it does over a record, task or decision list (pipelinq "Mijn werk" on
 * PqOperationeel: the title 25px above the first row, the board 17).
 * Read from the stylesheet.
 *
 * @spec openspec/changes/board-ruled-rows-marker/specs/board-card-title-above-ruled-list/spec.md#requirement-an-apps-own-ruled-list-starts-6px-under-the-card-title
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board: a card title over an app\'s own ruled list', () => {
	it('stands 6px above the first rule of a list marked cn-board-ruled-rows', () => {
		const re = /([^{}]+)\{([^{}]*)\}/g
		let found = null
		let m
		while ((m = re.exec(css))) {
			if (m[1].includes('.cn-board-ruled-rows') && m[1].includes('.cn-widget-wrapper__header') && /padding-bottom:\s*6px/.test(m[2])) {
				found = m[1]
			}
		}
		expect(found).not.toBeNull()
		expect(found).toContain('> .cn-widget-wrapper__content .cn-board-ruled-rows')
	})
})

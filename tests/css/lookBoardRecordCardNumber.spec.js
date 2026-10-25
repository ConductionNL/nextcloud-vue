/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record card's case number broke over two lines ("2026-" / "0206") on
 * :8080 when the head also held the checkbox, a pill and the menu
 * (DqAanMijToegewezen). It stays on one line.
 *
 * @spec openspec/changes/board-record-card-number-one-line/specs/board-record-card-number-one-line/spec.md#requirement-the-record-cards-number-stays-on-one-line
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the record card number', () => {
	it('does not wrap', () => {
		const rule = css.match(/\.cn-look-board \.cn-object-card--board \.cn-object-card__record-number \{([^}]*)\}/)
		expect(rule[1]).toContain('white-space: nowrap;')
	})
})

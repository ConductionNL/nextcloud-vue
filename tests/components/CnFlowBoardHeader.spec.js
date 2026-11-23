/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board-look flow editor pads like every board page, its header buttons
 * are the board's header buttons and its palette steps are plain labels
 * (DqFlow). jsdom draws no layout, so the rules are read from the sources.
 *
 * @spec openspec/changes/board-flow-editor-header/specs/board-flow-editor-header/spec.md#requirement-the-board-flow-editor-has-the-board-page-header-and-plain-palette-steps
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8')

/**
 * A selector that ends a selector list (` {`) or sits in one (`,`): another board's
 * header may share the same list.
 *
 * @param {string} selector The selector.
 * @return {RegExp} The pattern.
 */
const inSelectorList = (selector) => new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?: \\{|,)')

describe('the board flow editor header', () => {
	const sfc = read('components/CnFlowsPage/CnFlowBoard.vue')

	it('pads its page with the board content padding', () => {
		expect(sfc).toMatch(/\.cn-flow-board \{[^}]*padding: var\(--cn-board-content-padding, 24px 28px\);/)
	})

	it('draws a palette step at 400 under a theme', () => {
		expect(sfc).toMatch(/\.cn-flow-board__palette-step \{[^}]*--nldesign-component-button-font-weight: 400;[^}]*font-weight: 400;/)
	})

	it('gives the header actions the board header button rules', () => {
		const css = read('css/look-board.css')
		expect(css).toMatch(inSelectorList('.cn-look-board .cn-flow-board__actions:not(.cn-look-nextcloud *) .button-vue'))
		expect(css).toMatch(inSelectorList('.cn-look-board .cn-flow-board__actions:not(.cn-look-nextcloud *) .button-vue--primary'))
	})
})

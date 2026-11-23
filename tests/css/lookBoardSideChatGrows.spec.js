/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/board-side-chat-grows/specs/board-side-chat-grows/spec.md#requirement-the-side-chat-grows-with-its-thread
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.resolve(__dirname, '../../src/css/look-board-detail.css'), 'utf8')

/**
 * The declarations of the first rule whose selector holds `part`.
 *
 * @param {string} part Part of the selector.
 * @return {string} The block.
 */
function block(part) {
	const start = css.indexOf(part)
	expect(start).toBeGreaterThan(-1)
	return css.slice(css.indexOf('{', start), css.indexOf('}', start))
}

describe('the embedded chat in the side column under the board look', () => {
	it('takes the height of its thread', () => {
		expect(block('.cn-detail-page__side .cn-ai-chat-window.cn-ai-chat-window--embedded')).toContain('height: auto')
	})

	it('has no scroller of its own', () => {
		expect(block('.cn-ai-chat-window--embedded .cn-ai-chat-window__messages')).toContain('overflow: visible')
	})
})

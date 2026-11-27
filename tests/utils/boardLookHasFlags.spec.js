/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Switching the board look on starts the engine that sets the `:has()` flags
 * the build put in the board-look rules.
 *
 * @spec openspec/changes/board-look-has-flags/specs/library-stylesheet/spec.md#requirement-the-board-look-anchors-no-has-outside-the-subject
 */
jest.mock('../../src/utils/boardLookSheet.js', () => ({
	BOARD_LOOK_CSS: '.cn-look-board :where(.cn-h-abc):not(.cn-h) .x{color:red}',
	BOARD_LOOK_BUILT: '2026-11-27T10:00:00.000Z',
	BOARD_LOOK_HAS: [['cn-h-abc', '.k.m', '.k']],
	BOARD_LOOK_HAS_ATTRIBUTES: ['class'],
}))

const { BOARD_LOOK_FLAG, enableBoardLookStyle } = require('../../src/utils/boardLookStyle.js')

describe('board-look :has() flags', () => {
	afterEach(() => {
		document.head.innerHTML = ''
		document.body.innerHTML = ''
		document.documentElement.removeAttribute(BOARD_LOOK_FLAG)
	})

	test('switching the look on flags the matching elements, and a later call starts nothing new', async () => {
		document.body.innerHTML = '<div class="k m"></div>'
		expect(window.__cnHasFlags).toBeUndefined()
		enableBoardLookStyle()
		expect(document.querySelector('.k').classList.contains('cn-h-abc')).toBe(true)
		const engine = window.__cnHasFlags
		const updates = engine.updates
		enableBoardLookStyle()
		expect(window.__cnHasFlags).toBe(engine)
		expect(engine.updates).toBe(updates)
	})
})

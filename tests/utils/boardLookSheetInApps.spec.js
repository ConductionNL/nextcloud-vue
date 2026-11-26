/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In an app bundle the library sheet comes from the app's css/index.css import
 * without the board-look block. enableBoardLookStyle() adds the block from the
 * rules the build put in boardLookSheet.js, once, right after the library sheet.
 *
 * @spec openspec/changes/board-look-sheet-in-app-bundles/specs/library-stylesheet/spec.md#requirement-an-app-bundle-carries-the-board-look-rules-switched-off
 */
const RULES = '.cn-look-board .x:has(.y){color:red}'
const BUILT = '2026-11-26T01:00:00.000Z'

jest.mock('../../src/utils/boardLookSheet.js', () => ({
	BOARD_LOOK_CSS: '.cn-look-board .x:has(.y){color:red}',
	BOARD_LOOK_BUILT: '2026-11-26T01:00:00.000Z',
}))

const { BOARD_LOOK_FLAG, BOARD_LOOK_SLOT, enableBoardLookStyle } = require('../../src/utils/boardLookStyle.js')

const board = () => [...document.querySelectorAll('style[data-cn-library-board]')]
const addStyle = (text, attrs = {}) => {
	const style = document.createElement('style')
	Object.entries(attrs).forEach(([k, v]) => style.setAttribute(k, v))
	style.textContent = text
	document.head.appendChild(style)
	return style
}

describe('board-look rules in an app bundle', () => {
	afterEach(() => {
		document.head.innerHTML = ''
		document.documentElement.removeAttribute(BOARD_LOOK_FLAG)
	})

	test('a default-look page has no board rules', () => {
		addStyle('.a{color:red}' + BOARD_LOOK_SLOT + '.b{color:blue}')
		expect(board()).toHaveLength(0)
	})

	test('switching on adds the rules right after the library sheet, before the app sheets', () => {
		const library = addStyle('.a{color:red}' + BOARD_LOOK_SLOT + '.b{color:blue}')
		const app = addStyle('.my-app{color:green}')
		expect(enableBoardLookStyle()).toBe(true)
		expect(board()).toHaveLength(1)
		expect(board()[0].textContent).toBe(RULES)
		expect(board()[0].getAttribute('data-cn-library-board')).toBe(BUILT)
		expect(board()[0].hasAttribute('media')).toBe(false)
		expect(library.nextElementSibling).toBe(board()[0])
		expect(board()[0].nextElementSibling).toBe(app)
	})

	test('a second call adds nothing', () => {
		addStyle(BOARD_LOOK_SLOT)
		enableBoardLookStyle()
		expect(enableBoardLookStyle()).toBe(false)
		expect(board()).toHaveLength(1)
	})

	test('an installed board sheet is switched on instead of adding another', () => {
		addStyle('.a{color:red}', { 'data-cn-library': BUILT })
		addStyle('.cn-look-board .z{color:blue}', { 'data-cn-library-board': BUILT, media: 'not all' })
		enableBoardLookStyle()
		expect(board()).toHaveLength(1)
		expect(board()[0].textContent).toBe('.cn-look-board .z{color:blue}')
		expect(board()[0].hasAttribute('media')).toBe(false)
	})

	test('the installed library sheet is the anchor when there is one', () => {
		const library = addStyle('.a{color:red}', { 'data-cn-library': BUILT })
		addStyle('.my-app{color:green}')
		enableBoardLookStyle()
		expect(library.nextElementSibling).toBe(board()[0])
	})

	test('without a library sheet the rules go at the end of head', () => {
		addStyle('.my-app{color:green}')
		enableBoardLookStyle()
		expect(document.head.lastElementChild).toBe(board()[0])
	})
})

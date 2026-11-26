import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board-look rules (about 260 `:has()` rules) take no part in style
 * matching on a page that never draws the board look, and are on before the
 * first render of a component that does.
 *
 * @spec openspec/changes/board-look-sheet-on-demand/specs/library-stylesheet/spec.md#requirement-the-board-look-rules-are-active-only-where-the-board-look-is-used
 */
import { defineComponent, h, provide } from 'vue'
import { useLook } from '../../src/composables/useLook.js'
import { BOARD_LOOK_FLAG, enableBoardLookStyle } from '../../src/utils/boardLookStyle.js'
import { installLibraryStyle, splitBoardLook } from '../../src/utils/libraryStyle.js'

const OLD = '2026-09-01T10:00:00.000Z'
const NEW = '2026-10-13T10:00:00.000Z'
const BOARD = '.cn-look-board .x:has(.y){color:red}'
const board = () => [...document.querySelectorAll('style[data-cn-library-board]')]
const base = () => [...document.querySelectorAll('style[data-cn-library]')]

describe('board-look sheet on demand', () => {
	afterEach(() => {
		base().forEach((node) => node.remove())
		board().forEach((node) => node.remove())
		document.documentElement.removeAttribute(BOARD_LOOK_FLAG)
	})

	test('splitBoardLook cuts the marked block out of the extracted sheet', () => {
		const css = '.a{color:red}/*! cn-board-look-start */' + BOARD + '/*! cn-board-look-end */.b{color:blue}'
		expect(splitBoardLook(css)).toEqual({ base: '.a{color:red}.b{color:blue}', board: BOARD })
		expect(splitBoardLook('.a{color:red}')).toBeNull()
	})

	test('the board rules are installed right after the library sheet, switched off', () => {
		const later = document.createElement('style')
		installLibraryStyle('.a{color:red}', OLD, undefined, BOARD)
		document.head.appendChild(later)
		expect(board()).toHaveLength(1)
		expect(base()[0].nextElementSibling).toBe(board()[0])
		expect(board()[0].getAttribute('media')).toBe('not all')
		expect(board()[0].textContent).toBe(BOARD)
		later.remove()
	})

	test('enableBoardLookStyle switches them on once', () => {
		installLibraryStyle('.a{color:red}', OLD, undefined, BOARD)
		expect(enableBoardLookStyle()).toBe(true)
		expect(board()[0].hasAttribute('media')).toBe(false)
		expect(document.documentElement.hasAttribute(BOARD_LOOK_FLAG)).toBe(true)
		expect(enableBoardLookStyle()).toBe(false)
	})

	test('a newer build replaces the board rules in place and keeps them on; an older one is kept out', () => {
		installLibraryStyle('.a{color:red}', OLD, undefined, BOARD)
		enableBoardLookStyle()
		installLibraryStyle('.a{color:green}', NEW, undefined, '.cn-look-board .z{color:green}')
		expect(board()).toHaveLength(1)
		expect(board()[0].textContent).toBe('.cn-look-board .z{color:green}')
		expect(board()[0].hasAttribute('media')).toBe(false)
		expect(base()[0].nextElementSibling).toBe(board()[0])
		installLibraryStyle('.a{color:red}', OLD, undefined, BOARD)
		expect(board()[0].textContent).toBe('.cn-look-board .z{color:green}')
	})

	test('a build installed after the board look is in use comes in switched on', () => {
		enableBoardLookStyle()
		installLibraryStyle('.a{color:red}', OLD, undefined, BOARD)
		expect(board()[0].hasAttribute('media')).toBe(false)
	})

	test('a build without board rules leaves no board sheet', () => {
		installLibraryStyle('.a{color:red}', OLD)
		expect(board()).toHaveLength(0)
	})

	test('useLook in the board look switches the rules on during setup, before the first render', () => {
		installLibraryStyle('.a{color:red}', OLD, undefined, BOARD)
		let mediaAtRender = 'unset'
		const Child = defineComponent({
			setup() {
				const { lookClass } = useLook()
				return () => {
					mediaAtRender = board()[0].getAttribute('media')
					return h('div', { class: lookClass.value })
				}
			},
		})
		mount(defineComponent({
			setup() {
				provide('cnLook', 'board')
				return () => h(Child)
			},
		}))
		expect(mediaAtRender).toBeNull()
	})

	test('useLook in the Nextcloud look leaves the rules off', () => {
		installLibraryStyle('.a{color:red}', OLD, undefined, BOARD)
		mount(defineComponent({
			setup() {
				useLook()
				return () => h('div')
			},
		}))
		expect(board()[0].getAttribute('media')).toBe('not all')
		expect(document.documentElement.hasAttribute(BOARD_LOOK_FLAG)).toBe(false)
	})
})

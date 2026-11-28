/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Teleported board-look surfaces key on `data-cn-board-page` on `<html>`,
 * kept from what the page shows, instead of a `:has()` anchored at `<body>`.
 *
 * @spec openspec/changes/board-page-flag/specs/library-stylesheet/spec.md#requirement-teleported-board-surfaces-key-on-a-page-flag-not-on-body-has
 */
import fs from 'fs'
import path from 'path'
import { BOARD_LOOK_FLAG, BOARD_PAGE_FLAG, enableBoardLookStyle, trackBoardPage } from '../../src/utils/boardLookStyle.js'

const flagged = (doc = document) => doc.documentElement.hasAttribute(BOARD_PAGE_FLAG)
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/** A fresh document, so each test starts untracked. */
function freshDocument() {
	return document.implementation.createHTMLDocument('t')
}

describe('board page flag', () => {
	afterEach(() => {
		document.querySelectorAll('style[data-cn-library-board]').forEach((node) => node.remove())
		document.documentElement.removeAttribute(BOARD_LOOK_FLAG)
	})

	test('is set while a board-look element is shown and no Nextcloud-look element', async () => {
		const doc = freshDocument()
		expect(trackBoardPage(doc)).toBe(true)
		expect(flagged(doc)).toBe(false)
		const root = doc.createElement('div')
		root.className = 'cn-look-board'
		doc.body.appendChild(root)
		await settle()
		expect(flagged(doc)).toBe(true)

		const page = doc.createElement('div')
		page.className = 'cn-look-nextcloud'
		root.appendChild(page)
		await settle()
		expect(flagged(doc)).toBe(false)

		page.className = ''
		await settle()
		expect(flagged(doc)).toBe(true)

		root.classList.remove('cn-look-board')
		await settle()
		expect(flagged(doc)).toBe(false)
	})

	test('reads what is already on the page when it starts, and starts once per document', () => {
		const doc = freshDocument()
		doc.body.innerHTML = '<main class="cn-look-board"></main>'
		expect(trackBoardPage(doc)).toBe(true)
		expect(flagged(doc)).toBe(true)
		expect(trackBoardPage(doc)).toBe(false)
	})

	test('enableBoardLookStyle starts it, also when another copy already switched the board rules on', async () => {
		document.documentElement.setAttribute(BOARD_LOOK_FLAG, '')
		expect(enableBoardLookStyle()).toBe(false)
		const root = document.createElement('div')
		root.className = 'cn-look-board'
		document.body.appendChild(root)
		await settle()
		expect(flagged()).toBe(true)
		root.remove()
		await settle()
		expect(flagged()).toBe(false)
	})

	test('no library rule anchors a :has() at <body> or <html>', () => {
		const dir = path.resolve(__dirname, '../../src/css')
		for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.css'))) {
			const css = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
			expect({ file, anchored: /(^|[\s,{}])(html|body|:root)(\[[^\]]*\]|\.[\w-]+)*:has\(/m.test(css) }).toEqual({ file, anchored: false })
		}
	})
})

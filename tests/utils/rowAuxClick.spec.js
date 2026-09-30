/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */
import { isFromNestedControl, isNewTabClick, isNewTabHandled, isRowMiddleClick, markNewTabHandled } from '../../src/utils/rowAuxClick.js'

/**
 * Dispatch an auxclick from `target` and capture it at `row`.
 *
 * @param {Element} row The listening element.
 * @param {Element} target Where the click starts.
 * @param {number} button The mouse button.
 * @return {MouseEvent|null} What the row listener saw.
 */
function auxclickAt(row, target, button) {
	let seen = null
	let result = null
	row.addEventListener('auxclick', (event) => {
		seen = event
		result = isRowMiddleClick(event)
	}, { once: true })
	target.dispatchEvent(new MouseEvent('auxclick', { button, bubbles: true }))
	return seen ? result : null
}

describe('rowAuxClick', () => {
	let row

	beforeEach(() => {
		row = document.createElement('tr')
		row.innerHTML = '<td class="cell"><span class="text">x</span><a href="#">link</a><button>go</button></td>'
		document.body.appendChild(row)
	})

	afterEach(() => row.remove())

	it('accepts a middle click on the row body', () => {
		expect(auxclickAt(row, row.querySelector('.text'), 1)).toBe(true)
	})

	it('rejects the right button, which browsers also report as auxclick', () => {
		expect(auxclickAt(row, row.querySelector('.text'), 2)).toBe(false)
	})

	it.each(['a', 'button'])('rejects a middle click on a nested %s', (selector) => {
		expect(auxclickAt(row, row.querySelector(selector), 1)).toBe(false)
	})

	it('does not count the listening element itself as a nested control', () => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		let result = null
		button.addEventListener('auxclick', (event) => {
			result = isFromNestedControl(event)
		}, { once: true })
		button.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true }))
		expect(result).toBe(false)
		button.remove()
	})

	it.each([
		[{ ctrlKey: true }, true],
		[{ metaKey: true }, true],
		[{ shiftKey: true }, true],
		[{ button: 1 }, true],
		[{ button: 0 }, false],
		[{ altKey: true }, false],
	])('isNewTabClick(%o) is %s', (init, expected) => {
		expect(isNewTabClick(new MouseEvent('click', init))).toBe(expected)
	})

	it('isNewTabClick is false without an event', () => {
		expect(isNewTabClick(undefined)).toBe(false)
	})

	it('marks a new-tab click as handled only when something opened', () => {
		const skipped = new MouseEvent('click', { ctrlKey: true, cancelable: true })
		markNewTabHandled(skipped, false)
		expect(isNewTabHandled(skipped)).toBe(false)

		const opened = new MouseEvent('click', { ctrlKey: true, cancelable: true })
		markNewTabHandled(opened, true)
		expect(isNewTabHandled(opened)).toBe(true)

		const plain = new MouseEvent('click', { cancelable: true })
		markNewTabHandled(plain, true)
		expect(plain.defaultPrevented).toBe(false)
		expect(isNewTabHandled(plain)).toBe(false)
	})

	it('does not treat an unrelated preventDefault() as a handled new tab', () => {
		const event = new MouseEvent('auxclick', { button: 1, cancelable: true })
		event.preventDefault()
		expect(isNewTabHandled(event)).toBe(false)

		markNewTabHandled(event, true)
		expect(isNewTabHandled(event)).toBe(true)
	})
})

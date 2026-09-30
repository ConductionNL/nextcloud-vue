/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */
import { followLinkClick, isModifiedClick, openRowTarget, resolveHref } from '../../src/utils/linkNavigation.js'

function makeRouter() {
	return {
		push: jest.fn(() => Promise.resolve()),
		resolve: jest.fn((loc) => ({ href: `/apps/x/${loc.name}/${(loc.params && loc.params.id) || ''}` })),
	}
}

function click(init = {}) {
	return { button: 0, preventDefault: jest.fn(), defaultPrevented: false, ...init }
}

function throwingRouter() {
	return {
		resolve() {
			throw new Error('no route')
		},
	}
}

describe('linkNavigation', () => {
	let openSpy

	beforeEach(() => {
		openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
	})

	afterEach(() => jest.restoreAllMocks())

	describe('isModifiedClick', () => {
		it.each([
			['ctrl', { ctrlKey: true }],
			['cmd', { metaKey: true }],
			['shift', { shiftKey: true }],
			['alt', { altKey: true }],
			['middle button', { button: 1 }],
		])('is true for a %s click', (_name, init) => {
			expect(isModifiedClick(click(init))).toBe(true)
		})

		it('is false for a plain click and for no event', () => {
			expect(isModifiedClick(click())).toBe(false)
			expect(isModifiedClick(null)).toBe(false)
		})
	})

	describe('resolveHref', () => {
		it('returns a URL as is and resolves a location through the router', () => {
			const router = makeRouter()
			expect(resolveHref('/apps/files', router)).toBe('/apps/files')
			expect(resolveHref({ name: 'LeadDetail', params: { id: 7 } }, router)).toBe('/apps/x/LeadDetail/7')
		})

		it('returns an empty string when it cannot resolve', () => {
			expect(resolveHref({ name: 'X' })).toBe('')
			expect(resolveHref(null, makeRouter())).toBe('')
			expect(resolveHref({ name: 'X' }, throwingRouter())).toBe('')
		})
	})

	describe('followLinkClick', () => {
		it('routes a plain click in place', () => {
			const router = makeRouter()
			const event = click()
			expect(followLinkClick(event, { name: 'A' }, router)).toBe(true)
			expect(event.preventDefault).toHaveBeenCalled()
			expect(router.push).toHaveBeenCalledWith({ name: 'A' })
		})

		it('leaves a modified or already-prevented click to the browser', () => {
			const router = makeRouter()
			const modified = click({ ctrlKey: true })
			const prevented = click({ defaultPrevented: true })
			expect(followLinkClick(modified, { name: 'A' }, router)).toBe(false)
			expect(followLinkClick(prevented, { name: 'A' }, router)).toBe(false)
			expect(modified.preventDefault).not.toHaveBeenCalled()
			expect(router.push).not.toHaveBeenCalled()
		})
	})

	describe('openRowTarget', () => {
		it('opens a new tab on a ctrl, cmd, shift or middle click', () => {
			const router = makeRouter()
			for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
				expect(openRowTarget(click(init), { name: 'LeadDetail', params: { id: 3 } }, router)).toBe(true)
			}
			expect(openSpy).toHaveBeenCalledTimes(4)
			expect(openSpy).toHaveBeenCalledWith('/apps/x/LeadDetail/3', '_blank', 'noopener,noreferrer')
			expect(router.push).not.toHaveBeenCalled()
		})

		it('navigates in place on a plain click', () => {
			const router = makeRouter()
			expect(openRowTarget(click(), { name: 'LeadDetail', params: { id: 3 } }, router)).toBe(true)
			expect(router.push).toHaveBeenCalledWith({ name: 'LeadDetail', params: { id: 3 } })
			// A URL loads in place through window.location, not the router.
			router.push.mockClear()
			expect(openRowTarget(click(), '/apps/files', router)).toBe(true)
			expect(router.push).not.toHaveBeenCalled()
			expect(openSpy).not.toHaveBeenCalled()
		})

		it('marks the event when it opens a tab, and skips an already-marked one', () => {
			const router = makeRouter()
			const event = new MouseEvent('click', { ctrlKey: true, cancelable: true })
			expect(openRowTarget(event, { name: 'A' }, router)).toBe(true)
			expect(event.defaultPrevented).toBe(true)
			// A second listener on the same click opens nothing.
			expect(openRowTarget(event, { name: 'A' }, router)).toBe(false)
			expect(openSpy).toHaveBeenCalledTimes(1)
		})

		it('leaves a click from a control inside the row to that control', () => {
			const router = makeRouter()
			const row = document.createElement('tr')
			const button = document.createElement('button')
			row.appendChild(button)
			let handled
			row.addEventListener('click', (event) => {
				handled = openRowTarget(event, { name: 'A' }, router)
			})
			button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			expect(handled).toBe(false)
			row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			expect(handled).toBe(true)
			expect(router.push).toHaveBeenCalledTimes(1)
		})

		it('does nothing on a right click or without a target', () => {
			const router = makeRouter()
			expect(openRowTarget(click({ button: 2 }), { name: 'A' }, router)).toBe(false)
			expect(openRowTarget(click(), null, router)).toBe(false)
			expect(router.push).not.toHaveBeenCalled()
			expect(openSpy).not.toHaveBeenCalled()
		})
	})
})

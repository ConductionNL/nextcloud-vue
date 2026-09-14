/**
 * Tests for useCurrentTheme — the reactive light/dark read that keeps
 * theme-variant rendering (folder-customization colors) in step with a live
 * theme flip.
 */

const { nextTick } = require('vue')

describe('useCurrentTheme', () => {
	beforeEach(() => {
		jest.resetModules()
		document.body.removeAttribute('data-theme-dark')
		document.body.removeAttribute('data-theme-light')
		document.body.removeAttribute('data-theme-default')
		// jsdom has no matchMedia; the composable only needs the listener
		// surface.
		window.matchMedia = jest.fn().mockReturnValue({
			matches: true,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		})
	})

	it('reads light for a body without theme attributes', () => {
		const { currentTheme } = require('../../src/composables/useCurrentTheme.js')
		expect(currentTheme()).toBe('light')
	})

	it('reads dark for an explicit data-theme-dark body', () => {
		document.body.setAttribute('data-theme-dark', '1')
		const { currentTheme } = require('../../src/composables/useCurrentTheme.js')
		expect(currentTheme()).toBe('dark')
	})

	it('follows a LIVE theme flip through the MutationObserver', async () => {
		const { useCurrentTheme } = require('../../src/composables/useCurrentTheme.js')
		const theme = useCurrentTheme()
		expect(theme.value).toBe('light')

		document.body.setAttribute('data-theme-dark', '1')
		// MutationObserver callbacks run as microtasks.
		await Promise.resolve()
		await nextTick()
		expect(theme.value).toBe('dark')

		document.body.removeAttribute('data-theme-dark')
		await Promise.resolve()
		await nextTick()
		expect(theme.value).toBe('light')
	})
})

/**
 * `window.matchMedia` absent, which is jsdom's actual state and the state of
 * any host that has not implemented it.
 *
 * The mock in the block above is a WORKAROUND for a real defect rather than a
 * fixture: `init()` called `window.matchMedia` unguarded from inside a
 * computed, so without the mock the call threw DURING RENDER and the consuming
 * component would not mount — surfacing as a dead component, nowhere near the
 * theme. Three specs carried that mock. These tests hold the guard in place.
 */
describe('useCurrentTheme — no window.matchMedia', () => {
	let saved

	beforeEach(() => {
		jest.resetModules()
		document.body.removeAttribute('data-theme-dark')
		document.body.removeAttribute('data-theme-light')
		document.body.removeAttribute('data-theme-default')
		saved = window.matchMedia
		delete window.matchMedia
	})

	afterEach(() => {
		window.matchMedia = saved
	})

	it('reads the theme instead of throwing', () => {
		const { currentTheme } = require('../../src/composables/useCurrentTheme.js')
		expect(() => currentTheme()).not.toThrow()
		expect(currentTheme()).toBe('light')
	})

	it('resolves the system-default theme to light rather than throwing', () => {
		document.body.setAttribute('data-theme-default', '1')
		const { getTheme } = require('../../src/utils/getTheme.js')
		expect(getTheme()).toBe('light')
	})

	it('still follows a live theme flip, so only the OS-preference half is skipped', async () => {
		const { useCurrentTheme } = require('../../src/composables/useCurrentTheme.js')
		const theme = useCurrentTheme()
		expect(theme.value).toBe('light')

		// The MutationObserver is installed BEFORE the matchMedia branch, so a
		// guard that returned too early would take this with it.
		document.body.setAttribute('data-theme-dark', '1')
		await Promise.resolve()
		await nextTick()
		expect(theme.value).toBe('dark')
		document.body.removeAttribute('data-theme-dark')
	})
})

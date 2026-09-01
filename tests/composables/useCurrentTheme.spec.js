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

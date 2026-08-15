/**
 * Tests for the NcSelectTags override's own logic (the parts it adds on top of
 * the upstream component it `extends`): the `tags` computed's precedence rule
 * and the `created` hook's `fetchTags` dev-warning.
 *
 * The upstream `@nextcloud/vue` component is mocked away in this suite, so the
 * override's `extends` target is `undefined` — harmless at import time. We
 * exercise the override's `created` / `tags` directly against a synthetic
 * `this` rather than mounting, which is exactly what these unit-level checks
 * need (no DOM, no upstream component).
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateRemoteUrl: jest.fn(() => '/remote.php/dav') }))

const NcSelectTags = require('../../src/components/NcSelectTags/NcSelectTags.js').default

describe('NcSelectTags override — tags precedence', () => {
	it('returns consumer :options verbatim when non-empty', () => {
		const options = [{ id: 1 }, { id: 2 }]
		const ctx = { options, cnFetchedTags: [{ id: 9 }] }
		expect(NcSelectTags.computed.tags.call(ctx)).toBe(options)
	})

	it('falls back to fetched system tags when no :options given', () => {
		const fetched = [{ id: 3 }]
		expect(NcSelectTags.computed.tags.call({ options: [], cnFetchedTags: fetched })).toBe(fetched)
	})

	it('returns [] before the fetch settles (cnFetchedTags still null)', () => {
		expect(NcSelectTags.computed.tags.call({ options: [], cnFetchedTags: null })).toEqual([])
	})
})

describe('NcSelectTags override — fetchTags dev warning', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('warns when fetchTags=true (the redundant, bug-retriggering case)', async () => {
		// Non-empty options make created() return before fetching — we only
		// want to assert the warning fired.
		await NcSelectTags.created.call({ fetchTags: true, options: [{ id: 1 }] })
		expect(warnSpy).toHaveBeenCalledTimes(1)
		expect(warnSpy.mock.calls[0][0]).toContain('fetchTags')
	})

	it('does not warn when fetchTags is left at its default (false)', async () => {
		await NcSelectTags.created.call({ fetchTags: false, options: [{ id: 1 }] })
		expect(warnSpy).not.toHaveBeenCalled()
	})
})

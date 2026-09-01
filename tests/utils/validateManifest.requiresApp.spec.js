/**
 * Tests for the page-level `requiresApp` soft-dependency gate.
 *
 * Validation matters here more than for most keys because this one fails OPEN:
 * an unrecognised key is simply never read, so a typo means the gate never
 * fires and the page renders an empty list. "Install DossiQ" silently becomes
 * "no results", which is the failure this whole feature exists to prevent.
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

/**
 * Build a minimal v2 manifest with one page carrying `requiresApp`.
 *
 * @param {*} requiresApp The value under test.
 * @return {object} The manifest.
 */
function manifestWith(requiresApp) {
	return {
		version: '2.0.0',
		menu: [],
		pages: [
			{
				id: 'tickets',
				route: '/tickets',
				type: 'index',
				title: 'Tickets',
				...(requiresApp === undefined ? {} : { requiresApp }),
			},
		],
	}
}

describe('validateManifest requiresApp', () => {
	it('accepts an app id string', () => {
		const { errors } = validateManifest(manifestWith('dossiq'))

		expect(errors.filter((e) => e.includes('requiresApp'))).toEqual([])
	})

	it('accepts the { id, name } object form', () => {
		const { errors } = validateManifest(manifestWith({ id: 'dossiq', name: 'DossiQ' }))

		expect(errors.filter((e) => e.includes('requiresApp'))).toEqual([])
	})

	it('accepts a page that declares nothing', () => {
		const { errors } = validateManifest(manifestWith(undefined))

		expect(errors.filter((e) => e.includes('requiresApp'))).toEqual([])
	})

	it('rejects an empty string', () => {
		const { errors } = validateManifest(manifestWith(''))

		expect(errors.some((e) => e.includes('requiresApp'))).toBe(true)
	})

	it('rejects a wrong type', () => {
		const { errors } = validateManifest(manifestWith(42))

		expect(errors.some((e) => e.includes('requiresApp'))).toBe(true)
	})

	it('rejects an object without an id', () => {
		const { errors } = validateManifest(manifestWith({ name: 'DossiQ' }))

		expect(errors.some((e) => e.includes('requiresApp'))).toBe(true)
	})
})

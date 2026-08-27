/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * NAMED INDEX SOURCES.
 *
 * The point of this change is that a list which is not an OpenRegister object
 * no longer needs its own page component. What could go wrong quietly is the
 * precedence: a page that names a source AND carries register/schema must not
 * fire an object fetch whose rows it then discards, and must not render the
 * object list while the manifest asked for flows. Both of those produce a
 * plausible table of the WRONG things rather than an error.
 */
describe('resolveIndexSource', () => {
	it('resolves a registered source', async () => {
		const { resolveIndexSource } = await import('../../src/composables/indexSources.js')
		const source = resolveIndexSource('flows')

		expect(source).toBeTruthy()
		expect(typeof source.load).toBe('function')
		expect(typeof source.rows).toBe('function')
		expect(typeof source.loading).toBe('function')
		expect(source.columns.map((c) => c.key)).toContain('name')
	})

	/**
	 * An unknown name must WARN and degrade, not throw and not go quiet.
	 *
	 * Silence here would render an empty index that is indistinguishable from a
	 * source with genuinely no rows — the reader has no way to tell a typo from
	 * an empty list.
	 */
	it('warns and returns null for an unknown source rather than throwing', async () => {
		const { resolveIndexSource } = await import('../../src/composables/indexSources.js')
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

		const source = resolveIndexSource('flowz')

		expect(source).toBeNull()
		expect(warn).toHaveBeenCalled()
		expect(String(warn.mock.calls[0][0])).toContain('flowz')
		warn.mockRestore()
	})

	it('returns null for an absent source without warning', async () => {
		const { resolveIndexSource } = await import('../../src/composables/indexSources.js')
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

		expect(resolveIndexSource('')).toBeNull()
		expect(resolveIndexSource(undefined)).toBeNull()
		// Not naming a source is the ordinary case, not a mistake.
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('self-fetch precedence', () => {
	/**
	 * THE ONE THAT MATTERS: a named source suppresses the object fetch.
	 *
	 * Without this the page issues an OpenRegister request, succeeds, and then
	 * throws the rows away — so a manifest that names both silently disagrees
	 * with itself and nothing reports it.
	 */
	it('does not self-fetch when a source is named', async () => {
		const { useSelfFetchList } = await import('../../src/components/CnIndexPage/useSelfFetchList.js')

		const withSource = useSelfFetchList(
			{ register: 'dossiq', schema: 'case', source: 'flows', quickFilters: null },
			null,
			() => null,
		)

		expect(withSource.isSelfFetch).toBe(false)
	})

	it('still self-fetches when register and schema are named alone', async () => {
		const { useSelfFetchList } = await import('../../src/components/CnIndexPage/useSelfFetchList.js')

		const withoutSource = useSelfFetchList(
			{ register: 'dossiq', schema: 'case', source: '', quickFilters: null },
			null,
			() => null,
		)

		expect(withoutSource.isSelfFetch).toBe(true)
	})
})

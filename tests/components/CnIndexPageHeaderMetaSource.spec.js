/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The index header note can read a value from an endpoint
 * (index-header-meta-from-endpoint): learniq's groups list reads
 * "Bijgewerkt uit Magister om 07.00, 3 wijzigingen", a line no list count gives.
 *
 * @spec openspec/changes/index-header-meta-from-endpoint/specs/index-page/spec.md#requirement-the-header-note-can-read-a-value-from-an-endpoint
 */
jest.mock('../../src/composables/useEndpointSource.js', () => {
	const actual = jest.requireActual('../../src/composables/useEndpointSource.js')
	return { __esModule: true, ...actual, fetchEndpointSource: jest.fn() }
})

const { fetchEndpointSource } = require('../../src/composables/useEndpointSource.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const { headerMetaText, headerMetaSourceKey } = CnIndexPage.computed
const SOURCE = { url: '/apps/learniq/api/cohorts/sync-line', responsePath: 'line' }

/**
 * A stand-in for the component's `this`.
 *
 * @param {object} over Fields to set.
 * @return {object} The context.
 */
function ctx(over = {}) {
	return {
		presentation: { headerMeta: '{source}' },
		presented(key) { return this.presentation[key] },
		cnTranslate: (s) => s,
		effectivePagination: { total: 42 },
		effectiveObjects: [],
		headerMetaCountValues: {},
		headerMetaSourceValue: null,
		headerMetaSource: SOURCE,
		...over,
	}
}

beforeEach(() => {
	fetchEndpointSource.mockReset()
})

describe('CnIndexPage header meta from an endpoint', () => {
	it('fills {source} with the value the endpoint answered', () => {
		const c = ctx({ headerMetaSourceValue: 'Bijgewerkt uit Magister om 07.00, 3 wijzigingen' })
		expect(headerMetaText.call(c)).toBe('Bijgewerkt uit Magister om 07.00, 3 wijzigingen')
		c.presentation.headerMeta = '{total} groepen · {source}'
		expect(headerMetaText.call(c)).toBe('42 groepen · Bijgewerkt uit Magister om 07.00, 3 wijzigingen')
	})

	it('leaves the note out while the value is unknown, empty or not text', () => {
		expect(headerMetaText.call(ctx())).toBe('')
		expect(headerMetaText.call(ctx({ headerMetaSourceValue: '' }))).toBe('')
		expect(headerMetaText.call(ctx({ headerMetaSourceValue: { line: 'x' } }))).toBe('')
	})

	it('reads the endpoint once per resolved request, and keeps null after a failed read', async () => {
		fetchEndpointSource.mockResolvedValueOnce('Bijgewerkt uit Magister om 07.00, 3 wijzigingen')
		const c = ctx()
		c.headerMetaSourceKey = headerMetaSourceKey.call(c)
		await CnIndexPage.methods.loadHeaderMetaSource.call(c)
		expect(fetchEndpointSource).toHaveBeenCalledWith(SOURCE, {})
		expect(c.headerMetaSourceValue).toBe('Bijgewerkt uit Magister om 07.00, 3 wijzigingen')

		fetchEndpointSource.mockRejectedValueOnce(new Error('500'))
		await CnIndexPage.methods.loadHeaderMetaSource.call(c)
		expect(c.headerMetaSourceValue).toBe(null)
	})

	it('has no key and reads nothing without a source', async () => {
		const c = ctx({ headerMetaSource: null })
		c.headerMetaSourceKey = headerMetaSourceKey.call(c)
		expect(c.headerMetaSourceKey).toBe('')
		await CnIndexPage.methods.loadHeaderMetaSource.call(c)
		expect(fetchEndpointSource).not.toHaveBeenCalled()
	})
})

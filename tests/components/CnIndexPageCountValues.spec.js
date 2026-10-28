/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board count line can name sums and values (`countValues`): board PqLeads
 * reads "15 van 15 open leads · € 509.928 in de pijplijn, € 246.122 gewogen".
 * A sum over the page's schema follows the active filters; a value can also
 * come from an app endpoint.
 *
 * @spec openspec/changes/index-count-values/specs/index-page/spec.md#requirement-the-count-line-can-name-sums-and-values
 */
jest.mock('../../src/utils/fetchAggregate.js', () => ({
	...jest.requireActual('../../src/utils/fetchAggregate.js'),
	fetchAggregateValue: jest.fn(async () => 509928),
}))
jest.mock('../../src/utils/cnFetch.js', () => ({
	...jest.requireActual('../../src/utils/cnFetch.js'),
	cnFetchJson: jest.fn(async () => ({ weightedForecast: 246122 })),
}))

const { cnFetchJson } = require('../../src/utils/cnFetch.js')
const { fetchAggregateValue } = require('../../src/utils/fetchAggregate.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const { headerDescriptionBase, countValuesKey } = CnIndexPage.computed
const { countValueToken, loadCountValues } = CnIndexPage.methods

const VALUES = {
	pipeline: { metric: 'sum', field: 'value' },
	weighted: { endpoint: '/apps/pipelinq/api/analytics/commercial', path: 'weightedForecast' },
}

function ctx(over = {}) {
	const c = {
		presentation: {},
		presented(key) { return this.presentation[key] },
		cnTranslate: (s) => s,
		effectivePagination: { total: 15 },
		effectiveObjects: new Array(15).fill({}),
		isBoardLook: true,
		countSubtitle: '',
		description: '',
		activeScopePresentation: {},
		countTextByView: null,
		sourceTerm: '',
		appliedViewConditionsText: '',
		register: 'pipelinq',
		exportSchemaSlug: 'lead',
		filter: null,
		effectiveActiveFilters: { status: 'open', pipeline: 'p-sales' },
		countValues: VALUES,
		countValueResults: {},
		$route: { params: {} },
		countValueToken,
		...over,
	}
	c.countValuesKey = countValuesKey.call(c)
	c.presentedCountText = CnIndexPage.computed.presentedCountText.call(c)
	return c
}

describe('CnIndexPage count values', () => {
	it('reads a sum under the active filters and a value from an endpoint', async () => {
		const c = ctx()
		await loadCountValues.call(c)
		expect(fetchAggregateValue).toHaveBeenCalledWith(
			expect.objectContaining({ register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value', filter: { status: 'open', pipeline: 'p-sales' } }),
			expect.anything(),
		)
		expect(cnFetchJson).toHaveBeenCalledWith('/apps/pipelinq/api/analytics/commercial')
		expect(c.countValueResults).toEqual({ pipeline: 509928, weighted: 246122 })
	})

	it('fills the tokens with their format and leaves other text alone', () => {
		const c = ctx({
			presentation: { countText: '{shown} of {total} open leads · {pipeline|currency:EUR} in the pipeline, {weighted|currency:EUR} weighted · {other}' },
			countValueResults: { pipeline: 509928, weighted: 246122 },
		})
		const line = headerDescriptionBase.call(c)
		expect(line).toMatch(/^15 of 15 open leads · € ?509[.,]928([.,]00)? in the pipeline, € ?246[.,]122([.,]00)? weighted · \{other\}$/)
	})

	it('leaves a value that is not read yet empty', () => {
		const c = ctx({ presentation: { countText: '{total} leads · {pipeline|currency:EUR}' } })
		expect(headerDescriptionBase.call(c)).toBe('15 leads · ')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts row can show how many records of another list point at this one:
 * DqZaaktype's Gegevens card reads "Lopende zaken 43", the running cases of
 * the case type, counted with the list endpoint's total.
 *
 * @spec openspec/changes/facts-entry-count/specs/facts-widget/spec.md#requirement-a-facts-entry-can-count-a-related-list
 */
jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	...jest.requireActual('../../src/utils/fetchFilterCounts.js'),
	fetchListTotal: jest.fn(),
}))

const { mount } = require('@vue/test-utils')
const { fetchListTotal } = require('../../src/utils/fetchFilterCounts.js')
const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const CASE_TYPE = { id: 'ct-1', category: 'VTH' }
const RUNNING = { label: 'Running cases', countFrom: { register: 'dossiq', schema: 'case', filter: { caseType: '@objectId', isFinalStatus: false } } }

async function flush() {
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

function mountFacts(fields) {
	return mount(CnFactsWidget, {
		propsData: { objectData: CASE_TYPE, objectId: 'ct-1', content: { fields } },
		provide: { cnTranslate: (s) => s },
		stubs: { NcLoadingIcon: true },
	})
}

describe('CnFactsWidget countFrom', () => {
	beforeEach(() => fetchListTotal.mockReset())

	it('shows the count of the related list, the filter resolved against this record', async () => {
		fetchListTotal.mockResolvedValue(43)
		const w = mountFacts([{ path: 'category', label: 'Domain' }, RUNNING])
		await flush()
		expect(fetchListTotal).toHaveBeenCalledWith('dossiq', 'case', { caseType: '@objectId', isFinalStatus: false }, expect.objectContaining({ objectId: 'ct-1' }))
		expect(w.text()).toContain('Running cases')
		expect(w.text()).toContain('43')
	})

	it('shows a zero', async () => {
		fetchListTotal.mockResolvedValue(0)
		const w = mountFacts([RUNNING])
		await flush()
		expect(w.text()).toContain('0')
	})

	it('leaves the row out while the count cannot be read', async () => {
		fetchListTotal.mockRejectedValue(new Error('down'))
		const w = mountFacts([{ path: 'category', label: 'Domain' }, RUNNING])
		await flush()
		expect(w.text()).not.toContain('Running cases')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts link can name a count of a related list: board PqContactmoment's
 * client card ends with "Klantpagina, 4 eerdere contacten".
 *
 * @spec openspec/changes/facts-link-count/specs/facts-widget/spec.md#requirement-a-facts-link-can-name-a-count
 */
jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	...jest.requireActual('../../src/utils/fetchFilterCounts.js'),
	fetchListTotal: jest.fn(),
}))

const { mount } = require('@vue/test-utils')
const { fetchListTotal } = require('../../src/utils/fetchFilterCounts.js')
const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const LINK = {
	label: 'Client page, {count} earlier contacts',
	fallbackLabel: 'Client page',
	route: { name: 'ClientDetail', params: { id: 'c-1' } },
	countFrom: { register: 'pipelinq', schema: 'ticket', filter: { client: '@object.client', ticketType: 'interaction' } },
}

/** @return {Promise<void>} */
async function flush() {
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

/** @return {object} Wrapper. */
function mountFacts() {
	return mount(CnFactsWidget, {
		propsData: { objectData: { id: 't-1', client: 'c-1', notes: 'x' }, objectId: 't-1', content: { fields: [{ label: 'Notes', path: 'notes' }], link: LINK } },
		provide: { cnTranslate: (s) => s },
		stubs: { NcLoadingIcon: true, RouterLink: { template: '<a><slot /></a>' } },
	})
}

describe('CnFactsWidget: a link with a count', () => {
	beforeEach(() => fetchListTotal.mockReset())

	it('puts the related list\'s total in the label', async () => {
		fetchListTotal.mockResolvedValue(4)
		const w = mountFacts()
		await flush()
		expect(fetchListTotal).toHaveBeenCalledWith('pipelinq', 'ticket', LINK.countFrom.filter, expect.anything())
		expect(w.text()).toContain('Client page, 4 earlier contacts')
	})

	it('reads the fallback label while the count cannot be read', async () => {
		fetchListTotal.mockRejectedValue(new Error('500'))
		const w = mountFacts()
		await flush()
		expect(w.text()).toContain('Client page')
		expect(w.text()).not.toContain('{count}')
		expect(w.text()).not.toContain('earlier contacts')
	})
})

/**
 * @spec openspec/changes/facts-link-count/specs/facts-widget/spec.md#requirement-a-fact-can-read-as-a-long-date-with-its-time
 */
describe('CnFactsWidget: longdatetime', () => {
	it('writes the month out, with the year and the time', () => {
		const w = mount(CnFactsWidget, {
			propsData: { objectData: { id: 't-1', occurredAt: '2026-10-07T09:12:00' }, content: { fields: [{ label: 'When', path: 'occurredAt', format: 'longdatetime' }] } },
			provide: { cnTranslate: (s) => s },
			stubs: { NcLoadingIcon: true },
		})
		expect(w.find('[data-testid="cn-fact-occurredAt"] dd').text()).toMatch(/7.*2026, 09[:.]12$/)
	})
})

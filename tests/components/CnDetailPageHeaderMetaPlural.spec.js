/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqOrganisatie's header line reads "1 lopende zaak", and "2 lopende zaken"
 * for two: `headerMeta` may be `{ count, one, other, zero? }`, the form
 * chosen by the named count, each form translated on its own.
 *
 * @spec openspec/changes/header-meta-plural/specs/detail-page/spec.md#requirement-a-header-line-can-name-a-count-in-the-singular-or-the-plural
 */
const mockTotal = jest.fn()
const mockSource = { load: jest.fn(async () => {}), rows: jest.fn(() => [{}, {}, {}, {}, {}, {}]) }
jest.mock('../../src/utils/fetchFilterCounts.js', () => {
	const actual = jest.requireActual('../../src/utils/fetchFilterCounts.js')
	return { ...actual, fetchListTotal: (...args) => mockTotal(...args) }
})
jest.mock('../../src/composables/indexSources.js', () => {
	const actual = jest.requireActual('../../src/composables/indexSources.js')
	return { ...actual, resolveIndexSource: (name) => (name === 'organisations' ? mockSource : null) }
})

const { mount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const store = {
	objects: { 'dossiq-caseType': { 'ct-1': { title: 'Omgevingsvergunning' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}
/**
 * Let the counts settle.
 *
 * @return {Promise<void>}
 */
async function settle() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve))
	}
}

/**
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props) {
	return mount(CnDetailPage, {
		propsData: { title: 'Case type', register: 'dossiq', schema: 'caseType', objectId: 'ct-1', objectStore: store, ...props },
	})
}

beforeEach(() => {
	mockTotal.mockReset()
	mockTotal.mockResolvedValue(14)
})

const PLURAL = { count: 'open', one: '{count:open} open case', other: '{count:open} open cases', zero: '' }
const COUNTS = { open: { register: 'dossiq', schema: 'case', filter: { requester: '@objectId', isFinalStatus: false } } }

describe('CnDetailPage headerMeta with plural forms', () => {
	it('reads the singular for one', async () => {
		mockTotal.mockResolvedValue(1)
		const w = mountPage({ headerMeta: PLURAL, headerMetaCounts: COUNTS })
		await settle()
		expect(w.vm.headerMetaText).toBe('1 open case')
	})

	it('reads the plural for more', async () => {
		mockTotal.mockResolvedValue(2)
		const w = mountPage({ headerMeta: PLURAL, headerMetaCounts: COUNTS })
		await settle()
		expect(w.vm.headerMetaText).toBe('2 open cases')
	})

	it('reads the zero form, here nothing, for none', async () => {
		mockTotal.mockResolvedValue(0)
		const w = mountPage({ headerMeta: PLURAL, headerMetaCounts: COUNTS })
		await settle()
		expect(w.vm.headerMetaText).toBe('')
	})

	it('reads the plural for none without a zero form', async () => {
		mockTotal.mockResolvedValue(0)
		const w = mountPage({ headerMeta: { count: 'open', one: '{count:open} open case', other: '{count:open} open cases' }, headerMetaCounts: COUNTS })
		await settle()
		expect(w.vm.headerMetaText).toBe('0 open cases')
	})

	it('leaves the line out while the count is missing', async () => {
		mockTotal.mockRejectedValue(new Error('403'))
		const w = mountPage({ headerMeta: PLURAL, headerMetaCounts: COUNTS })
		await settle()
		expect(w.vm.headerMetaText).toBe('')
	})
})

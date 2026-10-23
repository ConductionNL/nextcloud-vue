/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTenant's header line reads "een van 6 organisaties op deze omgeving".
 * A record page's `headerMetaCounts` names lists to count, as a list page's
 * does, and `{count:<name>}` in `headerMeta` reads that count: a register
 * list (`{ register, schema, filter? }`) or a named source
 * (`{ entitySource }`). While a count is missing the line is left out.
 *
 * @spec openspec/changes/detail-header-meta-counts/specs/detail-page/spec.md#requirement-a-record-page-header-line-can-count-a-list
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

describe('CnDetailPage headerMetaCounts', () => {
	it('fills {count:<name>} from a named source', async () => {
		const w = mountPage({ headerMeta: 'one of {count:organisations} organisations', headerMetaCounts: { organisations: { entitySource: 'organisations' } } })
		await settle()
		expect(mockSource.load).toHaveBeenCalled()
		expect(w.vm.headerMetaText).toBe('one of 6 organisations')
	})

	it('fills {count:<name>} from a register list', async () => {
		const w = mountPage({ headerMeta: '{count:types} case types', headerMetaCounts: { types: { register: 'dossiq', schema: 'caseType', filter: { isDraft: false } } } })
		await settle()
		expect(mockTotal).toHaveBeenCalledWith('dossiq', 'caseType', { isDraft: false }, expect.anything())
		expect(w.vm.headerMetaText).toBe('14 case types')
	})

	it('leaves the line out while a count is missing', async () => {
		mockTotal.mockRejectedValue(new Error('403'))
		const w = mountPage({ headerMeta: '{count:types} case types', headerMetaCounts: { types: { register: 'dossiq', schema: 'caseType' } } })
		await settle()
		expect(w.vm.headerMetaText).toBe('')
	})
})

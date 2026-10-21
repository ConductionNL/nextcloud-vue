/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFkResolveCell looking a record up by something other than its id: a
 * person by their user id (`matchField`), the row's own reference first
 * (`refField`), the name built from two fields (`labelTemplate`) or read off
 * a related object (`labelPath`). A user id is never shown while the lookup
 * runs.
 *
 * @spec openspec/changes/fk-resolve-lookup/specs/fk-resolve-lookup/spec.md#requirement-a-reference-cell-can-look-its-record-up-by-a-property
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))
jest.mock('../../src/store/useObjectStore.js', () => ({ useObjectStore: jest.fn() }))

const { mount } = require('@vue/test-utils')
const { useObjectStore } = require('../../src/store/useObjectStore.js')
const CnFkResolveCell = require('../../src/components/CnFkResolveCell/CnFkResolveCell.vue').default
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default
const { clearFkMatchCache } = require('../../src/utils/fkMatchLookup.js')

const PROFILES = {
	'ref-noor': { id: 'ref-noor', givenName: 'Noor', familyName: 'Bakker', ncUserId: 'noor' },
	'ref-sem': { id: 'ref-sem', givenName: 'Sem', familyName: 'de Vries', ncUserId: 'sem' },
}

function makeStore() {
	return {
		objects: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(function(slug, schemaId, registerId) {
			this.objectTypeRegistry[slug] = { schema: schemaId, register: registerId }
		}),
		fetchObject: jest.fn((type, id) => Promise.resolve(PROFILES[id] || null)),
	}
}

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((r) => setTimeout(r))
	}
}

const person = { register: 'learniq', schema: 'learner-profile', matchField: 'ncUserId', labelTemplate: '{givenName} {familyName}' }

let store
beforeEach(() => {
	store = makeStore()
	useObjectStore.mockReturnValue(store)
	mockGet.mockReset()
	mockGet.mockImplementation((url, { params }) => {
		const hit = Object.values(PROFILES).find((p) => p.ncUserId === params.ncUserId)
		return Promise.resolve({ data: { results: hit ? [hit] : [] } })
	})
	clearFkMatchCache()
})

describe('CnFkResolveCell lookup by property', () => {
	it('finds a person by user id and shows the name from the template, never the user id', async () => {
		const w = mount(CnFkResolveCell, { propsData: { ...person, value: 'noor' } })
		expect(w.text()).toBe('')
		await flush()
		expect(w.text()).toBe('Noor Bakker')
		expect(mockGet).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/learniq/learner-profile', { params: { ncUserId: 'noor', _limit: 1 } })
	})

	it('asks once for the same user id across cells', async () => {
		mount(CnFkResolveCell, { propsData: { ...person, value: 'sem' } })
		mount(CnFkResolveCell, { propsData: { ...person, value: 'sem' } })
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(1)
	})

	it('prefers the row reference, and pairs a list of references with a list of user ids', async () => {
		const w = mount(CnFkResolveCell, { propsData: { ...person, value: ['noor', 'sem'], refValue: ['ref-noor', 'ref-sem'] } })
		await flush()
		expect(w.text()).toBe('Noor Bakker, Sem de Vries')
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('falls back to the user id lookup when the reference does not resolve, and to the user id when nothing does', async () => {
		const w = mount(CnFkResolveCell, { propsData: { ...person, value: ['sem', 'ghost'], refValue: ['ref-gone', 'ref-gone-too'] } })
		await flush()
		expect(w.text()).toBe('Sem de Vries, ghost')
	})

	it('reads the label off a related object with labelPath', async () => {
		store.fetchObject = jest.fn(() => Promise.resolve({ id: 'app-1', applicant: { name: 'Yara Smit' } }))
		const w = mount(CnFkResolveCell, { propsData: { register: 'learniq', schema: 'application', labelPath: 'applicant.name', value: 'app-1' } })
		await flush()
		expect(w.text()).toBe('Yara Smit')
	})

	it('takes the reference from the row field CnCellRenderer names in refField', async () => {
		const w = mount(CnCellRenderer, {
			propsData: {
				value: 'noor',
				widget: 'fkResolve',
				widgetProps: { ...person, refField: 'learnerRef' },
				row: { learnerId: 'noor', learnerRef: 'ref-noor' },
			},
		})
		await flush()
		expect(w.text()).toBe('Noor Bakker')
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('resolves a row with only a reference and no user id', async () => {
		const w = mount(CnCellRenderer, {
			propsData: { value: null, widget: 'fkResolve', widgetProps: { ...person, refField: 'learnerRef' }, row: { learnerRef: 'ref-sem' } },
		})
		await flush()
		expect(w.text()).toBe('Sem de Vries')
	})
})

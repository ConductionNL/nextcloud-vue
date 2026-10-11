/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header pill can be a constant or a count of a related list
 * (screens-relation-pages): DqContact reads "Inwoner" and "1 lopende zaak",
 * pills no field of the record carries.
 *
 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-header-pill-can-be-a-constant-or-a-count
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { pillCountSource, resolveCountPill, resolvePill } from '../../src/utils/detailActionModel.js'
import { fetchListTotal } from '../../src/utils/fetchFilterCounts.js'

jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	fetchListTotal: jest.fn(),
}))

const PERSON = { name: 'Sanne de Vries', kind: 'resident' }
const COUNT = { countFrom: { register: 'r', schema: 'case', filter: { requester: '@objectId' } }, countLabel: { one: '{count} lopende zaak', other: '{count} lopende zaken' }, variant: 'purple' }

function makeStore(object) {
	return {
		objects: { 'reg-person': { 'id-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountPage(props = {}) {
	return mount(CnDetailPage, {
		props: { title: 'Person', register: 'reg', schema: 'person', objectId: 'id-1', objectStore: makeStore(PERSON), ...props },
		global: {
			stubs: {
				NcBreadcrumbs: { template: '<nav><slot /></nav>' },
				NcBreadcrumb: { props: ['name'], template: '<span>{{ name }}</span>' },
				CnDashboardGrid: { template: '<div />' },
				CnDetailWidgetHost: { template: '<div />' },
			},
			provide: { cnLook: 'board' },
		},
	})
}

const pillTexts = (w) => w.findAll('[data-testid^="cn-detail-page-pill-"]').map((p) => p.text())

beforeEach(() => {
	fetchListTotal.mockReset()
})

describe('resolvePill / resolveCountPill', () => {
	it('a constant pill reads its text', () => {
		expect(resolvePill({ text: 'Inwoner', variant: 'info' }, null)).toEqual({ label: 'Inwoner', colorKey: 'Inwoner', colorMap: null, variant: 'info' })
	})

	it('a field pill wins over text', () => {
		expect(resolvePill({ field: 'kind', text: 'Inwoner' }, PERSON).label).toBe('resident')
	})

	it('a count pill reads one and other, and nothing at 0, unknown or failed', () => {
		expect(pillCountSource(COUNT)).toEqual({ register: 'r', schema: 'case', filter: { requester: '@objectId' } })
		expect(resolveCountPill(COUNT, 1).label).toBe('1 lopende zaak')
		expect(resolveCountPill(COUNT, 3).label).toBe('3 lopende zaken')
		expect(resolveCountPill(COUNT, 0)).toBe(null)
		expect(resolveCountPill(COUNT, null)).toBe(null)
		expect(resolveCountPill({ field: 'x', countFrom: COUNT.countFrom }, 2)).toBe(null)
	})

	it('translates the label before the count is filled', () => {
		expect(resolveCountPill(COUNT, 2, (t) => t.replace('lopende zaken', 'open cases')).label).toBe('2 open cases')
	})
})

describe('CnDetailPage count pills', () => {
	it('counts the list with the record id and shows the constant and the count', async () => {
		fetchListTotal.mockResolvedValue(1)
		const w = mountPage({ typePill: { text: 'Inwoner' }, statusPill: COUNT })
		await flush()
		expect(fetchListTotal).toHaveBeenCalledWith('r', 'case', { requester: '@objectId' }, expect.objectContaining({ objectId: 'id-1' }))
		expect(pillTexts(w)).toEqual(['Inwoner', '1 lopende zaak'])
	})

	it('shows no count pill at 0 or after a failed count', async () => {
		fetchListTotal.mockResolvedValue(0)
		const zero = mountPage({ statusPill: COUNT })
		await flush()
		expect(pillTexts(zero)).toEqual([])
		fetchListTotal.mockRejectedValue(new Error('500'))
		const failed = mountPage({ statusPill: COUNT })
		await flush()
		expect(pillTexts(failed)).toEqual([])
	})

	it('sends nothing for a page without count pills', async () => {
		mountPage({ typePill: { field: 'kind' } })
		await flush()
		expect(fetchListTotal).not.toHaveBeenCalled()
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header pill can read a value from an endpoint (detail-pill-from-endpoint):
 * the pupil page's state today, which the record cannot store.
 *
 * @spec openspec/changes/detail-pill-from-endpoint/specs/detail-page/spec.md#requirement-a-header-pill-can-read-a-value-from-an-endpoint
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { pillEndpointSource, resolveEndpointPill } from '../../src/utils/detailActionModel.js'
import { fetchEndpointSource } from '../../src/composables/useEndpointSource.js'

jest.mock('../../src/composables/useEndpointSource.js', () => {
	const actual = jest.requireActual('../../src/composables/useEndpointSource.js')
	return { __esModule: true, ...actual, fetchEndpointSource: jest.fn() }
})

const PUPIL = { ncUserId: 'vera', fullName: 'Vera Hulstkamp' }
const STATE = {
	endpointSource: { url: '/apps/learniq/api/pupils/@object.ncUserId/page', responsePath: 'header.statePill.value' },
	labels: { 'in-class': 'In de klas', 'reported-ill': 'Ziek gemeld' },
	colorMap: { 'reported-ill': 'warning' },
	variant: 'success',
}

function makeStore(object) {
	return {
		objects: { 'reg-learner-profile': { 'id-1': object } },
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
		props: { title: 'Pupil', register: 'reg', schema: 'learner-profile', objectId: 'id-1', objectStore: makeStore(PUPIL), ...props },
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
	fetchEndpointSource.mockReset()
})

describe('pillEndpointSource / resolveEndpointPill', () => {
	it('is an endpoint pill only without field, text and countFrom, and with a url', () => {
		expect(pillEndpointSource(STATE)).toEqual(STATE.endpointSource)
		expect(pillEndpointSource({ ...STATE, field: 'state' })).toBe(null)
		expect(pillEndpointSource({ ...STATE, text: 'x' })).toBe(null)
		expect(pillEndpointSource({ endpointSource: { url: '' } })).toBe(null)
		expect(pillEndpointSource(null)).toBe(null)
	})

	it('maps the value as a field pill, and shows nothing for no value', () => {
		expect(resolveEndpointPill(STATE, 'in-class')).toEqual({ label: 'In de klas', colorKey: 'in-class', colorMap: { 'reported-ill': 'warning' }, variant: 'success' })
		expect(resolveEndpointPill(STATE, 'late').label).toBe('late')
		expect(resolveEndpointPill(STATE, '')).toBe(null)
		expect(resolveEndpointPill(STATE, null)).toBe(null)
		expect(resolveEndpointPill(STATE, { kind: 'today' })).toBe(null)
		expect(resolveEndpointPill({ ...STATE, values: ['reported-ill'] }, 'in-class')).toBe(null)
	})
})

describe('CnDetailPage endpoint pills', () => {
	it('reads the endpoint with the record and shows the value in words', async () => {
		fetchEndpointSource.mockResolvedValue('in-class')
		const w = mountPage({ typePill: { text: 'Leerling' }, statusPill: STATE })
		await flush()
		expect(fetchEndpointSource).toHaveBeenCalledWith(STATE.endpointSource, expect.objectContaining({ objectId: 'id-1' }))
		expect(pillTexts(w)).toEqual(['Leerling', 'In de klas'])
	})

	it('shows no pill after a failed read', async () => {
		fetchEndpointSource.mockRejectedValue(new Error('500'))
		const w = mountPage({ statusPill: STATE })
		await flush()
		expect(pillTexts(w)).toEqual([])
	})

	it('reads nothing for a page without endpoint pills', async () => {
		mountPage({ typePill: { field: 'fullName' } })
		await flush()
		expect(fetchEndpointSource).not.toHaveBeenCalled()
	})
})

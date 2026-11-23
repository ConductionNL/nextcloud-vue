/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header pill can show the label of the record its field points at
 * (detail-pill-resolve): a case's case type reads "Woo-verzoek", not its uuid.
 * The lookup is the reference-label resolver the index tables use.
 *
 * @spec openspec/changes/detail-pill-resolve/specs/detail-page/spec.md#requirement-a-header-pill-can-show-a-referenced-record-s-label
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockResolve = jest.fn()
jest.mock('../../src/composables/useRefLabels.js', () => {
	const actual = jest.requireActual('../../src/composables/useRefLabels.js')
	return { ...actual, createRefLabelResolver: () => ({ resolve: (...a) => mockResolve(...a), invalidate: jest.fn() }) }
})

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function makeStore(object) {
	return {
		objects: { 'dossiq-case': { 'case-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountPage(typePill, object = { id: 'case-1', caseType: 'uuid-woo', status: 'open' }) {
	return shallowMount(CnDetailPage, {
		props: { title: 'Case', register: 'dossiq', schema: 'case', objectId: 'case-1', objectStore: makeStore(object), typePill },
		global: {
			provide: { cnTranslate: (key) => key },
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

const typePill = (w) => w.vm.headerPills.find((pill) => pill.key === 'type')

beforeEach(() => {
	mockResolve.mockReset()
	mockResolve.mockImplementation(async (register, schema, ids) => Object.fromEntries(ids.map((id) => [id, id === 'uuid-woo' ? 'Woo-verzoek' : null])))
})

describe('CnDetailPage header pill resolve', () => {
	it('shows the referenced record label and keys its colour by it', async () => {
		const w = mountPage({ field: 'caseType', resolve: { register: 'dossiq', schema: 'caseType', labelField: 'title' }, colorMap: { 'Woo-verzoek': 'info' } })
		await flushPromises()
		expect(mockResolve).toHaveBeenCalledWith('dossiq', 'caseType', ['uuid-woo'], 'title')
		expect(typePill(w).label).toBe('Woo-verzoek')
		expect(typePill(w).colorKey).toBe('Woo-verzoek')
	})

	it('keeps the raw value when the lookup finds nothing', async () => {
		const w = mountPage({ field: 'caseType', resolve: { register: 'dossiq', schema: 'caseType' } }, { id: 'case-1', caseType: 'uuid-gone' })
		await flushPromises()
		expect(typePill(w).label).toBe('uuid-gone')
	})

	it('looks nothing up without resolve', async () => {
		const w = mountPage({ field: 'caseType' })
		await flushPromises()
		expect(mockResolve).not.toHaveBeenCalled()
		expect(typePill(w).label).toBe('uuid-woo')
	})
})

describe('CnDetailPage header pill colour and icon (pill-color-field)', () => {
	beforeEach(() => {
		mockResolve.mockImplementation(async (register, schema, ids, field, options = {}) => {
			const row = { title: 'Woo-verzoek', colour: 'red', icon: 'FileDocumentOutline' }
			return Object.fromEntries(ids.map((id) => [id, options.strict ? (row[field] ?? null) : row.title]))
		})
	})

	it('takes the tone and icon of the referenced record', async () => {
		const w = mountPage({ field: 'caseType', variant: 'info', resolve: { register: 'dossiq', schema: 'caseType', labelField: 'title', colorField: 'colour', iconField: 'icon' } })
		await flushPromises()
		expect(mockResolve).toHaveBeenCalledWith('dossiq', 'caseType', ['uuid-woo'], 'colour', { strict: true })
		expect(typePill(w)).toMatchObject({ label: 'Woo-verzoek', variant: 'error', colorMap: null, icon: 'FileDocumentOutline' })
	})

	it('keeps the declared variant without a colour field', async () => {
		const w = mountPage({ field: 'caseType', variant: 'info', resolve: { register: 'dossiq', schema: 'caseType', labelField: 'title' } })
		await flushPromises()
		expect(typePill(w).variant).toBe('info')
		expect(typePill(w).icon).toBeUndefined()
	})
})

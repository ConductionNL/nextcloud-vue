/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * THE ORGANISATIONS ENTITY SOURCE (organisations-entity-source).
 *
 * An OpenRegister organisation is not a register/schema object, so neither the
 * index nor the detail page could load one from manifest config. These tests
 * pin the requests (the two organisation endpoints and nothing else), the row
 * and record identity (the uuid, as an object's id is), and that a detail page
 * naming the source feeds its pills and its `@objectId` / `@object.*` context
 * from the organisation instead of the object store.
 *
 * @spec openspec/changes/organisations-entity-source/specs/organisations-entity-source/spec.md
 */

var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
	},
}))

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { resolveIndexSource, resolveRecordSource } from '../../src/composables/indexSources.js'
import { useOrganisationStore } from '../../src/composables/useOrganisationStore.js'

const UUID = '7d1c2a4e-0000-4000-8000-000000000001'
const ORG = { id: 12, uuid: UUID, name: 'Gemeente Zuiddrecht', slug: 'zuiddrecht', status: 'active', type: 'municipality', created: '2026-01-02T10:00:00+00:00', contactEmail: 'info@zuiddrecht.nl', kvk: '12345678' }

/**
 * Answer the list and the single read the way OpenRegister does.
 *
 * @param {object} [options] `{ status }` makes the single read fail with that HTTP status.
 * @return {void}
 */
function answer(options = {}) {
	mockGet.mockImplementation((url) => {
		if (url.endsWith('/api/organisations')) {
			return Promise.resolve({ data: { total: 1, active: ORG, results: [ORG] } })
		}
		if (options.status) {
			return Promise.reject(Object.assign(new Error('refused'), { response: { status: options.status } }))
		}
		return Promise.resolve({ data: { organisation: ORG } })
	})
}

beforeEach(() => {
	setActivePinia(createPinia())
	mockGet.mockReset()
	answer()
})

describe('the organisations index source', () => {
	it('is registered with the columns an organisation list needs and no Add', () => {
		const source = resolveIndexSource('organisations')

		expect(source.columns.map((c) => c.key)).toEqual(['name', 'status', 'type', 'created'])
		expect(source.showAdd).toBe(false)
		expect(source.deleteRow).toBeUndefined()
	})

	it('reads the list endpoint with no parameters and keys each row on its uuid', async () => {
		const source = resolveIndexSource('organisations')
		await source.load({ app: 'dossiq', scope: 'all' })

		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockGet.mock.calls[0][0]).toContain('/apps/openregister/api/organisations')
		expect(mockGet.mock.calls[0][1]).toBeUndefined()
		expect(source.rows()).toEqual([{ ...ORG, id: UUID }])
	})
})

describe('the organisations record source', () => {
	it('resolves for organisations and not for a source that cannot read one record', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

		expect(typeof resolveRecordSource('organisations').loadRecord).toBe('function')
		expect(resolveRecordSource('tasks')).toBeNull()
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('reads one organisation by uuid, keyed on its uuid', async () => {
		const source = resolveRecordSource('organisations')
		await source.loadRecord(UUID)

		expect(mockGet.mock.calls[0][0]).toContain(`/apps/openregister/api/organisations/${UUID}`)
		expect(source.record(UUID)).toEqual({ ...ORG, id: UUID })
		expect(source.recordError(UUID)).toBeNull()
	})

	it('keeps the status of a refused read and holds no record', async () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {})
		answer({ status: 403 })
		await useOrganisationStore().fetchRecord(UUID)
		const source = resolveRecordSource('organisations')

		expect(source.record(UUID)).toBeNull()
		expect(source.recordError(UUID)).toBe(403)
		error.mockRestore()
	})
})

describe('a detail page on the organisations source', () => {
	/**
	 * Mount a detail page that names the source and no register or schema.
	 *
	 * @return {object} The wrapper.
	 */
	function mountPage() {
		return mount(CnDetailPage, {
			props: {
				title: 'Organisation',
				entitySource: 'organisations',
				objectId: UUID,
				statusPill: { field: 'status' },
				typePill: { field: 'type' },
			},
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

	it('loads the organisation and draws its pills from it', async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockGet.mock.calls[0][0]).toContain(`/api/organisations/${UUID}`)
		const pills = wrapper.findAll('[data-testid^="cn-detail-page-pill-"]').map((p) => p.text())
		expect(pills).toEqual(expect.arrayContaining(['active', 'municipality']))
	})

	it('hands the organisation to the @objectId and @object.* token context', async () => {
		const wrapper = mountPage()
		await flushPromises()

		const ctx = wrapper.vm.cnObjectContextRef.value
		expect(ctx.objectId).toBe(UUID)
		expect(ctx.object).toEqual({ ...ORG, id: UUID })
	})

	it('shows the not-found state when OpenRegister refuses the organisation', async () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {})
		answer({ status: 403 })
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-detail-page-not-found"]').exists()).toBe(true)
		error.mockRestore()
	})
})

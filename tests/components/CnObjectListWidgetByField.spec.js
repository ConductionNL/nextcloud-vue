/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An object list whose rows point at objects of more than one schema (a
 * relationship to a contact or to an organisation): the row opens the page
 * its `rowRouteField` names through `rowRouteMap`, a reference cell resolves
 * its label in the schema the row names (`fkResolve` `schemaFrom`), and a new
 * row can be created through an app endpoint (`createEndpoint`).
 *
 * @spec openspec/changes/object-list-by-field/specs/object-list-widget/spec.md
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => '/nc' + u.replace('{register}', p?.register).replace('{schema}', p?.schema) }))

import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

function mountList(content) {
	const push = jest.fn().mockResolvedValue(undefined)
	const wrapper = shallowMount(CnObjectListWidget, {
		props: { content: { register: 'pipelinq', schema: 'relationship', filter: { fromContact: '@objectId' }, ...content } },
		global: {
			provide: { cnObjectContext: ref({ objectId: 'c-1', object: { id: 'c-1' } }), cnTranslate: (key) => key },
			mocks: { $router: { push, resolve: (to) => ({ href: `/${to.name}/${to.params.id}` }) } },
			stubs: { CnDataTable: true, CnFormDialog: { name: 'CnFormDialog', template: '<div />', methods: { setResult: jest.fn() } }, CnPagination: true, CnWidgetEmptyState: true },
		},
	})
	return { wrapper, push }
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	mockGet.mockResolvedValue({ data: { results: [], total: 0 } })
})

describe('CnObjectListWidget: a row opens the page its field names', () => {
	it('picks the route by the row field', async () => {
		const { wrapper, push } = mountList({ rowRouteField: 'toType', rowRouteMap: { client: 'ClientDetail', contact: 'ContactDetail' }, rowRouteIdField: 'toContact' })
		await flushPromises()
		wrapper.vm.openRowRoute({ id: 'r-1', toContact: 'k-9', toType: 'client' })
		expect(push).toHaveBeenCalledWith({ name: 'ClientDetail', params: { id: 'k-9' } })
	})

	it('opens the referenced id with rowRouteIdField, and falls back to rowRoute', async () => {
		const { wrapper, push } = mountList({ rowRoute: 'ContactDetail', rowRouteField: 'toType', rowRouteMap: { client: 'ClientDetail' }, rowRouteIdField: 'toContact' })
		await flushPromises()
		wrapper.vm.openRowRoute({ id: 'r-2', toContact: 'c-7', toType: 'contact' })
		expect(push).toHaveBeenCalledWith({ name: 'ContactDetail', params: { id: 'c-7' } })
	})
})

describe('CnObjectListWidget: createEndpoint', () => {
	it('posts a new row to the app endpoint, wrapped as declared, with the filter values', async () => {
		mockPost.mockResolvedValue({ data: { object: { id: 'new' } } })
		const { wrapper } = mountList({ createEndpoint: { url: '/apps/pipelinq/api/contacts-sync/create', bodyKey: 'object', extra: { objectType: 'contact' } } })
		await flushPromises()
		await wrapper.vm.onCreateConfirm({ name: 'Jan' })
		expect(mockPost).toHaveBeenCalledWith('/nc/apps/pipelinq/api/contacts-sync/create', { objectType: 'contact', object: { name: 'Jan', fromContact: 'c-1' } })
		expect(wrapper.emitted('created')).toHaveLength(1)
	})
})

describe('CnCellRenderer fkResolve: the schema the row names', () => {
	it('resolves in the schema mapped from the row field', () => {
		const w = mount(CnCellRenderer, {
			props: { value: 'k-9', widget: 'fkResolve', widgetProps: { register: 'pipelinq', schemaFrom: { field: 'toType', map: { client: 'client', contact: 'contact' } } }, row: { toType: 'client' } },
			global: { stubs: { CnFkResolveCell: { name: 'CnFkResolveCell', props: ['value', 'register', 'schema', 'labelField'], template: '<span class="fk">{{ schema }}</span>' } } },
		})
		expect(w.find('.fk').text()).toBe('client')
	})
})

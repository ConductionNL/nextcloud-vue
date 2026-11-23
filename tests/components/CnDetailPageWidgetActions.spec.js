/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's case page shows its side-column data cards without an Actions
 * menu. CnDetailPage `showWidgetActions` (manifest
 * `config.showWidgetActions`) reaches the cards through CnDetailWidgetHost
 * `showActions`; a definition's own `showActions` wins. Default: every card
 * keeps its menu, as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-detail-page-can-drop-the-widget-actions-menu
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const SCHEMA = { title: 'Case', properties: { title: { type: 'string', title: 'Title' } } }

function mountHost(widget, extra = {}) {
	return mount(CnDetailWidgetHost, {
		propsData: {
			widget,
			chrome: 'card',
			objectId: 'o1',
			object: { id: 'o1', title: 'A case' },
			objectType: 'case',
			schemaObject: SCHEMA,
			register: 'dossiq',
			schema: 'case',
			...extra,
		},
	})
}

describe('CnDetailWidgetHost: showActions', () => {
	it('keeps the data card menu by default', () => {
		const data = mountHost({ id: 'req', type: 'data', title: 'Requester' }).findComponent(CnObjectDataWidget)
		expect(data.props('showActions')).toBe(true)
	})

	it('drops it when the surface says so', () => {
		const data = mountHost({ id: 'req', type: 'data', title: 'Requester' }, { showActions: false }).findComponent(CnObjectDataWidget)
		expect(data.props('showActions')).toBe(false)
	})

	it('lets the definition win either way', () => {
		const kept = mountHost({ id: 'req', type: 'data', title: 'Requester', showActions: true }, { showActions: false }).findComponent(CnObjectDataWidget)
		expect(kept.props('showActions')).toBe(true)
		const dropped = mountHost({ id: 'req', type: 'data', title: 'Requester', showActions: false }).findComponent(CnObjectDataWidget)
		expect(dropped.props('showActions')).toBe(false)
	})
})

describe('CnDetailPage: showWidgetActions reaches the side column', () => {
	const store = {
		objects: { 'reg-case': { 'id-1': { name: 'A case' } } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
	const HostStub = { name: 'CnDetailWidgetHost', props: ['widget', 'showActions'], template: '<div class="host" :data-actions="String(showActions)" />' }
	const mountPage = (extra) => mount(CnDetailPage, {
		propsData: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: store,
			widgets: [{ id: 'req', type: 'data', title: 'Requester' }],
			sideColumn: ['req'],
			...extra,
		},
		global: { stubs: { CnDetailWidgetHost: HostStub } },
	})

	it('passes true without the key', () => {
		const host = mountPage({}).find('[data-testid="cn-detail-page-side-req"] .host')
		expect(host.attributes('data-actions')).toBe('true')
	})

	it('passes false with showWidgetActions: false', () => {
		const host = mountPage({ showWidgetActions: false }).find('[data-testid="cn-detail-page-side-req"] .host')
		expect(host.attributes('data-actions')).toBe('false')
	})
})

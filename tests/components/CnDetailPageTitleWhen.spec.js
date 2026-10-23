/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page resolves a widget's `titleWhen` against the record before the
 * widget host, the tab strip (through `availableWidgets`) and the other title
 * readers see the definition.
 *
 * @spec openspec/changes/widget-title-when/specs/widget-title-when/spec.md#requirement-a-widget-title-can-depend-on-the-record
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

function store(kind) {
	return {
		objects: { 'r-s': { 'o-1': { id: 'o-1', kind } } },
		schemas: { 'r-s': { properties: { kind: { type: 'string' } } } },
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

const FILES = { id: 'files', type: 'probe-title', title: 'Files', titleWhen: [{ when: { field: 'kind', op: 'eq', value: 'review' }, text: 'Documents for this request' }, { text: '' }] }
const TABS = { id: 'panels', type: 'tabs', title: 'Panels', content: { tabs: [{ widgetId: 'files' }] } }

async function mountPage(kind) {
	const w = mount(CnDetailPage, {
		propsData: {
			register: 'r',
			schema: 's',
			objectId: 'o-1',
			objectStore: store(kind),
			layout: [{ id: 1, widgetId: 'files', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }, { id: 2, widgetId: 'panels', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 3 }],
			widgets: [FILES, TABS],
		},
	})
	await w.vm.$nextTick()
	return w
}

describe('CnDetailPage: titleWhen', () => {
	it('hands the host the title the record picks', async () => {
		const w = await mountPage('review')
		const host = w.findAllComponents(CnDetailWidgetHost).find((h) => h.props('widget') && h.props('widget').id === 'files')
		expect(host.props('widget').title).toBe('Documents for this request')
		expect(host.props('widget').titleWhen).toBeUndefined()
	})

	it('hands the tab strip resolved definitions', async () => {
		const w = await mountPage('review')
		const tabsHost = w.findAllComponents(CnDetailWidgetHost).find((h) => h.props('widget') && h.props('widget').id === 'panels')
		const files = tabsHost.props('availableWidgets').find((d) => d.id === 'files')
		expect(files.title).toBe('Documents for this request')
		expect(files.titleWhen).toBeUndefined()
	})

	it('gives the other record an empty title', async () => {
		const w = await mountPage('plain')
		expect(w.vm.titledWidgets.find((d) => d.id === 'files').title).toBe('')
	})
})

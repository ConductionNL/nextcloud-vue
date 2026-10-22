/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail tab can name the permission it needs (`permission`), as a page tab
 * and a menu entry can: the case page's Indication and Case meeting tabs show
 * only to a holder of `sociaal-domein`. With no permissions known the tab
 * shows, as a menu entry does. This only decides whether the tab is drawn;
 * the data behind it is guarded on the server.
 *
 * @spec openspec/changes/detail-tab-permission/specs/tabs-widget/spec.md#requirement-a-detail-tab-can-name-the-permission-it-needs
 */
import { mount } from '@vue/test-utils'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-overview', type: 'data', title: 'Overview' },
	{ id: 'w-indication', type: 'custom', title: 'Indication' },
]

const TABS = [
	{ widgetId: 'w-overview', label: 'Overview' },
	{ widgetId: 'w-indication', label: 'Indication', permission: 'sociaal-domein' },
]

/**
 * @param {Array<string>|undefined} permissions What the viewer holds.
 * @return {Array<string>} The labels drawn.
 */
function labels(permissions) {
	const w = mount(CnTabsWidget, {
		props: { content: { tabs: TABS }, availableWidgets: WIDGETS, objectData: { id: 'c1' } },
		global: {
			provide: permissions === undefined ? {} : { cnPermissions: permissions },
			stubs: { CnDetailWidgetHost: { props: ['widget'], template: '<div class="host">{{ widget.id }}</div>' } },
		},
	})
	return w.vm.resolvedTabs.map((tab) => tab.label)
}

describe('CnTabsWidget tab permission', () => {
	it('draws the tab for a holder of the permission', () => {
		expect(labels(['sociaal-domein'])).toEqual(['Overview', 'Indication'])
	})

	it('leaves it out for a viewer without it', () => {
		expect(labels(['privacy'])).toEqual(['Overview'])
	})

	it('draws it when no permissions are known, as a menu entry does', () => {
		expect(labels(undefined)).toEqual(['Overview', 'Indication'])
		expect(labels([])).toEqual(['Overview', 'Indication'])
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard widget's content can name an app setting (`@config.<key>`), and
 * the dashboard reads the app config an ancestor provides when its own
 * `appConfig` is empty (pipelinq's knowledge-base widget scoped to the admin's
 * default space).
 *
 * @spec openspec/changes/pl4-dashboard-config/specs/pl4-dashboard-config/spec.md#requirement-a-dashboard-widget-can-name-an-app-setting
 */

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout'] },
	NcButton: { template: '<button />' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const WIDGETS = [{ id: 'kb', type: 'kb-search', title: 'Knowledge base', content: { space: '@config.xwiki_default_space?', limit: 5, nested: { team: '@config.team' }, plain: 'x' } }]
const LAYOUT = [{ id: 1, widgetId: 'kb', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 }]

/**
 * Mount a dashboard, optionally under an app config an ancestor provides.
 *
 * @param {object} props The props.
 * @param {object|null} provided The provided app config.
 * @return {import('@vue/test-utils').VueWrapper}
 */
function mountPage(props = {}, provided = null) {
	return mount(CnDashboardPage, {
		props: { widgets: WIDGETS, layout: LAYOUT, ...props },
		global: { stubs, provide: provided ? { cnAppConfig: ref(provided) } : {} },
	})
}

describe('CnDashboardPage widget content tokens', () => {
	it('fills @config tokens in a registry widget\'s content from the inherited app config', () => {
		const w = mountPage({}, { xwiki_default_space: 'Support', team: 'Sales' })
		const content = w.vm.registryWidgetBindings(LAYOUT[0])
		expect(content).toMatchObject({ space: 'Support', limit: 5, nested: { team: 'Sales' }, plain: 'x' })
	})

	it('lets its own appConfig win, and drops an optional token nobody set', () => {
		const w = mountPage({ appConfig: { team: 'Service' } }, { team: 'Sales' })
		const content = w.vm.registryWidgetBindings(LAYOUT[0])
		expect(content.nested.team).toBe('Service')
		expect(content.space).toBe('')
	})

	it('hands a widget the same content object on every render', () => {
		const w = mountPage({}, { xwiki_default_space: 'Support', team: 'Sales' })
		expect(w.vm.registryWidgetBindings(LAYOUT[0])).toBe(w.vm.registryWidgetBindings(LAYOUT[0]))
	})
})

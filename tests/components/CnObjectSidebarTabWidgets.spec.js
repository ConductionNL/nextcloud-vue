/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A declared sidebar tab may hold an integration's tab (`{ type:
 * 'integration', integrationId }`) or a library widget type with its
 * `content` (`{ type: 'kb-search', content }`), beside the built-ins and
 * the app's own components.
 *
 * @spec openspec/changes/sidebar-tab-library-widgets/specs/object-sidebar/spec.md#requirement-a-sidebar-tab-holds-integrations-and-library-widgets
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnObjectSidebar from '../../src/components/CnObjectSidebar/CnObjectSidebar.vue'
import { registerDashboardWidget } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
const { integrations } = require('../../src/integrations/registry.js')

const baseProps = {
	objectType: 'client',
	objectId: 'client-1',
	register: 'pipelinq',
	schema: 'client',
	apiBase: '/apps/openregister/api',
	useRegistry: false,
}

const KnowledgeTab = {
	name: 'KnowledgeTab',
	props: ['objectId', 'register', 'schema'],
	render() {
		return h('div', { class: 'knowledge-tab' }, `${this.register}/${this.schema}/${this.objectId}`)
	},
}

const SearchProbe = {
	name: 'SearchProbe',
	props: ['content', 'objectId', 'objectData'],
	render() {
		return h('div', { class: 'search-probe' }, `${this.content.space}|${this.objectId}`)
	},
}

registerDashboardWidget('sidebar-search-probe', { renderer: SearchProbe, form: null, surfaces: ['detail-page'] })

/**
 * Mount the sidebar with one declared tab.
 *
 * @param {Array<object>} widgets The tab's widgets.
 * @return {object} The wrapper.
 */
function mountTab(widgets) {
	return mount(CnObjectSidebar, {
		props: { ...baseProps, tabs: [{ id: 'knowledgeBase', label: 'Knowledge base', widgets }] },
		global: {
			stubs: { CnFilesTab: true, CnNotesTab: true, CnTagsTab: true, CnTasksTab: true, CnAuditTrailTab: true },
		},
	})
}

afterEach(() => {
	integrations.__resetForTests()
})

describe('CnObjectSidebar tab widgets', () => {
	it("renders an integration's tab for this object", () => {
		integrations.register({ id: 'knowledge', label: 'Knowledge', tab: KnowledgeTab, widget: KnowledgeTab })
		const wrapper = mountTab([{ type: 'integration', integrationId: 'knowledge' }])

		expect(wrapper.find('.knowledge-tab').text()).toBe('pipelinq/client/client-1')
	})

	it('renders nothing for an integration that is not registered', () => {
		const wrapper = mountTab([{ type: 'integration', integrationId: 'missing' }])

		expect(wrapper.find('.knowledge-tab').exists()).toBe(false)
	})

	it('renders a library widget type with its content and the object', () => {
		const wrapper = mountTab([{ type: 'sidebar-search-probe', content: { space: 'KCC' } }])

		expect(wrapper.find('.search-probe').text()).toBe('KCC|client-1')
	})
})

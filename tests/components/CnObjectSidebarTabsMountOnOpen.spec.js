// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectSidebar: a tab's content mounts when the tab is first opened.
 *
 * Measured on the dossiq case page (24 Nov 2026): the sidebar's seven tabs all
 * mounted on open, so audit trail, shares, access links, permissions and grants
 * were read before anything was clicked. NcAppSidebarTab renders its content
 * whether or not it is the active tab, so the sidebar decides what mounts.
 * @spec openspec/changes/sidebar-tab-mounts-on-open/specs/object-sidebar/spec.md#requirement-a-sidebar-tab-mounts-its-content-when-first-opened
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnObjectSidebar from '../../src/components/CnObjectSidebar/CnObjectSidebar.vue'

const mounted = []

/**
 * A tab body that records its mount, as a tab reading its data on mount does.
 *
 * @param {string} name The tab body's name.
 * @return {object} The component.
 */
function body(name) {
	return {
		name,
		mounted() {
			mounted.push(name)
		},
		render() {
			return h('div', { class: `body-${name}` })
		},
	}
}

const stubs = { CnFilesTab: true, CnNotesTab: true, CnTagsTab: true, CnTasksTab: true, CnAuditTrailTab: true }

function mountSidebar() {
	return mount(CnObjectSidebar, {
		propsData: {
			objectType: 'case',
			objectId: 'case-1',
			register: 'dossiq',
			schema: 'case',
			tabs: [
				{ id: 'audit', label: 'Audit trail', component: 'AuditBody' },
				{ id: 'sharing', label: 'Sharing', component: 'SharingBody' },
				{ id: 'access', label: 'Access', component: 'AccessBody' },
			],
			customComponents: { AuditBody: body('audit'), SharingBody: body('sharing'), AccessBody: body('access') },
		},
		global: { stubs },
	})
}

describe('CnObjectSidebar tabs mount on open', () => {
	beforeEach(() => {
		mounted.length = 0
	})

	it('mounts only the open tab\'s content on arrival', () => {
		const wrapper = mountSidebar()
		expect(wrapper.vm.activeTab).toBe('audit')
		expect(mounted).toEqual(['audit'])
		expect(wrapper.html()).toContain('id="sharing"')
		expect(wrapper.find('.body-sharing').exists()).toBe(false)
		wrapper.unmount()
	})

	it('mounts a tab\'s content when it is opened and keeps the one left mounted', async () => {
		const wrapper = mountSidebar()
		wrapper.vm.activeTab = 'sharing'
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(mounted).toEqual(['audit', 'sharing'])
		expect(wrapper.find('.body-audit').exists()).toBe(true)
		expect(wrapper.find('.body-access').exists()).toBe(false)

		wrapper.vm.activeTab = 'audit'
		await wrapper.vm.$nextTick()
		expect(mounted).toEqual(['audit', 'sharing'])
		wrapper.unmount()
	})
})

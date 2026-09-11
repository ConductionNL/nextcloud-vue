/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditSidebarModal — the per-page-type body (index = Search &
 * columns, detail = tabs), the visibility gate each page type actually reads,
 * and the tab edits. @nextcloud/vue is auto-stubbed via
 * tests/__mocks__/nextcloud-vue.js.
 */
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnEditSidebarModal from '../../src/dialogs/CnEditSidebarModal.vue'

// The shared @nextcloud/vue stub declares no props, so `modelValue` would land
// in attrs; declare it here to assert what the switch actually renders.
const SwitchStub = {
	name: 'NcCheckboxRadioSwitch',
	props: ['modelValue', 'type', 'disabled'],
	template: '<div><slot /></div>',
}

const mountModal = (page) => mount(CnEditSidebarModal, {
	propsData: { working: reactive({ pages: [page] }), pageId: page.id },
	stubs: { NcCheckboxRadioSwitch: SwitchStub },
})

const indexPage = (sidebar) => ({ id: 'dogs', type: 'index', config: sidebar ? { sidebar } : {} })
const detailPage = (sidebar) => ({ id: 'dog', type: 'detail', config: sidebar ? { sidebar } : {} })

describe('CnEditSidebarModal', () => {
	describe('the visibility switch reports the gate its page type reads', () => {
		it('an index page with no sidebar config reads OFF — CnIndexPage mounts nothing without enabled', () => {
			expect(mountModal(indexPage()).vm.sidebarShown).toBe(false)
		})

		it('an index page reads ON only once enabled is explicitly true', () => {
			expect(mountModal(indexPage({ show: true })).vm.sidebarShown).toBe(false)
			expect(mountModal(indexPage({ enabled: true })).vm.sidebarShown).toBe(true)
			expect(mountModal(indexPage({ enabled: true, show: false })).vm.sidebarShown).toBe(false)
		})

		it('a detail page with no sidebar config reads ON — CnDetailPage defaults both flags on', () => {
			expect(mountModal(detailPage()).vm.sidebarShown).toBe(true)
			expect(mountModal(detailPage({ show: false })).vm.sidebarShown).toBe(false)
		})

		it('turning it on writes both flags, so either page type sees it', () => {
			const wrapper = mountModal(indexPage())
			wrapper.vm.sidebarShown = true
			expect(wrapper.vm.page.config.sidebar).toMatchObject({ show: true, enabled: true })
			expect(wrapper.vm.sidebarShown).toBe(true)
		})

		it('the switch redraws when it is flipped', async () => {
			const wrapper = mountModal(indexPage())
			const gate = () => wrapper.findAllComponents({ name: 'NcCheckboxRadioSwitch' })
				.find((c) => c.text().includes('Show sidebar on this page'))
			expect(gate().props('modelValue')).toBe(false)
			wrapper.vm.sidebarShown = true
			await wrapper.vm.$nextTick()
			expect(gate().props('modelValue')).toBe(true)
		})
	})

	describe('the body follows the page type', () => {
		it('an index page offers the Metadata group and NO tabs — an index sidebar has none', () => {
			const wrapper = mountModal(indexPage({ enabled: true }))
			expect(wrapper.text()).toContain('Search & columns')
			expect(wrapper.text()).toContain('Metadata column group')
			expect(wrapper.find('.cn-edit-sidebar__tabs').exists()).toBe(false)
			expect(wrapper.text()).not.toContain('Add tab')
		})

		it('a detail page offers the tabs and not the index-only settings', () => {
			const wrapper = mountModal(detailPage())
			expect(wrapper.find('.cn-edit-sidebar__tabs').exists()).toBe(true)
			expect(wrapper.text()).toContain('Add tab')
			expect(wrapper.text()).not.toContain('Metadata column group')
			expect(wrapper.find('.cn-edit-sidebar__groups').exists()).toBe(false)
		})
	})

	describe('the index tab-order and column-group settings', () => {
		it('opens on Search & filters by default and drops the key when set back', () => {
			const wrapper = mountModal(indexPage({ enabled: true }))
			expect(wrapper.vm.selectedDefaultTab.id).toBe('search-tab')
			wrapper.vm.setDefaultTab({ id: 'columns-tab' })
			expect(wrapper.vm.page.config.sidebar.search.defaultTab).toBe('columns-tab')
			expect(wrapper.vm.selectedDefaultTab.id).toBe('columns-tab')
			wrapper.vm.setDefaultTab({ id: 'search-tab' })
			expect('defaultTab' in wrapper.vm.page.config.sidebar.search).toBe(false)
		})

		it('setting the first tab does not clobber other search overrides', () => {
			const wrapper = mountModal(indexPage({ enabled: true, search: { searchPlaceholder: 'Find a dog' } }))
			wrapper.vm.setDefaultTab({ id: 'columns-tab' })
			expect(wrapper.vm.page.config.sidebar.search).toEqual({ searchPlaceholder: 'Find a dog', defaultTab: 'columns-tab' })
		})

		it('adds, edits and removes a column group', async () => {
			const wrapper = mountModal(indexPage({ enabled: true }))
			wrapper.vm.addColumnGroup()
			await wrapper.vm.$nextTick()
			expect(wrapper.findAll('.cn-edit-sidebar__groups .cn-edit-sidebar__tab')).toHaveLength(1)

			const group = wrapper.vm.editableColumnGroups[0]
			wrapper.vm.setColumnKeys(group, 'owner, vaccinated , ')
			expect(group.columns).toEqual([
				{ key: 'owner', label: 'owner' },
				{ key: 'vaccinated', label: 'vaccinated' },
			])
			expect(wrapper.vm.columnKeys(group)).toBe('owner, vaccinated')

			wrapper.vm.removeColumnGroup(0)
			expect(wrapper.vm.page.config.sidebar.columnGroups).toEqual([])
		})

		it('editing the key list keeps the labels of keys that stay', () => {
			const wrapper = mountModal(indexPage({
				enabled: true,
				columnGroups: [{ id: 'g1', label: 'Care', columns: [{ key: 'owner', label: 'Owner' }] }],
			}))
			const group = wrapper.vm.editableColumnGroups[0]
			wrapper.vm.setColumnKeys(group, 'owner, vet')
			expect(group.columns).toEqual([
				{ key: 'owner', label: 'Owner' },
				{ key: 'vet', label: 'vet' },
			])
		})
	})

	describe('the index Metadata group', () => {
		it('is enabled even while the sidebar is off — it is config, not a live control', () => {
			const wrapper = mountModal(indexPage())
			const toggle = wrapper.findAllComponents(SwitchStub).find((c) => c.text().includes('Metadata'))
			expect(wrapper.vm.sidebarShown).toBe(false)
			expect(toggle.props('disabled')).toBeFalsy()
		})

		it('defaults on and is dropped from the config when left on', () => {
			const wrapper = mountModal(indexPage({ enabled: true }))
			expect(wrapper.vm.showMetadata).toBe(true)
			wrapper.vm.setShowMetadata(true)
			expect('showMetadata' in wrapper.vm.page.config.sidebar).toBe(false)
		})

		it('stores false when switched off, and reads back', async () => {
			const wrapper = mountModal(indexPage({ enabled: true }))
			wrapper.vm.setShowMetadata(false)
			expect(wrapper.vm.page.config.sidebar.showMetadata).toBe(false)
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.showMetadata).toBe(false)
		})
	})

	describe('the detail header and registry settings', () => {
		it('stores the header strings and drops each one when blanked', () => {
			const wrapper = mountModal(detailPage())
			for (const key of ['title', 'subtitle', 'register', 'schema']) {
				expect(wrapper.vm.sidebarString(key)).toBe('')
				wrapper.vm.setSidebarString(key, 'x')
				expect(wrapper.vm.page.config.sidebar[key]).toBe('x')
				wrapper.vm.setSidebarString(key, '')
				expect(key in wrapper.vm.page.config.sidebar).toBe(false)
			}
		})

		it('registry mode is off unless explicitly stored — CnDetailPage publishes `useRegistry === true`', async () => {
			const wrapper = mountModal(detailPage())
			expect(wrapper.vm.useRegistry).toBe(false)
			wrapper.vm.setUseRegistry(true)
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.page.config.sidebar.useRegistry).toBe(true)
			expect(wrapper.vm.useRegistry).toBe(true)
			wrapper.vm.setUseRegistry(false)
			expect('useRegistry' in wrapper.vm.page.config.sidebar).toBe(false)
		})

		it('warns that declared tabs beat registry mode, as CnObjectSidebar does', async () => {
			const wrapper = mountModal(detailPage({ useRegistry: true }))
			expect(wrapper.vm.registryOverridden).toBe(false)
			wrapper.vm.addTab()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.registryOverridden).toBe(true)
			expect(wrapper.text()).toContain('registry mode is ignored')
		})

		it('excluded integration ids round-trip through the comma-separated field', () => {
			const wrapper = mountModal(detailPage({ useRegistry: true }))
			wrapper.vm.setSidebarList('excludeIntegrations', 'tasks, notes ,')
			expect(wrapper.vm.page.config.sidebar.excludeIntegrations).toEqual(['tasks', 'notes'])
			expect(wrapper.vm.sidebarList('excludeIntegrations')).toBe('tasks, notes')
			wrapper.vm.setSidebarList('excludeIntegrations', '')
			expect('excludeIntegrations' in wrapper.vm.page.config.sidebar).toBe(false)
		})

		it('the index body offers none of these', () => {
			const wrapper = mountModal(indexPage({ enabled: true }))
			expect(wrapper.text()).not.toContain('registered integrations')
			expect(wrapper.text()).not.toContain('Sidebar subtitle')
		})
	})

	describe('detail tabs', () => {
		it('adding a tab enables the sidebar on both gates', () => {
			const wrapper = mountModal(detailPage({ show: false }))
			wrapper.vm.addTab()
			expect(wrapper.vm.page.config.sidebar).toMatchObject({ show: true, enabled: true })
			expect(wrapper.vm.editableTabs).toHaveLength(1)
		})

		it('hiding a tab records its id in hiddenTabs', () => {
			const wrapper = mountModal(detailPage({ tabs: [{ id: 'files', label: 'Files' }] }))
			wrapper.vm.setTabVisible('files', false)
			expect(wrapper.vm.page.config.sidebar.hiddenTabs).toEqual(['files'])
			wrapper.vm.setTabVisible('files', true)
			expect(wrapper.vm.page.config.sidebar.hiddenTabs).toEqual([])
		})

		it('a tab content choice writes one built-in widget, and clearing empties it', () => {
			const wrapper = mountModal(detailPage({ tabs: [{ id: 'files', label: 'Files' }] }))
			const tab = wrapper.vm.editableTabs[0]
			wrapper.vm.setContent(tab, { id: 'audit' })
			expect(tab.widgets).toEqual([{ type: 'audit' }])
			expect(wrapper.vm.selectedContent(tab).id).toBe('audit')
			wrapper.vm.setContent(tab, { id: '' })
			expect(tab.widgets).toEqual([])
		})
	})
})

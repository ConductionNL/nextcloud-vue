/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditActionsModal — the two action surfaces (`config.headerActions`
 * for the page's Actions menu, `config.actions` for CnIndexPage's row menu), the
 * empty state, the icon picker, and the add/remove/reorder edits.
 * @nextcloud/vue is auto-stubbed via tests/__mocks__/nextcloud-vue.js.
 */
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnEditActionsModal from '../../src/dialogs/CnEditActionsModal.vue'

const CnIconBrowserStub = {
	name: 'CnIconBrowser',
	props: ['value', 'label', 'clearable'],
	emits: ['input'],
	template: '<div class="icon-browser-stub" />',
}

function mountModal(working, pageId = '') {
	return mount(CnEditActionsModal, {
		propsData: { working, pageId },
		stubs: { CnIconBrowser: CnIconBrowserStub },
	})
}

const pageOf = (type, config = {}) => reactive({ pages: [{ id: 'p', type, config }] })
const configOf = (wrapper) => wrapper.vm.page.config
const action = (id, extra = {}) => ({ id, label: id, icon: '', type: 'open-page', target: '', ...extra })

describe('CnEditActionsModal', () => {
	describe('the surface it writes to', () => {
		// REGRESSION. The modal wrote `config.actions` on every page type. Only
		// CnIndexPage declares an `actions` prop, and there it is the per-ROW
		// menu — CnDetailPage and CnDashboardPage have no such prop at all, so
		// an action added on a detail page was stored where nothing reads it.
		it('defaults to the page Actions menu, which every page type renders', () => {
			const wrapper = mountModal(pageOf('detail'), 'p')
			wrapper.vm.add()
			expect(configOf(wrapper).headerActions).toHaveLength(1)
			expect(configOf(wrapper).actions).toBeUndefined()
		})

		it('offers no surface choice on a detail page — it has no rows', () => {
			const wrapper = mountModal(pageOf('detail'), 'p')
			expect(wrapper.vm.surfaceOptions.map((o) => o.id)).toEqual(['headerActions'])
			expect(wrapper.findAllComponents({ name: 'NcSelect' })
				.some((c) => c.props('inputLabel') === 'Where these actions appear')).toBe(false)
		})

		it('an index page can edit either surface', async () => {
			const wrapper = mountModal(pageOf('index'), 'p')
			expect(wrapper.vm.surfaceOptions.map((o) => o.id)).toEqual(['headerActions', 'actions'])

			wrapper.vm.add()
			expect(configOf(wrapper).headerActions).toHaveLength(1)

			wrapper.vm.setSurface({ id: 'actions' })
			await wrapper.vm.$nextTick()
			wrapper.vm.add()
			expect(configOf(wrapper).actions).toHaveLength(1)
			expect(configOf(wrapper).headerActions).toHaveLength(1)
		})

		it('the hint names where the chosen surface shows up', async () => {
			const wrapper = mountModal(pageOf('index'), 'p')
			expect(wrapper.text()).toContain('Actions menu in the page header')
			wrapper.vm.setSurface({ id: 'actions' })
			await wrapper.vm.$nextTick()
			expect(wrapper.text()).toContain('on every row')
		})
	})

	describe('actions stranded under config.actions', () => {
		it('warns on a page type that cannot render them, and moves them on request', async () => {
			const wrapper = mountModal(pageOf('detail', { actions: [action('a1'), action('a2')] }), 'p')
			expect(wrapper.text()).toContain('does not render')

			wrapper.vm.adoptStranded()
			await wrapper.vm.$nextTick()
			expect(configOf(wrapper).headerActions.map((a) => a.id)).toEqual(['a1', 'a2'])
			expect('actions' in configOf(wrapper)).toBe(false)
			expect(wrapper.text()).not.toContain('does not render')
		})

		it('appends after any actions the menu already had', () => {
			const wrapper = mountModal(
				pageOf('detail', { headerActions: [action('kept')], actions: [action('moved')] }), 'p')
			wrapper.vm.adoptStranded()
			expect(configOf(wrapper).headerActions.map((a) => a.id)).toEqual(['kept', 'moved'])
		})

		it('says nothing on an index page, where config.actions IS a surface', () => {
			const wrapper = mountModal(pageOf('index', { actions: [action('a1')] }), 'p')
			expect(wrapper.vm.strandedActions).toEqual([])
			expect(wrapper.text()).not.toContain('does not render')
		})
	})

	describe('editing the list', () => {
		it('hints that an action must be added when the surface is empty', () => {
			const wrapper = mountModal(pageOf('detail'), 'p')
			expect(wrapper.text()).toContain('Add action')
		})

		it('drops the hint once an action exists', async () => {
			const wrapper = mountModal(pageOf('detail'), 'p')
			wrapper.vm.add()
			await wrapper.vm.$nextTick()
			expect(wrapper.text()).not.toContain('Nothing here yet')
			expect(wrapper.findAll('.cn-edit-actions__row')).toHaveLength(1)
		})

		it('edits the icon through the icon browser, not a text field', async () => {
			const wrapper = mountModal(pageOf('detail', { headerActions: [action('a1', { icon: 'Plus' })] }), 'p')
			const browser = wrapper.findComponent(CnIconBrowserStub)
			expect(browser.props('value')).toBe('Plus')

			browser.vm.$emit('input', 'Heart')
			expect(configOf(wrapper).headerActions[0].icon).toBe('Heart')
			await wrapper.vm.$nextTick()
			expect(wrapper.findComponent(CnIconBrowserStub).props('value')).toBe('Heart')
		})

		it('clearing the icon stores an empty string, not null', () => {
			const wrapper = mountModal(pageOf('detail', { headerActions: [action('a1', { icon: 'Plus' })] }), 'p')
			wrapper.findComponent(CnIconBrowserStub).vm.$emit('input', null)
			expect(configOf(wrapper).headerActions[0].icon).toBe('')
		})

		it('an icon-less action passes null to the browser rather than an empty string', () => {
			const wrapper = mountModal(pageOf('detail', { headerActions: [action('a1')] }), 'p')
			expect(wrapper.findComponent(CnIconBrowserStub).props('value')).toBe(null)
		})

		it('remove and move edit the working page in place', () => {
			const wrapper = mountModal(
				pageOf('detail', { headerActions: [action('a1'), action('a2'), action('a3')] }), 'p')
			wrapper.vm.move(2, -1)
			expect(configOf(wrapper).headerActions.map((a) => a.id)).toEqual(['a1', 'a3', 'a2'])
			wrapper.vm.remove(0)
			expect(configOf(wrapper).headerActions.map((a) => a.id)).toEqual(['a3', 'a2'])
		})

		it('targetLabel names what each action type targets', () => {
			const wrapper = mountModal(pageOf('detail'), 'p')
			expect(wrapper.vm.targetLabel({ type: 'open-page' })).toBe('Target page id')
			expect(wrapper.vm.targetLabel({ type: 'navigate' })).toBe('URL or route')
			expect(wrapper.vm.targetLabel({ type: 'open-modal' })).toBe('Modal key')
			expect(wrapper.vm.targetLabel({ type: 'handler' })).toBe('Handler name')
		})
	})
})

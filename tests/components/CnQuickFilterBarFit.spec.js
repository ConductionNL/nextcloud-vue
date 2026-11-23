/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `quickFilterPlacement: "toolbar"` (DqTeamwachtrij) keeps the chips on one row
 * with the Filter button and the view switch. CnQuickFilterBar's `fit` shows
 * as many chips as its width holds, the rest in the overflow chip; CnIndexPage
 * turns it on and marks itself so the board look gives the chips the room the
 * buttons leave. jsdom lays nothing out, so the widths are set by hand.
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnQuickFilterBar from '../../src/components/CnQuickFilterBar/CnQuickFilterBar.vue'

const TABS = ['Alle', 'Woo-verzoek', 'Bezwaar', 'Klacht', 'Subsidie'].map((label) => ({ label, filter: {} }))

/**
 * Mount a fitting bar of the given width, every chip 100px and the overflow chip 40px.
 *
 * @param {number} width The bar's width.
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountFit(width, props = {}) {
	const w = mount(CnQuickFilterBar, { props: { tabs: TABS, inline: true, fit: true, ...props }, global: { stubs: { NcPopover: { template: '<div class="popover"><slot name="trigger" /></div>' } } } })
	const root = w.vm.$refs.chipsRoot
	Object.defineProperty(root, 'clientWidth', { configurable: true, value: width })
	for (const chip of root.querySelectorAll('[data-measure="chip"]')) {
		Object.defineProperty(chip, 'offsetWidth', { configurable: true, value: 100 })
	}
	const more = root.querySelector('[data-measure="more"]')
	Object.defineProperty(more, 'offsetWidth', { configurable: true, value: 40 })
	w.vm.measureFit()
	return w
}

const shown = (w) => w.findAll('.cn-quick-filter-bar__tabs > .cn-quick-filter-bar__tab').map((b) => b.text())

describe('CnQuickFilterBar fit', () => {
	it('shows every chip when they all fit', async () => {
		const w = mountFit(600)
		await w.vm.$nextTick()
		expect(shown(w)).toHaveLength(5)
		expect(w.find('[data-testid="cn-quick-filter-more"]').exists()).toBe(false)
	})

	it('shows the chips that fit beside the overflow chip, the rest in it', async () => {
		const w = mountFit(400)
		await w.vm.$nextTick()
		// 40 for the overflow chip, then 8 + 100 per chip: three fit in 400.
		expect(shown(w)).toEqual(['Alle', 'Woo-verzoek', 'Bezwaar'])
		expect(w.find('[data-testid="cn-quick-filter-more"]').exists()).toBe(true)
	})

	it('keeps at least one chip, and lets maxVisible cap it further', async () => {
		const narrow = mountFit(60)
		await narrow.vm.$nextTick()
		expect(shown(narrow)).toHaveLength(1)
		const capped = mountFit(600, { maxVisible: 2 })
		await capped.vm.$nextTick()
		expect(shown(capped)).toEqual(['Alle', 'Woo-verzoek'])
	})

	it('measures nothing without fit', () => {
		const w = mount(CnQuickFilterBar, { props: { tabs: TABS, inline: true } })
		expect(w.find('.cn-quick-filter-bar__measure').exists()).toBe(false)
		expect(shown(w)).toHaveLength(5)
	})
})

describe('CnIndexPage quickFilterPlacement', () => {
	it('turns fit on and marks the page for the toolbar placement only', () => {
		const mountPage = (props) => mount(CnIndexPage, {
			propsData: { title: 'Wachtrij', schema: { title: 'Zaak', properties: { title: { type: 'string' } } }, objects: [{ id: '1', title: 'A' }], quickFilters: TABS, ...props },
			global: { stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnQuickFilterBar: { name: 'CnQuickFilterBar', props: ['fit'], template: '<div />' } } },
		})
		const toolbar = mountPage({ quickFilterPlacement: 'toolbar' })
		expect(toolbar.classes()).toContain('cn-index-page--quick-filters-toolbar')
		expect(toolbar.findComponent({ name: 'CnQuickFilterBar' }).props('fit')).toBe(true)
		const plain = mountPage({})
		expect(plain.classes()).not.toContain('cn-index-page--quick-filters-toolbar')
		expect(plain.findComponent({ name: 'CnQuickFilterBar' }).props('fit')).toBe(false)
	})
})

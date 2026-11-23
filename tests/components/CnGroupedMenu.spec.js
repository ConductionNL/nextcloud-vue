/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnGroupedMenu: one "More" button holds a page's actions in titled groups
 * over two columns (LpVandaag "Meer"), as a keyboard-operable menu.
 *
 * @spec openspec/changes/lpvandaag-start-page/specs/lpvandaag-start-page/spec.md#requirement-one-more-button-holds-the-pages-actions-in-groups
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnGroupedMenu, { visibleColumns } from '../../src/components/CnGroupedMenu/CnGroupedMenu.vue'

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
}))

const NcPopover = {
	name: 'NcPopover',
	props: ['shown'],
	emits: ['update:shown', 'afterShow'],
	watch: {
		shown(value) {
			if (value) {
				this.$nextTick(() => this.$emit('afterShow'))
			}
		},
	},
	template: '<div class="popover-stub"><slot name="trigger" :attrs="{ \'aria-expanded\': String(shown) }" /><div v-if="shown"><slot /></div></div>',
}

const NcButton = {
	name: 'NcButton',
	emits: ['click'],
	template: '<button class="button-stub" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
}

const COLUMNS = [
	[
		{
			id: 'boards',
			title: 'Dashboards',
			items: [
				{ id: 'today', label: 'Vandaag', meta: 'standaard', checked: true },
				{ id: 'team', label: 'Team', checked: false, href: '/team' },
			],
		},
		{ id: 'empty', title: 'Leeg', items: [] },
	],
	[
		{
			id: 'this',
			title: 'Dit dashboard',
			items: [
				{ id: 'edit', label: 'Bewerken' },
				{ id: 'delete', label: 'Verwijderen', destructive: true, divided: true },
				{ id: 'off', label: 'Uit', disabled: true },
			],
		},
	],
]

/**
 * Mount the menu, open.
 *
 * @param {object} props Props.
 * @return {Promise<object>} The wrapper.
 */
async function mountOpen(props = {}) {
	const wrapper = mount(CnGroupedMenu, {
		props: { columns: COLUMNS, label: 'Meer', ...props },
		global: { stubs: { NcPopover, NcButton, DotsHorizontal: true, RouterLink: { props: ['to'], template: '<a class="router-link"><slot /></a>' } } },
		attachTo: document.body,
	})
	await wrapper.setData({ open: true })
	await nextTick()
	return wrapper
}

describe('visibleColumns', () => {
	it('leaves out empty groups and then empty columns', () => {
		const columns = visibleColumns([[{ id: 'a', items: [] }], [{ id: 'b', items: [{ id: 'x' }] }], null])
		expect(columns).toEqual([[{ id: 'b', items: [{ id: 'x' }] }]])
		expect(visibleColumns(undefined)).toEqual([])
	})
})

describe('CnGroupedMenu', () => {
	it('names the button and the menu with its label, and reports that it opened', async () => {
		const wrapper = await mountOpen()
		expect(wrapper.emitted('open')).toHaveLength(1)
		expect(wrapper.find('[data-testid="cn-grouped-menu-trigger"]').text()).toBe('Meer')
		expect(wrapper.find('[role="menu"]').attributes('aria-label')).toBe('Meer')
		wrapper.unmount()
	})

	it('draws the groups with their titles over two columns, without the empty group', async () => {
		const wrapper = await mountOpen()
		expect(wrapper.findAll('.cn-grouped-menu__column')).toHaveLength(2)
		expect(wrapper.find('[data-testid="cn-grouped-menu-group-empty"]').exists()).toBe(false)
		const group = wrapper.find('[data-testid="cn-grouped-menu-group-boards"]')
		expect(group.attributes('role')).toBe('group')
		expect(group.find('.cn-grouped-menu__title').text()).toBe('Dashboards')
		wrapper.unmount()
	})

	it('makes a checked item a radio item with its note, and a link for an href', async () => {
		const wrapper = await mountOpen()
		const today = wrapper.find('[data-testid="cn-grouped-menu-item-today"]')
		expect(today.attributes('role')).toBe('menuitemradio')
		expect(today.attributes('aria-checked')).toBe('true')
		expect(today.find('.cn-grouped-menu__meta').text()).toBe('standaard')
		const team = wrapper.find('[data-testid="cn-grouped-menu-item-team"]')
		expect(team.element.tagName).toBe('A')
		expect(team.attributes('href')).toBe('/team')
		expect(team.attributes('aria-checked')).toBe('false')
		const edit = wrapper.find('[data-testid="cn-grouped-menu-item-edit"]')
		expect(edit.element.tagName).toBe('BUTTON')
		expect(edit.attributes('role')).toBe('menuitem')
		expect(wrapper.find('[data-testid="cn-grouped-menu-item-delete"]').classes()).toContain('cn-grouped-menu__item--destructive')
		wrapper.unmount()
	})

	it('runs a chosen item, reports it and closes', async () => {
		const onClick = jest.fn()
		const columns = [[{ id: 'g', items: [{ id: 'go', label: 'Go', onClick }] }]]
		const wrapper = await mountOpen({ columns })
		await wrapper.find('[data-testid="cn-grouped-menu-item-go"]').trigger('click')
		expect(onClick).toHaveBeenCalledTimes(1)
		expect(wrapper.emitted('select')[0][0].id).toBe('go')
		expect(wrapper.vm.open).toBe(false)
		expect(wrapper.find('.cn-grouped-menu__panel--single').exists()).toBe(false)
		wrapper.unmount()
	})

	it('does not run a disabled item', async () => {
		const wrapper = await mountOpen()
		const off = wrapper.find('[data-testid="cn-grouped-menu-item-off"]')
		expect(off.attributes('aria-disabled')).toBe('true')
		await off.trigger('click')
		expect(wrapper.emitted('select')).toBeUndefined()
		wrapper.unmount()
	})

	it('moves focus through every item over both columns with the arrow keys, Home and End', async () => {
		const wrapper = await mountOpen()
		const items = wrapper.findAll('.cn-grouped-menu__item')
		expect(document.activeElement).toBe(items[0].element)
		const panel = wrapper.find('[role="menu"]')
		await panel.trigger('keydown', { key: 'ArrowDown' })
		expect(document.activeElement).toBe(items[1].element)
		await panel.trigger('keydown', { key: 'ArrowDown' })
		expect(document.activeElement).toBe(items[2].element)
		await panel.trigger('keydown', { key: 'End' })
		expect(document.activeElement).toBe(items[items.length - 1].element)
		await panel.trigger('keydown', { key: 'ArrowDown' })
		expect(document.activeElement).toBe(items[0].element)
		await panel.trigger('keydown', { key: 'ArrowUp' })
		expect(document.activeElement).toBe(items[items.length - 1].element)
		await panel.trigger('keydown', { key: 'Home' })
		expect(document.activeElement).toBe(items[0].element)
		expect(items[0].attributes('tabindex')).toBe('0')
		expect(items[1].attributes('tabindex')).toBe('-1')
		await panel.trigger('keydown', { key: 'Escape' })
		expect(wrapper.vm.open).toBe(false)
		wrapper.unmount()
	})

	it('draws one column when only one has items', async () => {
		const wrapper = await mountOpen({ columns: [[{ id: 'g', items: [{ id: 'a', label: 'A' }] }], []] })
		expect(wrapper.find('.cn-grouped-menu__panel--single').exists()).toBe(true)
		wrapper.unmount()
	})
})

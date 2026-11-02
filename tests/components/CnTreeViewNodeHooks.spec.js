/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnTreeView from '../../src/components/CnTreeView/CnTreeView.vue'

const nodes = [
	{ id: 'hr', name: 'HR', children: [{ id: 'onb', name: 'Onboarding' }] },
	{ id: 'it', name: 'IT' },
]

/**
 * Mount a tree with the per-node hooks a host such as a dashboard switcher uses.
 *
 * @param {object} extra Extra props.
 * @param {object} slots Slots.
 * @return {object} The wrapper.
 */
function mountHooked(extra = {}, slots = {}) {
	return mount(CnTreeView, {
		propsData: {
			nodes,
			labelKey: 'name',
			expandLabel: (node) => `Expand ${node.name}`,
			collapseLabel: (node) => `Collapse ${node.name}`,
			toggleAttrs: (node) => ({ 'data-testid': `tree-expand-${node.id}` }),
			rowAttrs: (node, depth) => ({
				role: 'button',
				'aria-label': node.name,
				'data-depth': String(depth),
				'data-source': 'group',
				class: { active: node.id === 'onb' },
			}),
			focusableRows: true,
			...extra,
		},
		slots,
	})
}

describe('CnTreeView per-node hooks', () => {
	it('names each expand button after its node, collapsed and expanded', async () => {
		const wrapper = mountHooked()
		const toggle = wrapper.find('[data-testid="tree-expand-hr"]')
		expect(toggle.attributes('aria-label')).toBe('Expand HR')
		expect(toggle.classes()).toContain('cn-tree-node__toggle')
		await wrapper.setProps({ expandedIds: ['hr'] })
		expect(wrapper.find('[data-testid="tree-expand-hr"]').attributes('aria-label')).toBe('Collapse HR')
	})

	it('a leaf gets no expand button and no toggle attributes', () => {
		const wrapper = mountHooked()
		expect(wrapper.find('[data-testid="tree-expand-it"]').exists()).toBe(false)
	})

	it('adds the row attributes per node and depth, merged with the row class and indent', () => {
		const wrapper = mountHooked({ expandedIds: ['hr'] })
		const rows = wrapper.findAll('.cn-tree-node__row')
		expect(rows.map((row) => row.attributes('aria-label'))).toEqual(['HR', 'Onboarding', 'IT'])
		expect(rows.map((row) => row.attributes('data-depth'))).toEqual(['0', '1', '0'])
		expect(rows[0].attributes('role')).toBe('button')
		expect(rows[0].attributes('data-source')).toBe('group')
		expect(rows[1].classes()).toEqual(expect.arrayContaining(['cn-tree-node__row', 'active']))
		expect(rows[0].classes()).not.toContain('active')
		expect(rows[1].attributes('style')).toContain('padding-left: 18px')
	})

	it('focusable rows take Tab focus and select on Enter and Space', async () => {
		const wrapper = mountHooked()
		const row = wrapper.findAll('.cn-tree-node__row')[1]
		expect(row.attributes('tabindex')).toBe('0')
		await row.trigger('keydown', { key: 'Enter' })
		await row.trigger('keydown', { key: ' ' })
		await row.trigger('keydown', { key: 'a' })
		expect(wrapper.emitted('select')).toEqual([[nodes[1]], [nodes[1]]])
		expect(wrapper.emitted('update:selected-id')).toEqual([['it'], ['it']])
	})

	it('keys on the expand button or an action inside the row do not select the row', async () => {
		const wrapper = mountHooked({}, { actions: ({ node }) => h('button', { class: 'act' }, node.name) })
		await wrapper.find('[data-testid="tree-expand-hr"]').trigger('keydown', { key: 'Enter' })
		await wrapper.find('.act').trigger('keydown', { key: ' ' })
		expect(wrapper.emitted('select')).toBeUndefined()
	})

	it('Space on a focusable row does not scroll the page', () => {
		const wrapper = mountHooked()
		const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
		wrapper.findAll('.cn-tree-node__row')[1].element.dispatchEvent(event)
		expect(event.defaultPrevented).toBe(true)
	})

	it('string labels still apply to every row', () => {
		const wrapper = mountHooked({ expandLabel: 'Open', collapseLabel: 'Close', toggleAttrs: null, rowAttrs: null, focusableRows: false })
		expect(wrapper.find('.cn-tree-node__toggle').attributes('aria-label')).toBe('Open')
		expect(wrapper.find('.cn-tree-node__row').attributes('tabindex')).toBeUndefined()
	})
})

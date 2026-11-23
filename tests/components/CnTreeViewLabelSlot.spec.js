/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnTreeView from '../../src/components/CnTreeView/CnTreeView.vue'

const nodes = [
	{ id: 1, label: 'Root', children: [{ id: 2, label: 'Child', children: [{ id: 3, label: 'Leaf' }] }] },
	{ id: 4, label: 'Other' },
]

/**
 * A label slot that shows its whole scope.
 *
 * @param {object} scope The slot scope.
 * @return {object} A vnode.
 */
function label({ node, depth, expanded }) {
	return h('span', {
		class: 'custom',
		'data-testid': `row-${node.id}`,
	}, `${node.label}|${depth}|${expanded}`)
}

describe('CnTreeView #label slot', () => {
	it('renders the slot inside the label of every row, at every depth', () => {
		const wrapper = mount(CnTreeView, {
			propsData: { nodes, expandedIds: [1, 2] },
			slots: { label },
		})
		const rows = wrapper.findAll('.cn-tree-node__label')
		expect(rows.map((row) => row.text())).toEqual(['Root|0|true', 'Child|1|true', 'Leaf|2|false', 'Other|0|false'])
		expect(wrapper.find('.cn-tree-node__label [data-testid="row-3"]').exists()).toBe(true)
	})

	it('keeps the expand button, actions slot and selection beside a custom label', async () => {
		const wrapper = mount(CnTreeView, {
			propsData: { nodes },
			slots: { label, actions: ({ node }) => h('button', { class: 'act' }, node.label) },
		})
		expect(wrapper.findAll('.act')).toHaveLength(2)
		await wrapper.find('.cn-tree-node__toggle').trigger('click')
		expect(wrapper.emitted('update:expanded-ids')[0][0]).toEqual([1])
		await wrapper.find('[data-testid="row-4"]').trigger('click')
		expect(wrapper.emitted('select')[0][0]).toEqual(nodes[1])
	})

	it('falls back to the label key without the slot', () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes, labelKey: 'label', expandedIds: [1] } })
		expect(wrapper.findAll('.cn-tree-node__label').map((row) => row.text())).toEqual(['Root', 'Child', 'Other'])
	})
})

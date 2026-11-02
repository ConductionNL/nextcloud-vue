/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnTreeView from '../../src/components/CnTreeView/CnTreeView.vue'

const nodes = [
	{ id: 1, label: 'Root', icon: '📁', children: [{ id: 2, label: 'Child', badge: 3, children: [{ id: 3, label: 'Leaf' }] }] },
	{ id: 4, label: 'Other' },
]

/**
 * The tree's markup without Vue's scoped-style attributes and authored
 * template comments (the library build compiles with `comments: false`).
 *
 * @param {object} wrapper The mounted tree.
 * @return {string} The normalised HTML.
 */
function shape(wrapper) {
	return wrapper.html()
		.replace(/ data-v-[a-z0-9]+=""/g, '')
		.replace(/<!--(?!v-if-->)[\s\S]*?-->/g, '')
}

// The markup a tree draws without any of the per-node hooks: the render must
// stay the same for every consumer that does not pass them.
describe('CnTreeView default render', () => {
	const states = {
		empty: { nodes: [] },
		collapsed: { nodes, title: 'Pages', description: 'All pages' },
		'expanded and selected': { nodes, expandedIds: [1, 2], selectedId: 3 },
		'custom keys and labels': {
			nodes: [{ key: 'a', name: 'A', kids: [{ key: 'b', name: 'B' }] }],
			idKey: 'key',
			labelKey: 'name',
			childrenKey: 'kids',
			expandedIds: ['a'],
			expandLabel: 'Open',
			collapseLabel: 'Close',
			indent: 24,
		},
	}
	for (const [name, propsData] of Object.entries(states)) {
		it(`draws the ${name} state as before`, () => {
			expect(shape(mount(CnTreeView, { propsData }))).toMatchSnapshot()
		})
	}

	it('draws the actions and label slots as before', () => {
		const wrapper = mount(CnTreeView, {
			propsData: { nodes, expandedIds: [1] },
			slots: {
				actions: ({ node }) => h('button', { class: 'act' }, node.label),
				label: ({ node, depth, expanded }) => h('em', `${node.label}|${depth}|${expanded}`),
			},
		})
		expect(shape(wrapper)).toMatchSnapshot()
	})

	it('draws a focused focusable row with tabindex and a focus ring', () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes, expandedIds: [1], focusableRows: true }, attachTo: document.body })
		const row = wrapper.findAll('.cn-tree-node__row')[1]
		row.element.focus()
		expect(document.activeElement).toBe(row.element)
		expect(shape(wrapper)).toMatchSnapshot()
		wrapper.unmount()
	})

	it('styles the focus ring of a focusable row with the theme focus token', () => {
		const source = readFileSync(join(__dirname, '../../src/components/CnTreeView/CnTreeNode.vue'), 'utf8')
		const rule = source.match(/\.cn-tree-node__row\[tabindex\]:focus-visible \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('outline: 2px solid var(--color-primary-element)')
	})

	it('a row has no tabindex and ignores Enter without the opt-in', async () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes } })
		const row = wrapper.find('.cn-tree-node__row')
		expect(row.attributes('tabindex')).toBeUndefined()
		await row.trigger('keydown', { key: 'Enter' })
		expect(wrapper.emitted('select')).toBeUndefined()
	})
})

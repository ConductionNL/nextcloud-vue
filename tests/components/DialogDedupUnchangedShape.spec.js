/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnConfirmDialog, CnMassDeleteDialog and CnTreeView gain additive props and
 * slots for the app dialog dedup. A consumer that passes none of them must get
 * the same markup as before. This suite pins today's default render of every
 * state of those three components.
 *
 * The snapshots in `__snapshots__/DialogDedupUnchangedShape.spec.js.snap` were
 * recorded on the commit BEFORE the new props and slots existed. Scoped-style
 * attributes (`data-v-*`) are stripped: their hash follows the file path, not
 * the markup. Authored template comments are stripped too: the library build
 * compiles with `comments: false` (rollup.config.js), so they never reach a
 * consumer. Runtime placeholders such as `<!--v-if-->` stay.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnMassDeleteDialog from '../../src/components/CnMassDeleteDialog/CnMassDeleteDialog.vue'
import CnTreeView from '../../src/components/CnTreeView/CnTreeView.vue'
import CnConfirmDialog from '../../src/dialogs/CnConfirmDialog.vue'

/**
 * The rendered markup without scoped-style attributes and authored comments.
 *
 * @param {object} wrapper A mounted wrapper.
 * @return {string} Normalised HTML.
 */
function markup(wrapper) {
	return wrapper.html()
		.replace(/ data-v-[0-9a-f]+(="")?/g, '')
		.replace(/<!--\s[\s\S]*?-->/g, '')
}

const looks = ['nextcloud', 'board']

describe('CnConfirmDialog default render', () => {
	for (const look of looks) {
		it(`confirm phase, defaults (${look})`, () => {
			const wrapper = mount(CnConfirmDialog, { propsData: { look } })
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`confirm phase, destructive with icon and labels (${look})`, () => {
			const wrapper = mount(CnConfirmDialog, {
				propsData: {
					look,
					dialogTitle: 'Release lock',
					message: 'Release the lock on this dashboard?',
					variant: 'error',
					confirmIcon: 'LockOpenVariant',
					confirmLabel: 'Release',
					cancelLabel: 'Keep',
				},
			})
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`confirm phase, typed confirm value (${look})`, () => {
			const wrapper = mount(CnConfirmDialog, { propsData: { look, confirmValue: 'main' } })
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`loading phase (${look})`, async () => {
			const wrapper = mount(CnConfirmDialog, { propsData: { look } })
			const cancel = wrapper.findAll('.stub.NcButton').at(-2)
			expect(cancel.attributes('disabled')).toBeUndefined()
			await wrapper.find('[data-testid="cn-confirm-dialog-confirm"]').trigger('click')
			expect(cancel.text()).toBe('Cancel')
			expect(cancel.attributes('disabled')).toBeDefined()
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`result phase, success (${look})`, async () => {
			jest.useFakeTimers()
			const wrapper = mount(CnConfirmDialog, { propsData: { look, successText: 'Released.' } })
			wrapper.vm.setResult({ success: true })
			await wrapper.vm.$nextTick()
			expect(markup(wrapper)).toMatchSnapshot()
			jest.useRealTimers()
		})

		it(`result phase, error (${look})`, async () => {
			const wrapper = mount(CnConfirmDialog, { propsData: { look } })
			wrapper.vm.setResult({ error: 'It failed' })
			await wrapper.vm.$nextTick()
			expect(markup(wrapper)).toMatchSnapshot()
		})
	}
})

const items = [
	{ id: 1, title: 'Report A' },
	{ id: 2, name: 'Report B' },
	{ id: 3 },
]

describe('CnMassDeleteDialog default render', () => {
	for (const look of looks) {
		it(`review phase, defaults (${look})`, () => {
			const wrapper = mount(CnMassDeleteDialog, { propsData: { look, items } })
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`review phase, custom labels and formatter (${look})`, () => {
			const wrapper = mount(CnMassDeleteDialog, {
				propsData: {
					look,
					items,
					nameFormatter: (item) => `#${item.id}`,
					dialogTitle: 'Delete reports',
					warningText: 'These reports go.',
					confirmLabel: 'Delete reports',
					irreversible: false,
				},
			})
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`review phase, typed confirm value (${look})`, () => {
			const wrapper = mount(CnMassDeleteDialog, { propsData: { look, items, confirmValue: 'delete' } })
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`review phase, every item removed (${look})`, async () => {
			const wrapper = mount(CnMassDeleteDialog, { propsData: { look, items: [items[0]] } })
			await wrapper.find('.cn-mass-delete__item .stub.NcButton').trigger('click')
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`loading phase (${look})`, async () => {
			const wrapper = mount(CnMassDeleteDialog, { propsData: { look, items } })
			const cancel = wrapper.findAll('.stub.NcButton').at(-2)
			expect(cancel.attributes('disabled')).toBeUndefined()
			await wrapper.find('[data-testid="cn-mass-delete-dialog-confirm"]').trigger('click')
			expect(wrapper.emitted('confirm')).toEqual([[[1, 2, 3]]])
			expect(cancel.text()).toBe('Cancel')
			expect(cancel.attributes('disabled')).toBeDefined()
			expect(markup(wrapper)).toMatchSnapshot()
		})

		it(`result phase, success (${look})`, async () => {
			jest.useFakeTimers()
			const wrapper = mount(CnMassDeleteDialog, { propsData: { look, items } })
			wrapper.vm.setResult({ success: true })
			await wrapper.vm.$nextTick()
			expect(markup(wrapper)).toMatchSnapshot()
			jest.useRealTimers()
		})

		it(`result phase, error (${look})`, async () => {
			const wrapper = mount(CnMassDeleteDialog, { propsData: { look, items } })
			wrapper.vm.setResult({ error: 'It failed' })
			await wrapper.vm.$nextTick()
			expect(markup(wrapper)).toMatchSnapshot()
		})
	}
})

const tree = [
	{
		id: 1,
		label: 'Root A',
		icon: '📁',
		badge: 2,
		children: [
			{ id: 11, label: 'Child A1', children: [{ id: 111, label: 'Leaf A1a' }] },
			{ id: 12, label: 'Child A2', badge: 0 },
		],
	},
	{ id: 2, label: 'Root B' },
]

describe('CnTreeView default render', () => {
	it('empty', () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: [] } })
		expect(markup(wrapper)).toMatchSnapshot()
	})

	it('collapsed with title and description', () => {
		const wrapper = mount(CnTreeView, {
			propsData: { nodes: tree, title: 'Pages', description: 'All pages' },
		})
		expect(markup(wrapper)).toMatchSnapshot()
	})

	it('expanded and selected, custom keys and indent', () => {
		const nodes = [{ key: 'a', name: 'Alpha', kids: [{ key: 'b', name: 'Beta' }] }]
		const wrapper = mount(CnTreeView, {
			propsData: {
				nodes,
				idKey: 'key',
				labelKey: 'name',
				childrenKey: 'kids',
				indent: 24,
				expandedIds: ['a'],
				selectedId: 'b',
			},
		})
		expect(markup(wrapper)).toMatchSnapshot()
	})

	it('expanded with the actions slot', () => {
		const wrapper = mount(CnTreeView, {
			propsData: { nodes: tree, expandedIds: [1, 11] },
			slots: {
				actions: ({ node, depth }) => h('span', { class: 'act' }, `${node.label}:${depth}`),
			},
		})
		expect(markup(wrapper)).toMatchSnapshot()
	})
})

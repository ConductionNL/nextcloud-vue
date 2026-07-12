/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditPagesModal — the modal now renders the compact CnPageTreeNode
 * and only owns top-level page creation + pages normalisation. @nextcloud/vue is
 * auto-stubbed via tests/__mocks__/nextcloud-vue.js.
 */
import { mount } from '@vue/test-utils'
import CnEditPagesModal from '../../src/dialogs/CnEditPagesModal.vue'

const CnPageTreeNodeStub = { name: 'CnPageTreeNode', props: ['list', 'parentId', 'depth', 'maxDepth'], template: '<div class="page-tree-stub" />' }

function mountModal(working, provide = {}) {
	return mount(CnEditPagesModal, { propsData: { working }, provide, stubs: { CnPageTreeNode: CnPageTreeNodeStub } })
}

describe('CnEditPagesModal', () => {
	it('normalises a missing pages array on the working manifest', () => {
		const working = {}
		const wrapper = mountModal(working)
		expect(wrapper.vm.pages).toEqual([])
		expect(Array.isArray(working.pages)).toBe(true)
	})

	it('add appends a blank top-level page with a unique stable id', () => {
		const working = { pages: [{ id: 'page-1', route: '/a', type: 'index', title: 'A' }] }
		const wrapper = mountModal(working)
		wrapper.vm.add()
		expect(working.pages.length).toBe(2)
		const added = working.pages[1]
		expect(added.id).toBe('page-2')
		expect(added.route).toBe('/page-2')
		expect(added.type).toBe('custom')
		expect(added.parent).toBeUndefined()
	})

	it('passes the flat pages list to the tree node', () => {
		const working = { pages: [{ id: 'a' }] }
		const wrapper = mountModal(working)
		const node = wrapper.findComponent(CnPageTreeNodeStub)
		expect(node.props('list')).toBe(working.pages)
		expect(node.props('maxDepth')).toBe(1)
	})

	// "Done = save": the primary button persists via the injected editor before
	// closing, so an in-app edit isn't silently left unsaved (manifestModalDoneMixin).
	it('Done persists via the injected editor, then closes', async () => {
		let resolveSave
		const save = jest.fn(() => new Promise((resolve) => { resolveSave = resolve }))
		const wrapper = mountModal({ pages: [] }, { cnManifestEditor: { save } })

		const done = wrapper.vm.onDone()
		expect(save).toHaveBeenCalledTimes(1)
		// saving flag is set while the persist is in flight; no close yet
		expect(wrapper.vm.saving).toBe(true)
		expect(wrapper.emitted('close')).toBeFalsy()

		resolveSave()
		await done
		expect(wrapper.vm.saving).toBe(false)
		expect(wrapper.emitted('close')).toHaveLength(1)
	})

	it('Done still closes even if the editor save rejects (edit stays in working copy)', async () => {
		const save = jest.fn(() => Promise.reject(new Error('boom')))
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const wrapper = mountModal({ pages: [] }, { cnManifestEditor: { save } })
		await wrapper.vm.onDone()
		expect(wrapper.vm.saving).toBe(false)
		expect(wrapper.emitted('close')).toHaveLength(1)
		errSpy.mockRestore()
	})

	it('Done degrades to a plain close when no editor is injected', async () => {
		const wrapper = mountModal({ pages: [] })
		await wrapper.vm.onDone()
		expect(wrapper.emitted('close')).toHaveLength(1)
	})
})

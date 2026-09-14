/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Picking WHO a step asks.
 *
 * 🔴 THE LOAD-BEARING TEST IS THE ONE ABOUT A REFERENCE THE AUTHOR CANNOT SEE.
 * The autocomplete endpoint answers with what THIS author may look up, and a
 * delegation is routinely to somebody they cannot. If an unmatched reference
 * rendered as nothing, opening a step and pressing Done would silently clear
 * it — a save that deletes the assignment while appearing to change nothing.
 *
 * The second is that the picker does not decide what is VALID. A position, a
 * function, a case role are legal references this editor cannot search, and the
 * server's resolver registry is what says so.
 */

import { mount } from '@vue/test-utils'
import CnFlowNodeEditModal from '../../src/dialogs/CnFlowNodeEditModal.vue'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

let mockRows = []

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { ocs: { data: mockRows } } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * Mount the editor over a step whose config is given.
 *
 * @param {object} config The step's stored configuration.
 * @param {Array<object>} configForm What the engine declares about its fields.
 * @return {Promise<object>} The wrapper.
 */
async function mountEditor(config, configForm = []) {
	// 🔑 THE DIALOG READS ITS NODE FROM THE STORE, NOT FROM PROPS.
	// `tests/setup.js` installs a fresh pinia per test and into mounted
	// components, so calling useFlowStore() here resolves the SAME instance
	// the dialog will — which is what lets the node be seeded before `data()`
	// snapshots it into the draft. Passing it as a prop silently edits an
	// empty node, and every assertion reads back nothing.
	const store = useFlowStore()
	store.nodeCatalog = [
		{ id: 'openregister.user-task', configForm, configKeys: Object.keys(config) },
	]
	store.flow = {
		name: 'x',
		nodes: [{ id: 'n1', type: 'openregister.user-task', name: 'Ask', config }],
		edges: [],
	}
	store.editingNodeId = 'n1'

	const wrapper = mount(CnFlowNodeEditModal, {
		global: {
			stubs: {
				NcDialog: { template: '<div class="dialog"><slot /><slot name="actions" /></div>' },
				NcSelect: {
					props: ['modelValue', 'options', 'multiple'],
					template: '<div class="nc-select"></div>',
				},
				NcTextField: true,
				NcTextArea: true,
				NcCheckboxRadioSwitch: true,
				NcButton: true,
			},
			mocks: { t: (app, s, vars) => (vars ? s.replace('{uid}', vars.uid) : s) },
		},
	})

	await wrapper.vm.$nextTick()
	await Promise.resolve()
	await wrapper.vm.$nextTick()

	return wrapper
}

describe('the principal picker', () => {
	beforeEach(() => {
		mockRows = [
			{ id: 'alice', label: 'Alice', source: 'users' },
			{ id: 'bezwaar', label: 'Bezwaarcommissie', source: 'groups' },
		]
		jest.clearAllMocks()
	})

	it('uses the principal widget for the fields that name a performer', async () => {
		const wrapper = await mountEditor({ assignee: 'alice', candidateGroups: [] })

		expect(wrapper.vm.widgetFor('assignee')).toBe('principal')
		expect(wrapper.vm.widgetFor('candidateGroups')).toBe('principal')
	})

	it('🔴 keeps runAs on the single-user picker', async () => {
		const wrapper = await mountEditor({ runAs: 'admin' })

		// `runAs` is not a performer: it names the identity the step RUNS AS,
		// the server decides whether this author may delegate to it, and a
		// group cannot be one.
		expect(wrapper.vm.widgetFor('runAs')).toBe('user')
	})

	it('reads a bare entry under the type its FIELD NAME implies', async () => {
		const wrapper = await mountEditor({
			assignee: 'alice',
			candidateGroups: ['bezwaar'],
		})

		// A `candidateGroups` entry must not appear as a person: that is the
		// same widening the typed reference exists to prevent, in the editor.
		expect(wrapper.vm.storedPrincipals('assignee')).toEqual([
			{ type: 'user', id: 'alice' },
		])
		expect(wrapper.vm.storedPrincipals('candidateGroups')).toEqual([
			{ type: 'group', id: 'bezwaar' },
		])
	})

	it('reads a typed reference in either spelling', async () => {
		const wrapper = await mountEditor({
			assignee: { type: 'position', id: 'chair' },
			candidates: [{ type: 'group', value: 'bezwaar' }],
		})

		expect(wrapper.vm.storedPrincipals('assignee')).toEqual([
			{ type: 'position', id: 'chair' },
		])
		expect(wrapper.vm.storedPrincipals('candidates')).toEqual([
			{ type: 'group', id: 'bezwaar' },
		])
	})

	it('🔴 SHOWS a stored reference the lookup cannot find', async () => {
		// The author may not look this person up, or the type is one this
		// editor cannot search at all.
		const wrapper = await mountEditor({
			assignee: { type: 'position', id: 'chair' },
		})

		const shown = wrapper.vm.principalOptions('assignee')

		// If it rendered as nothing, opening the step and pressing Done would
		// silently clear the assignment.
		expect(shown).toHaveLength(1)
		expect(shown[0].type).toBe('position')
		expect(shown[0].value).toBe('chair')
	})

	it('writes back a TYPED reference, never a bare string', async () => {
		const wrapper = await mountEditor({ assignee: '' })

		wrapper.vm.setPrincipals('assignee', [
			{ id: 'group:bezwaar', type: 'group', value: 'bezwaar' },
		])

		// The whole point: the document now records which kind of thing was
		// meant, so nothing has to guess later.
		expect(wrapper.vm.draft.config.assignee).toEqual({
			type: 'group',
			id: 'bezwaar',
		})
	})

	it('keeps a single-valued field single, and a list a list', async () => {
		const wrapper = await mountEditor({ assignee: '', candidates: [] })

		wrapper.vm.setPrincipals('assignee', [
			{ id: 'user:alice', type: 'user', value: 'alice' },
			{ id: 'user:bob', type: 'user', value: 'bob' },
		])
		wrapper.vm.setPrincipals('candidates', [
			{ id: 'user:alice', type: 'user', value: 'alice' },
			{ id: 'group:bezwaar', type: 'group', value: 'bezwaar' },
		])

		// `assignee` is ONE performer; turning it into a list would change what
		// the engine reads.
		expect(Array.isArray(wrapper.vm.draft.config.assignee)).toBe(false)
		expect(wrapper.vm.draft.config.assignee).toEqual({ type: 'user', id: 'alice' })
		expect(wrapper.vm.draft.config.candidates).toHaveLength(2)
	})

	it('offers groups as well as people', async () => {
		const wrapper = await mountEditor({ assignee: '' })
		await wrapper.vm.searchPrincipals('be')
		await wrapper.vm.$nextTick()

		const types = wrapper.vm.principalChoices.map((o) => o.type)
		expect(types).toContain('user')
		expect(types).toContain('group')
	})

	it('a failed lookup does not clear what is already picked', async () => {
		const wrapper = await mountEditor({
			assignee: { type: 'group', id: 'bezwaar' },
		})

		mockRows = null // the endpoint answers with nothing usable
		await wrapper.vm.searchPrincipals('anything')
		await wrapper.vm.$nextTick()

		// The selected options are synthesised from the DOCUMENT, not from the
		// lookup, so an unreachable endpoint cannot empty the field.
		expect(wrapper.vm.principalOptions('assignee')).toHaveLength(1)
		expect(wrapper.vm.draft.config.assignee).toEqual({ type: 'group', id: 'bezwaar' })
	})
})

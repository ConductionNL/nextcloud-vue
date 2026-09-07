/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What publishing will be called, said before it happens.
 *
 * 🔴 THE DERIVATION WAS ALREADY RIGHT AND ENTIRELY INVISIBLE. An author found
 * out that a change was major by publishing it, and the first surprising major
 * is the one that teaches them to ignore the number.
 *
 * The claim these tests defend is not "a dialog appears". It is that the dialog
 * NAMES what the publish takes away, that the override only ever raises the
 * verdict, and that a preview which fails to load still leaves the author able
 * to publish.
 */

import { mount } from '@vue/test-utils'
import { useFlowStore } from '../../src/composables/useFlowStore.js'
import CnFlowPublishDialog from '../../src/dialogs/CnFlowPublishDialog.vue'

const preview = {
	verdict: 'major',
	next: '2.0.0',
	current: '1.4.0',
	removed: 'This removes steps middle.',
	removedNodes: ['middle'],
	removedEdges: ['start->middle'],
	removedKeys: ['done.note'],
	first: false,
}

let mockGetResponse = { data: preview }
let mockGetRejects = false

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => (mockGetRejects
			? Promise.reject(new Error('no such route'))
			: Promise.resolve(mockGetResponse))),
		post: jest.fn(() => Promise.resolve({ data: { version: 5, semver: '2.0.0' } })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * Mount the dialog over the store THE COMPONENT holds.
 *
 * `tests/setup.js` installs a global pinia, so a store made out here would be a
 * different instance and every assertion would read the empty default.
 *
 * @param {object} storeOverrides Fields to force onto the store after mount.
 * @return {Promise<object>} The wrapper.
 */
async function mountDialog(storeOverrides = {}) {
	// 🔴 THE FLOW GOES IN BEFORE THE MOUNT. `mounted()` fetches the preview,
	// and a store with no `flow.id` at that moment answers null without ever
	// calling the route — so setting the flow afterwards tests an empty dialog
	// and says nothing about the preview at all.
	//
	// `tests/setup.js` installs ONE global pinia, so the store also survives
	// between tests: the fields this dialog reads are cleared here rather than
	// inherited from whichever test ran last.
	const store = useFlowStore()
	store.flow = { id: 'f-1', name: 'A flow', nodes: [], edges: [] }
	store.publishPreview = null
	store.previewingPublish = false
	store.versionBumpRefusal = null
	Object.assign(store, storeOverrides)

	const wrapper = mount(CnFlowPublishDialog, {
		global: {
			stubs: {
				NcDialog: { template: '<div class="dialog"><slot /><slot name="actions" /></div>' },
				NcButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
				NcCheckboxRadioSwitch: {
					props: ['modelValue'],
					template: '<label><input type="checkbox" :checked="modelValue"'
						+ ' @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>',
				},
				NcLoadingIcon: true,
			},
			mocks: { t: (app, s, vars) => (vars
				? Object.entries(vars).reduce((out, [k, v]) => out.replace(`{${k}}`, v), s)
				: s) },
		},
	})

	// The preview is fetched in `mounted()`; let its promise settle.
	await wrapper.vm.$nextTick()
	await Promise.resolve()
	await Promise.resolve()
	await wrapper.vm.$nextTick()

	return wrapper
}

describe('CnFlowPublishDialog', () => {
	beforeEach(() => {
		mockGetResponse = { data: preview }
		mockGetRejects = false
		jest.clearAllMocks()
	})

	afterEach(() => {
		// The store is global, so a spy left on `publish` would still be there
		// for the next test — passing for the wrong reason.
		jest.restoreAllMocks()
	})

	it('says which version this becomes, from the one it is now', async () => {
		const wrapper = await mountDialog()

		const headline = wrapper.find('[data-testid="flow-publish-next"]').text()
		expect(headline).toContain('1.4.0')
		expect(headline).toContain('2.0.0')
	})

	it('NAMES what the publish takes away, rather than counting it', async () => {
		const wrapper = await mountDialog()

		const removals = wrapper.find('[data-testid="flow-publish-removals"]').text()
		// A step, a connection and a setting are three different losses to
		// whoever depends on them, and each is named.
		expect(removals).toContain('middle')
		expect(removals).toContain('start->middle')
		expect(removals).toContain('done.note')
	})

	it('calls a removal breaking, in words rather than in a version number', async () => {
		const wrapper = await mountDialog()

		expect(wrapper.find('[data-testid="flow-publish-verdict"]').text())
			.toContain('breaking change')
	})

	it('offers the raise-to-major override only when the diff found no removal', async () => {
		const major = await mountDialog()
		expect(major.find('[data-testid="flow-publish-force-major"]').exists()).toBe(false)

		mockGetResponse = {
			data: {
				verdict: 'minor',
				next: '1.5.0',
				current: '1.4.0',
				removed: '',
				removedNodes: [],
				removedEdges: [],
				removedKeys: [],
				first: false,
			},
		}
		const minor = await mountDialog()
		expect(minor.find('[data-testid="flow-publish-force-major"]').exists()).toBe(true)
		expect(minor.find('[data-testid="flow-publish-removals"]').exists()).toBe(false)
	})

	it('sends the bump only when the author actually ticked it', async () => {
		mockGetResponse = {
			data: {
				verdict: 'minor',
				next: '1.5.0',
				current: '1.4.0',
				removed: '',
				removedNodes: [],
				removedEdges: [],
				removedKeys: [],
				first: false,
			},
		}

		const wrapper = await mountDialog()
		const publish = jest.spyOn(wrapper.vm.store, 'publish').mockResolvedValue({ version: 5 })

		await wrapper.find('[data-testid="flow-publish-confirm"]').trigger('click')
		// Unticked sends NOTHING. Sending 'minor' would be an assertion the
		// author never made, and one the server is right to refuse over a
		// removal.
		expect(publish).toHaveBeenCalledWith(null)

		await wrapper.find('[data-testid="flow-publish-force-major"] input').setValue(true)
		await wrapper.find('[data-testid="flow-publish-confirm"]').trigger('click')
		expect(publish).toHaveBeenLastCalledWith('major')
	})

	it('still offers to publish when the preview could not be fetched', async () => {
		mockGetRejects = true

		const wrapper = await mountDialog()

		// A courtesy, not a gate: an instance whose route is older than this
		// build must not lose the ability to publish.
		expect(wrapper.find('[data-testid="flow-publish-unknown"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="flow-publish-confirm"]').attributes('disabled'))
			.toBeUndefined()
	})

	it('stays open on a refusal, because the refusal is written in it', async () => {
		const wrapper = await mountDialog()
		jest.spyOn(wrapper.vm.store, 'publish').mockImplementation(async () => {
			wrapper.vm.store.versionBumpRefusal = 'This publish cannot be minor. This removes steps middle.'
			return null
		})

		await wrapper.find('[data-testid="flow-publish-confirm"]').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.emitted('close')).toBeFalsy()
		expect(wrapper.find('[data-testid="flow-publish-refusal"]').text()).toContain('middle')
	})

	it('closes once the publish succeeds', async () => {
		const wrapper = await mountDialog()
		jest.spyOn(wrapper.vm.store, 'publish').mockResolvedValue({ version: 5, semver: '2.0.0' })

		await wrapper.find('[data-testid="flow-publish-confirm"]').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.emitted('published')).toBeTruthy()
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('says a first publish is a first publish, not a minor over nothing', async () => {
		mockGetResponse = {
			data: {
				verdict: 'minor',
				next: '1.0.0',
				current: null,
				removed: '',
				removedNodes: [],
				removedEdges: [],
				removedKeys: [],
				first: true,
			},
		}

		const wrapper = await mountDialog()

		expect(wrapper.find('[data-testid="flow-publish-next"]').text()).toContain('first version of this flow')
		expect(wrapper.find('[data-testid="flow-publish-next"]').text()).toContain('1.0.0')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * `CnDetailPage`'s `#form-dialog` slot — the seam that lets an app transform
 * the schema driving the built-in create/edit form.
 *
 * Why it had to exist. `CnIndexPage` has exposed a `form-dialog` slot for a
 * while, so an app can replace that dialog and adjust the form it renders.
 * `CnDetailPage` exposed no such seam: its create and edit dialogs were
 * hard-wired children, and the ONLY schema they could ever render was the one
 * the store returned.
 *
 * Measured consequence (decidiq#1109): decidiq moved its decision types from a
 * schema `enum` to stored configuration served from
 * `GET /apps/decidiq/api/v1/decision-types` (decidiq#1099), which left the
 * schema enum deliberately EMPTY. On index pages it spliced the vocabulary
 * back in through the `form-dialog` slot. On detail pages there was nowhere to
 * splice, so the user was shown an empty required picker — a form that cannot
 * be completed.
 *
 * The slot is deliberately the SAME NAME and the SAME SCOPE as CnIndexPage's,
 * so one replacement component serves both pages.
 *
 * @spec openspec/changes/cn-detail-form-dialog-slot/specs/detail-page-form-dialog-slot/spec.md
 */

import { h } from 'vue'
import { mount, shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const mockPost = jest.fn(async () => ({ status: 200, data: { '@self': { id: 'new-1' } } }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: () => Promise.resolve({ status: 200, data: {} }),
		post: (...a) => mockPost(...a),
	},
}))

// The decidiq shape: `decisionType` carries an EMPTY enum, because the real
// vocabulary is stored configuration the app fetches at runtime. A form
// rendered straight off this schema shows a required picker with no options.
const SCHEMA = {
	title: 'Decision',
	properties: {
		title: { type: 'string' },
		decisionType: { type: 'string', enum: [] },
	},
}

const RECORD = { id: 'd-1', title: 'Vergunning', '@self': { id: 'd-1' } }

/**
 * Stub object store holding the schema and (optionally) the record.
 *
 * @param {object} extras Overrides merged into the store.
 * @return {object} The stub store.
 */
function makeStore(extras = {}) {
	return {
		schemas: { 'decidiq-decision': SCHEMA },
		objects: { 'decidiq-decision': { 'd-1': RECORD } },
		objectTypeRegistry: { 'decidiq-decision': {} },
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
		saveObject: jest.fn(async () => ({ ...RECORD, title: 'Gewijzigd' })),
		getError: jest.fn(() => null),
		...extras,
	}
}

const ROUTER_MOCKS = {
	$route: { params: {}, query: {} },
	$router: { push: jest.fn(() => Promise.resolve()), back: jest.fn() },
}

/**
 * Stand-in for a manifest-declared replacement dialog, shaped exactly like the
 * openconnector editors CnIndexPage's slot had to accommodate: it takes the
 * whole slot scope as PROPS and refuses to enable Save unless it was handed a
 * callable save path.
 */
const ManifestEditorStub = {
	name: 'ManifestEditorStub',
	props: {
		show: { type: Boolean, default: false },
		item: { type: Object, default: null },
		schema: { type: Object, default: null },
		confirm: { type: Function, default: null },
		close: { type: Function, default: null },
	},
	data() {
		return { result: null }
	},
	computed: {
		canSave() {
			return typeof this.confirm === 'function'
		},
		// The whole point of the seam: read the enum the host handed us, after
		// the app has spliced its runtime vocabulary in.
		options() {
			return this.schema?.properties?.decisionType?.enum ?? []
		},
	},
	methods: {
		async save() {
			this.result = await this.confirm({ title: 'Vergunning', decisionType: 'besluit' })
		},
	},
	template: `
		<div v-if="show" class="manifest-editor">
			<span
				v-for="opt in options"
				:key="opt"
				class="editor-option">{{ opt }}</span>
			<button class="editor-save" :disabled="!canSave" @click="save">Save</button>
			<button class="editor-close" @click="close">Cancel</button>
		</div>
	`,
}

/**
 * Mount a detail page, optionally with a `#form-dialog` replacement.
 *
 * @param {object} propsData Extra props.
 * @param {object} options   `{ slots, route }`.
 * @return {object} The wrapper.
 */
function mountDetail(propsData = {}, options = {}) {
	return mount(CnDetailPage, {
		propsData: {
			title: 'Decision',
			register: 'decidiq',
			schema: 'decision',
			objectId: 'd-1',
			objectStore: makeStore(),
			...propsData,
		},
		mocks: { ...ROUTER_MOCKS, ...(options.route ? { $route: options.route } : {}) },
		stubs: {
			CnFormDialog: {
				name: 'CnFormDialog',
				props: ['schema', 'item'],
				template: '<div class="cn-form-dialog-stub" />',
				methods: { setResult() {} },
			},
		},
		slots: options.slots,
	})
}

describe('CnDetailPage #form-dialog — the default path is unchanged', () => {
	it('renders the built-in edit dialog, not an empty slot, when no slot is passed', async () => {
		const wrapper = mountDetail({ showEditAction: true })
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		// The fallback content of a `<slot>` renders when nothing overrides it.
		// If wrapping the dialogs in a slot had swallowed them, this is the
		// assertion that would go red.
		expect(wrapper.find('.cn-form-dialog-stub').exists()).toBe(true)
	})

	it('renders the built-in create dialog when no slot is passed', () => {
		const wrapper = mountDetail({ objectId: '' })
		expect(wrapper.vm.isCreateMode).toBe(true)
		expect(wrapper.find('.cn-form-dialog-stub').exists()).toBe(true)
	})

	it('still hands the built-in dialog the STORE schema, untransformed', async () => {
		const wrapper = mountDetail({ showEditAction: true })
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
		expect(dialog.props('schema')).toEqual(SCHEMA)
		expect(dialog.props('schema').properties.decisionType.enum).toEqual([])
	})

	it('keeps the built-in dialog closed until the record has loaded', async () => {
		// The `editFormAwaitingRecord` guard (#850). A dialog opened before the
		// fetch lands shows a blank form whose Save would PUT those blanks over
		// the record.
		const wrapper = mountDetail({
			showEditAction: true,
			objectStore: makeStore({ objects: { 'decidiq-decision': {} } }),
		})
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.editFormAwaitingRecord).toBe(true)
		expect(wrapper.vm.formDialogVisible).toBe(false)
		expect(wrapper.find('.cn-form-dialog-stub').exists()).toBe(false)
	})
})

describe('CnDetailPage #form-dialog — the override receives the index-page scope', () => {
	/**
	 * Mount with the replacement bound exactly the way CnPageRenderer mounts a
	 * manifest slot: `<component :is=… v-bind="slotProps" />` — the whole scope
	 * spread as PROPS, with no listeners. A listener is unreachable from a
	 * manifest even in principle, so testing with one would prove nothing.
	 *
	 * @param {object} propsData Extra props.
	 * @param {Function} transform Optional schema transform.
	 * @return {object} The wrapper.
	 */
	function mountWithSlot(propsData = {}, transform = (s) => s) {
		return mountDetail(propsData, {
			slots: {
				'form-dialog': (slotProps) => h(ManifestEditorStub, {
					...slotProps,
					schema: transform(slotProps.schema),
				}),
			},
		})
	}

	it('binds the same five scope keys CnIndexPage binds', async () => {
		const seen = {}
		const wrapper = mountDetail({ showEditAction: true }, {
			slots: {
				'form-dialog': (slotProps) => {
					Object.assign(seen, slotProps)
					return h('div', { class: 'replacement' })
				},
			},
		})
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		// Exactly the contract documented on CnIndexPage's `form-dialog`.
		expect(Object.keys(seen).sort()).toEqual(['close', 'confirm', 'item', 'schema', 'show'])
		expect(seen.show).toBe(true)
		expect(seen.item).toMatchObject({ id: 'd-1' })
		expect(seen.schema).toEqual(SCHEMA)
		expect(typeof seen.confirm).toBe('function')
		expect(typeof seen.close).toBe('function')
	})

	it('suppresses the built-in dialog when the slot is filled', async () => {
		const wrapper = mountWithSlot({ showEditAction: true })
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.manifest-editor').exists()).toBe(true)
		expect(wrapper.find('.cn-form-dialog-stub').exists()).toBe(false)
	})

	it('leaves the replacement\'s Save button ENABLED (confirm is a prop, not a listener)', async () => {
		const wrapper = mountWithSlot({ showEditAction: true })
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		// Assert on the BUTTON: the openconnector#1150 bug rendered the editor
		// perfectly and only disabled the one control that matters.
		const saveBtn = wrapper.find('button.editor-save')
		expect(saveBtn.exists()).toBe(true)
		expect(saveBtn.element.disabled).toBe(false)
	})

	it('routes the replacement\'s save through the page\'s own persistence path', async () => {
		const store = makeStore()
		const wrapper = mountWithSlot({ showEditAction: true, objectStore: store })
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		await wrapper.find('button.editor-save').trigger('click')
		await new Promise((resolve) => setTimeout(resolve))

		// The same save the built-in dialog performs: through the store, with
		// the id merged in so it PUTs instead of creating a duplicate.
		expect(store.saveObject).toHaveBeenCalledWith('decidiq-decision', {
			title: 'Vergunning',
			decisionType: 'besluit',
			id: 'd-1',
		})
		expect(wrapper.emitted('edited')).toBeTruthy()
	})

	it('resolves `confirm` to a result so the replacement can unlock its own dialog', async () => {
		// CnFormDialog sets `loading` on submit and only `setResult` clears it,
		// with `no-close` bound to `loading`. A replacement holds no ref the
		// host can reach, so without a returned result its modal would stay
		// locked open forever — on success as well as failure.
		const wrapper = mountWithSlot({ showEditAction: true })
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		await wrapper.find('button.editor-save').trigger('click')
		await new Promise((resolve) => setTimeout(resolve))

		const editor = wrapper.findComponent(ManifestEditorStub)
		expect(editor.vm.result).toMatchObject({ success: true })
	})

	it('resolves `confirm` to an ERROR result when the save fails', async () => {
		const store = makeStore({
			saveObject: jest.fn(async () => null),
			getError: jest.fn(() => ({ message: 'Register refused the write' })),
		})
		const wrapper = mountWithSlot({ showEditAction: true, objectStore: store })
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		await wrapper.find('button.editor-save').trigger('click')
		await new Promise((resolve) => setTimeout(resolve))

		const editor = wrapper.findComponent(ManifestEditorStub)
		expect(editor.vm.result).toEqual({ error: 'Register refused the write' })
	})

	it('closes the edit form through the bound `close`', async () => {
		const wrapper = mountWithSlot({ showEditAction: true })
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		await wrapper.find('button.editor-close').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.editFormOpen).toBe(false)
		expect(wrapper.find('.manifest-editor').exists()).toBe(false)
	})

	it('covers create mode through the same slot, with a null item', async () => {
		// One slot, both dialogs — mirroring CnIndexPage, where a null `item`
		// likewise means "create".
		const wrapper = mountWithSlot({ objectId: '' })
		await wrapper.vm.$nextTick()

		const editor = wrapper.findComponent(ManifestEditorStub)
		expect(wrapper.vm.isCreateMode).toBe(true)
		expect(editor.props('show')).toBe(true)
		expect(editor.props('item')).toBe(null)

		await wrapper.find('button.editor-save').trigger('click')
		await new Promise((resolve) => setTimeout(resolve))

		// Create mode POSTs rather than saving through the store.
		expect(mockPost).toHaveBeenCalled()
		expect(wrapper.emitted('created')).toBeTruthy()
	})
})

describe('CnDetailPage #form-dialog — a transform reaches the rendered form', () => {
	/**
	 * The decidiq-shaped use: the app fetched its vocabulary at runtime and
	 * splices it into the schema's empty enum before the form renders.
	 *
	 * @param {object} schema The schema the host handed the slot.
	 * @return {object} A copy carrying the runtime vocabulary.
	 */
	function spliceDecisionTypes(schema) {
		return {
			...schema,
			properties: {
				...schema.properties,
				decisionType: {
					...schema.properties.decisionType,
					enum: ['besluit', 'mandaat'],
				},
			},
		}
	}

	it('renders the transformed enum, where the untransformed one is empty', async () => {
		const wrapper = mountDetail({ showEditAction: true }, {
			slots: {
				'form-dialog': (slotProps) => h(ManifestEditorStub, {
					...slotProps,
					schema: spliceDecisionTypes(slotProps.schema),
				}),
			},
		})
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		// Assert on what actually RENDERED, not on the prop: the defect this
		// seam fixes is a picker the user sees with no options in it.
		const rendered = wrapper.findAll('.editor-option').map((n) => n.text())
		expect(rendered).toEqual(['besluit', 'mandaat'])
	})

	it('NEGATIVE CONTROL: the same form renders no options without the transform', async () => {
		// Without this, the test above would pass just as happily if the
		// component rendered options from somewhere else entirely.
		const wrapper = mountDetail({ showEditAction: true }, {
			slots: {
				'form-dialog': (slotProps) => h(ManifestEditorStub, { ...slotProps }),
			},
		})
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		expect(wrapper.findAll('.editor-option')).toHaveLength(0)
	})

	it('does not mutate the store\'s schema, so other surfaces are unaffected', async () => {
		const wrapper = mountDetail({ showEditAction: true }, {
			slots: {
				'form-dialog': (slotProps) => h(ManifestEditorStub, {
					...slotProps,
					schema: spliceDecisionTypes(slotProps.schema),
				}),
			},
		})
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		expect(SCHEMA.properties.decisionType.enum).toEqual([])
	})
})

describe('CnDetailPage #form-dialog — visibility mirrors the built-in dialog', () => {
	it('reports show=false while nothing is open', () => {
		const wrapper = shallowMount(CnDetailPage, {
			propsData: {
				title: 'Decision',
				register: 'decidiq',
				schema: 'decision',
				objectId: 'd-1',
				objectStore: makeStore(),
			},
			mocks: ROUTER_MOCKS,
		})
		expect(wrapper.vm.formDialogVisible).toBe(false)
	})

	it('reports show=false when there is no schema to build a form from', () => {
		const wrapper = shallowMount(CnDetailPage, {
			propsData: {
				title: 'Decision',
				register: 'decidiq',
				schema: 'decision',
				objectId: 'd-1',
				objectStore: makeStore({ schemas: {} }),
			},
			mocks: ROUTER_MOCKS,
		})
		wrapper.vm.openEditForm()
		expect(wrapper.vm.currentSchema).toBeFalsy()
		expect(wrapper.vm.formDialogVisible).toBe(false)
	})
})

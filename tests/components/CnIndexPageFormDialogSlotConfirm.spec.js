/**
 * Regression: `CnIndexPage`'s `form-dialog` slot must expose the SAVE path.
 *
 * The slot is documented as a REPLACEMENT for the create/edit dialog, but it
 * only ever bound `show` / `item` / `schema` / `close`. The save path
 * (`onFormConfirm` — the method that persists through `createOverride`, the
 * store, or the self-store, refreshes the list and emits `create` / `edit`)
 * was wired as an `@confirm` LISTENER on the default child only.
 *
 * That makes a replacement decorative: it can render and it can close, and it
 * can do nothing with what the user typed.
 *
 * It is unreachable *in principle* through a manifest, which is how the fleet
 * declares these editors. `CnPageRenderer` mounts a manifest slot as:
 *
 *     <component :is="entry.component" v-bind="slotProps" />
 *
 * `v-bind` binds PROPS ONLY — there is no listener to hook and no way to
 * attach one. This spec therefore mounts the replacement exactly that way,
 * rather than with an `@confirm` handler a real manifest could never supply.
 *
 * Measured consequence (openconnector#1150): all three of that app's editors
 * declare `props: ['show','item','schema','confirm','close']` and gate saving
 * on `typeof this.confirm === 'function'`, so their Save/Create button was
 * permanently disabled — "Create button must be enabled in form dialog".
 *
 * @spec openspec/specs/index-page/spec.md
 */
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Source', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Source', properties: {} })),
	getError: jest.fn(() => null),
	saveObject: jest.fn().mockResolvedValue({ id: 'new-1', name: 'my-source' }),
}
jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const { h } = require('vue')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true,
	CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnPageHeader: true,
	CnMassDeleteDialog: true, CnMassCopyDialog: true, CnMassExportDialog: true,
	CnMassImportDialog: true, CnDeleteDialog: true, CnCopyDialog: true,
	CnFormDialog: true, CnAdvancedFormDialog: true, NcLoadingIcon: true,
	NcEmptyContent: true, CnIcon: true,
}

/**
 * Stand-in for a manifest-declared editor, shaped like openconnector's
 * SynchronizationEditorModal / MappingEditorModal / RuleEditorModal: it takes
 * the slot scope as PROPS and refuses to enable Save unless it was handed a
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
		return { draft: { name: 'my-source' } }
	},
	computed: {
		// Verbatim from openconnector: no `confirm` means the host did not bind
		// the slot scope, so there is nothing to save through.
		canSave() {
			return typeof this.confirm === 'function'
		},
	},
	template: `
		<div v-if="show" class="manifest-editor">
			<button
				class="editor-save"
				:disabled="!canSave"
				@click="confirm(draft)">Create</button>
		</div>
	`,
}

function mountWithManifestSlot() {
	return mount(CnIndexPage, {
		props: { title: 'Sources', register: 'oc', schema: 'source' },
		global: {
			stubs,
			components: { ManifestEditorStub },
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
		},
		slots: {
			// Exactly CnPageRenderer's shape: the whole slot scope spread onto
			// the component as PROPS, no listeners. Written as a render
			// function rather than a template string so the scope variable is
			// named by us and cannot silently arrive undefined — an undefined
			// v-bind would fail this spec for the wrong reason.
			'form-dialog': (slotProps) => h(ManifestEditorStub, { ...slotProps }),
		},
	})
}

describe('CnIndexPage form-dialog slot exposes the save path', () => {
	beforeEach(() => {
		mockStore.saveObject.mockClear()
	})

	it('binds a callable `confirm` into the slot scope', async () => {
		const wrapper = mountWithManifestSlot()
		await new Promise((r) => setTimeout(r))
		wrapper.vm.openFormDialog(null)
		await wrapper.vm.$nextTick()

		const editor = wrapper.findComponent(ManifestEditorStub)
		expect(editor.exists()).toBe(true)
		expect(typeof editor.props('confirm')).toBe('function')
	})

	it('leaves the replacement dialog\'s Create button ENABLED', async () => {
		const wrapper = mountWithManifestSlot()
		await new Promise((r) => setTimeout(r))
		wrapper.vm.openFormDialog(null)
		await wrapper.vm.$nextTick()

		// Assert on the BUTTON itself, not on the dialog container: the bug
		// rendered the editor perfectly and only disabled the one control that
		// matters.
		const saveBtn = wrapper.find('button.editor-save')
		expect(saveBtn.exists()).toBe(true)
		expect(saveBtn.attributes('disabled')).toBeUndefined()
		expect(saveBtn.element.disabled).toBe(false)
	})

	it('routes a click on that button through to the persistence path', async () => {
		const wrapper = mountWithManifestSlot()
		await new Promise((r) => setTimeout(r))
		wrapper.vm.openFormDialog(null)
		await wrapper.vm.$nextTick()

		await wrapper.find('button.editor-save').trigger('click')
		await new Promise((r) => setTimeout(r))

		expect(mockStore.saveObject).toHaveBeenCalledWith('oc-source', { name: 'my-source' })
	})
})

/**
 * The same shape, on the sibling "replace this dialog" slots. Both documented
 * as replacements, both wired their action as an `@confirm` listener on the
 * default child only, and neither exposed `show` — so a replacement could not
 * even tell when it was supposed to be open.
 */
describe('CnIndexPage sibling replace-dialog slots expose show + confirm', () => {
	it.each([
		['delete-dialog', 'showSingleDeleteDialog'],
		['copy-dialog', 'showSingleCopyDialog'],
	])('%s binds a callable `confirm` and a boolean `show`', async (slotName, visibilityFlag) => {
		const seen = {}
		const wrapper = mount(CnIndexPage, {
			props: { title: 'Sources', register: 'oc', schema: 'source' },
			global: { stubs, mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } } },
			slots: {
				[slotName]: (slotProps) => {
					Object.assign(seen, slotProps)
					return h('div', { class: 'replacement' })
				},
			},
		})
		await new Promise((r) => setTimeout(r))
		// Exactly what the row-action handlers do to open these two dialogs
		// (`onCopy` / `onDelete` in mergedActions); only `delete` also has a
		// public opener, so drive both through the state they set.
		wrapper.vm.actionTargetItem = { id: 'x-1', name: 'thing' }
		wrapper.vm[visibilityFlag] = true
		await wrapper.vm.$nextTick()

		expect(typeof seen.confirm).toBe('function')
		expect(seen.show).toBe(true)
		expect(seen.item).toMatchObject({ id: 'x-1' })
	})
})

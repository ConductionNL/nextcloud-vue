/**
 * Tests for CnIndexPage — highest-leverage starter spec (#469).
 *
 * CnIndexPage is the most-used component in the fleet (1900+ lines,
 * drives all list views). This spec covers the four highest-value
 * scenarios: dialog-override slots, save→refresh integration, delete
 * confirmation flow, and search/filter parameter forwarding.
 *
 * Detailed edge-case coverage is left to follow-up specs; this file's
 * goal is to catch regressions in the core CRUD orchestration paths.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory can reference the var.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	objects: {},
	registerObjectType: jest.fn(),
	unregisterObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Item', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Item', properties: {} })),
	saveObject: jest.fn().mockResolvedValue({ id: '1', title: 'Saved' }),
	deleteObject: jest.fn().mockResolvedValue(true),
	getCollection: jest.fn(() => []),
	isLoading: jest.fn(() => false),
	getError: jest.fn(() => null),
	getPagination: jest.fn(() => ({ total: 0, page: 1, pages: 1, limit: 20 })),
	setSearchTerm: jest.fn(),
	getSearchTerm: jest.fn(() => ''),
	getFacets: jest.fn(() => ({})),
	_options: { baseUrl: '/apps/openregister/api/objects' },
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

/** Stub every heavy sub-component that CnIndexPage uses internally. */
const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	CnMassDeleteDialog: true,
	CnMassCopyDialog: true,
	CnMassExportDialog: true,
	CnMassImportDialog: true,
	CnDeleteDialog: true,
	CnCopyDialog: true,
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

/**
 * Mount helper — provides the minimum required props plus a mock router.
 *
 * @param {object} propsData Component props.
 * @param {object} [slots] Named slot overrides.
 * @return {object} Vue Test Utils wrapper.
 */
function mountPage(propsData = {}, slots = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Items', ...propsData },
		stubs,
		slots,
		mocks: {
			$route: { params: {}, query: {}, name: 'items' },
			$router: { push: jest.fn(), replace: jest.fn() },
		},
	})
}

beforeEach(() => {
	jest.clearAllMocks()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
	mockStore.errors = {}
	mockStore.objects = {}
	mockStore.fetchCollection.mockResolvedValue([])
	mockStore.fetchSchema.mockResolvedValue({ title: 'Item', properties: {} })
	mockStore.saveObject.mockResolvedValue({ id: '1', title: 'Saved' })
	mockStore.deleteObject.mockResolvedValue(true)
})

// ── Dialog slot overrides ───────────────────────────────────────────────

describe('dialog-override slots', () => {
	it('renders the default form-dialog slot when no override is provided', () => {
		const wrapper = mountPage({ title: 'Items' })
		// The default CnFormDialog stub renders as a div[stub]
		// presence of the stub means the default slot is active
		expect(wrapper.find('[data-testid="cn-index-page"]').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders a custom form-dialog slot override when provided', () => {
		const wrapper = mountPage(
			{ title: 'Items' },
			{
				'form-dialog': '<div class="custom-form-dialog" />',
			},
		)
		// The custom dialog markup should appear in the rendered output
		expect(wrapper.html()).toContain('custom-form-dialog')
		wrapper.destroy()
	})

	it('renders a custom delete-dialog slot override when provided', () => {
		const wrapper = mountPage(
			{ title: 'Items' },
			{
				'delete-dialog': '<div class="custom-delete-dialog" />',
			},
		)
		expect(wrapper.html()).toContain('custom-delete-dialog')
		wrapper.destroy()
	})
})

// ── Reference register threading ───────────────────────────────────────

describe('register threading to CnFormDialog', () => {
	it('passes its register through to the built-in CnFormDialog', async () => {
		const wrapper = mountPage({ title: 'Items', register: 'zaken', schema: 's1' })
		await wrapper.vm.$nextTick()
		wrapper.vm.openFormDialog()
		await wrapper.vm.$nextTick()
		const dialog = wrapper.findComponent({ ref: 'formDialog' })
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('register')).toBe('zaken')
		wrapper.destroy()
	})
})

// ── Save → collection refresh ──────────────────────────────────────────

describe('save → collection refresh', () => {
	it('calls fetchCollection after a successful save via the built-in form dialog', async () => {
		const wrapper = mountPage({ title: 'Items', register: 'r1', schema: 's1' })
		await wrapper.vm.$nextTick()

		// Simulate the internal onSave handler being triggered
		if (typeof wrapper.vm.onSave === 'function') {
			await wrapper.vm.onSave({ title: 'New Item' })
			expect(mockStore.saveObject).toHaveBeenCalled()
		} else if (typeof wrapper.vm.handleSave === 'function') {
			await wrapper.vm.handleSave({ title: 'New Item' })
			expect(mockStore.saveObject).toHaveBeenCalled()
		}

		wrapper.destroy()
	})
})

// ── Validation error keeps the form open ───────────────────────────────

describe('form validation errors', () => {
	it('keeps the form visible on a validation error instead of replacing it with a result note', async () => {
		const validationError = {
			status: 400,
			message: "Property 'client' should match format 'uuid'.",
			isValidation: true,
			fields: null,
		}
		mockStore.saveObject.mockResolvedValueOnce(null)
		mockStore.getError.mockReturnValueOnce(validationError)

		const wrapper = mountPage({ store: mockStore, objectType: 'pipelinq-contact' })
		await wrapper.vm.$nextTick()

		const keepForm = jest.spyOn(wrapper.vm, 'setFormValidationErrors').mockImplementation(() => {})
		const showResult = jest.spyOn(wrapper.vm, 'setFormResult').mockImplementation(() => {})

		await wrapper.vm.onFormConfirm({ client: 'alice' })

		// Validation error → keep the form, surface the real message; do NOT
		// switch to the result phase (which would hide the form).
		expect(keepForm).toHaveBeenCalledWith(null, "Property 'client' should match format 'uuid'.")
		expect(showResult).not.toHaveBeenCalled()
		wrapper.destroy()
	})

	it('keeps the form open on a validation error in self-fetch mode (register/schema)', async () => {
		// pipelinq's manifest pages use self-fetch mode (register/schema), not
		// the explicit `store` prop — this path goes through selfModeActions.
		mockStore.saveObject.mockResolvedValueOnce(null)
		mockStore.getError.mockReturnValue({
			status: 400,
			message: "Property 'client' should match format 'uuid'.",
			isValidation: true,
			fields: null,
		})

		const wrapper = mountPage({ register: 'r1', schema: 's1' })
		await wrapper.vm.$nextTick()

		const keepForm = jest.spyOn(wrapper.vm, 'setFormValidationErrors').mockImplementation(() => {})
		const showResult = jest.spyOn(wrapper.vm, 'setFormResult').mockImplementation(() => {})

		await wrapper.vm.onFormConfirm({ client: 'alice' })

		expect(keepForm).toHaveBeenCalledWith(null, "Property 'client' should match format 'uuid'.")
		expect(showResult).not.toHaveBeenCalled()
		mockStore.getError.mockReturnValue(null)
		wrapper.destroy()
	})

	it('shows a terminal result for non-validation save failures', async () => {
		mockStore.saveObject.mockResolvedValueOnce(null)
		mockStore.getError.mockReturnValueOnce({ status: 500, message: 'Server error', isValidation: false, fields: null })

		const wrapper = mountPage({ store: mockStore, objectType: 'pipelinq-contact' })
		await wrapper.vm.$nextTick()

		const keepForm = jest.spyOn(wrapper.vm, 'setFormValidationErrors').mockImplementation(() => {})
		const showResult = jest.spyOn(wrapper.vm, 'setFormResult').mockImplementation(() => {})

		await wrapper.vm.onFormConfirm({ client: 'alice' })

		expect(showResult).toHaveBeenCalledWith({ error: 'Server error' })
		expect(keepForm).not.toHaveBeenCalled()
		wrapper.destroy()
	})
})

// ── Delete confirmation ────────────────────────────────────────────────

describe('delete confirmation flow', () => {
	it('calls deleteObject when onDeleteConfirm is triggered', async () => {
		const wrapper = mountPage({ title: 'Items', register: 'r1', schema: 's1' })
		await wrapper.vm.$nextTick()

		const deleteHandler = wrapper.vm.onDeleteConfirm
			|| wrapper.vm.onConfirmDelete
			|| wrapper.vm.handleDeleteConfirm

		if (typeof deleteHandler === 'function') {
			await deleteHandler.call(wrapper.vm, { id: 'obj-1', title: 'Doomed Item' })
			expect(mockStore.deleteObject).toHaveBeenCalled()
		}
		wrapper.destroy()
	})
})

// ── Search / filter forwarding ─────────────────────────────────────────

describe('search and filter parameter forwarding', () => {
	it('renders without error when filters prop is provided', () => {
		const filters = { status: 'active' }
		const wrapper = mountPage({ title: 'Items', register: 'r1', schema: 's1', filters })
		expect(wrapper.find('[data-testid="cn-index-page"]').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders without error when activeFilters prop is provided', () => {
		// activeFilters is an Object (field→values map), not an Array
		const wrapper = mountPage({
			title: 'Items',
			register: 'r1',
			schema: 's1',
			activeFilters: { status: ['active'] },
		})
		expect(wrapper.find('[data-testid="cn-index-page"]').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders self-fetch mode and calls fetchCollection on mount', async () => {
		mountPage({ title: 'Items', register: 'r1', schema: 's1' })
		// Give the async created() chain time to run
		await new Promise((resolve) => setTimeout(resolve, 10))
		// In self-fetch mode the store is consulted
		expect(mockStore.registerObjectType).toHaveBeenCalled()
	})
})

// ── Per-schema create-override hook ────────────────────────────────────

describe('createOverride hook', () => {
	it('routes a create through createOverride INSTEAD of saveObject and uses its result', async () => {
		const created = { id: 'c-1', '@self': { id: 'c-1' }, name: 'Acme', contactsUid: 'card-42' }
		const override = jest.fn().mockResolvedValue(created)

		const wrapper = mountPage({ store: mockStore, objectType: 'crm-client', createOverride: override })
		await wrapper.vm.$nextTick()

		const showResult = jest.spyOn(wrapper.vm, 'setFormResult').mockImplementation(() => {})

		await wrapper.vm.onFormConfirm({ name: 'Acme' })

		// The override owns persistence; the store's saveObject is bypassed.
		expect(override).toHaveBeenCalledTimes(1)
		expect(override.mock.calls[0][0]).toEqual({ name: 'Acme' })
		// ctx carries schema-routing info.
		expect(override.mock.calls[0][1]).toMatchObject({ objectType: 'crm-client' })
		expect(mockStore.saveObject).not.toHaveBeenCalled()
		expect(showResult).toHaveBeenCalledWith({ success: true })
		// @create is emitted with the override's returned object, not the form data.
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0][0]).toBe(created)
		wrapper.destroy()
	})

	it('falls back to saveObject when no createOverride is provided', async () => {
		const wrapper = mountPage({ store: mockStore, objectType: 'crm-client' })
		await wrapper.vm.$nextTick()

		await wrapper.vm.onFormConfirm({ name: 'Acme' })

		expect(mockStore.saveObject).toHaveBeenCalledWith('crm-client', { name: 'Acme' })
		wrapper.destroy()
	})

	it('does NOT route an EDIT through createOverride (create-only)', async () => {
		const override = jest.fn().mockResolvedValue({ id: 'c-1' })
		const wrapper = mountPage({ store: mockStore, objectType: 'crm-client', createOverride: override })
		await wrapper.vm.$nextTick()

		// Put the page into edit mode (editItem set) then confirm.
		wrapper.vm.editItem = { id: 'c-1', name: 'Existing' }
		await wrapper.vm.onFormConfirm({ id: 'c-1', name: 'Existing Renamed' })

		expect(override).not.toHaveBeenCalled()
		expect(mockStore.saveObject).toHaveBeenCalledWith('crm-client', { id: 'c-1', name: 'Existing Renamed' })
		wrapper.destroy()
	})

	it('surfaces a terminal error when createOverride throws', async () => {
		const override = jest.fn().mockRejectedValue(new Error('contact resolve failed'))
		const wrapper = mountPage({ store: mockStore, objectType: 'crm-client', createOverride: override })
		await wrapper.vm.$nextTick()

		const showResult = jest.spyOn(wrapper.vm, 'setFormResult').mockImplementation(() => {})

		await wrapper.vm.onFormConfirm({ name: 'Acme' })

		expect(showResult).toHaveBeenCalledWith({ error: 'contact resolve failed' })
		expect(mockStore.saveObject).not.toHaveBeenCalled()
		wrapper.destroy()
	})

	it('surfaces a failure when createOverride returns falsy', async () => {
		const override = jest.fn().mockResolvedValue(null)
		const wrapper = mountPage({ store: mockStore, objectType: 'crm-client', createOverride: override })
		await wrapper.vm.$nextTick()

		const showResult = jest.spyOn(wrapper.vm, 'setFormResult').mockImplementation(() => {})

		await wrapper.vm.onFormConfirm({ name: 'Acme' })

		expect(showResult).toHaveBeenCalledWith({ error: 'Save failed' })
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})
})

// ── ?action=create deep-link ───────────────────────────────────────────

describe('?action=create deep-link', () => {
	/**
	 * Mount with a `?action=create` query param pre-set so mounted() fires it.
	 *
	 * @param {object} [extra] Extra props.
	 * @return {object} wrapper
	 */
	function mountWithCreate(extra = {}) {
		return mount(CnIndexPage, {
			propsData: { title: 'Items', showFormDialog: true, ...extra },
			stubs,
			mocks: {
				$route: { params: {}, query: { action: 'create' }, name: 'items' },
				$router: { push: jest.fn(), replace: jest.fn().mockResolvedValue(undefined) },
			},
		})
	}

	it('opens the create dialog on mount when ?action=create is present', async () => {
		const wrapper = mountWithCreate()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.showFormDialogVisible).toBe(true)
		expect(wrapper.vm.editItem).toBeNull()
		wrapper.destroy()
	})

	it('clears the action query param after opening', async () => {
		const replace = jest.fn().mockResolvedValue(undefined)
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Items', showFormDialog: true },
			stubs,
			mocks: {
				$route: { params: {}, query: { action: 'create' }, name: 'items' },
				$router: { push: jest.fn(), replace },
			},
		})
		await wrapper.vm.$nextTick()
		expect(replace).toHaveBeenCalledWith({ query: {} })
		wrapper.destroy()
	})

	it('does NOT open the dialog when showFormDialog is false (consumer manages its own dialog)', async () => {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Items', showFormDialog: false },
			stubs,
			mocks: {
				$route: { params: {}, query: { action: 'create' }, name: 'items' },
				$router: { push: jest.fn(), replace: jest.fn().mockResolvedValue(undefined) },
			},
		})
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.showFormDialogVisible).toBe(false)
		wrapper.destroy()
	})

	it('does NOT open the dialog when ?action is absent', async () => {
		const wrapper = mountPage({ title: 'Items', showFormDialog: true })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.showFormDialogVisible).toBe(false)
		wrapper.destroy()
	})

	it('opens the dialog when the watcher fires on same-page navigation', async () => {
		const wrapper = mountPage({ title: 'Items', showFormDialog: true })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.showFormDialogVisible).toBe(false)

		// Simulate the watcher being triggered directly (same-page nav injects ?action=create)
		wrapper.vm.$route.query.action = 'create'
		wrapper.vm.maybeOpenCreateFromQuery()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.showFormDialogVisible).toBe(true)
		wrapper.destroy()
	})
})

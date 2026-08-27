/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * CnDetailPage's record Edit affordance.
 *
 * Why it had to exist before the index table could stop offering an edit modal:
 * measured across the 20 fleet manifests, ZERO of 233 detail pages declared any
 * edit action, and this component had none of its own — its only "edit mode"
 * is Buildiq LAYOUT editing (ADR-041), which is a different feature entirely.
 * So the modal launched from the index was the sole way to change a record
 * anywhere in the fleet. Removing it first would have made 214 index pages'
 * records read-only.
 */

const { shallowMount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const schema = { title: 'Case type', properties: { title: { type: 'string' } } }
const record = { id: 'ct-1', title: 'Omgevingsvergunning', '@self': { id: 'ct-1' } }

/**
 * Mount a schema-bound detail page with a stub object store.
 *
 * @param {object} propsData   Extra props.
 * @param {object} storeExtras Overrides merged into the stub store.
 * @return {{wrapper: object, store: object}} The wrapper and its store.
 */
function mountDetail(propsData = {}, storeExtras = {}) {
	const store = {
		// `currentSchema` reads the schema off the store by registered type
		// key, so the store is also how the form gets its fields.
		schemas: { 'dossiq-caseType': schema },
		saveObject: jest.fn().mockResolvedValue({ ...record, title: 'Gewijzigd' }),
		getError: jest.fn().mockReturnValue(null),
		...storeExtras,
	}
	const setResult = jest.fn()
	const wrapper = shallowMount(CnDetailPage, {
		propsData: {
			title: 'Case type',
			register: 'dossiq',
			schema: 'caseType',
			objectId: 'ct-1',
			objectStore: store,
			...propsData,
		},
		stubs: {
			// A stub carrying `setResult`: the component reports save success
			// and failure back through that ref, and `$refs` is not writable
			// in Vue 3, so the only way to observe it is a real child.
			CnFormDialog: { name: 'CnFormDialog', template: '<div class="cn-form-dialog-stub" />', methods: { setResult } },
		},
	})
	return { wrapper, store, setResult }
}

describe('CnDetailPage — record edit', () => {
	it('renders no Edit button by default, so existing consumers are untouched', () => {
		const { wrapper } = mountDetail()
		expect(wrapper.find('[data-testid="cn-detail-page-edit"]').exists()).toBe(false)
		expect(wrapper.vm.canEditRecord).toBe(false)
	})

	it('POSITIVE CONTROL: renders the Edit button when the page opts in', () => {
		// Without this, the negative cases below would pass just as happily if
		// the button never rendered under any condition at all.
		const { wrapper } = mountDetail({ showEditAction: true })
		expect(wrapper.vm.canEditRecord).toBe(true)
		expect(wrapper.find('[data-testid="cn-detail-page-edit"]').exists()).toBe(true)
	})

	it('does not render an Edit button without a record to edit', () => {
		// No objectId: this is the create archetype's page, which already owns
		// the id-less case with its own create form.
		const { wrapper } = mountDetail({ objectId: '', showEditAction: true })
		expect(wrapper.vm.canEditRecord).toBe(false)
	})

	it('does not render an Edit button without a schema to build the form from', () => {
		// A button that opens a form with no fields is a dead button.
		const { wrapper } = mountDetail({ schema: '', showEditAction: true })
		expect(wrapper.vm.canEditRecord).toBe(false)
	})

	it('opens the record form when the Edit button is clicked', async () => {
		const { wrapper } = mountDetail({ showEditAction: true })
		expect(wrapper.vm.editFormOpen).toBe(false)

		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.editFormOpen).toBe(true)
	})

	it('saves through the object store, so every other surface sees the change', async () => {
		const { wrapper, store } = mountDetail({ showEditAction: true })
		wrapper.vm.openEditForm()
		await wrapper.vm.onEditFormConfirm({ title: 'Gewijzigd' })

		expect(store.saveObject).toHaveBeenCalledTimes(1)
		const [type, payload] = store.saveObject.mock.calls[0]
		// The store addresses a type by its REGISTERED composite key
		// (`register-schema`), which is what `_getTypeConfig` resolves
		// register + schema back out of — not the bare schema slug.
		expect(type).toBe('dossiq-caseType')
		// The decisive assertion. `saveObject` picks PUT over POST on the
		// presence of `id`, and an OpenRegister record carries its id in
		// `@self`, not at the top level — so a payload without this would
		// CREATE A DUPLICATE instead of editing the record.
		expect(payload.id).toBe('ct-1')
		expect(payload.title).toBe('Gewijzigd')

		expect(wrapper.vm.editFormOpen).toBe(false)
		expect(wrapper.emitted('edited')).toHaveLength(1)
	})

	it('keeps the form open and reports the error when the save fails', async () => {
		const { wrapper, store, setResult } = mountDetail(
			{ showEditAction: true },
			{
				schemas: { 'dossiq-caseType': schema },
				saveObject: jest.fn().mockResolvedValue(null),
				getError: jest.fn().mockReturnValue({ message: 'Validation failed' }),
			},
		)
		wrapper.vm.openEditForm()
		await wrapper.vm.$nextTick()
		await wrapper.vm.onEditFormConfirm({ title: '' })

		expect(store.saveObject).toHaveBeenCalledTimes(1)
		expect(setResult).toHaveBeenCalledWith({ error: 'Validation failed' })
		// A failed save that closed the form would discard the user's input.
		expect(wrapper.vm.editFormOpen).toBe(true)
		expect(wrapper.emitted('edited')).toBeUndefined()
	})

	it('closes the form without saving on cancel', async () => {
		const { wrapper, store } = mountDetail({ showEditAction: true })
		wrapper.vm.openEditForm()
		wrapper.vm.closeEditForm()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.editFormOpen).toBe(false)
		expect(store.saveObject).not.toHaveBeenCalled()
	})
})

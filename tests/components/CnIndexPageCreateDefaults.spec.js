/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `createDefaults` closes the one create-form capability a manifest
 * `open-form` header action had that CnIndexPage's built-in Add dialog did
 * not: seeding fixed field values (`assignee: "@me"`) into a fresh record.
 * Without it, two buttons creating the same schema (a header action and an
 * index page's own Add button) opened with different starting values —
 * reported on dossiq's Cases/Queue pages, whose Add dialog never got the
 * `assignee`/`confidentiality` presets the Dashboard's `new-case` header
 * action already had.
 */

jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'alice' })),
}))

const { mount } = require('@vue/test-utils')

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const SCHEMA = {
	title: 'Case',
	properties: {
		title: { type: 'string' },
		assignee: { type: 'string' },
		confidentiality: { type: 'string' },
	},
}

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnMassDeleteDialog: true,
	CnMassCopyDialog: true,
	CnMassExportDialog: true,
	CnMassImportDialog: true,
	CnDeleteDialog: true,
	CnCopyDialog: true,
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnPageHeader: true,
	CnActionButtons: true,
	CnWidgetGrid: true,
	CnObjectSidebar: true,
	CnTabs: true,
	CnFormDialog: true,
}

const mocks = { $route: { params: {}, query: {} }, $router: { push: jest.fn() } }

/**
 * @param {object} extra Props merged over the base set.
 * @return {object} Mounted page with its Add dialog open.
 */
async function mountWithDialogOpen(extra = {}) {
	const wrapper = mount(CnIndexPage, {
		props: { title: 'Cases', schema: SCHEMA, objects: [], loading: false, ...extra },
		global: { stubs, mocks },
	})
	await wrapper.setData({ showFormDialogVisible: true })
	return wrapper
}

/**
 * @param {object} wrapper Mounted page.
 * @return {object|null} The stubbed CnFormDialog's props, or null.
 */
function dialogProps(wrapper) {
	const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
	return dialog.exists() ? dialog.props() : null
}

describe('CnIndexPage createDefaults', () => {
	it('forwards createDefaults as CnFormDialog initialData, with @me resolved', async () => {
		const wrapper = await mountWithDialogOpen({
			createDefaults: { assignee: '@me', confidentiality: 'vertrouwelijk' },
		})

		expect(dialogProps(wrapper).initialData).toEqual({
			assignee: 'alice',
			confidentiality: 'vertrouwelijk',
		})
	})

	it('leaves an undeclared page on CnFormDialog\'s own initialData default', async () => {
		const wrapper = await mountWithDialogOpen()

		expect(dialogProps(wrapper).initialData).toBeNull()
	})

	it('passes an unresolvable token through unchanged rather than dropping the key', async () => {
		const wrapper = await mountWithDialogOpen({
			createDefaults: { assignee: '@object.assignee' },
		})

		expect(dialogProps(wrapper).initialData).toEqual({ assignee: '@object.assignee' })
	})

	it('resolves a token nested inside the seed, not just a top-level one', async () => {
		const wrapper = await mountWithDialogOpen({
			createDefaults: { handover: { to: '@me' }, watchers: [{ uid: '@me' }] },
		})

		expect(dialogProps(wrapper).initialData).toEqual({
			handover: { to: 'alice' },
			watchers: [{ uid: 'alice' }],
		})
	})

	it('does not seed an edit: the dialog is handed the item, and only create reads the seed', async () => {
		const item = { id: 'case-1', title: 'Existing', assignee: 'bob' }
		const wrapper = mount(CnIndexPage, {
			props: {
				title: 'Cases',
				schema: SCHEMA,
				objects: [item],
				loading: false,
				createDefaults: { assignee: '@me' },
			},
			global: { stubs, mocks },
		})
		await wrapper.vm.openFormDialog(item)

		// The seed is still bound (CnFormDialog ignores it when `item` is set —
		// initFormData branches on the item), so what this pins is that the
		// dialog is told it IS an edit. A slot override that hardcodes
		// `:item="null"` is how an edit turns into a duplicate create.
		expect(dialogProps(wrapper).item).toEqual(item)
	})

	it('forwards the seed to CnAdvancedFormDialog as initialValues', async () => {
		const wrapper = mount(CnIndexPage, {
			props: {
				title: 'Cases',
				schema: SCHEMA,
				objects: [],
				loading: false,
				useAdvancedFormDialog: true,
				createDefaults: { assignee: '@me' },
			},
			global: { stubs: { ...stubs, CnAdvancedFormDialog: true }, mocks },
		})
		await wrapper.setData({ showFormDialogVisible: true })

		const advanced = wrapper.findComponent({ name: 'CnAdvancedFormDialog' })
		expect(advanced.props().initialValues).toEqual({ assignee: 'alice' })
	})
})

describe('CnIndexPage createSuccessRoute / createSuccessMessage', () => {
	/** A store whose save always succeeds, so the create path runs to the end. */
	const store = { saveObject: jest.fn(async (type, data) => ({ ...data, '@self': { id: 'new-1' } })) }

	beforeEach(() => {
		store.saveObject.mockClear()
		mocks.$router.push.mockClear()
	})

	it('navigates to the created record, reading the id through savedObjectId', async () => {
		const push = jest.fn(() => Promise.resolve())
		const wrapper = mount(CnIndexPage, {
			props: {
				title: 'Cases',
				schema: SCHEMA,
				objects: [],
				loading: false,
				store,
				objectType: 'case',
				createSuccessRoute: 'CaseDetail',
			},
			global: { stubs, mocks: { ...mocks, $router: { push } } },
		})

		await wrapper.vm.onFormConfirm({ title: 'New one' })

		// `@self.id` only — a bare `saved.id` read would push `undefined`.
		expect(push).toHaveBeenCalledWith({ name: 'CaseDetail', params: { id: 'new-1' } })
	})

	it('stays on the list when no route is declared', async () => {
		const push = jest.fn(() => Promise.resolve())
		const wrapper = mount(CnIndexPage, {
			props: { title: 'Cases', schema: SCHEMA, objects: [], loading: false, store, objectType: 'case' },
			global: { stubs, mocks: { ...mocks, $router: { push } } },
		})

		await wrapper.vm.onFormConfirm({ title: 'New one' })

		expect(push).not.toHaveBeenCalled()
	})

	it('does not navigate after an edit', async () => {
		const push = jest.fn(() => Promise.resolve())
		const wrapper = mount(CnIndexPage, {
			props: {
				title: 'Cases',
				schema: SCHEMA,
				objects: [],
				loading: false,
				store,
				objectType: 'case',
				createSuccessRoute: 'CaseDetail',
			},
			global: { stubs, mocks: { ...mocks, $router: { push } } },
		})
		await wrapper.setData({ editItem: { id: 'case-1' } })

		await wrapper.vm.onFormConfirm({ id: 'case-1', title: 'Edited' })

		expect(push).not.toHaveBeenCalled()
	})
})

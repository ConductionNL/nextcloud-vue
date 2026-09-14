/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFormDialog has taken `size` and `columns` since two-column forms shipped.
 * Four of its five hosts never passed either one.
 *
 * The consequence was not a missing feature but an inconsistent one, which is
 * harder to see: `CnActionButtons` — the manifest `open-form` path — DID
 * forward both, so a single app could open a roomy two-column create form from
 * a detail page's header action and a cramped one-column form for the same
 * kind of record from its index page's Add button. Dossiq had exactly that: a
 * case create form in two columns, and a case-type create form asking 41
 * properties in one.
 *
 * Every host that mounts CnFormDialog is pinned here, because the defect was
 * that the forwarding existed in one place and the other four were assumed to
 * have it. A host added later without these props fails this file rather than
 * shipping the same inconsistency again.
 */

const { mount } = require('@vue/test-utils')

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default
const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default
const CnObjectDataWidget = require('../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue').default

const SCHEMA = {
	title: 'Case type',
	properties: {
		title: { type: 'string' },
		category: { type: 'string' },
		purpose: { type: 'string' },
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
	CnWidgetWrapper: false,
	CnPageHeader: true,
	CnActionButtons: true,
	CnWidgetGrid: true,
	CnObjectSidebar: true,
	CnTabs: true,
	CnFormDialog: true,
}

const mocks = { $route: { params: {}, query: {} }, $router: { push: jest.fn() } }

/**
 * Find the stubbed CnFormDialog and read the props it was handed.
 *
 * Reading the STUB's props (rather than the rendered dialog) is what makes
 * this a forwarding test: it asserts the value crossed the boundary, which is
 * precisely the step that was missing, without depending on how CnFormDialog
 * then lays the fields out. That layout has its own coverage.
 *
 * @param {object} wrapper Mounted host component.
 * @return {object|null} The dialog's props, or null when no dialog is mounted.
 */
function dialogProps(wrapper) {
	const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
	return dialog.exists() ? dialog.props() : null
}

describe('CnFormDialog size/columns forwarding — every host', () => {
	describe('CnIndexPage', () => {
		/**
		 * @param {object} extra Props merged over the base set.
		 * @return {object} Mounted page with its Add dialog open.
		 */
		async function mountWithDialogOpen(extra = {}) {
			const wrapper = mount(CnIndexPage, {
				props: { title: 'Case types', schema: SCHEMA, objects: [], loading: false, ...extra },
				global: { stubs, mocks },
			})
			await wrapper.setData({ showFormDialogVisible: true })
			return wrapper
		}

		it('forwards formSize and formColumns to the built-in Add dialog', async () => {
			const wrapper = await mountWithDialogOpen({ formSize: 'large', formColumns: 2 })

			expect(dialogProps(wrapper)).toMatchObject({ size: 'large', columns: 2 })
		})

		it('leaves an undeclared page on the one-column normal dialog it had before', async () => {
			const wrapper = await mountWithDialogOpen()

			expect(dialogProps(wrapper)).toMatchObject({ size: 'normal', columns: 1 })
		})

		it('refuses a column count the dialog cannot lay out', () => {
			const validator = CnIndexPage.props.formColumns.validator

			expect(validator(2)).toBe(true)
			expect(validator(1)).toBe(true)
			expect(validator(3)).toBe(false)
			expect(validator(0)).toBe(false)
		})
	})

	describe('CnDetailPage', () => {
		/**
		 * `currentSchema` is read off the object store, so the page needs one
		 * before it will mount a form at all — a page with no resolved schema
		 * renders no dialog, and a test that skipped the assertion in that case
		 * would pass whether or not the props were forwarded.
		 *
		 * @return {object} An object-store double carrying the case-type schema.
		 */
		function makeStore() {
			return {
				objects: { 'dossiq-caseType': { 'ct-1': { title: 'A case type' } } },
				schemas: { 'dossiq-caseType': SCHEMA },
				objectTypeRegistry: { 'dossiq-caseType': {} },
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			}
		}

		/**
		 * A schema-bound detail page with no objectId renders the CREATE
		 * archetype — the empty form is the page, so no interaction is needed
		 * to put a dialog on screen.
		 *
		 * @param {object} extra Props merged over the base set.
		 * @return {object} Mounted page.
		 */
		function mountCreateArchetype(extra = {}) {
			return mount(CnDetailPage, {
				propsData: {
					title: 'New case type',
					register: 'dossiq',
					schema: 'caseType',
					createForm: 'always',
					objectStore: makeStore(),
					...extra,
				},
				mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), back: jest.fn() } },
				stubs: { CnFormDialog: { name: 'CnFormDialog', props: ['size', 'columns'], template: '<div />' } },
			})
		}

		it('mounts a create form at all — the precondition the rest of this block rests on', () => {
			const wrapper = mountCreateArchetype()

			expect(wrapper.vm.isCreateMode).toBe(true)
			expect(dialogProps(wrapper)).not.toBeNull()
		})

		it('forwards formSize and formColumns to the create form', () => {
			const wrapper = mountCreateArchetype({ formSize: 'large', formColumns: 2 })

			expect(dialogProps(wrapper)).toMatchObject({ size: 'large', columns: 2 })
		})

		it('leaves an undeclared page on the one-column normal dialog it had before', () => {
			const wrapper = mountCreateArchetype()

			expect(dialogProps(wrapper)).toMatchObject({ size: 'normal', columns: 1 })
		})

		it('forwards the same two props to the record EDIT form, not only the create one', async () => {
			// Two CnFormDialog mounts live in this template and they are wired
			// separately, so forwarding on one says nothing about the other.
			const wrapper = mount(CnDetailPage, {
				propsData: {
					title: 'Case type',
					register: 'dossiq',
					schema: 'caseType',
					objectId: 'ct-1',
					formSize: 'large',
					formColumns: 2,
					objectStore: makeStore(),
				},
				mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), back: jest.fn() } },
				stubs: { CnFormDialog: { name: 'CnFormDialog', props: ['size', 'columns'], template: '<div />' } },
			})
			await wrapper.setData({ editFormOpen: true })

			expect(wrapper.vm.isCreateMode).toBe(false)
			expect(dialogProps(wrapper)).toMatchObject({ size: 'large', columns: 2 })
		})

		it('refuses a column count the dialog cannot lay out', () => {
			const validator = CnDetailPage.props.formColumns.validator

			expect(validator(2)).toBe(true)
			expect(validator(3)).toBe(false)
		})
	})

	describe('CnObjectListWidget', () => {
		/**
		 * The widget takes its form configuration off `content`, not props —
		 * a dashboard widget is configured by the placement's content blob.
		 *
		 * @param {object} content Widget content blob.
		 * @return {object} Mounted widget with its create dialog open.
		 */
		async function mountWithCreateOpen(content = {}) {
			const wrapper = mount(CnObjectListWidget, {
				props: { content: { register: 'dossiq', schema: 'case', ...content } },
				global: { stubs, mocks },
			})
			await wrapper.setData({ showCreate: true, createSchema: SCHEMA })
			return wrapper
		}

		it('forwards content.formSize and content.formColumns to the create dialog', async () => {
			const wrapper = await mountWithCreateOpen({ formSize: 'large', formColumns: 2 })

			expect(dialogProps(wrapper)).toMatchObject({ size: 'large', columns: 2 })
		})

		it('forwards the field scoping the create dialog needs to stay usable', async () => {
			// Without this the widget fetched the WHOLE schema and asked for
			// every property on it, which is why consumers turned the create
			// button off rather than configure it.
			const wrapper = await mountWithCreateOpen({
				formIncludeFields: ['title', 'category'],
				formExcludeFields: ['purpose'],
				formFieldOverrides: { title: { widget: 'textarea' } },
			})

			expect(dialogProps(wrapper)).toMatchObject({
				includeFields: ['title', 'category'],
				excludeFields: ['purpose'],
				fieldOverrides: { title: { widget: 'textarea' } },
			})
		})

		it('leaves an unconfigured widget on the dialog it had before', async () => {
			const wrapper = await mountWithCreateOpen()

			expect(dialogProps(wrapper)).toMatchObject({
				size: 'normal',
				columns: 1,
				includeFields: null,
				excludeFields: [],
				fieldOverrides: {},
			})
		})

		it('ignores a column count the dialog cannot lay out rather than passing it through', async () => {
			// Content is data from a stored placement, not a prop a developer
			// typed, so there is no validator to fail — a bad value must
			// degrade to the safe layout instead of reaching the dialog.
			const wrapper = await mountWithCreateOpen({ formColumns: 5 })

			expect(dialogProps(wrapper).columns).toBe(1)
		})
	})

	describe('CnObjectDataWidget', () => {
		/**
		 * @param {object} extra Props merged over the base set.
		 * @return {object} Mounted widget with its edit dialog open.
		 */
		async function mountWithEditOpen(extra = {}) {
			const wrapper = mount(CnObjectDataWidget, {
				props: { schema: SCHEMA, objectData: { title: 'A case type' }, ...extra },
				global: { stubs, mocks },
			})
			await wrapper.setData({ editModalOpen: true })
			return wrapper
		}

		it('forwards formSize and formColumns to the edit dialog', async () => {
			const wrapper = await mountWithEditOpen({ formSize: 'large', formColumns: 2 })

			expect(dialogProps(wrapper)).toMatchObject({ size: 'large', columns: 2 })
		})

		it('leaves an undeclared widget on the dialog it had before', async () => {
			const wrapper = await mountWithEditOpen()

			expect(dialogProps(wrapper)).toMatchObject({ size: 'normal', columns: 1 })
		})
	})
})

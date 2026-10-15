/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index header action of `type: "open-form"` opens the create form, as
 * shillinq's "Nieuwe factuur" over the invoice list. The page hands such
 * entries to a menu-mode CnActionButtons (stubbed here) and runs the entry it
 * reports when the header button, the header Actions menu or the bar's menu
 * names it.
 *
 * @spec openspec/changes/index-header-open-form/specs/index-header/spec.md#requirement-an-index-header-action-can-open-the-create-form
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const runs = {}

const CnActionButtonsStub = {
	name: 'CnActionButtons',
	props: ['actions', 'display'],
	emits: ['entries', 'created'],
	mounted() {
		this.$emit('entries', this.actions.map((action) => {
			runs[action.id] = runs[action.id] || jest.fn()
			return { id: action.id, label: action.label, run: runs[action.id] }
		}))
	},
	template: '<div class="dialog-actions" />',
}

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Invoices',
			schema: { title: 'Invoice', titlePlural: 'Invoices', properties: { number: { title: 'Number' } } },
			objects: [{ id: 1 }],
			pagination: { page: 1, pages: 1, total: 1, limit: 20 },
			showTitle: true,
			...extra,
		},
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Invoices' } },
			stubs: {
				CnActionButtons: CnActionButtonsStub,
				CnActionsBar: { name: 'CnActionsBar', template: '<div class="bar" />' },
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				NcActions: { template: '<div class="actions-menu"><slot /></div>' },
				NcActionButton: { emits: ['click'], template: '<button class="entry" @click="$emit(\'click\')"><slot /></button>' },
				NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
				CnIcon: true,
			},
		},
	})
}

const NEW_INVOICE = { id: 'new-invoice', label: 'New invoice', type: 'open-form', register: 'shillinq', schema: 'invoice' }

describe('CnIndexPage: an open-form header action', () => {
	beforeEach(() => {
		Object.keys(runs).forEach((key) => delete runs[key])
	})

	it('hands the open-form entry to the action buttons, which own the dialog', () => {
		const w = mountPage({ headerActions: [NEW_INVOICE, { id: 'other', label: 'Other' }] })
		const buttons = w.findComponent({ name: 'CnActionButtons' })
		expect(buttons.exists()).toBe(true)
		expect(buttons.props('display')).toBe('menu')
		expect(buttons.props('actions').map((a) => a.id)).toEqual(['new-invoice'])
	})

	it('opens the form from a header button that names the entry', async () => {
		const w = mountPage({
			headerActions: [NEW_INVOICE],
			headerButtons: [{ action: 'new-invoice', variant: 'primary', label: 'New invoice' }],
		})
		await w.find('[data-testid="cn-index-header-button-new-invoice"]').trigger('click')
		expect(runs['new-invoice']).toHaveBeenCalledTimes(1)
		expect(w.emitted('header-action')).toEqual([[{ action: 'new-invoice', id: 'new-invoice' }]])
	})

	it('opens the form from the actions bar\'s menu', () => {
		const w = mountPage({ headerActions: [NEW_INVOICE] })
		w.findComponent({ name: 'CnActionsBar' }).vm.$emit('headerAction', { action: 'new-invoice', id: 'new-invoice' })
		expect(runs['new-invoice']).toHaveBeenCalledTimes(1)
	})

	it('opens the form from the header Actions menu', async () => {
		const w = mountPage({
			headerActions: [NEW_INVOICE],
			headerButtons: [{ action: 'actions-menu' }],
		})
		await w.find('[data-testid="cn-index-header-menu-new-invoice"]').trigger('click')
		expect(runs['new-invoice']).toHaveBeenCalledTimes(1)
	})

	it('reloads the list after the form saves', () => {
		const w = mountPage({ headerActions: [NEW_INVOICE] })
		w.findComponent({ name: 'CnActionButtons' }).vm.$emit('created', { id: 'inv-1' })
		expect(w.emitted('refresh')).toHaveLength(1)
	})

	it('keeps an entry with a handler on its handler (control)', async () => {
		const handler = jest.fn()
		const w = mountPage({
			headerActions: [{ ...NEW_INVOICE, handler }],
			headerButtons: [{ action: 'new-invoice', label: 'New invoice' }],
		})
		expect(w.findComponent({ name: 'CnActionButtons' }).exists()).toBe(false)
		await w.find('[data-testid="cn-index-header-button-new-invoice"]').trigger('click')
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('draws no action buttons for a page without dialog entries', () => {
		const w = mountPage({ headerActions: [{ id: 'calendar', label: 'Calendar', handler: 'emit' }] })
		expect(w.findComponent({ name: 'CnActionButtons' }).exists()).toBe(false)
	})
})

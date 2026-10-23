/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page runs an `api-call` header action itself, through the shared
 * actions dispatcher, after its confirmation when it asks for one, and
 * reloads the list after a call that went through.
 *
 * @spec openspec/changes/index-actions-menu-selection-export/specs/index-header/spec.md#requirement-an-index-page-runs-an-api-call-header-action
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'

jest.mock('../../src/utils/actionsDispatcher.js', () => ({
	...jest.requireActual('../../src/utils/actionsDispatcher.js'),
	dispatchAction: jest.fn(() => Promise.resolve({ ok: true })),
}))

const RELOAD = { id: 'reload', type: 'api-call', label: 'Reload templates', url: '/apps/x/api/reload', method: 'POST', successMessage: 'Done.' }

function mountPage(actions) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Case types',
			schema: { title: 'Case type', properties: {} },
			objects: [],
			pagination: { page: 1, pages: 1, total: 0, limit: 20 },
			headerActions: actions,
		},
		global: {
			provide: { cnLook: 'board', cnTranslate: (key) => ({ 'Done.': 'Klaar.' }[key] || key) },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'CaseTypes' } },
			stubs: {
				CnActionsBar: true,
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				CnConfirmDialog: { name: 'CnConfirmDialog', template: '<div class="confirm" />', methods: { setResult: jest.fn() } },
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
			},
		},
	})
}

describe('an index page runs an api-call header action', () => {
	beforeEach(() => dispatchAction.mockClear())

	it('dispatches it with the app translate and reloads the list after it went through', async () => {
		const w = mountPage([RELOAD])
		await w.vm.onHeaderAction({ id: 'reload' })
		await w.vm.$nextTick()

		expect(dispatchAction).toHaveBeenCalledTimes(1)
		const [action, context] = dispatchAction.mock.calls[0]
		expect(action.url).toBe('/apps/x/api/reload')
		expect(context.translate('Done.')).toBe('Klaar.')
		expect(w.emitted('refresh')).toBeTruthy()
		expect(w.emitted('header-action')).toBeFalsy()
	})

	it('asks first when the action says confirm, and runs only after the confirmation', async () => {
		const w = mountPage([{ ...RELOAD, confirm: true }])
		await w.vm.onHeaderAction({ id: 'reload' })
		await w.vm.$nextTick()

		expect(dispatchAction).not.toHaveBeenCalled()
		expect(w.find('.confirm').exists()).toBe(true)

		await w.vm.onHeaderApiCallConfirm()
		expect(dispatchAction).toHaveBeenCalledTimes(1)
	})

	it('does not reload after a call that failed', async () => {
		dispatchAction.mockImplementationOnce(() => Promise.resolve({ ok: false, error: new Error('no') }))
		const w = mountPage([RELOAD])
		await w.vm.onHeaderAction({ id: 'reload' })
		await w.vm.$nextTick()

		expect(w.emitted('refresh')).toBeFalsy()
	})
})

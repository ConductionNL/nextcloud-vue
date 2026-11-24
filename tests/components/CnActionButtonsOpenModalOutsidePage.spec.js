/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * An `open-modal` action outside a page (the navigation's primary action,
 * which CnAppNav renders through CnActionButtons where no CnPageRenderer
 * provides `cnDispatchAction`) opens its registered modal through
 * CnAppRoot's `cnOpenModal`, and leaves the route as it is.
 */

import { mount } from '@vue/test-utils'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))
jest.mock('../../src/utils/visibleWhen.js', () => ({ __esModule: true, evaluateVisibleWhen: jest.fn(() => Promise.resolve(true)) }))
jest.mock('../../src/store/useObjectStore.js', () => ({ __esModule: true, useObjectStore: jest.fn(() => ({})) }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcButton: { name: 'NcButton', emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>' },
	CnIcon: { template: '<span />' },
}

const CREATE_INVOICE = {
	id: 'create-invoice',
	label: 'Create invoice',
	type: 'open-modal',
	target: 'InvoiceQuickDraftModal',
	props: { open: true },
	variant: 'primary',
}

/**
 * @param {object} provide What the surrounding tree provides.
 * @return {{ wrapper: object, push: Function }} The mounted bar and the router's push.
 */
function mountBar(provide) {
	const push = jest.fn(() => Promise.resolve())
	const wrapper = mount(CnActionButtons, {
		propsData: { actions: [CREATE_INVOICE] },
		stubs,
		provide,
		mocks: { $router: { push }, $route: { name: 'PurchaseInvoices', path: '/purchase-invoices' } },
	})
	return { wrapper, push }
}

describe('CnActionButtons — open-modal outside a page', () => {
	it('opens the registered modal through CnAppRoot\'s opener and keeps the route', async () => {
		const cnOpenModal = jest.fn()
		const { wrapper, push } = mountBar({
			cnRegistry: { InvoiceQuickDraftModal: { kind: 'modal', component: { template: '<div />' } } },
			cnOpenModal,
		})
		await flush()

		await wrapper.find('button').trigger('click')
		await flush()

		expect(cnOpenModal).toHaveBeenCalledWith('InvoiceQuickDraftModal', { open: true })
		expect(push).not.toHaveBeenCalled()
	})

	it('opens nothing for a target that is not a registered modal', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const cnOpenModal = jest.fn()
		const { wrapper } = mountBar({
			cnRegistry: { InvoiceQuickDraftModal: { kind: 'widget', component: { template: '<div />' } } },
			cnOpenModal,
		})
		await flush()

		await wrapper.find('button').trigger('click')
		await flush()

		expect(cnOpenModal).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('still routes through a page\'s pre-bound dispatcher when one is provided', async () => {
		const cnOpenModal = jest.fn()
		const cnDispatchAction = jest.fn()
		const { wrapper } = mountBar({
			cnRegistry: { InvoiceQuickDraftModal: { kind: 'modal', component: { template: '<div />' } } },
			cnOpenModal,
			cnDispatchAction,
		})
		await flush()

		await wrapper.find('button').trigger('click')
		await flush()

		expect(cnDispatchAction).toHaveBeenCalledTimes(1)
		expect(cnDispatchAction.mock.calls[0][0]).toMatchObject({ type: 'open-modal', target: 'InvoiceQuickDraftModal' })
		expect(cnOpenModal).not.toHaveBeenCalled()
	})
})

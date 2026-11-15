/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An action can be disabled with the reason why (`disabledWhen`,
 * `disabledReason`): shillinq's Send payment link while the payment adapter
 * is dormant, on the case panel and on the Payment requests page.
 *
 * @spec openspec/changes/action-disabled-when/specs/action-disabled-when/spec.md
 */
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const DORMANT = { field: 'adapterActive', op: 'eq', value: false }
const SEND = { id: 'send-link', label: 'Send payment link', type: 'api-call', url: '/apps/shillinq/api/x', disabledWhen: DORMANT, disabledReason: 'The payment provider is not connected.' }

function mountButtons(object) {
	return mount(CnActionButtons, {
		propsData: { actions: [SEND, { id: 'other', label: 'Other', type: 'navigate', route: 'Home' }] },
		provide: { cnObjectContext: ref({ objectId: 'pr-1', object }) },
		mocks: { $router: { push: jest.fn() } },
	})
}

describe('CnActionButtons disabledWhen', () => {
	it('draws the action disabled with the reason while the condition holds', async () => {
		const w = mountButtons({ id: 'pr-1', adapterActive: false })
		await flushPromises()
		const button = w.find('[data-testid="cn-action-send-link"]')
		expect(button.attributes('disabled')).toBeDefined()
		expect(button.attributes('title')).toBe('The payment provider is not connected.')
		expect(w.vm.isDisabled({ id: 'other' })).toBe(false)
	})

	it('enables it when the condition does not hold, and a disabled one does not run', async () => {
		const live = mountButtons({ id: 'pr-1', adapterActive: true })
		await flushPromises()
		expect(live.find('[data-testid="cn-action-send-link"]').attributes('disabled')).toBeUndefined()
		expect(live.vm.disabledReason(SEND)).toBe('')
		const dormant = mountButtons({ id: 'pr-1', adapterActive: false })
		await flushPromises()
		const run = jest.spyOn(dormant.vm, 'runAction')
		dormant.vm.onActionClick(SEND)
		expect(run).not.toHaveBeenCalled()
	})
})

describe('CnIndexPage header action disabledWhen', () => {
	it('keeps the action in the menu, disabled with its reason, while the condition holds', async () => {
		window.OC = { appswebroots: { 'mollie-dormant': '/apps/mollie-dormant' } }
		const w = shallowMount(CnIndexPage, { props: { objects: [], headerActions: [{ ...SEND, disabledWhen: { appInstalled: 'mollie-dormant' } }], appConfig: {} } })
		await flushPromises()
		const entry = w.vm.mergedHeaderActions.find((a) => a.id === 'send-link')
		expect(entry).toBeTruthy()
		expect(entry.disabled).toBe(true)
		expect(entry.disabledReason).toBe('The payment provider is not connected.')
		delete window.OC
	})
})

describe('the manifest', () => {
	it('accepts disabledWhen and disabledReason on an action', () => {
		const manifest = { $schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json', version: '1.0.0', menu: [], pages: [{ id: 'PR', route: '/pr', type: 'index', title: 'PR', config: { register: 'r', schema: 's', headerActions: [SEND] }, actions: [SEND] }] }
		expect(validateManifestV2(manifest).errors).toEqual([])
	})
})

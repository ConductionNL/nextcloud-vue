/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnHandoffAction: "can this record go to another app? Then send it, and show
 * what came back."
 *
 * What is guarded: the action shows only when the availability endpoint says
 * so (one path or several), and nothing renders otherwise; a send posts to the
 * action url with the record's id and the declared fields; a done record shows
 * the done note, the reference and the link instead of the button; a repeatable
 * action keeps its button; the outcome of a send is named by a mapped status;
 * a refusal names its reason and reads the availability again; a fallback link
 * shows when the action is not offered; the reference copies; and the widget is
 * registered under `handoff`.
 *
 * @spec openspec/changes/handoff-action/specs/handoff-action/spec.md#requirement-a-record-is-handed-to-another-app-by-config
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
var mockSuccess = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showSuccess: (...args) => mockSuccess(...args),
	showError: jest.fn(),
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

import '../../src/components/CnHandoffAction/index.js'

const CnHandoffAction = require('../../src/components/CnHandoffAction/CnHandoffAction.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function settle(wrapper) {
	await flush()
	await flush()
	await wrapper.vm.$nextTick()
}

/**
 * Mount the action.
 *
 * @param {object} content The widget content.
 * @param {object} [extra] Extra props.
 * @return {object} The wrapper.
 */
function mountHandoff(content, extra = {}) {
	return mount(CnHandoffAction, {
		props: { objectId: 'req-1', content, ...extra },
		global: {
			provide: { cnTranslate: (text) => `T:${text}` },
			stubs: {
				NcLoadingIcon: true,
				NcButton: {
					name: 'NcButton',
					props: ['disabled', 'href', 'variant'],
					template: '<a v-if="href" :href="href" class="stub-link-button"><slot /></a><button v-else :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
				},
				NcNoteCard: {
					name: 'NcNoteCard',
					props: ['type'],
					template: '<div class="stub-note" :data-type="type"><slot /></div>',
				},
			},
		},
	})
}

const convertToCase = {
	availability: { url: '/apps/pipelinq/api/handoff/request/@objectId/availability' },
	canPath: 'canConvert',
	donePath: 'status',
	doneValue: 'converted',
	referencePath: 'caseReference',
	action: { url: '/apps/pipelinq/api/handoff/request/@objectId/convert-to-case', label: 'Convert to case' },
	labels: {
		done: 'This request has been converted to a case.',
		reference: 'Case reference',
		success: 'Request converted to case.',
	},
	errors: {
		path: 'status',
		map: {
			'invalid-status': { text: 'Conversion is no longer available for this request.', reload: true },
			'handoff-failed': { text: 'Could not create the case: {reason}' },
		},
		default: 'Could not convert this request to a case.',
	},
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	mockSuccess.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnHandoffAction', () => {
	it('is registered as the handoff widget', () => {
		expect(getWidgetTypeEntry('handoff').renderer).toBe(CnHandoffAction)
	})

	it('renders nothing when the action is not offered', async () => {
		mockGet.mockResolvedValue({ data: { canConvert: false, status: 'new' } })
		const w = mountHandoff(convertToCase)
		await settle(w)
		expect(mockGet.mock.calls[0][0]).toBe('/index.php/apps/pipelinq/api/handoff/request/req-1/availability')
		expect(w.find('[data-testid="cn-handoff-action"]').exists()).toBe(false)
	})

	it('offers the action, sends it, and swaps the button for the done note and the reference', async () => {
		mockGet.mockResolvedValue({ data: { canConvert: true, status: 'in_progress' } })
		mockPost.mockResolvedValue({ data: { caseReference: 'ZAAK-7' } })
		const w = mountHandoff(convertToCase)
		await settle(w)
		const button = w.find('[data-testid="cn-handoff-send"]')
		expect(button.text()).toBe('T:Convert to case')
		await button.trigger('click')
		await settle(w)
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/handoff/request/req-1/convert-to-case', {})
		expect(w.find('[data-testid="cn-handoff-send"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-handoff-done"]').text()).toBe('T:This request has been converted to a case.')
		expect(w.find('[data-testid="cn-handoff-reference"]').text()).toContain('ZAAK-7')
		expect(mockSuccess).toHaveBeenCalledWith('T:Request converted to case.')
	})

	it('shows a record that is already done without a button', async () => {
		mockGet.mockResolvedValue({ data: { canConvert: false, status: 'converted', caseReference: 'ZAAK-3' } })
		const w = mountHandoff(convertToCase)
		await settle(w)
		expect(w.find('[data-testid="cn-handoff-send"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-handoff-reference"]').text()).toContain('ZAAK-3')
	})

	it('links to the result when the response carries a safe link, and never to another scheme', async () => {
		mockGet.mockResolvedValue({ data: { canConvert: true } })
		mockPost.mockResolvedValue({ data: { caseReference: 'W-1', caseUrl: '/apps/dossiq/cases/9' } })
		const w = mountHandoff({ ...convertToCase, linkPath: 'caseUrl', labels: { ...convertToCase.labels, link: 'Open the Woo request' } })
		await settle(w)
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		const link = w.find('[data-testid="cn-handoff-link"]')
		expect(link.attributes('href')).toBe('/apps/dossiq/cases/9')
		expect(link.text()).toBe('T:Open the Woo request')

		mockGet.mockResolvedValue({ data: { canConvert: true } })
		mockPost.mockResolvedValue({ data: { caseReference: 'W-2', caseUrl: 'javascript:alert(1)' } })
		invalidateEndpointSourceCache()
		const unsafe = mountHandoff({ ...convertToCase, linkPath: 'caseUrl' })
		await settle(unsafe)
		await unsafe.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(unsafe)
		expect(unsafe.find('[data-testid="cn-handoff-link"]').exists()).toBe(false)
	})

	it('keeps a repeatable action and shows the last reference', async () => {
		mockGet.mockResolvedValue({ data: { canSend: true, status: 'active' } })
		mockPost.mockResolvedValue({ data: { invoiceReference: 'INV-1' } })
		const w = mountHandoff({
			availability: { url: '/apps/pipelinq/api/handoff/contract/@objectId/availability' },
			canPath: 'canSend',
			repeatable: true,
			referencePath: 'invoiceReference',
			action: { url: '/apps/pipelinq/api/handoff/contract/@objectId/send-to-invoicing', label: 'Send to invoicing' },
			labels: { done: 'Contract sent to invoicing.', reference: 'Invoice reference' },
		})
		await settle(w)
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		expect(w.find('[data-testid="cn-handoff-send"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-handoff-reference"]').text()).toContain('INV-1')
	})

	it('needs every path of a list to be true', async () => {
		mockGet.mockResolvedValue({ data: { available: true, isManager: false } })
		const w = mountHandoff({ ...convertToCase, canPath: ['available', 'isManager'] })
		await settle(w)
		expect(w.find('[data-testid="cn-handoff-send"]').exists()).toBe(false)
	})

	it('shows the fallback link when the action is not offered', async () => {
		mockGet.mockResolvedValue({ data: { available: true, isManager: false, deepLinkUrl: 'https://shillinq.example/clients/1' } })
		const w = mountHandoff({
			...convertToCase,
			canPath: ['available', 'isManager'],
			fallbackLinkPath: 'deepLinkUrl',
			labels: { fallbackLink: 'Continue in Shillinq' },
		})
		await settle(w)
		const link = w.find('[data-testid="cn-handoff-fallback"]')
		expect(link.attributes('href')).toBe('https://shillinq.example/clients/1')
		expect(link.text()).toBe('T:Continue in Shillinq')
	})

	it('asks the declared fields, prefilled from tokens, and posts them', async () => {
		mockGet.mockResolvedValue({ data: { available: true, isManager: true } })
		mockPost.mockResolvedValue({ data: { status: 'synced', invoiceNumber: 'F-12', entryCount: 4 } })
		const w = mountHandoff({
			availability: { url: '/apps/pipelinq/api/billing/handoff/@objectId/availability' },
			canPath: ['available', 'isManager'],
			repeatable: true,
			fields: [
				{ key: 'periodStart', type: 'date', label: 'From', default: '@monthStart' },
				{ key: 'periodEnd', type: 'date', label: 'To', default: '2026-10-31' },
			],
			action: { url: '/apps/pipelinq/api/billing/handoff/@objectId', label: 'Send to billing' },
			results: {
				path: 'status',
				map: {
					synced: { type: 'success', text: 'Sent to billing. Draft invoice {invoiceNumber} created ({entryCount} entries).' },
					empty: { type: 'success', text: 'No approved, un-billed hours in this period.' },
				},
			},
		})
		await settle(w)
		const inputs = w.findAll('input[type="date"]')
		expect(inputs.length).toBe(2)
		expect(inputs.at(0).element.value).toMatch(/^\d{4}-\d{2}-01$/)
		expect(w.find('label[for="' + inputs.at(1).attributes('id') + '"]').text()).toBe('T:To')
		await inputs.at(0).setValue('2026-10-01')
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/billing/handoff/req-1', { periodStart: '2026-10-01', periodEnd: '2026-10-31' })
		const result = w.find('[data-testid="cn-handoff-result"]')
		expect(result.attributes('data-type')).toBe('success')
		expect(result.text()).toBe('T:Sent to billing. Draft invoice F-12 created (4 entries).')
	})

	it('blocks the send while a required field is empty', async () => {
		mockGet.mockResolvedValue({ data: { canConvert: true } })
		const w = mountHandoff({ ...convertToCase, fields: [{ key: 'periodStart', type: 'date', label: 'From' }] })
		await settle(w)
		expect(w.find('[data-testid="cn-handoff-send"]').element.disabled).toBe(true)
	})

	it('names the reason of a refusal and reads the availability again', async () => {
		mockGet.mockResolvedValue({ data: { canConvert: true } })
		mockPost.mockRejectedValue({ response: { data: { status: 'invalid-status' } } })
		const w = mountHandoff(convertToCase)
		await settle(w)
		mockGet.mockResolvedValue({ data: { canConvert: false } })
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(w.find('[data-testid="cn-handoff-error"]').text()).toBe('T:Conversion is no longer available for this request.')
	})

	it('fills the refusal text from the response and falls back to the default', async () => {
		mockGet.mockResolvedValue({ data: { canConvert: true } })
		mockPost.mockRejectedValueOnce({ response: { data: { status: 'handoff-failed', reason: 'no case type' } } })
		const w = mountHandoff(convertToCase)
		await settle(w)
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		expect(w.find('[data-testid="cn-handoff-error"]').text()).toBe('T:Could not create the case: no case type')

		mockPost.mockRejectedValueOnce(new Error('network'))
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		expect(w.find('[data-testid="cn-handoff-error"]').text()).toBe('T:Could not convert this request to a case.')
	})

	it('picks the first variant whose whenPath holds, and reads a text the answer carries', async () => {
		mockGet.mockResolvedValue({ data: { available: true } })
		const results = {
			path: 'status',
			map: {
				synced: [
					{ whenPath: 'duplicated', text: 'Already sent. Draft invoice {invoiceNumber} exists.' },
					{ text: 'Draft invoice {invoiceNumber} created.' },
				],
				unmapped: { type: 'error', textPath: 'message', text: 'Check the organisation reference.' },
			},
		}
		const w = mountHandoff({ ...convertToCase, canPath: 'available', repeatable: true, results })
		await settle(w)
		mockPost.mockResolvedValueOnce({ data: { status: 'synced', duplicated: true, invoiceNumber: 'F-1' } })
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		expect(w.find('[data-testid="cn-handoff-result"]').text()).toBe('T:Already sent. Draft invoice F-1 exists.')

		mockPost.mockResolvedValueOnce({ data: { status: 'unmapped', message: 'No rate for consultancy' } })
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		const result = w.find('[data-testid="cn-handoff-result"]')
		expect(result.attributes('data-type')).toBe('error')
		expect(result.text()).toBe('No rate for consultancy')
	})

	it('reads the availability again after a default refusal that asks for it', async () => {
		mockGet.mockResolvedValue({ data: { canConvert: true } })
		mockPost.mockRejectedValue(new Error('gone'))
		const w = mountHandoff({ ...convertToCase, errors: { default: { text: 'This question can no longer be converted.', reload: true } } })
		await settle(w)
		await w.find('[data-testid="cn-handoff-send"]').trigger('click')
		await settle(w)
		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(w.find('[data-testid="cn-handoff-error"]').text()).toBe('T:This question can no longer be converted.')
	})

	it('copies the reference', async () => {
		const writeText = jest.fn().mockResolvedValue()
		Object.defineProperty(global.navigator, 'clipboard', { value: { writeText }, configurable: true })
		mockGet.mockResolvedValue({ data: { status: 'converted', caseReference: 'ZAAK-3' } })
		const w = mountHandoff({ ...convertToCase, copyReference: true, labels: { ...convertToCase.labels, copied: 'Case reference copied.' } })
		await settle(w)
		await w.find('[data-testid="cn-handoff-copy"]').trigger('click')
		await settle(w)
		expect(writeText).toHaveBeenCalledWith('ZAAK-3')
		expect(mockSuccess).toHaveBeenCalledWith('T:Case reference copied.')
	})
})

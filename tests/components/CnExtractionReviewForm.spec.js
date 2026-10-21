import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/extraction-review-form/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import CnExtractionReviewForm from '../../src/components/CnExtractionReviewForm/CnExtractionReviewForm.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const stubs = { NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] } }
const flush = () => new Promise((r) => setTimeout(r, 0))

const FIELDS = [
	{ key: 'invoiceNumber', label: 'Invoice number', required: true },
	{ key: 'invoiceDate', label: 'Invoice date', type: 'date' },
	{ key: 'totalInclVat', label: 'Total', type: 'money', minorUnits: true },
	{ key: 'glAccount', label: 'Ledger account' },
]

const DRAFT = {
	id: 'draft-1',
	invoiceNumber: 'F-88',
	invoiceDate: '2026-02-01',
	totalInclVat: 12100,
	glAccount: '',
	fieldConfidence: { invoiceNumber: 0.97, totalInclVat: 0.42 },
	humanCorrected: ['invoiceDate'],
}

function build(props = {}) {
	return mount(CnExtractionReviewForm, {
		props: {
			fields: FIELDS,
			object: DRAFT,
			draftSource: { confidencePath: 'fieldConfidence', correctedPath: 'humanCorrected' },
			threshold: 0.8,
			confirmEndpoint: { url: '/apps/shillinq/api/v1/extraction/drafts/@objectId?schema=SupplierInvoice' },
			...props,
		},
		global: { stubs },
	})
}

describe('CnExtractionReviewForm', () => {
	afterEach(() => jest.clearAllMocks())

	it('shows every field with its value, money in units', () => {
		const w = build()
		expect(w.get('[data-testid="cn-extraction-field-invoiceNumber"] input').element.value).toBe('F-88')
		expect(w.get('[data-testid="cn-extraction-field-totalInclVat"] input').element.value).toBe('121')
		expect(w.get('[data-testid="cn-extraction-field-invoiceDate"] input').attributes('type')).toBe('date')
	})

	it('says the confidence in words, not colour only, and asks to check a field below the threshold', () => {
		const w = build()
		const sure = w.get('[data-testid="cn-extraction-field-invoiceNumber"]').text()
		expect(sure).toContain('97%')
		expect(sure).not.toContain('Check this value')
		const unsure = w.get('[data-testid="cn-extraction-field-totalInclVat"]').text()
		expect(unsure).toContain('42%')
		expect(unsure).toContain('Check this value')
		expect(w.get('[data-testid="cn-extraction-field-totalInclVat"] input').attributes('aria-describedby')).toBeTruthy()
		expect(w.get('[data-testid="cn-extraction-field-glAccount"]').text()).not.toContain('%')
	})

	it('marks a field corrected by hand', () => {
		const w = build()
		expect(w.get('[data-testid="cn-extraction-field-invoiceDate"]').text()).toContain('Corrected by hand')
	})

	it('saves only the changed fields through the confirm endpoint, money back in minor units', async () => {
		axios.put.mockResolvedValue({ data: { record: { ...DRAFT, totalInclVat: 12500 } } })
		const w = build()
		await w.get('[data-testid="cn-extraction-field-totalInclVat"] input').setValue('125')
		await w.get('[data-testid="cn-extraction-field-glAccount"] input').setValue('4500')
		await w.get('[data-testid="cn-extraction-save"]').trigger('click')
		await flush()

		expect(axios.put).toHaveBeenCalledWith(
			'/nc/apps/shillinq/api/v1/extraction/drafts/draft-1?schema=SupplierInvoice',
			{ totalInclVat: 12500, glAccount: '4500' },
		)
		expect(w.emitted('saved')[0][0].totalInclVat).toBe(12500)
	})

	it('does not save while a required field is empty', async () => {
		const w = build()
		await w.get('[data-testid="cn-extraction-field-invoiceNumber"] input').setValue('  ')
		expect(w.get('[data-testid="cn-extraction-save"]').attributes('disabled')).toBeDefined()
	})

	it('shows the refusal the server gives', async () => {
		axios.put.mockRejectedValue({ response: { data: { error: 'This invoice is already confirmed.' } } })
		const w = build()
		await w.get('[data-testid="cn-extraction-save"]').trigger('click')
		await flush()
		expect(w.get('[role="alert"]').text()).toBe('This invoice is already confirmed.')
		expect(w.emitted('saved')).toBeUndefined()
	})

	it('asks for the extraction again when a request endpoint is configured', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = build({ requestEndpoint: { url: '/apps/shillinq/api/v1/extraction/request', body: { id: '@objectId', documentUri: '@object.sourceDocumentUri' } }, object: { ...DRAFT, sourceDocumentUri: 'docudesk://x' } })
		await w.get('[data-testid="cn-extraction-request"]').trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/shillinq/api/v1/extraction/request', { id: 'draft-1', documentUri: 'docudesk://x' })
		expect(w.emitted('requested')).toHaveLength(1)

		expect(build().find('[data-testid="cn-extraction-request"]').exists()).toBe(false)
	})
})

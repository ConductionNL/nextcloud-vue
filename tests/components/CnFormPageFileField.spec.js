/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFormPage with a `type: "file"` field, end to end through the real
 * CnFileField: a picked file becomes a `data:` URL in the submitted payload,
 * and a required file field blocks the submit with an alert.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}))

import { mount } from '@vue/test-utils'
import axios from '@nextcloud/axios'
import CnFormPage from '@/components/CnFormPage/CnFormPage.vue'
import { readFileAsDataUrl } from '@/utils/widgetUpload.js'

const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

const mountForm = (props, cnCustomComponents = {}) => mount(CnFormPage, {
	props,
	global: {
		stubs: { CnPageHeader: true },
		mocks: { $route: { params: { id: 'case-1' } }, $router: { push: jest.fn() } },
		provide: { cnCustomComponents },
	},
})

async function pick(wrapper, file) {
	const input = wrapper.find('[data-testid="cn-file-field-input"]')
	Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
	await input.trigger('change')
	await settle()
}

describe('CnFormPage: file field', () => {
	beforeEach(() => jest.clearAllMocks())

	it('renders CnFileField for a type: "file" field', () => {
		const wrapper = mountForm({
			fields: [{ key: 'report', label: 'Report', type: 'file' }],
			submitHandler: 'noop',
		})
		expect(wrapper.findComponent({ name: 'CnFileField' }).exists()).toBe(true)
	})

	it('puts the picked file into the payload as its data: URL', async () => {
		const handler = jest.fn()
		const file = new File(['advice'], 'advice.pdf', { type: 'application/pdf' })
		const expected = await readFileAsDataUrl(file)
		const wrapper = mountForm({
			fields: [
				{ key: 'title', label: 'Title', type: 'string' },
				{ key: 'report', label: 'Report', type: 'file', accept: '.pdf' },
			],
			initialValue: { title: 'Advice' },
			submitHandler: 'saveAdvice',
		}, { saveAdvice: handler })
		await pick(wrapper, file)
		await wrapper.find('form').trigger('submit')
		await settle()
		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0][0]).toEqual({ title: 'Advice', report: expected })
	})

	it('sends the data: URL as JSON to a submitEndpoint', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const file = new File(['advice'], 'advice.pdf', { type: 'application/pdf' })
		const expected = await readFileAsDataUrl(file)
		const wrapper = mountForm({
			fields: [{ key: 'report', label: 'Report', type: 'file' }],
			submitEndpoint: '/apps/openregister/api/objects/dossiq/advice/:id',
		})
		await pick(wrapper, file)
		await wrapper.find('form').trigger('submit')
		await settle()
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/advice/case-1', { report: expected })
	})

	it('blocks the submit and shows the alert when a required file is missing', async () => {
		const handler = jest.fn()
		const wrapper = mountForm({
			fields: [{ key: 'report', label: 'Report', type: 'file', validation: { required: true } }],
			submitHandler: 'saveAdvice',
		}, { saveAdvice: handler })
		await wrapper.find('form').trigger('submit')
		await settle()
		expect(handler).not.toHaveBeenCalled()
		const alert = wrapper.find('#cn-form-page__field-error-report')
		expect(alert.exists()).toBe(true)
		expect(alert.attributes('role')).toBe('alert')
	})
})

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

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnFormPage from '@/components/CnFormPage/CnFormPage.vue'
import { readFileAsDataUrl } from '@/utils/widgetUpload.js'

const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

/**
 * Wait until the mounted CnFileField has finished with the picked file.
 *
 * A FIXED SLEEP IS WHAT MADE THIS FLAKY, and #1087 already established that
 * for CnFileField's own spec. This file mounts the SAME real component through
 * CnFormPage and kept the 20 ms guess, so the same latent flake stayed here:
 * a FileReader resolves on a macrotask, `flushPromises()` cannot cover it, and
 * 20 ms is a guess that holds on a quiet machine and loses on a loaded runner.
 * When it lost, the read had not resolved, the field had emitted nothing, and
 * the submitted payload asserted below was `{}` — a failure that names the
 * assertion and not the wait.
 *
 * So this waits on the child component's own `reading` flag, set before the
 * read's `await` and cleared in its `finally`, exactly as #1087 does. A read
 * that never finishes fails loudly here rather than letting a later assertion
 * read an absent value.
 *
 * @param {object} wrapper The mounted CnFormPage.
 * @param {number} [timeoutMs] How long a read may take before the test fails.
 * @return {Promise<void>}
 */
async function settleRead(wrapper, timeoutMs = 5000) {
	const field = wrapper.findComponent({ name: 'CnFileField' })
	const deadline = Date.now() + timeoutMs
	while (field.vm.reading && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 5))
	}
	if (field.vm.reading) {
		throw new Error(`CnFileField was still reading the file after ${timeoutMs} ms`)
	}
	await wrapper.vm.$nextTick()
}

function mountForm(props, cnCustomComponents = {}) {
	return mount(CnFormPage, {
		props,
		global: {
			stubs: { CnPageHeader: true },
			mocks: { $route: { params: { id: 'case-1' } }, $router: { push: jest.fn() } },
			provide: { cnCustomComponents },
		},
	})
}

async function pick(wrapper, file) {
	const input = wrapper.find('[data-testid="cn-file-field-input"]')
	Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
	await input.trigger('change')
	await settleRead(wrapper)
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

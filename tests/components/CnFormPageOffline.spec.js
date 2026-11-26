/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An offline form queues its submission (manifest-offline-block task 4,
 * design D6): validated as online, the visible-field payload is queued for
 * the declared register and schema, the sentence is shown and `queued` is
 * emitted. A form not listed behaves as before; file fields are disabled
 * while offline.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-an-offline-form-queues-its-submission-and-the-root-sends-it
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}))

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => p,
}))

const mockEnqueue = jest.fn(() => Promise.resolve('op-1'))
jest.mock('../../src/integrations/offline/offlineDb.js', () => ({
	enqueueMutation: (...args) => mockEnqueue(...args),
	resolveDeviceId: () => 'device-test',
}))

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnFormPage from '@/components/CnFormPage/CnFormPage.vue'

const FIELDS = [
	{ key: 'address', label: 'Address', type: 'string', validation: { required: true } },
	{ key: 'finding', label: 'Finding', type: 'string' },
	{ key: 'hidden', label: 'Hidden', type: 'string', visibleWhen: { field: 'finding', eq: 'never' } },
	{ key: 'photo', label: 'Photo', type: 'file' },
]

/**
 * Set navigator.onLine.
 *
 * @param {boolean} value Online or not.
 * @return {void}
 */
function setOnline(value) {
	Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value })
}

/**
 * Mount the inspection report form.
 *
 * @param {object} props Props over the defaults.
 * @param {object} [params] Route params.
 * @return {object} The wrapper.
 */
function mountForm(props = {}, params = {}) {
	return mount(CnFormPage, {
		props: {
			fields: FIELDS,
			register: 'toezicht',
			schema: 'report',
			offline: true,
			title: 'Inspection report',
			initialValue: { address: 'Kerkstraat 12', finding: 'Loose railing', hidden: 'not sent' },
			...props,
		},
		global: {
			stubs: { CnPageHeader: true },
			mocks: { $route: { params }, $router: { push: jest.fn() } },
		},
	})
}

describe('CnFormPage: offline form', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		setOnline(true)
	})

	afterAll(() => setOnline(true))

	it('queues a create of the visible fields while offline, says so and emits queued', async () => {
		setOnline(false)
		const wrapper = mountForm()
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(mockEnqueue).toHaveBeenCalledTimes(1)
		expect(mockEnqueue.mock.calls[0][0]).toEqual({
			deviceId: 'device-test',
			operationType: 'create',
			register: 'toezicht',
			schema: 'report',
			targetId: null,
			payload: { address: 'Kerkstraat 12', finding: 'Loose railing' },
			label: 'Inspection report',
		})
		expect(axios.post).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-form-page-queued"]').text()).toBe('Saved on this device. It will be sent when you are back online.')
		expect(wrapper.emitted('queued')).toEqual([['op-1']])
		expect(wrapper.emitted('submit')).toBeUndefined()
	})

	it('queues an update of the route\'s record in edit mode', async () => {
		setOnline(false)
		const wrapper = mountForm({ mode: 'edit' }, { id: 'rep-7' })
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(mockEnqueue.mock.calls[0][0]).toMatchObject({ operationType: 'update', targetId: 'rep-7' })
	})

	it('validates as online: a missing required field queues nothing', async () => {
		setOnline(false)
		const wrapper = mountForm({ initialValue: { finding: 'x' } })
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(mockEnqueue).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-form-page-queued"]').exists()).toBe(false)
	})

	it('queues when the send fails without any answer', async () => {
		axios.post.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' }))
		const wrapper = mountForm()
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/toezicht/report', { address: 'Kerkstraat 12', finding: 'Loose railing' })
		expect(mockEnqueue).toHaveBeenCalledTimes(1)
		expect(wrapper.emitted('queued')).toEqual([['op-1']])
	})

	it('shows a refusal from the server instead of queueing it', async () => {
		axios.post.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Not allowed' } } })
		const wrapper = mountForm()
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(mockEnqueue).not.toHaveBeenCalled()
		expect(wrapper.emitted('error')).toHaveLength(1)
	})

	it('posts online to the schema\'s object URL and emits submit', async () => {
		axios.post.mockResolvedValueOnce({ data: { id: 'rep-1' } })
		const wrapper = mountForm()
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(mockEnqueue).not.toHaveBeenCalled()
		expect(wrapper.emitted('submit')).toHaveLength(1)
	})

	it('disables file fields while offline, with the reason', async () => {
		setOnline(false)
		const wrapper = mountForm()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-page-file-offline"]').text()).toBe('Files cannot be sent offline.')
		expect(wrapper.findComponent({ name: 'CnFileField' }).props('disabled')).toBe(true)

		setOnline(true)
		window.dispatchEvent(new Event('online'))
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-form-page-file-offline"]').exists()).toBe(false)
	})

	it('leaves a form not listed as offline as it was: offline, it sends and does not queue', async () => {
		setOnline(false)
		axios.post.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { isAxiosError: true }))
		const wrapper = mountForm({ offline: false, submitEndpoint: '/apps/myapp/api/reports' })
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(mockEnqueue).not.toHaveBeenCalled()
		expect(axios.post).toHaveBeenCalledWith('/apps/myapp/api/reports', expect.any(Object))
		expect(wrapper.emitted('error')).toHaveLength(1)
		expect(wrapper.find('[data-testid="cn-form-page-file-offline"]').exists()).toBe(false)
	})
})

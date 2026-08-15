/**
 * Tests for CnCalendarEventCreate — modal for creating a VEVENT linked
 * to an OpenRegister object.
 *
 * Asserts:
 *  - Form requires a non-empty summary
 *  - Submit POSTs to /api/objects/{r}/{s}/{id}/events with the right shape
 *  - Successful submit emits `created`
 *  - Cancel emits `close`
 *  - Failed submit renders an error banner
 */

const { mount } = require('@vue/test-utils')
const CnCalendarEventCreate = require('../CnCalendarEventCreate.vue').default

const STUBS = {
	NcModal: { template: '<div class="cn-modal"><slot /></div>' },
	NcButton: { template: '<button class="cn-btn" @click="$emit(\'click\')"><slot /></button>' },
	NcTextField: {
		props: ['value'],
		template: '<input class="cn-text-field" :value="value" @input="$emit(\'input\', $event.target.value)" />',
	},
	NcTextArea: {
		props: ['value'],
		template: '<textarea class="cn-text-area" :value="value" @input="$emit(\'input\', $event.target.value)" />',
	},
	NcLoadingIcon: { template: '<div class="cn-loading" />' },
	NcDateTimePickerNative: {
		props: ['value'],
		template: '<input class="cn-dt" :value="value" />',
	},
}

function flush() {
	return new Promise((resolve) => Promise.resolve().then(() => Promise.resolve().then(resolve)))
}

describe('CnCalendarEventCreate', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	function mountCreate() {
		return mount(CnCalendarEventCreate, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
	}

	it('disables submit when summary is empty', async () => {
		const wrapper = mountCreate()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.form.summary = 'Hello'
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.unmount()
	})

	it('POSTs the new meeting to /events on submit', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ id: 'new.ics', uid: 'newuid', summary: 'Kickoff' }),
		})

		const wrapper = mountCreate()
		wrapper.vm.form.summary = 'Kickoff'
		await wrapper.vm.submit()
		await flush()

		const call = global.fetch.mock.calls[0]
		expect(call[0]).toBe('/apps/openregister/api/objects/r1/s1/o1/events')
		expect(call[1].method).toBe('POST')
		const body = JSON.parse(call[1].body)
		expect(body.summary).toBe('Kickoff')
		expect(body.dtstart).toBeDefined()
		expect(wrapper.emitted('created')).toBeTruthy()
		wrapper.unmount()
	})

	it('emits close on cancel', () => {
		const wrapper = mountCreate()
		wrapper.vm.onClose()
		expect(wrapper.emitted('close')).toBeTruthy()
		wrapper.unmount()
	})

	it('shows an error banner when the server responds 400', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: () => Promise.resolve({ error: 'Invalid' }),
		})

		const wrapper = mountCreate()
		wrapper.vm.form.summary = 'Bad'
		await wrapper.vm.submit()
		await flush()

		expect(wrapper.vm.error).toBe('Invalid')
		wrapper.unmount()
	})
})

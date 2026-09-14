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
	// The stub forwards `type` on purpose. It used to swallow it, and that is
	// why "POSTs the new meeting" passed for months while every meeting the
	// real dialog created had no start time: the real component only knows
	// date / datetime-local / month / time, the template asked for `datetime`,
	// and the value went to `<input type="datetime">`, which is not an HTML
	// input type. The browser fell back to a text box, nothing bound, and the
	// stub knew nothing about any of it.
	NcDateTimePickerNative: {
		props: ['value', 'type'],
		template: '<input class="cn-dt" :type="type" :value="value" />',
	},
}

/** The input types NcDateTimePickerNative understands. */
const PICKER_TYPES = ['date', 'datetime-local', 'month', 'time']

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

	it('asks the pickers for a type they actually understand', async () => {
		const wrapper = mountCreate()
		await wrapper.vm.$nextTick()

		const pickers = wrapper.findAll('.cn-dt')
		expect(pickers.length).toBe(2)
		pickers.forEach((picker, index) => {
			const type = picker.attributes('type')
			expect(PICKER_TYPES).toContain(type)
			// Named explicitly as well as range-checked: `date` is in the list
			// and would drop the time of day, which is not what a meeting wants.
			expect(type).toBe('datetime-local')
			expect(index).toBeLessThan(2)
		})
		wrapper.unmount()
	})

	it('refuses to submit a meeting with no usable start time', async () => {
		const wrapper = mountCreate()
		wrapper.vm.form.summary = 'Hearing'
		expect(wrapper.vm.canSubmit).toBe(true)

		// A VEVENT with no DTSTART shows in no calendar view and cannot be
		// deleted or updated by any CalDAV client. Never post one.
		wrapper.vm.form.dtstart = null
		expect(wrapper.vm.hasValidStart).toBe(false)
		expect(wrapper.vm.canSubmit).toBe(false)

		await wrapper.vm.submit()
		expect(global.fetch).not.toHaveBeenCalled()

		wrapper.vm.form.dtstart = 'not a date'
		expect(wrapper.vm.canSubmit).toBe(false)
		await wrapper.vm.submit()
		expect(global.fetch).not.toHaveBeenCalled()

		wrapper.unmount()
	})

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

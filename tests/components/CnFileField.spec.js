/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnFileField, the `type: "file"` form field.
 *
 * The property that matters most is what the field EMITS: always the picked
 * file's content as a `data:` URL, never a path, a name or a URL. That is
 * what keeps the field from choosing where a file is stored. Every read test
 * below therefore compares the emitted value to what FileReader itself
 * produces for the same File, instead of only checking a prefix.
 */

import { mount } from '@vue/test-utils'
import CnFileField from '@/components/CnFileField/CnFileField.vue'
import { readFileAsDataUrl, FALLBACK_MAX_BYTES } from '@/utils/widgetUpload.js'

/**
 * Wait until the component's async FileReader work has settled.
 *
 * Waits on the component's own `reading` flag rather than on the clock. This
 * used to be a fixed 20ms sleep, and FileReader in jsdom resolves on the event
 * loop, so on a loaded machine the read had not finished when the assertion
 * ran: `emitted('update:modelValue')` came back undefined and the spec failed
 * on a line that was not the bug. It passed alone and failed in a full run.
 *
 * The handler sets `reading` before its first await, so by the time
 * `trigger()` resolves the flag is already true for a file it accepted, and
 * still false for one it refused, which returns straight away.
 *
 * @param {object} wrapper The mounted CnFileField.
 * @return {Promise<void>}
 */
async function settle(wrapper) {
	for (let i = 0; i < 500; i++) {
		if (!wrapper.vm.reading) {
			await wrapper.vm.$nextTick()
			return
		}
		await new Promise((resolve) => setTimeout(resolve, 5))
	}
	throw new Error('CnFileField never finished reading the picked file')
}

/**
 * Put `file` on the hidden input and fire its change event, the way a
 * browser does after the user picks a file.
 *
 * @param {object} wrapper The mounted CnFileField.
 * @param {File} file The picked file.
 * @return {Promise<void>}
 */
async function pick(wrapper, file) {
	const input = wrapper.find('[data-testid="cn-file-field-input"]')
	Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
	await input.trigger('change')
	await settle(wrapper)
}

const pdf = (size = 12) => new File(['x'.repeat(size)], 'advice.pdf', { type: 'application/pdf' })

describe('CnFileField', () => {
	it('emits the picked file as the data: URL FileReader produces for it', async () => {
		const file = pdf()
		const expected = await readFileAsDataUrl(file)
		const wrapper = mount(CnFileField, { props: { label: 'Advice report' } })
		await pick(wrapper, file)
		const emitted = wrapper.emitted('update:modelValue')
		expect(emitted).toHaveLength(1)
		expect(emitted[0][0]).toBe(expected)
		expect(emitted[0][0].startsWith('data:application/pdf;base64,')).toBe(true)
	})

	it('never emits the file name or a path, only content', async () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report' } })
		await pick(wrapper, pdf())
		const value = wrapper.emitted('update:modelValue')[0][0]
		expect(value).not.toContain('advice.pdf')
		expect(value).not.toMatch(/^(\/|https?:|file:)/)
	})

	it('shows the picked file name once the parent stores the value', async () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report' } })
		await pick(wrapper, pdf())
		await wrapper.setProps({ modelValue: wrapper.emitted('update:modelValue')[0][0] })
		expect(wrapper.find('[data-testid="cn-file-field-name"]').text()).toBe('advice.pdf')
	})

	it('refuses a file larger than maxSize, says so, and emits nothing', async () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report', maxSize: 10 } })
		await pick(wrapper, pdf(11))
		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
		const alert = wrapper.find('[data-testid="cn-file-field-error"]')
		expect(alert.exists()).toBe(true)
		expect(alert.attributes('role')).toBe('alert')
		expect(alert.text()).toBe('This file is larger than 10 B.')
	})

	it('reads a file of exactly maxSize bytes', async () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report', maxSize: 10 } })
		await pick(wrapper, pdf(10))
		expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
	})

	it('defaults maxSize to the library inline-file cap', () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report' } })
		expect(wrapper.props('maxSize')).toBe(FALLBACK_MAX_BYTES)
	})

	it('refuses a file that does not match accept, and emits nothing', async () => {
		const wrapper = mount(CnFileField, { props: { label: 'Photo', accept: 'image/*' } })
		await pick(wrapper, pdf())
		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
		expect(wrapper.find('[data-testid="cn-file-field-error"]').text()).toBe('This file type is not accepted.')
	})

	it.each([
		['an extension', '.pdf'],
		['an exact MIME type', 'application/pdf'],
		['a wildcard', 'application/*'],
		['one entry of a list, any case', 'image/png, .PDF'],
	])('accepts a file matching %s', async (_what, accept) => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report', accept } })
		await pick(wrapper, pdf())
		expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
	})

	it('forwards accept to the native input so the picker is narrowed too', () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report', accept: '.pdf' } })
		expect(wrapper.find('[data-testid="cn-file-field-input"]').attributes('accept')).toBe('.pdf')
	})

	it('Remove file emits null', async () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report', modelValue: 'data:text/plain;base64,eA==' } })
		await wrapper.find('[data-testid="cn-file-field-remove"]').trigger('click')
		expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
	})

	it('shows an existing file by its title and emits nothing for it', () => {
		// Title and path differ on purpose, so the assertion can tell which one
		// the field read.
		const wrapper = mount(CnFileField, {
			props: { label: 'Advice report', modelValue: { id: 42, title: 'Advies 2026.pdf', path: '/dossiq/case-1/report_1767225600_ab12cd34.pdf' } },
		})
		expect(wrapper.find('[data-testid="cn-file-field-name"]').text()).toBe('Advies 2026.pdf')
		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
	})

	it('falls back to the last part of the path when an existing file has no title', () => {
		const wrapper = mount(CnFileField, {
			props: { label: 'Advice report', modelValue: { id: 42, path: '/dossiq/case-1/report.pdf' } },
		})
		expect(wrapper.find('[data-testid="cn-file-field-name"]').text()).toBe('report.pdf')
	})

	it('names the group with the visible label', () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report' } })
		const group = wrapper.find('[role="group"]')
		const labelId = group.attributes('aria-labelledby')
		expect(labelId).toBeTruthy()
		expect(wrapper.find(`#${labelId}`).text()).toBe('Advice report')
	})

	it('opens the native picker from the Choose file button', async () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report' } })
		const click = jest.spyOn(wrapper.find('[data-testid="cn-file-field-input"]').element, 'click')
		await wrapper.find('[data-testid="cn-file-field-choose"]').trigger('click')
		expect(click).toHaveBeenCalledTimes(1)
	})

	it('does not open the picker while disabled', async () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report', disabled: true } })
		const click = jest.spyOn(wrapper.find('[data-testid="cn-file-field-input"]').element, 'click')
		wrapper.vm.openPicker()
		expect(click).not.toHaveBeenCalled()
	})

	it('shows the surrounding form\'s helperText in its alert', () => {
		const wrapper = mount(CnFileField, { props: { label: 'Advice report', helperText: 'This field is required.' } })
		expect(wrapper.find('[data-testid="cn-file-field-error"]').text()).toBe('This field is required.')
	})
})

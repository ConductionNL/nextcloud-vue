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
import { FALLBACK_MAX_BYTES, readFileAsDataUrl } from '@/utils/widgetUpload.js'

/**
 * Wait until the component has finished with the picked file.
 *
 * A FIXED SLEEP IS WHAT MADE THIS FLAKY. The first version waited 20 ms for a
 * real FileReader, which is a macrotask rather than a microtask, so
 * `flushPromises()` cannot cover it and 20 ms is simply a guess. It held on a
 * quiet machine and lost on a loaded CI runner: the read had not resolved,
 * nothing had been emitted yet, and `emitted()[0][0]` threw on `undefined`.
 * It passed on one branch and failed on the next with no code change between.
 *
 * So this waits on the component's own `reading` flag, which is set before the
 * read's `await` and cleared in its `finally`. The refused paths (wrong type,
 * too large) return before setting it, so for them this resolves immediately,
 * and the tests asserting that NOTHING is emitted are not slowed down or
 * turned into timeouts. A read that never finishes fails loudly here rather
 * than letting a later assertion read an absent emit.
 *
 * @param {object} wrapper The mounted CnFileField.
 * @param {number} [timeoutMs] How long a read may take before the test fails.
 * @return {Promise<void>}
 */
async function settle(wrapper, timeoutMs = 5000) {
	const deadline = Date.now() + timeoutMs
	while (wrapper.vm.reading && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 5))
	}
	if (wrapper.vm.reading) {
		throw new Error(`CnFileField was still reading the file after ${timeoutMs} ms`)
	}
	await wrapper.vm.$nextTick()
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

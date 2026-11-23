/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-file-and-camera-fields/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnFileField from '../../src/components/CnFileField/CnFileField.vue'

const stubs = {
	NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	CnCameraCapture: { name: 'CnCameraCapture', template: '<div class="camera-stub" />' },
}
const mountField = (props = {}) => mount(CnFileField, { props: { label: 'Photos', multiple: true, modelValue: [], ...props }, global: { stubs } })
async function settle(w) {
	for (let i = 0; i < 20 && w.vm.reading; i++) {
		await new Promise((r) => setTimeout(r, 5))
	}
	await w.vm.$nextTick()
}
const photo = (name, size = 10) => new File([new Uint8Array(size)], name, { type: 'image/jpeg' })

describe('CnFileField several files', () => {
	it('lists three dropped photos with name and size, and removing one leaves two', async () => {
		let value = []
		const w = mountField({
			'onUpdate:modelValue': (v) => {
				value = v
				w.setProps({ modelValue: v })
			},
		})
		await w.get('[data-testid="cn-file-field"]').trigger('drop', { dataTransfer: { files: [photo('a.jpg'), photo('b.jpg'), photo('c.jpg')] } })
		await settle(w)
		expect(value).toHaveLength(3)
		await w.vm.$nextTick()
		const rows = w.findAll('[data-testid="cn-file-field-item"]')
		expect(rows).toHaveLength(3)
		expect(rows[0].text()).toContain('a.jpg')
		expect(rows[0].text()).toContain('10 B')

		await rows[1].get('[data-testid="cn-file-field-remove-item"]').trigger('click')
		await w.vm.$nextTick()
		expect(value).toHaveLength(2)
		expect(w.findAll('[data-testid="cn-file-field-item"]').map((r) => r.text()).join()).not.toContain('b.jpg')
	})

	it('the drop area is also a button that opens the picker', async () => {
		const w = mountField()
		const click = jest.spyOn(w.get('[data-testid="cn-file-field-input"]').element, 'click')
		await w.get('[data-testid="cn-file-field-choose"]').trigger('click')
		expect(click).toHaveBeenCalled()
		expect(w.get('[data-testid="cn-file-field-input"]').attributes('multiple')).toBeDefined()
	})

	it('keeps files already there when more are added, and checks each against accept', async () => {
		const existing = [{ title: 'old.jpg' }]
		const w = mountField({ modelValue: existing, accept: 'image/*' })
		await w.get('[data-testid="cn-file-field"]').trigger('drop', { dataTransfer: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] } })
		await settle(w)
		expect(w.emitted('update:modelValue')).toBeUndefined()
		expect(w.get('[data-testid="cn-file-field-error"]').text()).toBe('This file type is not accepted.')
	})

	it('holds a file over inlineMax as a File and reads a smaller one inline', async () => {
		const w = mountField({ inlineMax: 100, maxSize: 1000 })
		await w.get('[data-testid="cn-file-field"]').trigger('drop', { dataTransfer: { files: [photo('small.jpg', 50), photo('big.jpg', 500)] } })
		await settle(w)
		const [value] = w.emitted('update:modelValue')[0]
		expect(typeof value[0]).toBe('string')
		expect(value[0].startsWith('data:')).toBe(true)
		expect(value[1]).toBeInstanceOf(File)
		expect(value[1].name).toBe('big.jpg')
	})

	it('refuses a file over maxSize even when inlineMax would hold it', async () => {
		const w = mountField({ inlineMax: 100, maxSize: 200 })
		await w.get('[data-testid="cn-file-field"]').trigger('drop', { dataTransfer: { files: [photo('huge.jpg', 500)] } })
		await settle(w)
		expect(w.emitted('update:modelValue')).toBeUndefined()
		expect(w.get('[data-testid="cn-file-field-error"]').exists()).toBe(true)
	})

	it('a single field with inlineMax holds the big file', async () => {
		const w = mountField({ multiple: false, modelValue: null, inlineMax: 100, maxSize: 1000 })
		await w.get('[data-testid="cn-file-field"]').trigger('drop', { dataTransfer: { files: [photo('big.jpg', 500)] } })
		await settle(w)
		expect(w.emitted('update:modelValue')[0][0]).toBeInstanceOf(File)
	})
})

describe('CnFileField camera', () => {
	afterEach(() => {
		delete navigator.mediaDevices
	})

	it('capture sets the input attribute and accepts images unless narrowed', () => {
		const w = mountField({ multiple: false, modelValue: null, capture: 'environment' })
		const input = w.get('[data-testid="cn-file-field-input"]')
		expect(input.attributes('capture')).toBe('environment')
		expect(input.attributes('accept')).toBe('image/*')
		const narrowed = mountField({ multiple: false, modelValue: null, capture: 'user', accept: 'image/png' })
		expect(narrowed.get('[data-testid="cn-file-field-input"]').attributes('accept')).toBe('image/png')
	})

	it('offers Take photo only with a camera API, and opens the capture surface on press', async () => {
		const without = mountField({ multiple: false, modelValue: null, capture: 'environment' })
		expect(without.find('[data-testid="cn-file-field-take-photo"]').exists()).toBe(false)

		Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn() } })
		window.matchMedia = window.matchMedia || (() => ({ matches: false }))
		const w = mountField({ multiple: false, modelValue: null, capture: 'environment' })
		expect(w.find('.camera-stub').exists()).toBe(false)
		await w.get('[data-testid="cn-file-field-take-photo"]').trigger('click')
		expect(w.find('.camera-stub').exists()).toBe(true)
	})

	it('puts the captured photo into the field', async () => {
		Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn() } })
		window.matchMedia = window.matchMedia || (() => ({ matches: false }))
		const w = mountField({ multiple: false, modelValue: null, capture: 'environment' })
		await w.get('[data-testid="cn-file-field-take-photo"]').trigger('click')
		w.findComponent({ name: 'CnCameraCapture' }).vm.$emit('capture', photo('photo.jpg'))
		await settle(w)
		expect(w.emitted('update:modelValue')[0][0]).toMatch(/^data:/)
	})
})

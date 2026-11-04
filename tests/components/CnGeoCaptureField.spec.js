/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnGeoCaptureField: where something was recorded, from the device, with a
 * retry and an address by hand when the fix is rough or missing.
 *
 * @spec openspec/changes/checklist-run-location/specs/checklist-run-location/spec.md#requirement-a-field-captures-where-something-was-recorded
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnGeoCaptureField from '../../src/components/CnGeoCaptureField/CnGeoCaptureField.vue'
import { captureLocation } from '../../src/utils/captureLocation.js'

const FIX = { lat: 51.90123, lng: 4.48312, accuracy: 12.4, at: '2026-10-06T10:52:00Z', low: false }

const stubs = {
	NcButton: { name: 'NcButton', emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
	NcTextField: { name: 'NcTextField', props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input class="address">' },
}

function mountField(props = {}) {
	return mount(CnGeoCaptureField, { props, global: { stubs } })
}

function setDevice(getCurrentPosition) {
	Object.defineProperty(global.navigator, 'geolocation', { configurable: true, value: getCurrentPosition ? { getCurrentPosition } : undefined })
}

const line = (w) => w.find('[data-testid="cn-geo-capture-line"]')

describe('CnGeoCaptureField', () => {
	afterEach(() => setDevice(null))

	it('reads a good fix as coordinates, accuracy and time, in the status role', () => {
		const w = mountField({ modelValue: FIX })
		expect(line(w).text()).toContain('51.9012, 4.4831 · ±12 m')
		expect(line(w).attributes('role')).toBe('status')
		expect(w.find('.address').exists()).toBe(false)
	})

	it('says a rough fix is inaccurate and offers a retry and an address', () => {
		const w = mountField({ modelValue: { ...FIX, accuracy: 200, low: true } })
		expect(line(w).text()).toContain('±200 m')
		expect(w.find('[data-testid="cn-geo-capture-retry"]').exists()).toBe(true)
		expect(w.find('.address').exists()).toBe(true)
	})

	it('keeps the fix beside a typed address', () => {
		const w = mountField({ modelValue: { ...FIX, low: true } })
		w.findComponent({ name: 'NcTextField' }).vm.$emit('update:modelValue', 'Kerkplein 7')
		expect(w.emitted('update:modelValue')[0][0]).toEqual({ ...FIX, low: true, address: 'Kerkplein 7' })
	})

	it('marks a typed address without a fix as low', () => {
		const w = mountField()
		w.findComponent({ name: 'NcTextField' }).vm.$emit('update:modelValue', 'Kerkplein 7')
		expect(w.emitted('update:modelValue')[0][0]).toEqual({ low: true, address: 'Kerkplein 7' })
	})

	it('captures on mount with auto and judges the accuracy', async () => {
		setDevice((ok) => ok({ coords: { latitude: 52, longitude: 5, accuracy: 80 } }))
		const w = mountField({ auto: true, goodAccuracy: 50 })
		await flushPromises()
		expect(w.emitted('update:modelValue')[0][0]).toMatchObject({ lat: 52, lng: 5, accuracy: 80, low: true })
	})

	it('does not ask the device when it already holds a value', async () => {
		const ask = jest.fn()
		setDevice(ask)
		mountField({ auto: true, modelValue: FIX })
		await flushPromises()
		expect(ask).not.toHaveBeenCalled()
	})

	it('keeps a typed address when a retry finds a fix', async () => {
		setDevice((ok) => ok({ coords: { latitude: 52, longitude: 5, accuracy: 10 } }))
		const w = mountField({ modelValue: { low: true, address: 'Kerkplein 7' } })
		await w.find('[data-testid="cn-geo-capture-retry"]').trigger('click')
		await flushPromises()
		expect(w.emitted('update:modelValue')[0][0]).toMatchObject({ lat: 52, low: false, address: 'Kerkplein 7' })
	})

	it('says it is looking while busy', () => {
		const w = mountField({ busy: true })
		expect(line(w).text()).toBe('Looking for your location…')
		expect(w.find('.address').exists()).toBe(false)
	})

	it('emits nothing on a refusal and says there is no location', async () => {
		setDevice((_ok, fail) => fail(new Error('denied')))
		const w = mountField({ auto: true })
		await flushPromises()
		expect(w.emitted('update:modelValue')).toBeUndefined()
		expect(line(w).text()).toContain('No location found')
	})
})

describe('captureLocation', () => {
	afterEach(() => setDevice(null))

	it('answers null without a device', async () => {
		setDevice(null)
		await expect(captureLocation()).resolves.toBeNull()
	})

	it('answers null on a refusal', async () => {
		setDevice((_ok, fail) => fail(new Error('denied')))
		await expect(captureLocation()).resolves.toBeNull()
	})
})

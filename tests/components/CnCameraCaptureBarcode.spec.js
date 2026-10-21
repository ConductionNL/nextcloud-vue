/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/camera-barcode-mode/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import CnCameraCapture from '../../src/components/CnCameraCapture/CnCameraCapture.vue'

const stubs = { NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] } }

function fakeCamera() {
	const track = { stop: jest.fn() }
	const stream = { getTracks: () => [track] }
	const getUserMedia = jest.fn().mockResolvedValue(stream)
	Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
	return { track, getUserMedia }
}

function fakeDetector({ supported = ['qr_code', 'ean_13'], codes = [] } = {}) {
	const detect = jest.fn().mockResolvedValue(codes)
	const ctor = jest.fn(function() {
		this.detect = detect
	})
	ctor.getSupportedFormats = jest.fn().mockResolvedValue(supported)
	window.BarcodeDetector = ctor
	return { ctor, detect }
}

describe('CnCameraCapture mode barcode', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.useRealTimers()
		delete navigator.mediaDevices
		delete window.BarcodeDetector
		jest.restoreAllMocks()
	})

	async function settle() {
		for (let i = 0; i < 5; i++) {
			jest.advanceTimersByTime(300)
			await Promise.resolve()
			await Promise.resolve()
		}
	}

	it('reads a barcode from the camera, emits scan with the value and format, then stops the camera', async () => {
		const { track } = fakeCamera()
		const { ctor } = fakeDetector({ codes: [{ rawValue: '8712345678906', format: 'ean_13' }] })
		const w = mount(CnCameraCapture, { props: { mode: 'barcode', formats: ['ean_13'] }, global: { stubs } })
		await settle()

		expect(ctor).toHaveBeenCalledWith({ formats: ['ean_13'] })
		expect(w.emitted('scan')[0]).toEqual(['8712345678906', 'ean_13'])
		expect(track.stop).toHaveBeenCalled()
		expect(w.emitted('close')).toHaveLength(1)
		expect(w.find('[data-testid="cn-camera-capture-button"]').exists()).toBe(false)
	})

	it('keeps looking until a frame holds a code', async () => {
		fakeCamera()
		const { detect } = fakeDetector()
		detect.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValue([{ rawValue: 'SKU-1', format: 'qr_code' }])
		const w = mount(CnCameraCapture, { props: { mode: 'barcode' }, global: { stubs } })
		await settle()

		expect(detect.mock.calls.length).toBeGreaterThanOrEqual(3)
		expect(w.emitted('scan')[0][0]).toBe('SKU-1')
	})

	it('offers typed entry next to the camera, and emits scan with the trimmed code', async () => {
		fakeCamera()
		fakeDetector()
		const w = mount(CnCameraCapture, { props: { mode: 'barcode' }, global: { stubs } })
		await settle()

		const input = w.get('[data-testid="cn-camera-manual-input"]')
		expect(w.get('label[for="' + input.attributes('id') + '"]').text()).toContain('Type the code')
		await input.setValue('  SKU-42 ')
		await w.get('[data-testid="cn-camera-manual-form"]').trigger('submit')
		expect(w.emitted('scan')[0]).toEqual(['SKU-42', 'manual'])
	})

	it('without manualFallback hides typed entry while the camera reads codes', async () => {
		fakeCamera()
		fakeDetector()
		const w = mount(CnCameraCapture, { props: { mode: 'barcode', manualFallback: false }, global: { stubs } })
		await settle()

		expect(w.find('[data-testid="cn-camera-manual-input"]').exists()).toBe(false)
	})

	it('falls back to typed entry, without starting the camera, when the browser cannot read barcodes', async () => {
		const { getUserMedia } = fakeCamera()
		const w = mount(CnCameraCapture, { props: { mode: 'barcode', manualFallback: false }, global: { stubs } })
		await settle()

		expect(getUserMedia).not.toHaveBeenCalled()
		expect(w.get('[role="status"]').text()).toContain('cannot read barcodes')
		expect(w.find('[data-testid="cn-camera-manual-input"]').exists()).toBe(true)
	})

	it('falls back to typed entry when none of the formats is supported or the camera is refused', async () => {
		fakeCamera()
		fakeDetector({ supported: ['aztec'] })
		const unsupported = mount(CnCameraCapture, { props: { mode: 'barcode', formats: ['ean_13'], manualFallback: false }, global: { stubs } })
		await settle()
		expect(unsupported.find('[data-testid="cn-camera-manual-input"]').exists()).toBe(true)

		Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn().mockRejectedValue(new Error('denied')) } })
		fakeDetector()
		const refused = mount(CnCameraCapture, { props: { mode: 'barcode', manualFallback: false }, global: { stubs } })
		await settle()
		expect(refused.get('[role="status"]').text()).toContain('could not be started')
		expect(refused.find('[data-testid="cn-camera-manual-input"]').exists()).toBe(true)
	})

	it('stops looking and stops the camera on Cancel', async () => {
		const { track } = fakeCamera()
		const { detect } = fakeDetector()
		const w = mount(CnCameraCapture, { props: { mode: 'barcode' }, global: { stubs } })
		await settle()
		await w.get('[data-testid="cn-camera-cancel"]').trigger('click')
		const calls = detect.mock.calls.length
		await settle()

		expect(track.stop).toHaveBeenCalled()
		expect(detect.mock.calls.length).toBe(calls)
		expect(w.emitted('close')).toHaveLength(1)
		expect(w.emitted('scan')).toBeUndefined()
	})

	it('labels the preview and the group for barcode reading', async () => {
		fakeCamera()
		fakeDetector()
		const w = mount(CnCameraCapture, { props: { mode: 'barcode' }, global: { stubs } })
		await settle()

		expect(w.get('[data-testid="cn-camera-capture"]').attributes('aria-label')).toBe('Scan barcode')
		expect(w.get('video').attributes('aria-label')).toContain('barcode')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A field can be filled by scanning a code (`type: scan`), the camera opened
 * only on Scan, typing always possible (buildiq pages-qr-and-barcodes D2).
 *
 * @spec openspec/changes/scan-field/specs/scan-field/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnScanField from '../../src/components/CnScanField/CnScanField.vue'
import { cnRenderFormField } from '../../src/composables/cnFormFieldRenderer.js'
import { detectorFormats, scanSupported } from '../../src/utils/barcodeScan.js'

let stopTrack
function installCamera({ deny = false, codes = [[], [{ rawValue: 'SN-0042' }]] } = {}) {
	stopTrack = jest.fn()
	let call = 0
	window.BarcodeDetector = class {
		constructor({ formats }) {
			this.formats = formats
			window.__lastFormats = formats
		}

		detect() {
			return Promise.resolve(codes[Math.min(call++, codes.length - 1)])
		}
	}
	Object.defineProperty(navigator, 'mediaDevices', {
		configurable: true,
		value: { getUserMedia: jest.fn(() => (deny ? Promise.reject(new Error('NotAllowed')) : Promise.resolve({ getTracks: () => [{ stop: stopTrack }] }))) },
	})
	window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve())
}

afterEach(() => {
	delete window.BarcodeDetector
})

describe('barcodeScan', () => {
	it('maps the manifest formats and reads all three without any', () => {
		expect(detectorFormats(['qr', 'ean13', 'nope'])).toEqual(['qr_code', 'ean_13'])
		expect(detectorFormats()).toEqual(['qr_code', 'code_128', 'ean_13'])
	})

	it('needs BarcodeDetector and a camera', () => {
		expect(scanSupported()).toBe(false)
		installCamera()
		expect(scanSupported()).toBe(true)
	})
})

describe('CnScanField', () => {
	it('offers no Scan without BarcodeDetector and still takes a typed code', async () => {
		const w = mount(CnScanField, { props: { label: 'Serial' } })
		expect(w.find('[data-testid="cn-scan-field-start"]').exists()).toBe(false)
		w.findComponent({ name: 'NcTextField' }).vm.$emit('update:modelValue', 'SN-1')
		expect(w.emitted('update:modelValue')[0]).toEqual(['SN-1'])
	})

	it('opens the camera on Scan only, fills the field with the code read and lets the camera go', async () => {
		installCamera()
		const w = mount(CnScanField, { props: { label: 'Serial', formats: ['code128'] } })
		expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
		await w.vm.start()
		await flushPromises()
		expect(window.__lastFormats).toEqual(['code_128'])
		expect(w.emitted('update:modelValue').at(-1)).toEqual(['SN-0042'])
		expect(w.emitted('scanned')[0]).toEqual(['SN-0042'])
		expect(stopTrack).toHaveBeenCalled()
		expect(w.vm.scanning).toBe(false)
	})

	it('says to type the code when the camera is refused', async () => {
		installCamera({ deny: true })
		const w = mount(CnScanField, { props: { label: 'Serial' } })
		await w.vm.start()
		await flushPromises()
		expect(w.find('[data-testid="cn-scan-field-message"]').text()).toContain('Type the code')
	})

	it('is the form renderer for type scan', () => {
		const r = cnRenderFormField({ field: { key: 'serial', label: 'Serial', type: 'scan', formats: ['qr'] }, value: 'x', onInput: () => {} })
		expect(r.tag).toBe(CnScanField)
		expect(r.props).toEqual({ label: 'Serial', modelValue: 'x', formats: ['qr'] })
	})
})

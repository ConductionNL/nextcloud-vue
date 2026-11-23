/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A form can ask for a signature, a spoken note and a position
 * (`type: signature | audio | location`), the device asked only when the
 * person acts (buildiq forms-signature-audio-and-location T06).
 *
 * @spec openspec/changes/form-device-fields/specs/form-device-fields/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnAudioCapture from '../../src/components/CnAudioCapture/CnAudioCapture.vue'
import CnGeoCaptureField from '../../src/components/CnGeoCaptureField/CnGeoCaptureField.vue'
import CnSignatureCapture from '../../src/components/CnSignatureCapture/CnSignatureCapture.vue'
import { cnRenderFormField, locationWrites } from '../../src/composables/cnFormFieldRenderer.js'

describe('cnRenderFormField device types', () => {
	it('renders a signature, storing the drawn image', () => {
		const onInput = jest.fn()
		const r = cnRenderFormField({ field: { key: 'sig', label: 'Signature', type: 'signature' }, value: null, onInput })
		expect(r.kind).toBe('signature')
		expect(r.tag).toBe(CnSignatureCapture)
		expect(r.props).toEqual({ allowTyped: false, allowDrawn: true })
		r.listeners.change({ mode: 'drawn', value: 'data:image/png;base64,AAA' })
		expect(onInput).toHaveBeenCalledWith('data:image/png;base64,AAA')
		r.listeners.change({ mode: 'drawn', value: '' })
		expect(onInput).toHaveBeenLastCalledWith(null)
	})

	it('renders a spoken note with its longest clip', () => {
		const r = cnRenderFormField({ field: { key: 'note', label: 'Note', type: 'audio', maxSeconds: 30 }, value: 'data:audio/webm;base64,BB', onInput: () => {} })
		expect(r.tag).toBe(CnAudioCapture)
		expect(r.props).toEqual({ label: 'Note', modelValue: 'data:audio/webm;base64,BB', maxSeconds: 30 })
	})

	it('reads a position from its latitude and longitude fields and writes it back to them', () => {
		const field = { key: 'where', label: 'Where', type: 'location', latField: 'lat', lngField: 'lng', accuracyField: 'acc' }
		const r = cnRenderFormField({ field, value: undefined, values: { lat: 52.1, lng: 4.3, acc: 12 }, onInput: () => {} })
		expect(r.tag).toBe(CnGeoCaptureField)
		expect(r.props.modelValue).toEqual({ lat: 52.1, lng: 4.3, accuracy: 12 })
		expect(locationWrites(field, { lat: 51.9, lng: 4.48, accuracy: 8 })).toEqual({ lat: 51.9, lng: 4.48, acc: 8 })
		expect(locationWrites(field, null)).toEqual({ lat: null, lng: null, acc: null })
		expect(locationWrites({ key: 'where' }, { lat: 1, lng: 2 })).toEqual({ where: { lat: 1, lng: 2 } })
	})
})

describe('CnAudioCapture', () => {
	let stopTrack
	beforeEach(() => {
		jest.useFakeTimers()
		stopTrack = jest.fn()
		window.MediaRecorder = class {
			constructor() {
				this.state = 'inactive'
				this.mimeType = 'audio/webm'
			}

			start() {
				this.state = 'recording'
			}

			stop() {
				this.state = 'inactive'
				this.ondataavailable({ data: new Blob(['abc'], { type: 'audio/webm' }) })
				this.onstop()
			}
		}
		Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn(() => Promise.resolve({ getTracks: () => [{ stop: stopTrack }] })) } })
	})
	afterEach(() => {
		jest.useRealTimers()
	})

	it('asks for the microphone only on Record, stops by itself after maxSeconds and emits the clip', async () => {
		const w = mount(CnAudioCapture, { props: { label: 'Note', maxSeconds: 2 } })
		expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
		await w.vm.start()
		expect(w.vm.recording).toBe(true)
		jest.advanceTimersByTime(2000)
		jest.useRealTimers()
		await flushPromises()
		await new Promise((resolve) => setTimeout(resolve, 20))
		expect(stopTrack).toHaveBeenCalled()
		expect(w.emitted('update:modelValue')[0][0]).toMatch(/^data:audio\/webm;base64,/)
	})

	it('says so when the microphone is refused', async () => {
		navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('NotAllowed'))
		const w = mount(CnAudioCapture, { props: { label: 'Note' } })
		await w.vm.start()
		await flushPromises()
		expect(w.find('[data-testid="cn-audio-capture-message"]').text()).toContain('not allowed')
	})
})

describe('CnFormPage with a position field', () => {
	it('writes the captured place into the latitude and longitude fields and sends them', async () => {
		const { default: CnFormPage } = await import('../../src/components/CnFormPage/CnFormPage.vue')
		const handler = jest.fn()
		const w = mount(CnFormPage, {
			props: {
				fields: [{ key: 'where', label: 'Where', type: 'location', latField: 'lat', lngField: 'lng', validation: { required: true } }],
				submitHandler: 'save',
			},
			global: { stubs: { CnPageHeader: true }, mocks: { $route: { params: {} }, $router: { push: jest.fn() } }, provide: { cnCustomComponents: { save: handler } } },
		})
		expect(w.find('[data-testid="cn-form-page-device-label"]').text()).toBe('Where')
		w.findComponent(CnGeoCaptureField).vm.$emit('update:modelValue', { lat: 51.9, lng: 4.48, accuracy: 9 })
		await w.vm.$nextTick()
		expect(w.vm.formData.lat).toBe(51.9)
		expect(w.vm.formData.lng).toBe(4.48)
		expect(w.vm.effectivePayload.where).toBeUndefined()
	})
})

describe('CnMapPage reader position', () => {
	it('centres on the reader and draws the position once the map is ready, and asks nothing without the options', async () => {
		const { default: CnMapPage } = await import('../../src/components/CnMapPage/CnMapPage.vue')
		const getCurrentPosition = jest.fn((ok) => ok({ coords: { latitude: 52.37, longitude: 4.9, accuracy: 15 } }))
		Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
		const stubs = { CnMapWidget: { name: 'CnMapWidget', template: '<div />' }, CnPageHeader: true }
		const plain = mount(CnMapPage, { props: {}, global: { stubs } })
		await plain.vm.onMapReady({ map: { setView: jest.fn() } })
		expect(getCurrentPosition).not.toHaveBeenCalled()
		const map = { setView: jest.fn(), getZoom: () => 11 }
		const w = mount(CnMapPage, { props: { centerOnUser: true }, global: { stubs } })
		w.vm.onMapReady({ map })
		await flushPromises()
		expect(map.setView).toHaveBeenCalledWith([52.37, 4.9], 11)
		expect(w.emitted('user-location')[0][0]).toMatchObject({ lat: 52.37, lng: 4.9, accuracy: 15 })
	})
})

describe('the manifest', () => {
	it('accepts the device field types on a form page and the position options on a map page', async () => {
		const { validateManifestV2 } = await import('../../src/utils/validateManifest.js')
		const manifest = {
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [
				{ id: 'Report', route: '/report', type: 'form', title: 'Report', config: { submitEndpoint: '/apps/x/api/y', fields: [{ key: 'sig', label: 'Signature', type: 'signature', allowTyped: true }, { key: 'note', label: 'Note', type: 'audio', maxSeconds: 60 }, { key: 'where', label: 'Where', type: 'location', latField: 'lat', lngField: 'lng' }] } },
				{ id: 'Map', route: '/map', type: 'map', title: 'Map', config: { showUserLocation: true, centerOnUser: true } },
			],
		}
		expect(validateManifestV2(manifest).errors).toEqual([])
	})
})

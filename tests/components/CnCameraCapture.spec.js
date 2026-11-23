/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-file-and-camera-fields/tasks.md#task-4
 */
import { mount } from '@vue/test-utils'
import CnCameraCapture from '../../src/components/CnCameraCapture/CnCameraCapture.vue'

const stubs = { NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] } }
const flush = () => new Promise((r) => setTimeout(r, 0))

function fakeCamera() {
	const track = { stop: jest.fn() }
	const stream = { getTracks: () => [track] }
	const getUserMedia = jest.fn().mockResolvedValue(stream)
	Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
	return { track, getUserMedia }
}

describe('CnCameraCapture', () => {
	afterEach(() => {
		delete navigator.mediaDevices
		jest.restoreAllMocks()
	})

	it('starts the camera when mounted (the host mounts it on Take photo) and enables Capture', async () => {
		const { getUserMedia } = fakeCamera()
		const w = mount(CnCameraCapture, { global: { stubs } })
		await flush()
		expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false })
		expect(w.get('[data-testid="cn-camera-capture-button"]').attributes('disabled')).toBeUndefined()
		expect(w.get('video').attributes('aria-label')).toContain('camera is on')
	})

	it('captures a still, retakes, and uses it as a JPEG file, then stops every track', async () => {
		const { track } = fakeCamera()
		const draw = jest.fn()
		jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw })
		jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAAA')
		const w = mount(CnCameraCapture, { global: { stubs } })
		await flush()
		await w.get('[data-testid="cn-camera-capture-button"]').trigger('click')
		expect(draw).toHaveBeenCalled()
		expect(w.find('[data-testid="cn-camera-still"]').exists()).toBe(true)

		await w.get('[data-testid="cn-camera-retake"]').trigger('click')
		expect(w.find('[data-testid="cn-camera-still"]').exists()).toBe(false)

		await w.get('[data-testid="cn-camera-capture-button"]').trigger('click')
		await w.get('[data-testid="cn-camera-use"]').trigger('click')
		await flush()
		const file = w.emitted('capture')[0][0]
		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('image/jpeg')
		expect(track.stop).toHaveBeenCalled()
		expect(w.emitted('close')).toHaveLength(1)
	})

	it('stops the tracks on Cancel and when unmounted', async () => {
		const { track } = fakeCamera()
		const w = mount(CnCameraCapture, { global: { stubs } })
		await flush()
		await w.get('[data-testid="cn-camera-cancel"]').trigger('click')
		expect(track.stop).toHaveBeenCalledTimes(1)
		expect(w.emitted('close')).toHaveLength(1)
		const second = fakeCamera()
		const w2 = mount(CnCameraCapture, { global: { stubs } })
		await flush()
		w2.unmount()
		expect(second.track.stop).toHaveBeenCalled()
	})

	it('says so, and starts nothing, when permission is refused or there is no camera API', async () => {
		Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn().mockRejectedValue(new Error('denied')) } })
		const refused = mount(CnCameraCapture, { global: { stubs } })
		await flush()
		expect(refused.get('[data-testid="cn-camera-error"]').text()).toContain('could not be started')

		delete navigator.mediaDevices
		const none = mount(CnCameraCapture, { global: { stubs } })
		await flush()
		expect(none.get('[data-testid="cn-camera-error"]').text()).toContain('no camera')
	})
})

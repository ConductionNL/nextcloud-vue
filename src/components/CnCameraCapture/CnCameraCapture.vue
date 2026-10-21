<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-camera-capture"
		role="group"
		:aria-label="isBarcode ? t('nextcloud-vue', 'Scan barcode') : t('nextcloud-vue', 'Take photo')"
		data-testid="cn-camera-capture">
		<p v-if="error"
			class="cn-camera-capture__error"
			:role="isBarcode ? 'status' : 'alert'"
			data-testid="cn-camera-error">
			{{ error }}
		</p>

		<template v-else>
			<!-- Live preview while the camera is on; the still after Capture. -->
			<video
				v-show="!still"
				ref="video"
				class="cn-camera-capture__video"
				autoplay
				playsinline
				muted
				:aria-label="isBarcode
					? t('nextcloud-vue', 'Camera preview for reading a barcode. The camera is on.')
					: t('nextcloud-vue', 'Camera preview. The camera is on.')" />
			<p v-if="isBarcode && ready" class="cn-camera-capture__hint">
				{{ t('nextcloud-vue', 'Point the camera at the barcode.') }}
			</p>
			<img
				v-if="still"
				class="cn-camera-capture__still"
				:src="still"
				:alt="t('nextcloud-vue', 'The photo you took')"
				data-testid="cn-camera-still">
		</template>

		<form v-if="showManual"
			class="cn-camera-capture__manual"
			data-testid="cn-camera-manual-form"
			@submit.prevent="submitManual">
			<label :for="manualId">{{ t('nextcloud-vue', 'Type the code') }}</label>
			<input :id="manualId"
				v-model="manualValue"
				type="text"
				autocomplete="off"
				inputmode="search"
				data-testid="cn-camera-manual-input">
			<NcButton type="submit" :disabled="!manualValue.trim()" data-testid="cn-camera-manual-submit">
				{{ t('nextcloud-vue', 'Use this code') }}
			</NcButton>
		</form>

		<div class="cn-camera-capture__actions">
			<NcButton
				v-if="!isBarcode && !still && !error"
				variant="primary"
				:disabled="!ready"
				data-testid="cn-camera-capture-button"
				@click="capture">
				{{ t('nextcloud-vue', 'Capture') }}
			</NcButton>
			<template v-if="still">
				<NcButton variant="secondary" data-testid="cn-camera-retake" @click="retake">
					{{ t('nextcloud-vue', 'Retake') }}
				</NcButton>
				<NcButton variant="primary" data-testid="cn-camera-use" @click="use">
					{{ t('nextcloud-vue', 'Use photo') }}
				</NcButton>
			</template>
			<NcButton variant="tertiary" data-testid="cn-camera-cancel" @click="close">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'

const DEFAULT_BARCODE_FORMATS = ['qr_code', 'ean_13', 'code_128', 'code_39', 'code_93']

const SCAN_INTERVAL_MS = 250

let manualIdCounter = 0

/**
 * CnCameraCapture — a webcam snapshot for a file field, or a barcode reader.
 *
 * Mounting it starts the camera (the host mounts it only when the person
 * presses Take photo or Scan, so the browser asks permission then and not
 * before). In `photo` mode it shows a live preview with Capture, then the
 * still with Retake and Use photo; Use photo emits the picture as a JPEG
 * `File`. In `barcode` mode it reads the preview with the browser's
 * BarcodeDetector until a code is found and emits `scan`, with typed entry as
 * the fallback. Every camera track is stopped on Use photo, a scan, Cancel, an
 * error and when the component goes away.
 *
 * Example:
 * ```vue
 * <CnCameraCapture facing="user" @capture="addFile" @close="open = false" />
 * <CnCameraCapture mode="barcode" :formats="['ean_13']" @scan="lookUp" @close="scanning = false" />
 * ```
 */
export default {
	name: 'CnCameraCapture',

	components: { NcButton },

	props: {
		/** Which camera to prefer: `environment` (rear) or `user` (front). */
		facing: {
			type: String,
			default: 'environment',
			validator: (v) => ['environment', 'user'].includes(v),
		},

		/** File name of the photo. Empty: `photo-<timestamp>.jpg`. */
		fileName: {
			type: String,
			default: '',
		},

		/** `photo` takes a picture; `barcode` reads a barcode and emits `scan`. */
		mode: {
			type: String,
			default: 'photo',
			validator: (v) => ['photo', 'barcode'].includes(v),
		},

		/** Barcode mode: the BarcodeDetector formats to look for. */
		formats: {
			type: Array,
			default: () => DEFAULT_BARCODE_FORMATS,
		},

		/**
		 * Barcode mode: offer typed entry next to the camera. Typed entry is
		 * always offered when the camera cannot read barcodes.
		 */
		manualFallback: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['capture', 'scan', 'close'],

	data() {
		manualIdCounter += 1
		return {
			stream: null,
			ready: false,
			still: '',
			error: '',
			manualValue: '',
			manualId: `cn-camera-manual-${manualIdCounter}`,
		}
	},

	computed: {
		isBarcode() {
			return this.mode === 'barcode'
		},

		showManual() {
			return this.isBarcode && (this.manualFallback || this.error !== '')
		},
	},

	mounted() {
		if (this.isBarcode) {
			this.startBarcode()
			return
		}
		this.start()
	},

	beforeUnmount() {
		this.stop()
	},

	methods: {
		t,

		async start() {
			const devices = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
			if (!devices || typeof devices.getUserMedia !== 'function') {
				this.error = t('nextcloud-vue', 'This device has no camera the browser can use.')
				return
			}
			try {
				this.stream = await devices.getUserMedia({ video: { facingMode: this.facing }, audio: false })
				if (this._gone) {
					this.stop()
					return
				}
				const video = this.$refs.video
				if (video) {
					video.srcObject = this.stream
				}
				this.ready = true
			} catch {
				this.stop()
				this.error = t('nextcloud-vue', 'The camera could not be started. Check that you allowed it.')
			}
		},

		/** Start the camera only when the browser can read one of the formats. */
		async startBarcode() {
			const Detector = typeof window !== 'undefined' ? window.BarcodeDetector : undefined
			let supported = []
			if (typeof Detector === 'function') {
				try {
					supported = await Detector.getSupportedFormats()
				} catch {
					supported = []
				}
			}
			const formats = this.formats.filter((format) => Array.isArray(supported) && supported.includes(format))
			if (formats.length === 0) {
				this.error = t('nextcloud-vue', 'This browser cannot read barcodes. Type the code instead.')
				return
			}
			await this.start()
			if (!this.ready) {
				return
			}
			this._detector = new Detector({ formats })
			this.scanFrame()
		},

		/** Look at one frame; try again shortly when it holds no code. */
		async scanFrame() {
			if (this._gone || !this._detector) {
				return
			}
			let codes
			try {
				codes = await this._detector.detect(this.$refs.video)
			} catch {
				codes = []
			}
			if (this._gone) {
				return
			}
			const code = Array.isArray(codes) ? codes.find((c) => c && c.rawValue) : null
			if (code) {
				this.emitScan(code.rawValue, code.format || '')
				return
			}
			this._timer = setTimeout(() => this.scanFrame(), SCAN_INTERVAL_MS)
		},

		submitManual() {
			const value = this.manualValue.trim()
			if (value === '') {
				return
			}
			this.emitScan(value, 'manual')
		},

		emitScan(value, format) {
			this.stop()
			/**
			 * @event scan Barcode mode: a code was read or typed. Payload: the value, then its format (`manual` when typed).
			 * @type {string}
			 */
			this.$emit('scan', value, format)
			this.$emit('close')
		},

		/** Stop every camera track, so the camera light goes off. */
		stop() {
			this._gone = true
			if (this._timer) {
				clearTimeout(this._timer)
				this._timer = null
			}
			if (this.stream) {
				this.stream.getTracks().forEach((track) => track.stop())
				this.stream = null
			}
			this.ready = false
		},

		capture() {
			const video = this.$refs.video
			if (!video || !this.ready) {
				return
			}
			const canvas = document.createElement('canvas')
			canvas.width = video.videoWidth || 640
			canvas.height = video.videoHeight || 480
			canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
			this.still = canvas.toDataURL('image/jpeg', 0.9)
		},

		retake() {
			this.still = ''
		},

		use() {
			const bytes = Uint8Array.from(atob(this.still.split(',')[1] || ''), (c) => c.charCodeAt(0))
			const name = this.fileName || `photo-${Date.now()}.jpg`
			const file = new File([bytes], name, { type: 'image/jpeg' })
			this.stop()
			/**
			 * @event capture Emitted with the photo as a JPEG File when the person chooses Use photo.
			 * @type {File}
			 */
			this.$emit('capture', file)
			this.$emit('close')
		},

		close() {
			this.stop()
			/**
			 * @event close Emitted when the capture surface should go away (Cancel, or after Use photo).
			 */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-camera-capture {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-camera-capture__video,
.cn-camera-capture__still {
	width: 100%;
	max-height: 50vh;
	object-fit: contain;
	background: var(--color-background-darker);
	border-radius: var(--border-radius-large);
}

.cn-camera-capture__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-camera-capture__error {
	margin: 0;
	color: var(--color-error-text);
}

.cn-camera-capture__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-camera-capture__manual {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 8px;
}

.cn-camera-capture__manual label {
	flex-basis: 100%;
}

.cn-camera-capture__manual input {
	flex: 1 1 200px;
	min-height: var(--default-clickable-area);
}
</style>

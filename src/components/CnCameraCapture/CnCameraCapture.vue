<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-camera-capture"
		role="group"
		:aria-label="t('nextcloud-vue', 'Take photo')"
		data-testid="cn-camera-capture">
		<p v-if="error"
			class="cn-camera-capture__error"
			role="alert"
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
				:aria-label="t('nextcloud-vue', 'Camera preview. The camera is on.')" />
			<img
				v-if="still"
				class="cn-camera-capture__still"
				:src="still"
				:alt="t('nextcloud-vue', 'The photo you took')"
				data-testid="cn-camera-still">
		</template>

		<div class="cn-camera-capture__actions">
			<NcButton
				v-if="!still && !error"
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

/**
 * CnCameraCapture — a webcam snapshot for a file field.
 *
 * Mounting it starts the camera (the host mounts it only when the person
 * presses Take photo, so the browser asks permission then and not before). It
 * shows a live preview with Capture, then the still with Retake and Use photo;
 * Use photo emits the picture as a JPEG `File`. Every camera track is stopped
 * on Use photo, Cancel, an error and when the component goes away.
 *
 * Example:
 * ```vue
 * <CnCameraCapture facing="user" @capture="addFile" @close="open = false" />
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
	},

	emits: ['capture', 'close'],

	data() {
		return { stream: null, ready: false, still: '', error: '' }
	},

	mounted() {
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

		/** Stop every camera track, so the camera light goes off. */
		stop() {
			this._gone = true
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
</style>

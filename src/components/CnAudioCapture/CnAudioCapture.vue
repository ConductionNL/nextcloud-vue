<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-audio-capture" data-testid="cn-audio-capture">
		<span class="cn-audio-capture__label">{{ label }}</span>
		<div class="cn-audio-capture__row">
			<NcButton v-if="!recording"
				:disabled="!supported"
				data-testid="cn-audio-capture-record"
				@click="start">
				{{ modelValue ? t('nextcloud-vue', 'Record again') : t('nextcloud-vue', 'Record') }}
			</NcButton>
			<NcButton v-else
				variant="primary"
				data-testid="cn-audio-capture-stop"
				@click="stop">
				{{ t('nextcloud-vue', 'Stop ({seconds} s left)', { seconds: secondsLeft }) }}
			</NcButton>
			<NcButton v-if="modelValue && !recording"
				variant="tertiary"
				data-testid="cn-audio-capture-remove"
				@click="$emit('update:modelValue', null)">
				{{ t('nextcloud-vue', 'Remove') }}
			</NcButton>
		</div>
		<!-- eslint-disable-next-line vuejs-accessibility/media-has-caption -- a spoken note the person just recorded has no caption track -->
		<audio v-if="modelValue && !recording"
			:src="modelValue"
			controls
			data-testid="cn-audio-capture-player" />
		<p v-if="message"
			class="cn-audio-capture__message"
			role="status"
			data-testid="cn-audio-capture-message">
			{{ message }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'

/**
 * CnAudioCapture — record a short spoken note from the device microphone.
 * The browser asks for the microphone only when Record is pressed. The clip
 * stops by itself after `maxSeconds`, and the value is the recording as a
 * `data:` URL (the same content shape CnFileField sends), or null.
 *
 * ```vue
 * <CnAudioCapture v-model="note" label="Spoken note" :maxSeconds="60" />
 * ```
 */
export default {
	name: 'CnAudioCapture',

	components: { NcButton },

	props: {
		/** The recording as a `data:` URL, or null. */
		modelValue: {
			type: String,
			default: null,
		},

		/** The field label. */
		label: {
			type: String,
			default: '',
		},

		/** The longest clip in seconds; recording stops by itself then. */
		maxSeconds: {
			type: Number,
			default: 60,
		},
	},

	emits: ['update:modelValue'],

	data() {
		return {
			recording: false,
			secondsLeft: 0,
			reason: '',
			recorder: null,
			stream: null,
			chunks: [],
			timer: null,
		}
	},

	computed: {
		supported() {
			return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof window.MediaRecorder !== 'undefined'
		},

		message() {
			if (!this.supported) {
				return t('nextcloud-vue', 'This browser cannot record sound.')
			}
			if (this.reason === 'denied') {
				return t('nextcloud-vue', 'The microphone is not allowed for this site.')
			}
			if (this.reason === 'failed') {
				return t('nextcloud-vue', 'The recording could not be saved. Try again.')
			}
			return ''
		},
	},

	beforeUnmount() {
		this.release()
	},

	methods: {
		t,

		/**
		 * Ask for the microphone and start recording.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/form-device-fields/specs/form-device-fields/spec.md#requirement-a-form-can-ask-for-a-signature-a-spoken-note-and-a-position
		 */
		async start() {
			this.reason = ''
			try {
				this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			} catch {
				this.reason = 'denied'
				return
			}
			this.chunks = []
			this.recorder = new window.MediaRecorder(this.stream)
			this.recorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					this.chunks.push(event.data)
				}
			}
			this.recorder.onstop = () => this.finish()
			this.recorder.start()
			this.recording = true
			this.secondsLeft = this.maxSeconds
			this.timer = setInterval(() => {
				this.secondsLeft -= 1
				if (this.secondsLeft <= 0) {
					this.stop()
				}
			}, 1000)
		},

		/** Stop recording; the clip is read once the recorder hands it over. */
		stop() {
			clearInterval(this.timer)
			this.timer = null
			if (this.recorder && this.recorder.state !== 'inactive') {
				this.recorder.stop()
			}
		},

		/**
		 * Turn the recorded chunks into a `data:` URL and emit it.
		 *
		 * @return {Promise<void>}
		 */
		async finish() {
			this.recording = false
			const type = (this.recorder && this.recorder.mimeType) || 'audio/webm'
			const blob = new Blob(this.chunks, { type })
			this.release()
			try {
				const url = await new Promise((resolve, reject) => {
					const reader = new FileReader()
					reader.onload = () => resolve(reader.result)
					reader.onerror = () => reject(reader.error)
					reader.readAsDataURL(blob)
				})
				/** @event update:modelValue The recording as a `data:` URL, or null when removed. */
				this.$emit('update:modelValue', url)
			} catch {
				this.reason = 'failed'
			}
		},

		/** Release the microphone. */
		release() {
			clearInterval(this.timer)
			this.timer = null
			if (this.stream) {
				this.stream.getTracks().forEach((track) => track.stop())
				this.stream = null
			}
		},
	},
}
</script>

<style scoped>
.cn-audio-capture {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-audio-capture__label {
	font-weight: 600;
}

.cn-audio-capture__row {
	display: flex;
	gap: 8px;
}

.cn-audio-capture__message {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>

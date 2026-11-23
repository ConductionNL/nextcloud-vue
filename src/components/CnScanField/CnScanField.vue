<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-scan-field" data-testid="cn-scan-field">
		<div class="cn-scan-field__row">
			<NcTextField
				class="cn-scan-field__input"
				:label="label"
				:modelValue="modelValue || ''"
				data-testid="cn-scan-field-input"
				@update:modelValue="(v) => $emit('update:modelValue', v === '' ? null : v)" />
			<NcButton v-if="supported && !scanning"
				data-testid="cn-scan-field-start"
				@click="start">
				{{ t('nextcloud-vue', 'Scan') }}
			</NcButton>
			<NcButton v-else-if="scanning"
				data-testid="cn-scan-field-stop"
				@click="stop">
				{{ t('nextcloud-vue', 'Stop scanning') }}
			</NcButton>
		</div>
		<video v-show="scanning"
			ref="video"
			class="cn-scan-field__video"
			playsinline
			muted
			data-testid="cn-scan-field-video" />
		<p v-if="message"
			class="cn-scan-field__message"
			role="status"
			data-testid="cn-scan-field-message">
			{{ message }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField } from '@nextcloud/vue'
import { detectFromVideo, detectorFormats, scanSupported } from '../../utils/barcodeScan.js'

/**
 * CnScanField — a text field that can also be filled by scanning a code with
 * the device camera (QR, Code 128, EAN-13) through the browser's own
 * `BarcodeDetector`. The camera starts only when Scan is pressed and stops
 * once a code is read. Typing always works, so a handheld scanner that types,
 * or a refused camera, still fills the field.
 *
 * ```vue
 * <CnScanField v-model="serial" label="Serial number" :formats="['qr', 'code128']" />
 * ```
 */
export default {
	name: 'CnScanField',

	components: { NcButton, NcTextField },

	props: {
		/** The code. */
		modelValue: {
			type: String,
			default: null,
		},

		/** The field label. */
		label: {
			type: String,
			default: '',
		},

		/** The formats to read: `qr`, `code128`, `ean13`; all three when empty. */
		formats: {
			type: Array,
			default: () => [],
		},
	},

	emits: ['update:modelValue', 'scanned'],

	data() {
		return {
			supported: scanSupported(),
			scanning: false,
			reason: '',
			stream: null,
			signal: { aborted: false },
		}
	},

	computed: {
		message() {
			if (this.reason === 'denied') {
				return t('nextcloud-vue', 'The camera is not allowed for this site. Type the code instead.')
			}
			return this.scanning ? t('nextcloud-vue', 'Hold the code in front of the camera.') : ''
		},
	},

	beforeUnmount() {
		this.stop()
	},

	methods: {
		t,

		/**
		 * Open the camera and read until a code is found.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/scan-field/specs/scan-field/spec.md#requirement-a-field-can-be-filled-by-scanning-a-code
		 */
		async start() {
			this.reason = ''
			try {
				this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
			} catch {
				this.reason = 'denied'
				return
			}
			this.scanning = true
			this.signal = { aborted: false }
			await this.$nextTick()
			const video = this.$refs.video
			video.srcObject = this.stream
			try {
				await video.play()
			} catch {
				// Autoplay refused; detection still reads the frames it gets.
			}
			const code = await detectFromVideo(video, detectorFormats(this.formats), this.signal)
			this.stop()
			if (code) {
				/** @event update:modelValue The code. */
				this.$emit('update:modelValue', code)
				/** @event scanned A code was read from the camera. */
				this.$emit('scanned', code)
			}
		},

		/** Stop scanning and release the camera. */
		stop() {
			this.signal.aborted = true
			this.scanning = false
			if (this.stream) {
				this.stream.getTracks().forEach((track) => track.stop())
				this.stream = null
			}
		},
	},
}
</script>

<style scoped>
.cn-scan-field__row {
	display: flex;
	align-items: flex-end;
	gap: 8px;
}

.cn-scan-field__input {
	flex: 1 1 auto;
}

.cn-scan-field__video {
	width: 100%;
	max-width: 360px;
	margin-top: 8px;
	border-radius: var(--border-radius-large, 8px);
}

.cn-scan-field__message {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}
</style>

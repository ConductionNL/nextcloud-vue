<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-geo-capture" data-testid="cn-geo-capture">
		<p class="cn-geo-capture__line" role="status" data-testid="cn-geo-capture-line">
			{{ lineText }}
		</p>
		<template v-if="!searching && needsAddress">
			<NcButton variant="tertiary" data-testid="cn-geo-capture-retry" @click="retry">
				{{ t('nextcloud-vue', 'Try again') }}
			</NcButton>
			<NcTextField
				:modelValue="modelValue?.address || ''"
				:label="t('nextcloud-vue', 'Address (by hand)')"
				data-testid="cn-geo-capture-address"
				@update:modelValue="setAddress" />
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField } from '@nextcloud/vue'
import { captureLocation } from '../../utils/captureLocation.js'

/**
 * CnGeoCaptureField: the place something was recorded, captured from the
 * device (board DqInspectie: "51.9012, 4.4831 · ±12 m · 10:52"). A fix whose
 * accuracy is worse than `goodAccuracy`, or no fix at all, says so, offers a
 * retry and takes an address by hand. The user can always carry on, and the
 * value says how good it was through `low`.
 *
 * The value is `{ lat, lng, accuracy, at, low, address? }`, or null.
 *
 * ```vue
 * <CnGeoCaptureField v-model="place" auto />
 * ```
 *
 * @event update:modelValue The new value.
 * @spec openspec/changes/checklist-run-location/specs/checklist-run-location/spec.md#requirement-a-field-captures-where-something-was-recorded
 */
export default {
	name: 'CnGeoCaptureField',

	components: { NcButton, NcTextField },

	props: {
		/** The captured place: `{ lat, lng, accuracy, at, low, address? }`, or null. */
		modelValue: { type: Object, default: null },
		/** Capture on mount when no value is held yet. */
		auto: { type: Boolean, default: false },
		/** A host is capturing; the field says it is looking. */
		busy: { type: Boolean, default: false },
		/** The accuracy in metres above which a fix counts as low. */
		goodAccuracy: { type: Number, default: 50 },
	},

	emits: ['update:modelValue'],

	data() {
		return { capturing: false }
	},

	computed: {
		/** @return {boolean} Whether a capture is under way. */
		searching() {
			return this.busy || this.capturing
		},

		/** @return {boolean} Whether the value has coordinates. */
		hasFix() {
			return Number.isFinite(this.modelValue?.lat) && Number.isFinite(this.modelValue?.lng)
		},

		/** @return {boolean} Whether the fix is missing or too rough. */
		needsAddress() {
			return !this.hasFix || this.modelValue.low === true
		},

		/** @return {string} The state of the capture in words. */
		lineText() {
			if (this.searching) {
				return t('nextcloud-vue', 'Looking for your location…')
			}
			if (!this.hasFix) {
				return t('nextcloud-vue', 'No location found. You can carry on, or add the address by hand.')
			}
			const accuracy = Math.round(this.modelValue.accuracy)
			if (this.modelValue.low === true) {
				return t('nextcloud-vue', 'Location is inaccurate (±{accuracy} m). Wait for a better signal or add the address by hand.', { accuracy })
			}
			const time = new Date(this.modelValue.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
			return `${this.modelValue.lat.toFixed(4)}, ${this.modelValue.lng.toFixed(4)} · ±${accuracy} m · ${time}`
		},
	},

	mounted() {
		if (this.auto && !this.modelValue) {
			this.retry()
		}
	},

	methods: {
		t,

		/**
		 * Ask the device again. A fix replaces what is held, keeping a typed
		 * address; no fix keeps it all.
		 *
		 * @return {Promise<void>}
		 */
		async retry() {
			this.capturing = true
			const fix = await captureLocation()
			this.capturing = false
			if (fix) {
				this.$emit('update:modelValue', { ...this.modelValue, ...fix, low: fix.accuracy > this.goodAccuracy })
			}
		},

		/**
		 * Keep the address typed by hand beside whatever fix there is.
		 *
		 * @param {string} address The address.
		 * @return {void}
		 */
		setAddress(address) {
			this.$emit('update:modelValue', { low: true, ...this.modelValue, address })
		},
	},
}
</script>

<style scoped>
.cn-geo-capture {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-geo-capture__line {
	color: var(--color-text-maxcontrast);
	font-variant-numeric: tabular-nums;
	margin: 0;
}
</style>

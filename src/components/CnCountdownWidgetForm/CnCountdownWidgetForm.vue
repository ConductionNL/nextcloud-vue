<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-countdown-form">
		<h4 class="cn-countdown-form__section">
			{{ t('nextcloud-vue', 'Countdown widget') }}
		</h4>

		<NcTextField
			:model-value="content.label || ''"
			:label="t('nextcloud-vue', 'Title')"
			:placeholder="t('nextcloud-vue', 'Time left')"
			@update:model-value="updateField('label', $event)" />

		<NcTextField
			:model-value="content.field || ''"
			:label="t('nextcloud-vue', 'Date property')"
			placeholder="deadline"
			@update:model-value="updateField('field', $event)" />
		<p class="cn-countdown-form__hint">
			{{ t('nextcloud-vue', 'The property on this record holding the date to count down to.') }}
		</p>

		<NcTextField
			:model-value="warnValue"
			type="number"
			:label="t('nextcloud-vue', 'Warn when this many days are left')"
			@update:model-value="updateThreshold('warn', $event)" />

		<NcTextField
			:model-value="dangerValue"
			type="number"
			:label="t('nextcloud-vue', 'Alert when this many days are left')"
			@update:model-value="updateThreshold('danger', $event)" />
		<p class="cn-countdown-form__hint">
			{{ t('nextcloud-vue', 'Leave both empty to keep the tile one colour. A date in the past always shows as overdue.') }}
		</p>

		<NcCheckboxRadioSwitch
			:model-value="content.showDate !== false"
			type="switch"
			@update:model-value="updateField('showDate', $event)">
			{{ t('nextcloud-vue', 'Show the date under the countdown') }}
		</NcCheckboxRadioSwitch>
	</div>
</template>

<script>
import { NcCheckboxRadioSwitch, NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

/**
 * CnCountdownWidgetForm — the config sub-form for a `countdown` widget
 * ({@link CnCountdownWidget}).
 *
 * Picks the date property to count down to and the two threshold bands.
 * Emits `update:content`.
 */
export default {
	name: 'CnCountdownWidgetForm',

	components: {
		NcCheckboxRadioSwitch,
		NcTextField,
	},

	props: {
		/**
		 * The stored config: `{ field, label, icon, thresholds, showDate }`.
		 *
		 * @type {{ field?: string, label?: string, icon?: string, thresholds?: object, showDate?: boolean }}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['update:content'],

	computed: {
		/** @return {string} The warn threshold as an input value. */
		warnValue() {
			const v = this.content?.thresholds?.warn
			return Number.isFinite(v) ? String(v) : ''
		},

		/** @return {string} The danger threshold as an input value. */
		dangerValue() {
			const v = this.content?.thresholds?.danger
			return Number.isFinite(v) ? String(v) : ''
		},
	},

	methods: {
		t,

		/**
		 * Set one top-level config field.
		 *
		 * @param {string} key The field name.
		 * @param {*} value The new value.
		 * @return {void}
		 */
		updateField(key, value) {
			this.emit({ [key]: value })
		},

		/**
		 * Set one threshold. An empty input removes the band rather than storing
		 * 0, which would colour every future date as urgent.
		 *
		 * @param {string} key Either `warn` or `danger`.
		 * @param {string} raw The typed value.
		 * @return {void}
		 */
		updateThreshold(key, raw) {
			const thresholds = { ...(this.content?.thresholds || {}) }
			const parsed = Number(raw)
			if (raw === '' || raw === null || !Number.isFinite(parsed)) {
				delete thresholds[key]
			} else {
				thresholds[key] = parsed
			}
			this.emit({ thresholds })
		},

		/**
		 * Emit the merged config.
		 *
		 * @param {object} patch The changed fields.
		 * @return {void}
		 */
		emit(patch) {
			/**
			 * @event update:content Emitted with the edited config blob.
			 * @type {object}
			 */
			this.$emit('update:content', { ...this.content, ...patch })
		},
	},
}
</script>

<style scoped>
.cn-countdown-form {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-countdown-form__section {
	margin: 8px 0 0;
}

.cn-countdown-form__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	margin: 0;
}
</style>

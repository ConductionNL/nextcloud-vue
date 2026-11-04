<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-reveal-field" data-testid="cn-reveal-field">
		<div class="cn-reveal-field__row">
			<span :id="labelId" class="cn-reveal-field__label">{{ label }}</span>
			<span
				class="cn-reveal-field__value"
				:class="{ 'cn-reveal-field__value--masked': !revealed }"
				:aria-labelledby="labelId"
				aria-live="polite"
				data-testid="cn-reveal-value">{{ revealed ? revealedValue : maskedValue }}</span>
			<NcButton
				v-if="!askingReason"
				variant="tertiary"
				:aria-label="revealed ? t('nextcloud-vue', 'Hide {label}', { label }) : t('nextcloud-vue', 'Show {label}', { label })"
				:disabled="loading"
				data-testid="cn-reveal-toggle"
				@click="toggle">
				<template v-if="loading" #icon>
					<NcLoadingIcon :size="20" />
				</template>
				{{ revealed ? t('nextcloud-vue', 'Hide') : t('nextcloud-vue', 'Show') }}
			</NcButton>
		</div>

		<form
			v-if="askingReason"
			class="cn-reveal-field__reason"
			data-testid="cn-reveal-reason"
			@submit.prevent="submitReason">
			<NcTextField
				ref="reasonField"
				:modelValue="reason"
				:label="reasonLabel || t('nextcloud-vue', 'Why do you need to see this?')"
				required
				data-testid="cn-reveal-reason-input"
				@update:modelValue="reason = $event" />
			<div class="cn-reveal-field__reason-actions">
				<NcButton variant="tertiary" data-testid="cn-reveal-reason-cancel" @click="cancelReason">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton
					type="submit"
					variant="primary"
					:disabled="reason.trim() === '' || loading"
					data-testid="cn-reveal-reason-submit">
					{{ t('nextcloud-vue', 'Show') }}
				</NcButton>
			</div>
		</form>

		<p v-if="error"
			class="cn-reveal-field__error"
			role="alert"
			data-testid="cn-reveal-error">
			{{ error }}
		</p>
		<p v-if="note" class="cn-reveal-field__note" data-testid="cn-reveal-note">
			{{ note }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcTextField } from '@nextcloud/vue'

let uid = 0

/**
 * CnRevealField — a protected value shown masked until the user asks to see
 * it (board DqContact: "BSN *****4001 Tonen", "Het tonen van het BSN wordt
 * gelogd.").
 *
 * The component never holds the value until the user asks: `load` fetches it
 * on every reveal, so the server can log each viewing. With `requireReason`
 * the user first states why, and `load` receives that reason. Hide masks the
 * value again and drops it; the next Show calls `load` again.
 *
 * ```vue
 * <CnRevealField
 *   label="BSN"
 *   masked-value="*****4001"
 *   :load="(reason) => api.revealBsn(person.id, reason)"
 *   require-reason
 *   note="Het tonen van het BSN wordt gelogd." />
 * ```
 *
 * @event revealed Emitted once the value shows, with `{ reason }`.
 * @event hidden Emitted when the user masks the value again.
 */
export default {
	name: 'CnRevealField',

	components: {
		NcButton,
		NcLoadingIcon,
		NcTextField,
	},

	props: {
		/** What the value is, already translated ("BSN"). */
		label: { type: String, required: true },
		/** What shows while the value is hidden, such as the last digits behind stars. */
		maskedValue: { type: String, default: '••••••' },
		/**
		 * Fetches the value: `(reason) => string | Promise<string>`. Called on
		 * every reveal; `reason` is '' unless `requireReason` is set.
		 */
		load: { type: Function, required: true },
		/** Ask why the user needs the value before it is fetched. */
		requireReason: { type: Boolean, default: false },
		/** Label of the reason field, already translated; the library default is "Why do you need to see this?". */
		reasonLabel: { type: String, default: '' },
		/** A line under the value, already translated, such as that showing it is logged. */
		note: { type: String, default: '' },
	},

	emits: ['revealed', 'hidden'],

	data() {
		uid += 1
		return {
			labelId: `cn-reveal-field-${uid}`,
			revealed: false,
			revealedValue: '',
			askingReason: false,
			reason: '',
			loading: false,
			error: '',
		}
	},

	methods: {
		t,

		/**
		 * Show or hide the value. Showing asks the reason first when
		 * `requireReason` is set.
		 *
		 * @return {Promise<void>|void}
		 */
		toggle() {
			if (this.revealed) {
				this.hide()
				return undefined
			}
			if (this.requireReason) {
				this.askingReason = true
				this.error = ''
				this.$nextTick(() => this.$refs.reasonField?.focus?.())
				return undefined
			}
			return this.reveal('')
		},

		/**
		 * Reveal with the typed reason.
		 *
		 * @return {Promise<void>|void}
		 */
		submitReason() {
			const reason = this.reason.trim()
			if (reason === '') {
				return undefined
			}
			return this.reveal(reason)
		},

		/**
		 * Close the reason form without fetching.
		 *
		 * @return {void}
		 */
		cancelReason() {
			this.askingReason = false
			this.reason = ''
		},

		/**
		 * Fetch the value through `load` and show it; a failure keeps the
		 * value masked and says so.
		 *
		 * @param {string} reason Why the user asked, or ''.
		 * @return {Promise<void>}
		 */
		async reveal(reason) {
			this.loading = true
			this.error = ''
			try {
				const value = await this.load(reason)
				if (value === null || value === undefined || value === '') {
					throw new Error('empty')
				}
				this.revealedValue = String(value)
				this.revealed = true
				this.askingReason = false
				this.reason = ''
				this.$emit('revealed', { reason })
			} catch {
				this.error = t('nextcloud-vue', 'The value could not be shown. Try again later.')
			} finally {
				this.loading = false
			}
		},

		/**
		 * Mask the value again and drop it.
		 *
		 * @return {void}
		 */
		hide() {
			this.revealed = false
			this.revealedValue = ''
			this.$emit('hidden')
		},
	},
}
</script>

<style scoped>
.cn-reveal-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-reveal-field__row {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 4px 12px;
}

.cn-reveal-field__label {
	color: var(--color-text-maxcontrast);
}

.cn-reveal-field__value {
	font-variant-numeric: tabular-nums;
	font-weight: 500;
}

.cn-reveal-field__value--masked {
	letter-spacing: 0.08em;
}

.cn-reveal-field__reason {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-reveal-field__reason-actions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
}

.cn-reveal-field__error {
	color: var(--color-error-text, var(--color-error));
	margin: 0;
}

.cn-reveal-field__note {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	margin: 0;
}
</style>

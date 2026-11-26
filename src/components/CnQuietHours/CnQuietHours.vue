<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. -->
<template>
	<div class="cn-quiet-hours" data-testid="cn-quiet-hours">
		<component :is="innerHeadingTag" class="cn-quiet-hours__title cn-inner-heading">
			{{ t('nextcloud-vue', 'Quiet hours') }}
		</component>
		<p class="cn-quiet-hours__intro">
			{{ t('nextcloud-vue', 'Hold back notifications during set hours. Reminders with a deadline still arrive on time.') }}
		</p>
		<NcLoadingIcon v-if="loading" :size="20" />
		<template v-else>
			<NcCheckboxRadioSwitch type="switch"
				:modelValue="enabled"
				:disabled="saving"
				@update:modelValue="enabled = $event">
				{{ t('nextcloud-vue', 'Turn on quiet hours') }}
			</NcCheckboxRadioSwitch>
			<div class="cn-quiet-hours__fields">
				<NcTextField type="time"
					:label="t('nextcloud-vue', 'Begin')"
					:modelValue="start"
					:disabled="saving || !enabled"
					:error="fieldError !== ''"
					data-testid="cn-quiet-hours-start"
					@update:modelValue="start = $event" />
				<NcTextField type="time"
					:label="t('nextcloud-vue', 'End')"
					:modelValue="end"
					:disabled="saving || !enabled"
					:error="fieldError !== ''"
					data-testid="cn-quiet-hours-end"
					@update:modelValue="end = $event" />
			</div>
			<p v-if="fieldError"
				class="cn-quiet-hours__error"
				role="alert"
				data-testid="cn-quiet-hours-error">
				{{ fieldError }}
			</p>
			<p class="cn-quiet-hours__scope">
				{{ t('nextcloud-vue', 'This applies to every app that sends notifications through Open Register.') }}
			</p>
			<NcNoteCard v-if="notice === 'unsupported'" type="info" data-testid="cn-quiet-hours-unsupported">
				{{ t('nextcloud-vue', 'Your Nextcloud does not enforce quiet hours yet. Your choice is kept and works as soon as it can.') }}
			</NcNoteCard>
			<NcNoteCard v-else-if="notice === 'failed'" type="error" data-testid="cn-quiet-hours-failed">
				{{ t('nextcloud-vue', 'Saving failed. Try again.') }}
			</NcNoteCard>
			<NcButton variant="primary" :disabled="saving" @click="save">
				{{ t('nextcloud-vue', 'Save') }}
			</NcButton>
		</template>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import innerHeading from '../../mixins/innerHeading.js'

/**
 * OpenRegister's per-user delivery window. One window per user for every app
 * on the instance, so this block says so under its fields.
 */
export const DELIVERY_WINDOW_PATH = '/apps/openregister/api/notification-delivery-window'

/**
 * The browser's IANA time zone, or null when it cannot be read.
 *
 * @return {string|null} The time zone, e.g. `Europe/Amsterdam`.
 */
export function browserTimeZone() {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || null
	} catch {
		return null
	}
}

/**
 * CnQuietHours
 *
 * The quiet-hours block of the notification settings. It reads the current
 * user's window from OpenRegister's `/api/notification-delivery-window` and
 * saves it there with `PUT`: `{enabled, start, end, timezone}`, the time zone
 * taken from the browser; switching it off sends `{enabled: false}`, which
 * clears the window. Nothing is kept in the app or in browser storage.
 *
 * Answers: 200 shows the stored values; 422 shows OpenRegister's `error`
 * next to the fields and keeps what was typed; 404 (an OpenRegister without
 * the endpoint) shows that quiet hours are not enforced yet, values kept in
 * the form; anything else shows "Saving failed. Try again."
 *
 * Rendered by `CnNotificationPreferences` when the app turns it on (CnAppRoot
 * `quietHours`, or the pane's own `quietHours` prop).
 *
 * @spec openspec/changes/notification-quiet-hours-block/specs/notification-preferences/spec.md#requirement-the-notification-pane-can-show-quiet-hours-from-openregisters-delivery-window
 */
export default {
	name: 'CnQuietHours',

	components: {
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		NcNoteCard,
		NcTextField,
	},

	mixins: [innerHeading],

	emits: ['saved'],

	data() {
		return {
			loading: true,
			saving: false,
			enabled: false,
			start: '22:00',
			end: '07:00',
			fieldError: '',
			notice: '',
		}
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * Read the current user's window. A 404 means the endpoint is absent.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/notification-quiet-hours-block/specs/notification-preferences/spec.md#requirement-the-notification-pane-can-show-quiet-hours-from-openregisters-delivery-window
		 */
		async load() {
			this.loading = true
			try {
				const { data } = await axios.get(generateUrl(DELIVERY_WINDOW_PATH))
				this.apply(data)
			} catch (error) {
				this.notice = error?.response?.status === 404 ? 'unsupported' : ''
			} finally {
				this.loading = false
			}
		},

		/**
		 * Fill the form from a stored window.
		 *
		 * @param {object} window The endpoint's answer.
		 * @return {void}
		 */
		apply(window) {
			this.enabled = window?.enabled === true
			if (typeof window?.start === 'string' && window.start !== '') {
				this.start = window.start
			}
			if (typeof window?.end === 'string' && window.end !== '') {
				this.end = window.end
			}
		},

		/**
		 * The body to send: the window with the browser's time zone, or
		 * `{enabled: false}` when quiet hours are off.
		 *
		 * @return {object} The PUT body.
		 * @spec openspec/changes/notification-quiet-hours-block/specs/notification-preferences/spec.md#requirement-the-notification-pane-can-show-quiet-hours-from-openregisters-delivery-window
		 */
		body() {
			if (!this.enabled) {
				return { enabled: false }
			}
			const body = { enabled: true, start: this.start, end: this.end }
			const timezone = browserTimeZone()
			if (timezone) {
				body.timezone = timezone
			}
			return body
		},

		/**
		 * Save the window and show what the answer means.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/notification-quiet-hours-block/specs/notification-preferences/spec.md#requirement-the-notification-pane-can-show-quiet-hours-from-openregisters-delivery-window
		 */
		async save() {
			this.saving = true
			this.fieldError = ''
			this.notice = ''
			try {
				const { data } = await axios.put(generateUrl(DELIVERY_WINDOW_PATH), this.body())
				this.apply(data)
				this.$emit('saved', data)
			} catch (error) {
				const status = error?.response?.status
				if (status === 422) {
					this.fieldError = String(error.response.data?.error || t('nextcloud-vue', 'This time is not valid.'))
				} else if (status === 404) {
					this.notice = 'unsupported'
				} else {
					this.notice = 'failed'
				}
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-quiet-hours {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	margin-top: 20px;
}

.cn-quiet-hours__title {
	margin: 8px 0 0;
	font-weight: bold;
}

.cn-quiet-hours__intro,
.cn-quiet-hours__scope {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-quiet-hours__fields {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.cn-quiet-hours__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>

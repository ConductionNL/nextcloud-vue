<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-web-push-toggle" data-testid="cn-web-push-toggle">
		<NcCheckboxRadioSwitch
			type="switch"
			:modelValue="enabled"
			:disabled="!supported || busy"
			data-testid="cn-web-push-switch"
			@update:modelValue="onToggle">
			{{ label || t('nextcloud-vue', 'Notifications on this device') }}
		</NcCheckboxRadioSwitch>
		<p v-if="message" class="cn-web-push-toggle__hint" data-testid="cn-web-push-hint">
			{{ message }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { currentPushSubscription, disableWebPush, enableWebPush, webPushSupported } from '../../utils/webPush.js'

/**
 * CnWebPushToggle — a switch that turns web push on or off for this device
 * through OpenRegister's `web-push` channel. It never asks for permission on
 * its own: the browser prompt appears only after the person flips the switch.
 * On mount it reads whether this device is subscribed already.
 *
 * Example:
 * ```vue
 * <CnWebPushToggle :hint="t('humaniq', 'On an iPhone, add Mijn HR to the home screen first.')" />
 * ```
 */
export default {
	name: 'CnWebPushToggle',

	components: { NcCheckboxRadioSwitch },

	props: {
		/** The switch label; empty reads "Notifications on this device". */
		label: {
			type: String,
			default: '',
		},

		/** A line under the switch while nothing went wrong, such as how iPhone delivers push. */
		hint: {
			type: String,
			default: '',
		},

		/** The scope of the app's service worker; empty takes the page's ready worker. */
		scope: {
			type: String,
			default: '',
		},
	},

	emits: ['change'],

	data() {
		return {
			supported: webPushSupported(),
			enabled: false,
			busy: false,
			reason: '',
		}
	},

	computed: {
		/**
		 * The line under the switch: why it cannot be used, what went wrong, or the hint.
		 *
		 * @return {string}
		 */
		message() {
			if (!this.supported) {
				return t('nextcloud-vue', 'This browser cannot show notifications from this app.')
			}
			const reasons = {
				denied: t('nextcloud-vue', 'Notifications are blocked for this site. Allow them in the browser settings and try again.'),
				'not-configured': t('nextcloud-vue', 'Notifications on devices are not set up on this server yet.'),
				'no-worker': t('nextcloud-vue', 'This app is not ready to show notifications yet. Reload the page and try again.'),
				failed: t('nextcloud-vue', 'The notifications could not be switched. Try again.'),
			}
			return reasons[this.reason] || this.hint
		},
	},

	async mounted() {
		if (this.supported) {
			this.enabled = Boolean(await currentPushSubscription({ scope: this.scope || undefined }))
		}
	},

	methods: {
		t,

		/**
		 * Switch web push on or off, from the person's click.
		 *
		 * @param {boolean} on The new state.
		 * @return {Promise<void>}
		 * @spec openspec/changes/web-push-toggle/specs/web-push-toggle/spec.md#requirement-a-person-can-switch-web-push-on-for-this-device
		 */
		async onToggle(on) {
			this.busy = true
			this.reason = ''
			const options = { scope: this.scope || undefined }
			if (on) {
				const result = await enableWebPush(options)
				this.enabled = result.ok
				this.reason = result.ok ? '' : result.reason
			} else {
				const off = await disableWebPush(options)
				this.enabled = !off
				this.reason = off ? '' : 'failed'
			}
			this.busy = false
			/** @event change Whether this device now receives web push. */
			this.$emit('change', this.enabled)
		},
	},
}
</script>

<style scoped>
.cn-web-push-toggle__hint {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
}
</style>

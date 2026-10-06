<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<CnConfigurationCard class="cn-admin-action-card" :title="title" data-testid="cn-admin-action-card">
		<p v-if="description" class="cn-admin-action-card__description">
			{{ description }}
		</p>
		<!-- @slot default Extra content between the explanation and the button. -->
		<slot />
		<div class="cn-admin-action-card__footer">
			<NcButton
				:variant="buttonVariant"
				:disabled="running || disabled"
				data-testid="cn-admin-action-card-run"
				@click="run">
				<template v-if="running" #icon>
					<NcLoadingIcon :size="20" />
				</template>
				{{ running ? runningLabel : resolvedButtonLabel }}
			</NcButton>
		</div>
		<!-- role=status so a screen reader hears the outcome without moving focus. -->
		<div role="status" aria-live="polite">
			<NcNoteCard
				v-if="result"
				:type="result.success ? 'success' : 'error'"
				data-testid="cn-admin-action-card-result">
				{{ result.message }}
			</NcNoteCard>
		</div>
	</CnConfigurationCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnConfigurationCard from '../CnConfigurationCard/CnConfigurationCard.vue'

/**
 * CnAdminActionCard — one maintenance action on an admin settings page.
 *
 * A card with a title, a short explanation and one button. The click POSTs
 * an app action, the button spins while it runs, and the server's message
 * shows below it as success or error. Use it for work an admin starts by
 * hand, such as repairing the register or re-importing schemas. That work
 * never belongs in the setup wizard.
 *
 * By default it posts to the app's setup action contract,
 * `/apps/{appId}/api/setup/action/{action}`, the same endpoint the setup
 * wizard uses. Pass `url` to post somewhere else.
 *
 * ```vue
 * <CnAdminActionCard
 *   app-id="pipelinq"
 *   action="provision"
 *   :title="t('pipelinq', 'Repair the register')"
 *   :description="t('pipelinq', 'Creates missing schemas again. Your data stays as it is.')"
 *   :button-label="t('pipelinq', 'Repair')" />
 * ```
 *
 * @spec openspec/changes/setup-wizard-card-load-and-dependency-gate/specs/cn-setup-wizard/spec.md#requirement-an-admin-action-card-runs-one-server-action
 */
export default {
	name: 'CnAdminActionCard',

	components: {
		CnConfigurationCard,
		NcButton,
		NcLoadingIcon,
		NcNoteCard,
	},

	props: {
		/** Card heading. Pass it translated. */
		title: {
			type: String,
			required: true,
		},

		/** What the action does, in one or two short sentences. Pass it translated. */
		description: {
			type: String,
			default: '',
		},

		/** The Nextcloud app id; builds the default action URL. */
		appId: {
			type: String,
			default: '',
		},

		/** The action id, posted to `/apps/{appId}/api/setup/action/{action}`. */
		action: {
			type: String,
			default: '',
		},

		/**
		 * An app path to POST to instead of the setup action contract, e.g.
		 * `/apps/pipelinq/api/settings/repair`. Passed through `generateUrl`.
		 */
		url: {
			type: String,
			default: '',
		},

		/** Request body to send with the POST. */
		payload: {
			type: Object,
			default: () => ({}),
		},

		/** Button label. Defaults to "Run". */
		buttonLabel: {
			type: String,
			default: '',
		},

		/** Label next to the spinner while the action runs. */
		runningLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Running…'),
		},

		/** NcButton variant for the action button. */
		buttonVariant: {
			type: String,
			default: 'secondary',
		},

		/** Disable the button, e.g. while a precondition is not met. */
		disabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['result'],

	data() {
		return {
			running: false,
			/** @type {{ success: boolean, message: string }|null} */
			result: null,
		}
	},

	computed: {
		resolvedButtonLabel() {
			return this.buttonLabel || t('nextcloud-vue', 'Run')
		},

		/**
		 * The app path the button posts to: `url` when set, else the setup
		 * action contract. Empty when neither is configured.
		 *
		 * @return {string}
		 */
		actionPath() {
			if (this.url) {
				return this.url
			}
			if (this.appId && this.action) {
				return `/apps/${this.appId}/api/setup/action/${this.action}`
			}
			return ''
		},
	},

	methods: {
		/**
		 * Run the action: POST, spin while it runs, show the result.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/setup-wizard-card-load-and-dependency-gate/specs/cn-setup-wizard/spec.md#requirement-an-admin-action-card-runs-one-server-action
		 */
		async run() {
			if (this.running) {
				return
			}
			if (!this.actionPath) {
				this.result = { success: false, message: t('nextcloud-vue', 'This action is not configured.') }
				return
			}
			this.running = true
			this.result = null
			let data
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const response = await axios.post(generateUrl(this.actionPath), this.payload)
				data = response && response.data
				this.result = {
					success: !!data && data.success !== false,
					message: (data && data.message) || t('nextcloud-vue', 'Done.'),
				}
			} catch (err) {
				data = err && err.response ? err.response.data : null
				this.result = { success: false, message: this.errorMessage(err) }
			} finally {
				this.running = false
			}
			/**
			 * @event result The action finished.
			 * @type {{ success: boolean, message: string, data: object|null }}
			 */
			this.$emit('result', { ...this.result, data })
		},

		errorMessage(err) {
			const data = err && err.response && err.response.data
			if (data && (data.message || data.error)) {
				return data.message || data.error
			}
			return (err && err.message) || t('nextcloud-vue', 'Something went wrong.')
		},
	},
}
</script>

<style scoped>
.cn-admin-action-card__description {
	margin: 0 0 12px;
	color: var(--color-text-maxcontrast);
}

.cn-admin-action-card__footer {
	display: flex;
	gap: 8px;
	margin-block: 8px;
}
</style>

<!--
  CnIntegrationWidgetEmpty — the per-integration "not available / not
  configured" state rendered by CnIntegrationWidget when a leaf's
  backing app is missing or unconfigured.

  Renders NcEmptyContent with:
    - name        : "{App} not available" (or "{App} not configured" for
                    external integrations with no OpenConnector source).
    - icon slot   : the integration's app icon (descriptor `icon`,
                    resolved via CnIcon).
    - description : a short "this integration isn't set up" line.
    - action slot : an NcButton linking to the leaf's setup docs
                    (descriptor `docsUrl`, defaulting to
                    https://openregister.conduction.nl/docs/Integrations/{id}/).

  Split out from CnIntegrationWidget per ADR-004 (component isolation) so
  the widget template stays focused on tab/panel orchestration.
-->
<template>
	<NcEmptyContent :name="name" :description="description">
		<template #icon>
			<CnIcon v-if="provider.icon" :name="provider.icon" :size="64" />
		</template>
		<template #action>
			<NcButton
				variant="primary"
				:href="docsUrl"
				target="_blank"
				rel="noopener">
				<template #icon>
					<OpenInNew :size="18" />
				</template>
				{{ setupLabel }}
			</NcButton>
		</template>
	</NcEmptyContent>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcEmptyContent, NcButton } from '@nextcloud/vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import { registerIntegrationIcons } from '../../integrations/icons.js'

// The empty state can render before the widget's tab strip (single
// mode / standalone), so register the integration icon set here too.
registerIntegrationIcons()

/**
 * CnIntegrationWidgetEmpty — NcEmptyContent set-up state for an
 * unavailable / unconfigured integration leaf.
 */
export default {
	name: 'CnIntegrationWidgetEmpty',

	components: { NcEmptyContent, NcButton, CnIcon, OpenInNew },

	props: {
		/** Normalised registry descriptor for the unavailable leaf. */
		provider: {
			type: Object,
			required: true,
		},
		/**
		 * Why it's unavailable: 'missing-app' | 'not-configured' |
		 * 'unknown'. Drives the name + description copy.
		 */
		reason: {
			type: String,
			default: 'unknown',
		},
	},

	computed: {
		/** Backing-app display name (descriptor `appName`, falls back to `label`). */
		appName() {
			return this.provider.appName || this.provider.label || this.provider.id
		},

		/**
		 * Empty-state title. "{App} not configured" for not-configured
		 * (external) integrations, "{App} not available" otherwise.
		 *
		 * @return {string}
		 */
		name() {
			if (this.reason === 'not-configured') {
				return t('nextcloud-vue', '{app} not configured', { app: this.appName })
			}
			return t('nextcloud-vue', '{app} not available', { app: this.appName })
		},

		/**
		 * Empty-state description tailored to the reason.
		 *
		 * @return {string}
		 */
		description() {
			if (this.reason === 'not-configured') {
				return t('nextcloud-vue', 'This integration is not set up yet. Configure a connection to start using it.')
			}
			if (this.reason === 'missing-app') {
				return t('nextcloud-vue', 'This integration is not set up yet. Install and enable the {app} app to start using it.', { app: this.appName })
			}
			return t('nextcloud-vue', 'This integration is not available or not configured yet.')
		},

		/** Setup-docs URL (descriptor `docsUrl`, normalised by the registry). */
		docsUrl() {
			return this.provider.docsUrl || `https://openregister.conduction.nl/docs/Integrations/${this.provider.id}/`
		},

		/** Pre-translated CTA label. */
		setupLabel() {
			return t('nextcloud-vue', 'Set up {app}', { app: this.appName })
		},
	},
}
</script>

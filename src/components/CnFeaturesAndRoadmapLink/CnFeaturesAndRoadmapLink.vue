<template>
	<NcAppNavigationItem
		v-if="!disabled"
		:name="resolvedLabel"
		:to="{ name: routeName }">
		<template #icon>
			<RoadVariant :size="20" />
		</template>
	</NcAppNavigationItem>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnFeaturesAndRoadmapLink — `NcAppNavigationItem` that navigates to the
 * Features & Roadmap route configured by the host app. Renders nothing when
 * the `disabled` prop is true (admin opt-out path).
 *
 * Mount inside `<NcAppNavigationSettings>` above the Settings gear:
 *
 *   <NcAppNavigation>
 *     <template #list>...</template>
 *     <template #footer>
 *       <NcAppNavigationSettings>
 *         <CnFeaturesAndRoadmapLink />
 *       </NcAppNavigationSettings>
 *     </template>
 *   </NcAppNavigation>
 *
 * Spec: features-roadmap-component — Requirement "CnFeaturesAndRoadmapLink".
 */
import { translate as t } from '@nextcloud/l10n'
import { NcAppNavigationItem } from '@nextcloud/vue'
import RoadVariant from 'vue-material-design-icons/RoadVariant.vue'

export default {
	name: 'CnFeaturesAndRoadmapLink',

	components: { NcAppNavigationItem, RoadVariant },

	props: {
		/**
		 * Vue Router route name to navigate to when the menu entry is clicked.
		 * Host apps that mount this component must register a matching route.
		 */
		routeName: {
			type: String,
			default: 'features-roadmap',
		},
		/**
		 * When true the component renders nothing — the admin opt-out path
		 * driven by `openregister::features_roadmap_enabled` IAppConfig.
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Override the menu label. Defaults to the localized
		 * "Features & roadmap" string from the `nextcloud-vue` catalog.
		 */
		label: {
			type: String,
			default: '',
		},
	},

	computed: {
		resolvedLabel() {
			return this.label !== '' ? this.label : t('nextcloud-vue', 'Features & roadmap')
		},
	},
}
</script>

<style scoped>
/* Visual styling is inherited from NcAppNavigationItem; no overrides needed. */
</style>

<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<component
		:is="childRenderer"
		v-if="childRenderer"
		:content="childContent"
		:placement="placement"
		:edit-mode="editMode" />
	<div v-else class="cn-container-child cn-container-child--unknown">
		<span class="cn-container-child__missing">{{ unknownLabel }}</span>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { getWidgetTypeEntry } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

/**
 * CnContainerChild — registry-driven dispatcher for a single child placement
 * inside a `CnContainerWidget`.
 *
 * Looks up the placement's `type` in the shared dashboardWidgetRegistry and
 * mounts the matching `renderer`, forwarding the placement's `content`. Because
 * the `container` type's own renderer is `CnContainerWidget`, this component is
 * naturally recursive — it renders whatever depth it is handed; any nesting cap
 * is the consumer/server's concern, not this component's.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnContainerChild',

	props: {
		/** The child placement (`{type, content, ...}`). */
		placement: {
			type: Object,
			required: true,
		},
		/** Whether the surrounding container is in edit mode. */
		editMode: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/**
		 * The registry entry for the placement's type.
		 *
		 * @return {object|null} the entry, or `null` for unknown types.
		 */
		registryEntry() {
			const type = this.placement?.type
			if (typeof type !== 'string' || type === '') {
				return null
			}
			return getWidgetTypeEntry(type)
		},

		/**
		 * The renderer component for the placement's type.
		 *
		 * @return {object|null} the renderer, or `null`.
		 */
		childRenderer() {
			return this.registryEntry?.renderer || null
		},

		/**
		 * The placement's content blob.
		 *
		 * @return {object} the child content.
		 */
		childContent() {
			return this.placement?.content || {}
		},

		/**
		 * The localised "unknown widget type" label.
		 *
		 * @return {string} the fallback label.
		 */
		unknownLabel() {
			const type = this.placement?.type || ''
			return t('nextcloud-vue', 'Unknown widget type: {type}', { type })
		},
	},
}
</script>

<style scoped>
.cn-container-child {
	width: 100%;
	height: 100%;
}

.cn-container-child--unknown {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-maxcontrast);
	font-style: italic;
}
</style>

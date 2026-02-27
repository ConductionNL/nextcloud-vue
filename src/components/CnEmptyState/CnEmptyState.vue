<template>
	<NcEmptyContent :name="title" :description="description">
		<template #icon>
			<slot name="icon">
				<component :is="icon" v-if="icon" :size="64" />
			</slot>
		</template>
		<template v-if="actionLabel" #action>
			<slot name="action">
				<NcButton :type="actionType" @click="$emit('action')">
					{{ actionLabel }}
				</NcButton>
			</slot>
		</template>
	</NcEmptyContent>
</template>

<script>
import { NcEmptyContent, NcButton } from '@nextcloud/vue'

/**
 * CnEmptyState — Consistent empty state display wrapping NcEmptyContent.
 *
 * Provides a unified empty state pattern with icon, title, description,
 * and optional action button. Used across all list views.
 *
 * @example
 * <CnEmptyState
 *   title="No clients yet"
 *   description="Create your first client to get started"
 *   action-label="New Client"
 *   @action="createClient" />
 *
 * @example
 * <!-- With custom icon -->
 * <CnEmptyState title="No results">
 *   <template #icon>
 *     <Magnify :size="64" />
 *   </template>
 * </CnEmptyState>
 */
export default {
	name: 'CnEmptyState',

	components: {
		NcEmptyContent,
		NcButton,
	},

	props: {
		/** Main title text */
		title: {
			type: String,
			required: true,
		},
		/** Description text below the title */
		description: {
			type: String,
			default: '',
		},
		/** Vue component for the icon (e.g., imported material design icon) */
		icon: {
			type: [Object, null],
			default: null,
		},
		/** Action button label. If empty, no button is shown. */
		actionLabel: {
			type: String,
			default: '',
		},
		/** NcButton type for the action button */
		actionType: {
			type: String,
			default: 'primary',
		},
	},
}
</script>

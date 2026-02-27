<template>
	<div class="cn-detail-layout">
		<!-- Header -->
		<div class="cn-detail-layout__header">
			<NcButton @click="$emit('back')">
				<template #icon>
					<ArrowLeft :size="20" />
				</template>
				{{ backLabel }}
			</NcButton>

			<h2 class="cn-detail-layout__title">
				<slot name="title">{{ title }}</slot>
			</h2>

			<div class="cn-detail-layout__actions">
				<slot name="actions" />
			</div>
		</div>

		<!-- Loading state -->
		<div v-if="loading" class="cn-loading-container">
			<NcLoadingIcon :size="32" />
		</div>

		<!-- Main content -->
		<div v-else class="cn-detail-layout__content">
			<slot />
		</div>

		<!-- Delete confirmation dialog -->
		<slot name="dialogs" />
	</div>
</template>

<script>
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import ArrowLeft from 'vue-material-design-icons/ArrowLeft.vue'

/**
 * CnDetailViewLayout — Detail page layout with back button, title, actions, and content.
 *
 * Provides the standard structure for detail/edit views: back navigation,
 * page title, action buttons, and a content area. Supports loading state
 * and a dialogs slot for modals.
 *
 * @example
 * <CnDetailViewLayout
 *   title="Client: Acme Corp"
 *   :loading="isLoading"
 *   @back="goBack">
 *   <template #actions>
 *     <NcButton @click="edit">Edit</NcButton>
 *     <NcButton type="error" @click="confirmDelete">Delete</NcButton>
 *   </template>
 *   <div class="cn-detail-grid">
 *     <div class="cn-detail-item">...</div>
 *   </div>
 * </CnDetailViewLayout>
 */
export default {
	name: 'CnDetailViewLayout',

	components: {
		NcButton,
		NcLoadingIcon,
		ArrowLeft,
	},

	props: {
		/** Page title */
		title: {
			type: String,
			default: '',
		},
		/** Whether data is loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Back button label */
		backLabel: {
			type: String,
			default: 'Back',
		},
	},
}
</script>

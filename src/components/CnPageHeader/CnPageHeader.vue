<template>
	<div class="cn-page-header">
		<div v-if="icon || $slots.icon" class="cn-page-header__icon">
			<slot name="icon">
				<CnIcon :name="icon" :size="iconSize" />
			</slot>
		</div>
		<div class="cn-page-header__text">
			<h1 class="cn-page-header__title">
				{{ title }}
			</h1>
			<p v-if="description" class="cn-page-header__description">
				{{ description }}
			</p>
		</div>
		<slot name="extra" />
	</div>
</template>

<script>
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnPageHeader — Reusable page header with optional icon, title, and description.
 *
 * <CnPageHeader title="Clients" description="Manage your clients" icon="AccountGroup" />
 */
export default {
	name: 'CnPageHeader',

	components: {
		CnIcon,
	},

	props: {
		/** Page title text */
		title: {
			type: String,
			required: true,
		},
		/** Optional description shown below the title */
		description: {
			type: String,
			default: '',
		},
		/** Optional MDI icon name (rendered via CnIcon) */
		icon: {
			type: String,
			default: '',
		},
		/** Icon size in pixels */
		iconSize: {
			type: Number,
			default: 28,
		},
	},
}
</script>

<!-- Styles in css/page-header.css -->

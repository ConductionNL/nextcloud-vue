<template>
	<div class="cn-item-card" @click="$emit('click', $event)">
		<div class="cn-item-card__header">
			<div class="cn-item-card__title-row">
				<slot name="icon">
					<component :is="icon" v-if="icon" :size="iconSize" />
				</slot>
				<div class="cn-item-card__title-content">
					<h3 class="cn-item-card__title">{{ title }}</h3>
					<span v-if="subtitle" class="cn-item-card__subtitle">{{ subtitle }}</span>
				</div>
			</div>
			<div v-if="$slots.actions || $scopedSlots.actions" class="cn-item-card__actions">
				<slot name="actions" />
			</div>
		</div>
		<div v-if="$slots.default || $scopedSlots.default" class="cn-item-card__content">
			<slot />
		</div>
	</div>
</template>

<script>
/**
 * CnItemCard — Compact card for displaying an item in a sidebar list.
 *
 * Provides a card with a header (icon + title + optional actions) and
 * a flexible content area. Designed for use in sidebar lists such as
 * schema listings, source listings, etc.
 *
 * @example Basic usage
 * <CnItemCard title="My Schema" :icon="FileCodeOutline">
 *   <p>Schema content here</p>
 * </CnItemCard>
 *
 * @example With actions and stats
 * <CnItemCard title="My Schema" :icon="FileCodeOutline" subtitle="v1.0">
 *   <template #actions>
 *     <NcActions>
 *       <NcActionButton @click="edit">Edit</NcActionButton>
 *     </NcActions>
 *   </template>
 *   <CnKpiGrid :columns="2">
 *     <CnStatsBlock title="Objects" :count="42" />
 *     <CnStatsBlock title="Size" :count="0" :breakdown="{ size: '1.2 MB' }" />
 *   </CnKpiGrid>
 * </CnItemCard>
 */
export default {
	name: 'CnItemCard',

	props: {
		/** Card title */
		title: {
			type: String,
			default: '',
		},
		/** Optional subtitle below the title */
		subtitle: {
			type: String,
			default: '',
		},
		/** Icon component (e.g., imported MDI icon) */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/** Icon size in pixels */
		iconSize: {
			type: Number,
			default: 20,
		},
	},
}
</script>

<style scoped>
.cn-item-card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 10px);
	padding: 12px;
	margin-bottom: 12px;
}

.cn-item-card:last-child {
	margin-bottom: 0;
}

.cn-item-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.cn-item-card__title-row {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	flex: 1;
}

.cn-item-card__title-content {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-item-card__title {
	margin: 0;
	font-size: 1em;
	font-weight: 600;
	color: var(--color-main-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-item-card__subtitle {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-item-card__actions {
	flex-shrink: 0;
}

.cn-item-card__content {
	margin-top: 8px;
}
</style>

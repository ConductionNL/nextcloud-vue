<!--
  CnDetailCard — A card container for detail page sections.

  Visually matches the dashboard widget card style (rounded border, header, content).
  Used inside CnDetailPage to organize entity detail information into cards.
-->
<template>
	<div class="cn-detail-card" :class="{ 'cn-detail-card--collapsed': isCollapsed }">
		<!-- Header -->
		<div
			v-if="title || $slots.icon"
			class="cn-detail-card__header"
			:class="{ 'cn-detail-card__header--clickable': collapsible }"
			@click="collapsible && toggleCollapse()">
			<div class="cn-detail-card__header-left">
				<slot name="icon">
					<component
						:is="icon"
						v-if="icon"
						:size="20"
						class="cn-detail-card__icon" />
				</slot>
				<h3 class="cn-detail-card__title">
					{{ title }}
				</h3>
			</div>
			<div class="cn-detail-card__header-right">
				<slot name="header-actions" />
				<button
					v-if="collapsible"
					class="cn-detail-card__collapse-btn"
					:aria-label="isCollapsed ? 'Expand' : 'Collapse'">
					<ChevronDown
						:size="20"
						:class="{ 'cn-detail-card__chevron--rotated': isCollapsed }" />
				</button>
			</div>
		</div>

		<!-- Content -->
		<div v-show="!isCollapsed" class="cn-detail-card__content">
			<slot />
		</div>

		<!-- Footer -->
		<div v-if="$slots.footer" v-show="!isCollapsed" class="cn-detail-card__footer">
			<slot name="footer" />
		</div>
	</div>
</template>

<script>
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'

/**
 * CnDetailCard — Card container for detail page sections.
 *
 * @example Basic usage
 * <CnDetailCard title="Core Info">
 *   <div class="info-grid">...</div>
 * </CnDetailCard>
 *
 * @example With icon and actions
 * <CnDetailCard title="Pipeline" :icon="ChartIcon">
 *   <template #header-actions>
 *     <NcButton>Edit</NcButton>
 *   </template>
 *   <PipelineProgress :stages="stages" />
 * </CnDetailCard>
 *
 * @example Collapsible
 * <CnDetailCard title="Products" :collapsible="true">
 *   <ProductList :items="products" />
 * </CnDetailCard>
 */
export default {
	name: 'CnDetailCard',

	components: {
		ChevronDown,
	},

	props: {
		/** Card header title */
		title: {
			type: String,
			default: '',
		},
		/** Optional MDI icon component for the header */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/** Whether the card can be collapsed */
		collapsible: {
			type: Boolean,
			default: false,
		},
		/** Initial collapsed state (only relevant when collapsible is true) */
		collapsed: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			isCollapsed: this.collapsed,
		}
	},

	watch: {
		collapsed(val) {
			this.isCollapsed = val
		},
	},

	methods: {
		toggleCollapse() {
			this.isCollapsed = !this.isCollapsed
			this.$emit('update:collapsed', this.isCollapsed)
		},
	},
}
</script>

<style scoped>
.cn-detail-card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	overflow: hidden;
}

.cn-detail-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--color-border);
	flex-shrink: 0;
}

.cn-detail-card__header--clickable {
	cursor: pointer;
	user-select: none;
}

.cn-detail-card__header--clickable:hover {
	background: var(--color-background-hover);
}

.cn-detail-card--collapsed .cn-detail-card__header {
	border-bottom: none;
}

.cn-detail-card__header-left {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.cn-detail-card__header-right {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-shrink: 0;
}

.cn-detail-card__icon {
	color: var(--color-primary-element);
	flex-shrink: 0;
}

.cn-detail-card__title {
	font-weight: 600;
	font-size: 14px;
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-detail-card__collapse-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	padding: 4px;
	cursor: pointer;
	color: var(--color-text-maxcontrast);
	border-radius: var(--border-radius);
}

.cn-detail-card__collapse-btn:hover {
	background: var(--color-background-dark);
}

.cn-detail-card__chevron--rotated {
	transform: rotate(-90deg);
	transition: transform 0.2s ease;
}

.cn-detail-card__content {
	padding: 16px;
}

.cn-detail-card__footer {
	padding: 8px 16px;
	border-top: 1px solid var(--color-border);
}
</style>

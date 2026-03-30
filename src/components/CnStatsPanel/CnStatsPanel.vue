<template>
	<div class="cn-stats-panel">
		<!-- Header slot for filters/selectors -->
		<div v-if="$slots.header" class="cn-stats-panel__header">
			<slot name="header" />
		</div>

		<!-- Global loading state -->
		<div v-if="loading" class="cn-stats-panel__loading">
			<NcLoadingIcon :size="20" />
			<span>{{ loadingLabel }}</span>
		</div>

		<!-- Sections -->
		<template v-else>
			<div
				v-for="section in sections"
				:key="section.id"
				class="cn-stats-panel__section">
				<!-- Section title -->
				<h4 v-if="section.title" class="cn-stats-panel__section-title">
					{{ section.title }}
				</h4>

				<!-- Section-level loading -->
				<div v-if="section.loading" class="cn-stats-panel__loading">
					<NcLoadingIcon :size="20" />
					<span>{{ loadingLabel }}</span>
				</div>

				<!-- Empty section -->
				<div v-else-if="!section.items || !section.items.length" class="cn-stats-panel__empty">
					{{ section.emptyLabel || emptyLabel }}
				</div>

				<!-- Stats section -->
				<template v-else-if="section.type === 'stats'">
					<slot :name="'section-' + section.id" :section="section">
						<!-- Stack layout -->
						<div v-if="section.layout === 'stack'" class="cn-stats-panel__stack">
							<CnStatsBlock
								v-for="(item, index) in section.items"
								:key="index"
								:title="item.title"
								:count="item.count"
								:count-label="item.countLabel"
								:variant="item.variant || 'default'"
								:icon="isComponentIcon(item.icon) ? item.icon : null"
								:icon-size="item.iconSize || 24"
								:horizontal="item.horizontal !== undefined ? item.horizontal : true"
								:show-zero-count="item.showZeroCount !== undefined ? item.showZeroCount : true"
								:breakdown="item.breakdown || null"
								:route="item.route || null"
								:clickable="item.clickable || false"
								:loading="item.loading || false"
								@click="$emit('stat-click', { section: section.id, item, index })">
								<template v-if="typeof item.icon === 'string'" #icon>
									<CnIcon :name="item.icon" :size="item.iconSize || 24" />
								</template>
							</CnStatsBlock>
						</div>

						<!-- Grid layout -->
						<CnKpiGrid
							v-else-if="section.layout === 'grid'"
							grid-class="remove-margin"
							:columns="section.columns || 2">
							<CnStatsBlock
								v-for="(item, index) in section.items"
								:key="index"
								:title="item.title"
								:count="item.count"
								:count-label="item.countLabel"
								:variant="item.variant || 'default'"
								:icon="isComponentIcon(item.icon) ? item.icon : null"
								:icon-size="item.iconSize || 24"
								:horizontal="item.horizontal !== undefined ? item.horizontal : false"
								:show-zero-count="item.showZeroCount !== undefined ? item.showZeroCount : true"
								:breakdown="item.breakdown || null"
								:route="item.route || null"
								:clickable="item.clickable || false"
								:loading="item.loading || false"
								@click="$emit('stat-click', { section: section.id, item, index })">
								<template v-if="typeof item.icon === 'string'" #icon>
									<CnIcon :name="item.icon" :size="item.iconSize || 24" />
								</template>
							</CnStatsBlock>
						</CnKpiGrid>
					</slot>
				</template>

				<!-- List section -->
				<template v-else-if="section.type === 'list'">
					<slot :name="'section-' + section.id" :section="section">
						<div class="cn-stats-panel__list">
							<NcListItem
								v-for="item in section.items"
								:key="item.key"
								:name="item.name"
								:bold="item.bold || false"
								@click="$emit('list-click', { section: section.id, item })">
								<template #icon>
									<slot :name="'item-icon-' + section.id" :item="item">
										<CnIcon
											v-if="typeof item.icon === 'string'"
											:name="item.icon"
											:size="item.iconSize || 32" />
										<component
											:is="item.icon"
											v-else-if="item.icon"
											:size="item.iconSize || 32" />
									</slot>
								</template>
								<template #subname>
									<slot :name="'item-subname-' + section.id" :item="item">
										{{ item.subname }}
									</slot>
								</template>
							</NcListItem>
						</div>
					</slot>
				</template>
			</div>
		</template>

		<!-- Footer slot -->
		<div v-if="$slots.footer" class="cn-stats-panel__footer">
			<slot name="footer" />
		</div>
	</div>
</template>

<script>
import { NcLoadingIcon, NcListItem } from '@nextcloud/vue'
import { CnStatsBlock } from '../CnStatsBlock/index.js'
import { CnKpiGrid } from '../CnKpiGrid/index.js'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnStatsPanel — Configurable statistics panel with sections of stat blocks and list items.
 *
 * Renders statistics content from a declarative sections array. Each section can be
 * either a 'stats' section (renders CnStatsBlocks in stack or grid layout) or a
 * 'list' section (renders NcListItems). Suitable for sidebar tabs, dashboard widgets,
 * or any panel that displays statistics.
 *
 * @example Stats stack (vertical)
 * <CnStatsPanel :sections="[{
 *   type: 'stats',
 *   id: 'totals',
 *   title: 'System Totals',
 *   layout: 'stack',
 *   items: [
 *     { title: 'Objects', count: 42, countLabel: 'objects', variant: 'primary', icon: PackageIcon },
 *     { title: 'Files', count: 128, countLabel: 'files', icon: FileIcon },
 *   ],
 * }]" />
 *
 * @example Stats grid (2-column)
 * <CnStatsPanel :sections="[{
 *   type: 'stats',
 *   id: 'operations',
 *   title: 'Operations',
 *   layout: 'grid',
 *   columns: 2,
 *   items: [
 *     { title: 'Create', count: 10, countLabel: 'ops', variant: 'success', icon: PlusIcon },
 *     { title: 'Delete', count: 3, countLabel: 'ops', variant: 'error', icon: DeleteIcon },
 *   ],
 * }]" />
 *
 * @example List section
 * <CnStatsPanel :sections="[{
 *   type: 'list',
 *   id: 'topObjects',
 *   title: 'Most Active',
 *   items: [
 *     { key: '1', name: 'Object A', subname: '42 entries', icon: CogIcon },
 *   ],
 * }]" />
 *
 * @example With header slot for filters
 * <CnStatsPanel :sections="sections">
 *   <template #header>
 *     <NcSelect v-bind="registerOptions" />
 *   </template>
 * </CnStatsPanel>
 */
export default {
	name: 'CnStatsPanel',

	components: {
		NcLoadingIcon,
		NcListItem,
		CnStatsBlock,
		CnKpiGrid,
		CnIcon,
	},

	props: {
		/**
		 * Array of section definitions to render.
		 * Each section has a `type` of 'stats' or 'list'.
		 *
		 * Stats sections: `{ type: 'stats', id, title, layout: 'stack'|'grid', columns?, loading?, items: StatItem[] }`
		 * List sections: `{ type: 'list', id, title, loading?, items: ListItem[] }`
		 *
		 * StatItem: `{ title, count, countLabel, variant?, icon?, iconSize?, horizontal?, showZeroCount?, breakdown?, route?, clickable?, loading? }`
		 * ListItem: `{ key, name, subname?, bold?, icon?, iconSize? }`
		 */
		sections: {
			type: Array,
			default: () => [],
		},

		/** Whether the entire panel is in a loading state */
		loading: {
			type: Boolean,
			default: false,
		},

		/** Label shown during loading state */
		loadingLabel: {
			type: String,
			default: 'Loading...',
		},

		/** Default text shown when a section has no items. Can be overridden per section via `section.emptyLabel`. */
		emptyLabel: {
			type: String,
			default: 'No data available',
		},
	},

	emits: ['stat-click', 'list-click'],

	methods: {
		/**
		 * Check if an icon value is a component reference (not a string name).
		 * @param {*} icon - Icon value to check
		 * @return {boolean}
		 */
		isComponentIcon(icon) {
			return icon != null && typeof icon !== 'string'
		},
	},
}
</script>

<style scoped>
.cn-stats-panel__section {
	padding: 12px 0;
	border-bottom: 1px solid var(--color-border);
}

.remove-margin {
	margin: 0;
}

.cn-stats-panel__section:last-child {
	border-bottom: none;
}

.cn-stats-panel__section-title {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	font-weight: bold;
	padding: 0 16px;
	margin: 0 0 12px 0;
}

.cn-stats-panel__stack {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-stats-panel__loading {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 0 16px;
	color: var(--color-text-maxcontrast);
}

.cn-stats-panel__empty {
	padding: 0 16px;
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-stats-panel__header {
	padding-bottom: 12px;
	border-bottom: 1px solid var(--color-border);
}

.cn-stats-panel__footer {
	padding-top: 12px;
}

.cn-stats-panel__list {
	margin-top: 4px;
}
</style>

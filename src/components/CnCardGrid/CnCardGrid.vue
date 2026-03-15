<template>
	<div class="cn-card-grid">
		<!-- Loading state -->
		<div v-if="loading" class="cn-card-grid__loading">
			<NcLoadingIcon :size="32" />
		</div>

		<!-- Empty state -->
		<div v-else-if="objects.length === 0" class="cn-card-grid__empty">
			<slot name="empty">
				<NcEmptyContent :name="emptyText">
					<template #icon>
						<ViewGrid :size="64" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Card grid -->
		<div v-else class="cn-card-grid__grid">
			<slot
				v-for="object in objects"
				name="card"
				:object="object"
				:selected="isSelected(object)"
				:schema="schema">
				<CnObjectCard
					:key="object[rowKey]"
					:object="object"
					:schema="schema"
					:selectable="selectable"
					:selected="isSelected(object)"
					@click="$emit('click', object)"
					@select="toggleSelect(object)">
					<template v-if="$scopedSlots['card-actions']" #actions="{ object: obj }">
						<slot name="card-actions" :object="obj" />
					</template>
					<template v-if="$scopedSlots['card-badges']" #badges="{ object: obj }">
						<slot name="card-badges" :object="obj" />
					</template>
				</CnObjectCard>
			</slot>
		</div>
	</div>
</template>

<script>
import { NcLoadingIcon, NcEmptyContent } from '@nextcloud/vue'
import ViewGrid from 'vue-material-design-icons/ViewGrid.vue'
import { CnObjectCard } from '../CnObjectCard/index.js'

/**
 * CnCardGrid — Responsive grid container for CnObjectCard instances.
 *
 * Displays objects in a responsive CSS grid layout using schema-driven cards.
 * Supports selection, loading/empty states, and custom card rendering via slots.
 *
 * @example
 * <CnCardGrid
 *   :objects="publications"
 *   :schema="pubSchema"
 *   :selectable="true"
 *   :selected-ids="selectedIds"
 *   @click="openPublication"
 *   @select="onSelect">
 *   <template #card-actions="{ object }">
 *     <NcActions><NcActionButton>Edit</NcActionButton></NcActions>
 *   </template>
 * </CnCardGrid>
 */
export default {
	name: 'CnCardGrid',

	components: {
		NcLoadingIcon,
		NcEmptyContent,
		ViewGrid,
		CnObjectCard,
	},

	props: {
		/** Array of objects to display as cards */
		objects: {
			type: Array,
			default: () => [],
		},
		/** Schema definition (passed through to CnObjectCard) */
		schema: {
			type: Object,
			required: true,
		},
		/** Whether data is loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Whether cards can be selected */
		selectable: {
			type: Boolean,
			default: false,
		},
		/** Array of currently selected object IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},
		/** Property name used as unique identifier */
		rowKey: {
			type: String,
			default: 'id',
		},
		/** Text shown when there are no objects */
		emptyText: {
			type: String,
			default: 'No items found',
		},
	},

	methods: {
		isSelected(object) {
			return this.selectedIds.includes(object[this.rowKey])
		},

		toggleSelect(object) {
			const id = object[this.rowKey]
			const newIds = this.isSelected(object)
				? this.selectedIds.filter((i) => i !== id)
				: [...this.selectedIds, id]
			this.$emit('select', newIds)
		},
	},
}
</script>

<style scoped>
.cn-card-grid__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: 16px;
}

.cn-card-grid__loading {
	display: flex;
	justify-content: center;
	padding: 40px;
}

.cn-card-grid__empty {
	padding: 40px 20px;
	text-align: center;
}
</style>

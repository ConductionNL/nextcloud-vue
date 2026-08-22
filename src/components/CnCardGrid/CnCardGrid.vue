<template>
	<div class="cn-card-grid">
		<!-- Loading state -->
		<div v-if="loading" class="cn-card-grid__loading">
			<NcLoadingIcon :size="32" />
		</div>

		<!-- Empty state -->
		<div v-else-if="objects.length === 0" class="cn-card-grid__empty">
			<slot name="empty">
				<NcEmptyContent :name="resolvedEmptyText">
					<template #icon>
						<ViewGrid :size="64" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Card grid -->
		<div v-else class="cn-card-grid__grid">
			<div
				v-for="object in objects"
				:key="object[rowKey]"
				class="cn-card-grid__item">
				<slot
					name="card"
					:object="object"
					:selected="isSelected(object)"
					:schema="schema">
					<CnObjectCard
						:object="object"
						:schema="schema"
						:selectable="selectable"
						:selected="isSelected(object)"
						v-on="cardListeners(object)">
						<template v-if="$slots['card-actions']" #actions="{ object: obj }">
							<slot name="card-actions" :object="obj" />
						</template>
						<template v-if="$slots['card-badges']" #badges="{ object: obj }">
							<slot name="card-badges" :object="obj" />
						</template>
					</CnObjectCard>
				</slot>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcEmptyContent } from '@nextcloud/vue'
import ViewGrid from 'vue-material-design-icons/ViewGrid.vue'
import { CnObjectCard } from '../CnObjectCard/index.js'

/**
 * CnCardGrid — Responsive grid container for CnObjectCard instances.
 *
 * Displays objects in a responsive CSS grid layout using schema-driven cards.
 * Supports selection, loading/empty states, and custom card rendering via slots.
 *
 * ```vue
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
 * ```
 */
export default {
	name: 'CnCardGrid',

	components: {
		NcLoadingIcon,
		NcEmptyContent,
		ViewGrid,
		CnObjectCard,
	},

	inject: {
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). The
		 * manifest-authored empty-state copy is run through it. Defaults to
		 * an identity function so an untranslated key renders as itself.
		 */
		cnTranslate: { default: () => (key) => key },
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
			default: null,
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
			default: () => t('nextcloud-vue', 'No items found'),
		},
	},

	emits: ['click', 'select'],

	computed: {
		/**
		 * The empty-state copy run through the host translate function.
		 *
		 * @return {string}
		 */
		resolvedEmptyText() {
			const fn = typeof this.cnTranslate === 'function' ? this.cnTranslate : (k) => k
			return this.emptyText ? fn(this.emptyText) : this.emptyText
		},
	},

	methods: {
		isSelected(object) {
			return this.selectedIds.includes(object[this.rowKey])
		},

		/**
		 * Listeners bound on each CnObjectCard. Selectable cards select via
		 * `@select` only; the `@click` (navigation) listener is bound just for
		 * non-selectable cards — otherwise CnObjectCard's deprecated
		 * click-to-select path fires (a body click would both select AND
		 * navigate, unlike a table row which only selects).
		 *
		 * @param {object} object The card's object.
		 * @return {object} Event listeners for the card.
		 */
		cardListeners(object) {
			const listeners = { select: () => this.toggleSelect(object) }
			if (!this.selectable) {
				listeners.click = () => this.$emit('click', object)
			}
			return listeners
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

/* A card slot whose component renders nothing (e.g. a custom card that hides
   itself with `v-if` for a client-side filter) leaves an empty grid item that
   would still occupy a grid track and a row gap — pushing the visible cards
   down with a large blank gap above them. Collapse those empty cells so the
   remaining cards start at the top. A comment-only node (`v-if` false) still
   matches `:empty` per the CSS spec, so this catches the v-if-hidden case. */
.cn-card-grid__item:empty {
	display: none;
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

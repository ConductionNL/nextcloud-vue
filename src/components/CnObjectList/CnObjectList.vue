<template>
	<div class="cn-object-list">
		<!-- Loading state -->
		<div v-if="loading" class="cn-object-list__loading">
			<NcLoadingIcon :size="32" />
		</div>

		<!-- Empty state -->
		<div v-else-if="objects.length === 0" class="cn-object-list__empty">
			<!-- @slot empty Custom empty state shown when there are no objects. -->
			<slot name="empty">
				<NcEmptyContent :name="resolvedEmptyText">
					<template #icon>
						<FormatListBulletedSquare :size="64" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Rows -->
		<div v-else class="cn-object-list__rows">
			<div
				v-for="object in objects"
				:key="object[rowKey]"
				class="cn-object-list__item">
				<!-- @slot list-item Fully replace the default row (bypasses CnObjectRow). -->
				<!-- @binding {object} object The row's object. -->
				<!-- @binding {boolean} selected Whether the row is selected. -->
				<!-- @binding {?object} schema The schema prop. -->
				<!-- @binding {object} config The config prop. -->
				<slot
					name="list-item"
					:object="object"
					:selected="isSelected(object)"
					:schema="schema"
					:config="config">
					<CnObjectRow
						:object="object"
						:schema="schema"
						:config="config"
						:selectable="selectable"
						:selected="isSelected(object)"
						v-on="rowListeners(object)">
						<template v-if="$slots['row-actions']" #actions="{ object: obj }">
							<!-- @slot row-actions Trailing actions on the default row. -->
							<!-- @binding {object} object The row's object. -->
							<slot name="row-actions" :object="obj" />
						</template>
						<template v-if="$slots['row-badges']" #badges="{ object: obj }">
							<!-- @slot row-badges Badge area on the default row. -->
							<!-- @binding {object} object The row's object. -->
							<slot name="row-badges" :object="obj" />
						</template>
						<template v-if="$slots['row-icon']" #icon="{ object: obj }">
							<!-- @slot row-icon Leading icon/image on the default row. -->
							<!-- @binding {object} object The row's object. -->
							<slot name="row-icon" :object="obj" />
						</template>
					</CnObjectRow>
				</slot>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcEmptyContent } from '@nextcloud/vue'
import FormatListBulletedSquare from 'vue-material-design-icons/FormatListBulletedSquare.vue'
import { CnObjectRow } from '../CnObjectRow/index.js'

/**
 * CnObjectList — Vertical list container for CnObjectRow instances.
 *
 * The list-mode counterpart to `CnCardGrid`. Renders objects as compact
 * single-line rows, with selection, loading/empty states, and full row
 * override via the `#list-item` slot (or per-part `#row-icon` / `#row-badges`
 * / `#row-actions` slots on the default row).
 *
 * ```vue
 * <CnObjectList
 *   :objects="secrets"
 *   :schema="secretSchema"
 *   :config="{ subtitleField: 'url', iconName: 'Key' }"
 *   @click="openSecret">
 *   <template #row-actions="{ object }">
 *     <NcButton @click="copy(object)">Copy</NcButton>
 *   </template>
 * </CnObjectList>
 * ```
 */
export default {
	name: 'CnObjectList',

	components: {
		NcLoadingIcon,
		NcEmptyContent,
		FormatListBulletedSquare,
		CnObjectRow,
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
		/** Array of objects to display as rows */
		objects: {
			type: Array,
			default: () => [],
		},
		/** Schema definition (passed through to CnObjectRow) */
		schema: {
			type: Object,
			default: null,
		},
		/**
		 * Field-mapping config passed through to CnObjectRow.
		 * @type {{ titleField?: string, subtitleField?: string, imageField?: string, iconField?: string, iconName?: string, badgeField?: string, badgeVariantField?: string, badgeVariant?: string, badgeColorMap?: object }}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},
		/** Whether data is loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Whether rows can be selected */
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
		 * Listeners bound on each CnObjectRow. Selectable rows select via
		 * `@select` only; the `@click` (navigation) listener is bound only for
		 * non-selectable rows.
		 *
		 * @param {object} object The row's object.
		 * @return {object} Event listeners for the row.
		 */
		rowListeners(object) {
			const listeners = { select: () => this.toggleSelect(object) }
			if (!this.selectable) {
				listeners.click = () => this.emitClick(object)
			}
			return listeners
		},

		/**
		 * Emit `click` for a non-selectable row (navigation).
		 *
		 * @param {object} object The clicked row's object.
		 */
		emitClick(object) {
			/**
			 * @event click Emitted when a non-selectable row is clicked (navigation).
			 * @type {object} The clicked row's object.
			 */
			this.$emit('click', object)
		},

		toggleSelect(object) {
			const id = object[this.rowKey]
			const newIds = this.isSelected(object)
				? this.selectedIds.filter((i) => i !== id)
				: [...this.selectedIds, id]
			/**
			 * @event select Emitted when the selected-id set changes.
			 * @type {Array<string|number>} The new array of selected ids.
			 */
			this.$emit('select', newIds)
		},
	},
}
</script>

<style scoped>
.cn-object-list__rows {
	display: flex;
	flex-direction: column;
	border-top: 1px solid var(--color-border);
}

/* A list-item slot whose component renders nothing (e.g. a v-if client-side
   filter) still matches :empty per the CSS spec — collapse it so it leaves no
   ghost row / divider. */
.cn-object-list__item:empty {
	display: none;
}

.cn-object-list__loading {
	display: flex;
	justify-content: center;
	padding: 40px;
}

.cn-object-list__empty {
	padding: 40px 20px;
	text-align: center;
}
</style>

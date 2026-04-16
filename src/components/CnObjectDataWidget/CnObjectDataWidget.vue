<!--
  CnObjectDataWidget — Schema-driven editable data grid widget.

  Displays object properties in a CSS grid layout, auto-generated from a JSON Schema.
  Each cell shows a formatted value. Clicking an editable cell opens an inline editor
  matching the property type (text, select, date, checkbox, textarea, etc.).
  When any value is changed, a Save button appears in the widget header.

  Supports per-property overrides for order, grid span, visibility, editability, and widget type.
-->
<template>
	<CnDetailCard :title="title" :icon="iconComponent">
		<template #header-actions>
			<NcButton
				v-if="isDirty"
				type="primary"
				:disabled="saving"
				@click="save">
				<template #icon>
					<NcLoadingIcon v-if="saving" :size="20" />
					<ContentSaveOutline v-else :size="20" />
				</template>
				{{ saveLabel }}
			</NcButton>
			<NcButton
				v-if="isDirty"
				@click="discard">
				{{ discardLabel }}
			</NcButton>
			<slot name="header-actions" />
		</template>

		<!-- Empty state -->
		<div v-if="!resolvedFields.length" class="cn-object-data-widget__empty">
			{{ emptyLabel }}
		</div>

		<!-- Grid -->
		<div
			v-else
			class="cn-object-data-widget__grid"
			:style="gridStyle">
			<div
				v-for="field in resolvedFields"
				:key="field.key"
				class="cn-object-data-widget__cell"
				:style="cellStyle(field)">
				<!-- Label -->
				<div class="cn-object-data-widget__label">
					{{ field.label }}
				</div>

				<!-- Editing mode for this field -->
				<div
					v-if="editingField === field.key"
					class="cn-object-data-widget__editor">
					<!-- Per-field slot override -->
					<slot
						v-if="$scopedSlots['field-' + field.key]"
						:name="'field-' + field.key"
						:field="field"
						:value="editData[field.key]"
						:update="(val) => updateField(field.key, val)"
						:cancel="cancelEdit" />

					<!-- Auto-generated editor -->
					<template v-else>
						<!-- Text / Email / URL -->
						<NcTextField
							v-if="field.widget === 'text' || field.widget === 'email' || field.widget === 'url'"
							ref="activeEditor"
							:value="editData[field.key] != null ? String(editData[field.key]) : ''"
							:type="field.widget === 'email' ? 'email' : field.widget === 'url' ? 'url' : 'text'"
							:placeholder="field.description"
							@update:value="val => updateField(field.key, val)"
							@keydown.native.enter="commitEdit"
							@keydown.native.escape="cancelEdit" />

						<!-- Number -->
						<NcTextField
							v-else-if="field.widget === 'number'"
							ref="activeEditor"
							:value="editData[field.key] != null ? String(editData[field.key]) : ''"
							type="number"
							:placeholder="field.description"
							@update:value="val => updateField(field.key, val !== '' ? Number(val) : null)"
							@keydown.native.enter="commitEdit"
							@keydown.native.escape="cancelEdit" />

						<!-- Textarea -->
						<textarea
							v-else-if="field.widget === 'textarea'"
							ref="activeEditor"
							class="cn-object-data-widget__textarea"
							:value="editData[field.key] || ''"
							:placeholder="field.description"
							rows="4"
							@input="updateField(field.key, $event.target.value)"
							@keydown.escape="cancelEdit" />

						<!-- Select -->
						<NcSelect
							v-else-if="field.widget === 'select'"
							ref="activeEditor"
							:options="getSelectOptions(field)"
							:value="getSelectedOption(field)"
							:clearable="!field.required"
							@input="onSelectChange(field, $event)"
							@close="commitEdit" />

						<!-- Multiselect -->
						<NcSelect
							v-else-if="field.widget === 'multiselect'"
							ref="activeEditor"
							:options="getMultiselectOptions(field)"
							:value="getSelectedMultiselectOptions(field)"
							:multiple="true"
							:clearable="true"
							@input="onMultiselectChange(field, $event)" />

						<!-- Tags -->
						<NcSelect
							v-else-if="field.widget === 'tags'"
							ref="activeEditor"
							:value="editData[field.key] || []"
							:multiple="true"
							:taggable="true"
							:clearable="true"
							@input="val => updateField(field.key, val)" />

						<!-- Checkbox / Switch -->
						<NcCheckboxRadioSwitch
							v-else-if="field.widget === 'checkbox'"
							:checked="!!editData[field.key]"
							type="switch"
							@update:checked="val => { updateField(field.key, val); commitEdit() }">
							{{ editData[field.key] ? 'Yes' : 'No' }}
						</NcCheckboxRadioSwitch>

						<!-- Date -->
						<NcTextField
							v-else-if="field.widget === 'date'"
							ref="activeEditor"
							:value="editData[field.key] || ''"
							type="date"
							@update:value="val => updateField(field.key, val)"
							@keydown.native.enter="commitEdit"
							@keydown.native.escape="cancelEdit" />

						<!-- Datetime -->
						<NcTextField
							v-else-if="field.widget === 'datetime'"
							ref="activeEditor"
							:value="editData[field.key] || ''"
							type="datetime-local"
							@update:value="val => updateField(field.key, val)"
							@keydown.native.enter="commitEdit"
							@keydown.native.escape="cancelEdit" />

						<!-- Fallback: text -->
						<NcTextField
							v-else
							ref="activeEditor"
							:value="editData[field.key] != null ? String(editData[field.key]) : ''"
							:placeholder="field.description"
							@update:value="val => updateField(field.key, val)"
							@keydown.native.enter="commitEdit"
							@keydown.native.escape="cancelEdit" />
					</template>

					<!-- Confirm/Cancel for non-auto-committing editors -->
					<div
						v-if="field.widget !== 'checkbox'"
						class="cn-object-data-widget__editor-actions">
						<NcButton type="tertiary-no-background" @click="commitEdit">
							<template #icon>
								<Check :size="20" />
							</template>
						</NcButton>
						<NcButton type="tertiary-no-background" @click="cancelEdit">
							<template #icon>
								<Close :size="20" />
							</template>
						</NcButton>
					</div>
				</div>

				<!-- Display mode -->
				<div
					v-else
					class="cn-object-data-widget__value"
					:class="{
						'cn-object-data-widget__value--editable': isEditable(field),
						'cn-object-data-widget__value--empty': isValueEmpty(field.key),
					}"
					:tabindex="isEditable(field) ? 0 : -1"
					:role="isEditable(field) ? 'button' : undefined"
					:aria-label="isEditable(field) ? 'Click to edit ' + field.label : undefined"
					@click="isEditable(field) && startEdit(field)"
					@keydown.enter="isEditable(field) && startEdit(field)">
					<!-- Per-field display slot override -->
					<slot
						v-if="$scopedSlots['display-' + field.key]"
						:name="'display-' + field.key"
						:field="field"
						:value="displayValues[field.key]"
						:raw="objectData[field.key]" />
					<template v-else>
						{{ displayValues[field.key] }}
					</template>
					<Pencil
						v-if="isEditable(field)"
						class="cn-object-data-widget__edit-icon"
						:size="14" />
				</div>
			</div>
		</div>
	</CnDetailCard>
</template>

<script>
import { NcButton, NcLoadingIcon, NcTextField, NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { CnDetailCard } from '../CnDetailCard/index.js'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Close from 'vue-material-design-icons/Close.vue'
import { fieldsFromSchema, formatValue } from '../../utils/schema.js'

/**
 * CnObjectDataWidget — Schema-driven editable data grid widget.
 *
 * Renders object properties in a configurable CSS grid. Each property is displayed
 * as a label-value cell. Editable cells can be clicked to switch to inline editing.
 * Uses the objectStore to persist changes.
 *
 * @example Basic usage
 * <CnObjectDataWidget
 *   title="Character Info"
 *   :schema="schema"
 *   :object-data="character"
 *   object-type="characters"
 *   :overrides="{
 *     name: { order: 1, gridColumn: 2 },
 *     description: { order: 2, gridColumn: 3, gridRow: 2 },
 *     status: { order: 3 },
 *     internalId: { hidden: true },
 *   }" />
 *
 * @example Read-only mode
 * <CnObjectDataWidget
 *   title="Summary"
 *   :schema="schema"
 *   :object-data="item"
 *   :editable="false" />
 */
export default {
	name: 'CnObjectDataWidget',

	components: {
		NcButton,
		NcLoadingIcon,
		NcTextField,
		NcSelect,
		NcCheckboxRadioSwitch,
		CnDetailCard,
		ContentSaveOutline,
		Pencil,
		Check,
		Close,
	},

	props: {
		/** Widget title shown in the card header */
		title: {
			type: String,
			default: 'Data',
		},
		/** Optional MDI icon component for the header */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/**
		 * The JSON Schema describing the object's properties.
		 * Must have a `properties` field.
		 */
		schema: {
			type: Object,
			required: true,
		},
		/**
		 * The object data to display and edit.
		 * Keys should match the schema property keys.
		 */
		objectData: {
			type: Object,
			required: true,
		},
		/**
		 * The registered object type slug in the objectStore.
		 * Required for saving via objectStore.saveObject().
		 */
		objectType: {
			type: String,
			default: '',
		},
		/**
		 * Optional objectStore instance. When provided, used directly for saving.
		 * When not provided, falls back to auto-detecting the store via Pinia.
		 */
		store: {
			type: Object,
			default: null,
		},
		/**
		 * Per-property configuration overrides.
		 * Keys are property names, values are override objects.
		 *
		 * Supported overrides:
		 * - `order` (number) — Display order (lower = first)
		 * - `gridColumn` (number) — Number of grid columns to span (default 1)
		 * - `gridRow` (number) — Number of grid rows to span (default 1)
		 * - `hidden` (boolean) — Hide this property
		 * - `editable` (boolean) — Override editability (default: based on schema readOnly)
		 * - `label` (string) — Override the display label
		 * - `widget` (string) — Override the widget type for editing
		 *
		 * @type {Object<string, { order?: number, gridColumn?: number, gridRow?: number, hidden?: boolean, editable?: boolean, label?: string, widget?: string }>}
		 */
		overrides: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Number of grid columns.
		 */
		columns: {
			type: Number,
			default: 3,
		},
		/**
		 * Whether editing is enabled globally.
		 * When false, no fields are editable regardless of per-field settings.
		 */
		editable: {
			type: Boolean,
			default: true,
		},
		/**
		 * Properties to exclude from display.
		 * @type {string[]}
		 */
		exclude: {
			type: Array,
			default: () => [],
		},
		/**
		 * Properties to include (whitelist mode). If provided, only these are shown.
		 * @type {string[]}
		 */
		include: {
			type: Array,
			default: () => null,
		},
		/** Label for the save button */
		saveLabel: {
			type: String,
			default: 'Save',
		},
		/** Label for the discard button */
		discardLabel: {
			type: String,
			default: 'Discard',
		},
		/** Label shown when no properties to display */
		emptyLabel: {
			type: String,
			default: 'No data available',
		},
	},

	data() {
		return {
			/** Currently editing field key, or null */
			editingField: null,
			/** Working copy of changed field values */
			editData: {},
			/** Set of field keys that have been modified */
			dirtyFields: {},
			/** Whether a save is in progress */
			saving: false,
		}
	},

	computed: {
		iconComponent() {
			return this.icon
		},

		/**
		 * Resolved field definitions from schema + overrides.
		 * Sorted by order, filtered by hidden/exclude/include.
		 */
		resolvedFields() {
			// Build override map for fieldsFromSchema
			const fieldOverrides = {}
			for (const [key, cfg] of Object.entries(this.overrides)) {
				const override = {}
				if (cfg.label) override.label = cfg.label
				if (cfg.widget) override.widget = cfg.widget
				if (typeof cfg.order === 'number') override.order = cfg.order
				if (cfg.enum) override.enum = cfg.enum
				if (Object.keys(override).length > 0) {
					fieldOverrides[key] = override
				}
			}

			// Build exclude list: merge prop exclude + hidden overrides
			const excludeList = [...this.exclude]
			for (const [key, cfg] of Object.entries(this.overrides)) {
				if (cfg.hidden === true && !excludeList.includes(key)) {
					excludeList.push(key)
				}
			}

			const fields = fieldsFromSchema(this.schema, {
				exclude: excludeList,
				include: this.include,
				overrides: fieldOverrides,
				includeReadOnly: true,
			})

			// Attach grid span info from overrides
			const result = fields.map(field => ({
				...field,
				gridColumn: (this.overrides[field.key] && this.overrides[field.key].gridColumn) || 1,
				gridRow: (this.overrides[field.key] && this.overrides[field.key].gridRow) || 1,
			}))

			// Re-sort by order after overrides are applied
			// (fieldsFromSchema sorts before applying overrides, so order may have changed)
			result.sort(function(a, b) {
				const orderA = typeof a.order === 'number' ? a.order : Infinity
				const orderB = typeof b.order === 'number' ? b.order : Infinity
				if (orderA !== orderB) return orderA - orderB
				return a.key.localeCompare(b.key)
			})

			return result
		},

		/**
		 * Formatted display values for each field.
		 */
		displayValues() {
			const values = {}
			for (const field of this.resolvedFields) {
				// Show pending edit value if dirty
				const raw = field.key in this.dirtyFields
					? this.dirtyFields[field.key]
					: this.objectData[field.key]
				const prop = this.schema.properties && this.schema.properties[field.key]
				values[field.key] = formatValue(raw, prop || {})
			}
			return values
		},

		/**
		 * Whether any fields have been modified.
		 */
		isDirty() {
			return Object.keys(this.dirtyFields).length > 0
		},

		/**
		 * CSS grid template for the container.
		 */
		gridStyle() {
			return {
				'grid-template-columns': `repeat(${this.columns}, 1fr)`,
			}
		},
	},

	watch: {
		objectData: {
			deep: true,
			handler() {
				// If external data changes (e.g. after save), clear dirty state
				// for fields that now match the new data
				for (const key of Object.keys(this.dirtyFields)) {
					if (this.dirtyFields[key] === this.objectData[key]) {
						const { [key]: _, ...rest } = this.dirtyFields
						this.dirtyFields = rest
					}
				}
			},
		},
	},

	methods: {
		/**
		 * Check if a field is editable.
		 * @param field
		 */
		isEditable(field) {
			if (!this.editable) return false
			// Per-field override takes priority
			const override = this.overrides[field.key]
			if (override && typeof override.editable === 'boolean') {
				return override.editable
			}
			// Schema readOnly
			return !field.readOnly
		},

		/**
		 * Check if a field's current value is empty.
		 * @param key
		 */
		isValueEmpty(key) {
			const val = key in this.dirtyFields
				? this.dirtyFields[key]
				: this.objectData[key]
			return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
		},

		/**
		 * Start inline editing for a field.
		 * @param field
		 */
		startEdit(field) {
			// Set working value: dirty value > current object value
			const currentValue = field.key in this.dirtyFields
				? this.dirtyFields[field.key]
				: this.objectData[field.key]
			this.editData = { ...this.editData, [field.key]: currentValue }
			this.editingField = field.key

			this.$nextTick(() => {
				// Focus the editor
				const editor = this.$refs.activeEditor
				if (editor) {
					const el = Array.isArray(editor) ? editor[0] : editor
					if (el && el.$el) {
						const input = el.$el.querySelector('input, textarea, select')
						if (input) input.focus()
					} else if (el && el.focus) {
						el.focus()
					}
				}
			})
		},

		/**
		 * Update the working edit value for a field.
		 * @param key
		 * @param value
		 */
		updateField(key, value) {
			this.editData = { ...this.editData, [key]: value }
		},

		/**
		 * Commit the current inline edit — mark the field as dirty.
		 */
		commitEdit() {
			if (!this.editingField) return

			const key = this.editingField
			const newValue = this.editData[key]
			const originalValue = this.objectData[key]

			// Only mark dirty if actually changed
			if (newValue !== originalValue) {
				this.dirtyFields = { ...this.dirtyFields, [key]: newValue }
			} else {
				// Remove from dirty if reverted to original
				const { [key]: _, ...rest } = this.dirtyFields
				this.dirtyFields = rest
			}

			this.editingField = null
		},

		/**
		 * Cancel the current inline edit without saving.
		 */
		cancelEdit() {
			this.editingField = null
		},

		/**
		 * Discard all pending changes.
		 */
		discard() {
			this.dirtyFields = {}
			this.editData = {}
			this.editingField = null
			this.$emit('discard')
		},

		/**
		 * Save all dirty fields via the objectStore or emit event.
		 */
		async save() {
			if (!this.isDirty) return

			const mergedData = {
				...this.objectData,
				...this.dirtyFields,
			}

			this.saving = true

			try {
				// Try objectStore first if objectType is registered
				if (this.objectType) {
					const store = this._getObjectStore()
					if (store) {
						const result = await store.saveObject(this.objectType, mergedData)
						if (result) {
							this.dirtyFields = {}
							this.editData = {}
							this.$emit('saved', result)
						} else {
							const error = store.getError(this.objectType)
							this.$emit('save-error', error)
						}
						return
					}
				}

				// Fallback: emit for parent to handle
				this.$emit('save', mergedData)
			} finally {
				this.saving = false
			}
		},

		/**
		 * Get the objectStore instance.
		 * Uses the `store` prop if provided, otherwise tries Pinia auto-detection.
		 * @return {object|null}
		 */
		_getObjectStore() {
			// Prefer explicit store prop
			if (this.store) return this.store

			try {
				// Dynamic import to avoid hard dependency
				const pinia = this.$pinia
				if (!pinia) return null
				// Try to access the store — it must already be created by the consuming app
				const { useObjectStore } = require('../../store/index.js')
				return useObjectStore()
			} catch {
				return null
			}
		},

		/**
		 * Compute CSS grid placement for a field cell.
		 * @param field
		 */
		cellStyle(field) {
			const style = {}
			if (field.gridColumn > 1) {
				style.gridColumn = `span ${field.gridColumn}`
			}
			if (field.gridRow > 1) {
				style.gridRow = `span ${field.gridRow}`
			}
			return style
		},

		// ── Select helpers ──

		/**
		 * Normalize an option to { id, label } format.
		 * Accepts plain strings or objects with id/label properties.
		 * @param val
		 */
		_normalizeOption(val) {
			if (val && typeof val === 'object' && val.id !== undefined) {
				return { id: val.id, label: val.label || val.id }
			}
			return { id: val, label: String(val) }
		},

		getSelectOptions(field) {
			if (field.enum) {
				return field.enum.map(val => this._normalizeOption(val))
			}
			return []
		},

		getSelectedOption(field) {
			const val = this.editData[field.key]
			if (val === null || val === undefined) return null
			// Find matching option from enum for proper label display
			const options = this.getSelectOptions(field)
			return options.find(opt => opt.id === val) || { id: val, label: String(val) }
		},

		onSelectChange(field, option) {
			this.updateField(field.key, option ? option.id : null)
		},

		getMultiselectOptions(field) {
			// Check override enum first, then schema items.enum
			if (field.enum) {
				return field.enum.map(val => this._normalizeOption(val))
			}
			const itemsEnum = field.items && field.items.enum
			if (itemsEnum) {
				return itemsEnum.map(val => this._normalizeOption(val))
			}
			return []
		},

		getSelectedMultiselectOptions(field) {
			const val = this.editData[field.key]
			if (!Array.isArray(val)) return []
			// Map selected IDs to option objects with labels
			const options = this.getMultiselectOptions(field)
			return val.map(v => options.find(opt => opt.id === v) || { id: v, label: String(v) })
		},

		onMultiselectChange(field, selected) {
			const values = Array.isArray(selected)
				? selected.map(opt => opt.id || opt)
				: []
			this.updateField(field.key, values)
		},
	},
}
</script>

<style scoped>
.cn-object-data-widget__grid {
	display: grid;
	gap: calc(2 * var(--default-grid-baseline, 4px)) calc(4 * var(--default-grid-baseline, 4px));
}

.cn-object-data-widget__cell {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: calc(2 * var(--default-grid-baseline, 4px)) 0;
	border-bottom: 1px solid var(--color-border-dark);
	min-width: 0;
}

.cn-object-data-widget__label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	font-weight: 500;
}

.cn-object-data-widget__value {
	font-size: 1em;
	color: var(--color-main-text);
	word-break: break-word;
	position: relative;
	padding-right: 20px;
}

.cn-object-data-widget__value--editable {
	cursor: pointer;
	border-radius: var(--border-radius);
	padding: 4px 24px 4px 4px;
	margin: -4px;
}

.cn-object-data-widget__value--editable:hover {
	background: var(--color-background-dark);
}

.cn-object-data-widget__value--editable:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-object-data-widget__value--empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-object-data-widget__edit-icon {
	position: absolute;
	right: 4px;
	top: 50%;
	transform: translateY(-50%);
	color: var(--color-text-maxcontrast);
	opacity: 0;
	transition: opacity 0.15s ease;
}

.cn-object-data-widget__value--editable:hover .cn-object-data-widget__edit-icon,
.cn-object-data-widget__value--editable:focus-visible .cn-object-data-widget__edit-icon {
	opacity: 1;
}

.cn-object-data-widget__editor {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-object-data-widget__editor-actions {
	display: flex;
	gap: 2px;
	justify-content: flex-end;
}

.cn-object-data-widget__textarea {
	width: 100%;
	min-height: 80px;
	padding: 8px;
	border: 2px solid var(--color-border-dark);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-family: inherit;
	font-size: inherit;
	resize: vertical;
}

.cn-object-data-widget__textarea:focus {
	border-color: var(--color-primary-element);
	outline: none;
}

.cn-object-data-widget__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	padding: calc(2 * var(--default-grid-baseline, 4px));
}

/* Responsive: collapse to single column on narrow widths */
@media (max-width: 600px) {
	.cn-object-data-widget__grid {
		grid-template-columns: 1fr !important;
	}

	.cn-object-data-widget__cell {
		grid-column: span 1 !important;
		grid-row: span 1 !important;
	}
}
</style>

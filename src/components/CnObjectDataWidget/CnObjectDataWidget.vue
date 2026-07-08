<!--
  CnObjectDataWidget — Schema-driven editable data grid widget.

  Displays object properties in a CSS grid layout, auto-generated from a JSON Schema.
  Each cell shows a formatted value. Clicking an editable cell opens an inline editor
  matching the property type (text, select, date, checkbox, textarea, etc.).
  When any value is changed, a Save button appears in the widget header.

  Supports per-property overrides for order, grid span, visibility, editability, and widget type.
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId || objectType"
		:documentation-url="documentationUrl"
		:title-icon-position="iconComponent ? 'left' : 'right'">
		<template v-if="iconComponent" #title-icon>
			<component :is="iconComponent" :size="20" />
		</template>
		<template #actions>
			<NcButton
				v-if="isDirty"
				variant="primary"
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
			<slot name="actions" />
		</template>
		<!-- Object-specific item appended after the built-in
		     Refresh / Documentation / Request-a-feature trio. -->
		<template #action-items>
			<NcActionButton
				v-if="editable"
				:close-after-click="true"
				@click="editModalOpen = true">
				<template #icon>
					<Pencil :size="20" />
				</template>
				{{ editLabel }}
			</NcActionButton>
			<NcActionButton
				:close-after-click="true"
				@click="metadataModalOpen = true">
				<template #icon>
					<InformationOutline :size="20" />
				</template>
				{{ metadataLabel }}
			</NcActionButton>
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
							:keep-open="true"
							:clearable="true"
							@input="onMultiselectChange(field, $event)" />

						<!-- Tags -->
						<NcSelect
							v-else-if="field.widget === 'tags'"
							ref="activeEditor"
							:value="editData[field.key] || []"
							:multiple="true"
							:keep-open="true"
							:taggable="true"
							:clearable="true"
							@input="val => updateField(field.key, val)" />

						<!-- Checkbox / Switch -->
						<NcCheckboxRadioSwitch
							v-else-if="field.widget === 'checkbox'"
							:model-value="!!editData[field.key]"
							type="switch"
							@update:model-value="val => { updateField(field.key, val); commitEdit() }">
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
						<img v-if="isImageField(field) && rawOf(field)"
							:src="rawOf(field)"
							:alt="field.label"
							class="cn-object-data-widget__image"><template v-else>{{ displayValues[field.key] }}</template>
					</template>
					<Pencil
						v-if="isEditable(field)"
						class="cn-object-data-widget__edit-icon"
						:size="14" />
				</div>
			</div>
		</div>

		<!-- Read-only @self metadata, surfaced on demand from the
		     Metadata action item rather than as a permanent page widget. -->
		<CnObjectMetadataModal
			v-if="metadataModalOpen"
			:object-data="objectData"
			@close="metadataModalOpen = false" />

		<!-- Full-form edit (alongside the per-field inline editing) — schema-driven
		     dialog pre-filled with the current object; saves via the same path. -->
		<CnFormDialog
			v-if="editModalOpen"
			:schema="schema"
			:item="objectData"
			:dialog-title="editLabel"
			:overrides="overrides"
			:exclude-fields="exclude"
			:include-fields="include"
			@confirm="onEditConfirm"
			@close="editModalOpen = false" />
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcActionButton } from '@nextcloud/vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'
import { CnObjectMetadataModal } from '../CnObjectMetadataModal/index.js'
import CnFormDialog from '../CnFormDialog/CnFormDialog.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Close from 'vue-material-design-icons/Close.vue'
import { fieldsFromSchema, formatValue } from '../../utils/schema.js'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { useObjectStore } from '../../store/index.js'

/**
 * CnObjectDataWidget — Schema-driven editable data grid widget.
 *
 * Renders object properties in a configurable CSS grid. Each property is displayed
 * as a label-value cell. Editable cells can be clicked to switch to inline editing.
 * Uses the objectStore to persist changes.
 *
 * Basic usage
 * ```vue
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
 * ```
 *
 * Read-only mode
 * ```vue
 * <CnObjectDataWidget
 *   title="Summary"
 *   :schema="schema"
 *   :object-data="item"
 *   :editable="false" />
 * ```
 */
export default {
	name: 'CnObjectDataWidget',

	components: {
		NcButton,
		NcLoadingIcon,
		NcTextField,
		NcSelect,
		NcCheckboxRadioSwitch,
		NcActionButton,
		CnWidgetWrapper,
		CnObjectMetadataModal,
		CnFormDialog,
		ContentSaveOutline,
		InformationOutline,
		Pencil,
		Check,
		Close,
	},

	inject: {
		/**
		 * Detail-page object context (`{ objectId, register, schema }`) provided
		 * by CnDetailPage. Supplies the register that bare-slug `$ref` relation
		 * properties resolve against (an OpenRegister `$ref: "caseType"` means
		 * "schema caseType in the SAME register"). Null on other surfaces —
		 * bare-slug refs then stay unresolved (shortened id fallback).
		 */
		cnObjectContext: { default: null },
	},

	props: {
		/** Widget title shown in the widget header. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Data'),
		},
		/** Optional MDI icon component for the header. */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/**
		 * Documentation link surfaced in the widget's overflow Actions
		 * menu. Empty (the default) hides the Documentation item; the
		 * Refresh and Request-a-feature items always render.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Stable id forwarded to the widget chrome for the Refresh /
		 * Request-a-feature payloads. Falls back to `objectType`, then to a
		 * slugified title.
		 */
		widgetId: {
			type: String,
			default: '',
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
		 * @type {object}
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
			default: () => t('nextcloud-vue', 'Save'),
		},
		/** Label for the discard button */
		discardLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Discard'),
		},
		/** Label shown when no properties to display */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No data available'),
		},
		/** Label for the Metadata item in the overflow Actions menu. */
		metadataLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Metadata'),
		},
		/** Label for the Edit action item (opens the full-form edit dialog). */
		editLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Edit'),
		},
	},

	data() {
		return {
			/** Whether the read-only metadata modal is open. */
			metadataModalOpen: false,
			/** Whether the full-form edit dialog is open. */
			editModalOpen: false,
			/** Currently editing field key, or null */
			editingField: null,
			/** Working copy of changed field values */
			editData: {},
			/** Set of field keys that have been modified */
			dirtyFields: {},
			/** Whether a save is in progress */
			saving: false,
			/** Resolved display labels for related-object fields, keyed by field key */
			relatedLabels: {},
		}
	},

	mounted() { this.resolveRelations() },

	computed: {
		iconComponent() {
			return this.icon
		},

		/**
		 * Resolved field definitions from schema + overrides.
		 * Sorted by order, filtered by hidden/exclude/include.
		 */
		resolvedFields() {
			// The shared pipeline now honours per-key `hidden` (filter) and
			// `order` (sort) directly, so the overrides map is passed through
			// verbatim — no bespoke hidden→exclude merge or post-sort needed.
			// This keeps the data widget and the edit modal (CnFormDialog)
			// identical-by-construction from one config map.
			const fields = fieldsFromSchema(this.schema, {
				exclude: this.exclude,
				include: this.include,
				overrides: this.overrides,
				includeReadOnly: true,
			})

			// Attach grid span info (a display-only concern, not part of the
			// shared field pipeline) from the same overrides map.
			return fields.map(field => ({
				...field,
				gridColumn: (this.overrides[field.key] && this.overrides[field.key].gridColumn) || 1,
				gridRow: (this.overrides[field.key] && this.overrides[field.key].gridRow) || 1,
			}))
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
					: (this.objectData || {})[field.key]
				const prop = this.schema.properties && this.schema.properties[field.key]
				values[field.key] = (this.isRelationField(prop) && raw != null && raw !== '') ? this.relationLabel(raw) : formatValue(raw, prop || {})
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
				// Resolve relation display names whenever the object changes.
				this.resolveRelations()
			},
		},
		schema: {
			handler() { this.resolveRelations() },
		},
	},

	methods: {
		/** Raw (possibly dirty) value for a field. */
		rawOf(field) {
			const o = this.objectData || {}
			return (field.key in this.dirtyFields) ? this.dirtyFields[field.key] : o[field.key]
		},
		/** Whether a field should render as an image preview. */
		isImageField(field) {
			if (field.widget === 'image') return true
			const prop = this.schema.properties && this.schema.properties[field.key]
			const fmt = (prop && (prop.format || prop.contentMediaType)) || ''
			if (fmt === 'image' || String(fmt).indexOf('image/') === 0) return true
			return /(^|[._-])(photo|image|avatar|logo|thumb|picture)/i.test(field.key)
		},
		/** The x-openregister-relation block for a property (scalar or array), or null. */
		relationProp(prop) {
			if (!prop) return null
			if (prop['x-openregister-relation']) return prop['x-openregister-relation']
			if (prop.items && prop.items['x-openregister-relation']) return prop.items['x-openregister-relation']
			// Canonical OpenRegister shorthand: `$ref` on a uuid-string
			// property (or its array items) references a schema in the SAME
			// register. Authored as a slug ("caseType"), but the live schema
			// API serves it REWRITTEN to the numeric schema id (e.g. 85) —
			// accept both; the objects API resolves either in its path.
			// Register comes from the detail-page object context (ADR-062:
			// references display the target object's NAME, never a raw uuid).
			const rawRef = prop.$ref != null ? prop.$ref : (prop.items ? prop.items.$ref : null)
			if (rawRef != null && (typeof rawRef === 'string' || typeof rawRef === 'number')) {
				const slug = String(rawRef).split('/').pop().replace(/\.json$/, '')
				const reg = this.contextRegisterOf()
				if (slug && reg) return { target: `${reg}/${slug}` }
			}
			return null
		},

		/** The current register from the injected detail-page object context. */
		contextRegisterOf() {
			const c = this.cnObjectContext
			if (!c) return ''
			const v = (typeof c === 'object' && 'value' in c) ? c.value : c
			return (v && v.register) || ''
		},
		/** Whether a property is a relation. */
		isRelationField(prop) {
			return this.relationProp(prop) !== null
		},
		/** Display label(s) for a relation value, using resolved names. */
		relationLabel(raw) {
			const one = (v) => this.relatedLabels[v] || (typeof v === 'string' && v.length > 12 ? (v.slice(0, 8) + '…') : String(v))
			return Array.isArray(raw) ? raw.map(one).join(', ') : one(raw)
		},
		/** Fetch related objects' display names into relatedLabels. */
		async resolveRelations() {
			const props = (this.schema && this.schema.properties) || {}
			for (const key of Object.keys(props)) {
				const rel = this.relationProp(props[key])
				if (!rel) continue
				const parts = String(rel.target || '').split('/')
				if (parts.length < 2) continue
				const reg = parts[0]; const sch = parts[1]
				const raw = (this.objectData || {})[key]
				const ids = Array.isArray(raw) ? raw : (raw ? [raw] : [])
				for (const id of ids) {
					if (!id || (id in this.relatedLabels)) continue
					try {
						const url = generateUrl('/apps/openregister/api/objects/{reg}/{sch}/{id}', { reg, sch, id })
						const res = await axios.get(url)
						const d = (res && res.data) ? res.data : {}
						const obj = (d.results && d.results[0]) ? d.results[0] : d
						const self = obj['@self'] || {}
						let name = obj.name || obj.title || obj.displayName
						if (!name && (obj.firstName || obj.lastName)) name = ((obj.firstName || '') + ' ' + (obj.lastName || '')).trim()
						if (!name && self.name && self.name !== id) name = self.name
						this.$set(this.relatedLabels, id, name || id)
					} catch (e) {
						this.$set(this.relatedLabels, id, id)
					}
				}
			}
		},
		/**
		 * Check if a field is editable.
		 * @param {object} field - Resolved field definition from resolvedFields
		 */
		isEditable(field) {
			if (!this.editable) return false
			// Per-field override takes priority
			const override = this.overrides[field.key]
			if (override && typeof override.editable === 'boolean') {
				return override.editable
			}
			// Conditional immutability: a field declares it becomes read-only when
			// another field on this object holds a given value (schema
			// `x-openregister-readonly-when`). Evaluated against the live object —
			// e.g. a hybrid app's identity fields lock when appType === 'hybrid'.
			if (this.isReadOnlyByCondition(field)) return false
			// Schema readOnly
			return !field.readOnly
		},

		/**
		 * Evaluate a field's conditional read-only rule against the object data.
		 *
		 * @param {object} field - Resolved field definition (may carry `readOnlyWhen`).
		 * @return {boolean} True when the condition holds and the field is locked.
		 */
		isReadOnlyByCondition(field) {
			const rule = field.readOnlyWhen
			if (!rule || !rule.field) return false
			const current = this.objectData ? this.objectData[rule.field] : undefined
			if (Array.isArray(rule.in)) return rule.in.includes(current)
			if ('equals' in rule) return current === rule.equals
			return false
		},

		/**
		 * Check if a field's current value is empty.
		 * @param {string} key - Field key to check
		 */
		isValueEmpty(key) {
			const val = key in this.dirtyFields
				? this.dirtyFields[key]
				: (this.objectData || {})[key]
			return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
		},

		/**
		 * Start inline editing for a field.
		 * @param {object} field - Resolved field definition from resolvedFields
		 */
		startEdit(field) {
			// Set working value: dirty value > current object value
			const currentValue = field.key in this.dirtyFields
				? this.dirtyFields[field.key]
				: (this.objectData || {})[field.key]
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
		 * @param {string} key - Field key to update
		 * @param {*} value - New value for the field
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
		 * Persist the full-form edit dialog result, merged onto the current
		 * object, via the same store path as inline save. Closes on success.
		 * @param {object} formData The submitted form payload.
		 * @return {Promise<void>}
		 */
		async onEditConfirm(formData) {
			const mergedData = { ...this.objectData, ...formData }
			this.saving = true
			try {
				if (this.objectType) {
					const store = this._getObjectStore()
					if (store) {
						const result = await store.saveObject(this.objectType, mergedData)
						if (result) {
							this.dirtyFields = {}
							this.editData = {}
							this.editModalOpen = false
							this.$emit('saved', result)
						} else {
							this.$emit('save-error', store.getError(this.objectType))
						}
						return
					}
				}
				// Fallback: emit for parent to persist.
				this.editModalOpen = false
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
				// useObjectStore is a static import (top of file) — bundler
				// resolves it at lib build time so consumer apps don't need
				// to resolve the relative path. The try/catch still guards
				// the case where the consumer hasn't set up pinia.
				const pinia = this.$pinia
				if (!pinia) return null
				return useObjectStore()
			} catch {
				return null
			}
		},

		/**
		 * Compute CSS grid placement for a field cell.
		 * @param {object} field - The field configuration object.
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
		 * @param {string|object} val - Raw option value to normalize.
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
.cn-object-data-widget__image {
	max-width: 100%;
	max-height: 160px;
	border-radius: 8px;
	object-fit: cover;
}

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

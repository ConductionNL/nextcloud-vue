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
		:class="{ 'cn-object-data-widget--expanded': overflowing && expanded }"
		:title-icon-position="(iconComponent || iconName) ? 'left' : 'right'">
		<template v-if="iconName" #title-icon>
			<CnIcon :name="iconName" :size="20" />
		</template>
		<template v-else-if="iconComponent" #title-icon>
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

		<!-- Grid, wrapped so an overflowing field set is clipped at a WHOLE-ROW
		     boundary (never mid-text) with a bottom fade + a "Show all N fields"
		     affordance that expands the widget in place (ADR-062: the cell is
		     the budget; content adapts, no inner scrollbars). -->
		<div
			v-else
			class="cn-object-data-widget__grid-wrap"
			:class="{
				'cn-object-data-widget__grid-wrap--clipped': overflowing && !expanded,
				'cn-object-data-widget__grid-wrap--expanded': overflowing && expanded,
			}">
			<div
				ref="grid"
				class="cn-object-data-widget__grid"
				:style="collapsedGridStyle">
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

							<!-- Relation ($ref / x-openregister-relation): pick the
						     referenced object by NAME — the raw uuid is never a
						     user-facing value (ADR-062). Options load from the
						     target schema on edit start. Array relations keep
						     their generic editor for now. -->
							<NcSelect
								v-else-if="isSingleRelationField(field.key)"
								ref="activeEditor"
								:options="relationOptions[field.key] || []"
								:value="relationSelectedOption(field)"
								:loading="relationOptionsLoading"
								label="label"
								:clearable="!field.required"
								@input="onRelationChange(field, $event)"
								@close="commitEdit" />

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
								class="cn-object-data-widget__image">
							<!-- Relation name still resolving: a quiet skeleton bar,
						     never a raw uuid or a bare '…' (ADR-062). -->
							<span
								v-else-if="isRelationPending(field)"
								class="cn-object-data-widget__skeleton"
								:aria-label="t('nextcloud-vue', 'Loading')" />
							<!-- Array of OBJECTS → compact inline table (union of the
						     first rows' keys, capped at 5 columns / 5 rows) so a
						     structured value renders legibly instead of
						     "[object Object]" (ADR-062). -->
							<div
								v-else-if="fieldValueKind(field) === 'object-array'"
								class="cn-object-data-widget__mini-table-wrap">
								<table class="cn-object-data-widget__mini-table">
									<thead>
										<tr>
											<th v-for="col in objectArrayColumns(rawOf(field))" :key="col">
												{{ col }}
											</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="(row, ri) in objectArrayRows(rawOf(field))" :key="ri">
											<td v-for="col in objectArrayColumns(rawOf(field))" :key="col">
												{{ stringifyCell(row && row[col]) }}
											</td>
										</tr>
									</tbody>
								</table>
								<div v-if="rawOf(field).length > 5" class="cn-object-data-widget__more">
									{{ t('nextcloud-vue', '{count} more', { count: rawOf(field).length - 5 }) }}
								</div>
							</div>
							<!-- Array of SCALARS → comma-separated chips. -->
							<div
								v-else-if="fieldValueKind(field) === 'scalar-array'"
								class="cn-object-data-widget__chips">
								<span
									v-for="(v, ci) in rawOf(field)"
									:key="ci"
									class="cn-object-data-widget__chip">
									{{ stringifyCell(v) }}
								</span>
							</div>
							<!-- Single plain OBJECT → key: value definition list. -->
							<dl
								v-else-if="fieldValueKind(field) === 'object'"
								class="cn-object-data-widget__deflist">
								<template v-for="(pair, pi) in objectEntries(rawOf(field))" :key="pi">
									<dt>
										{{ pair[0] }}
									</dt>
									<dd>
										{{ stringifyCell(pair[1]) }}
									</dd>
								</template>
							</dl>
							<template v-else>
								{{ displayValues[field.key] }}
							</template>
						</template>
						<Pencil
							v-if="isEditable(field)"
							class="cn-object-data-widget__edit-icon"
							:size="14" />
					</div>
				</div>
			</div>
			<!-- Bottom fade over the clipped whole-row boundary. -->
			<div
				v-if="overflowing && !expanded"
				class="cn-object-data-widget__fade"
				aria-hidden="true" />
			<!-- Expand / collapse affordance — only rendered when the field set
			     actually overflows its cell. -->
			<button
				v-if="overflowing"
				type="button"
				class="cn-object-data-widget__toggle"
				@click="toggleExpanded">
				{{ expanded ? collapseFieldsLabel : showAllFieldsLabel }}
			</button>
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
import { CnIcon } from '../CnIcon/index.js'
import { CnObjectMetadataModal } from '../CnObjectMetadataModal/index.js'
import CnFormDialog from '../CnFormDialog/CnFormDialog.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Close from 'vue-material-design-icons/Close.vue'
import { fieldsFromSchema, formatValue } from '../../utils/schema.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
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
		CnIcon,
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
			type: [Object, Function, String],
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
		 * Hide fields that have no value, instead of rendering them with an em dash.
		 *
		 * Use this for a schema whose properties are only relevant to a subset of its
		 * objects — a discriminated supertype, say, where a `complaint` never carries
		 * the telephony fields a `contactmoment` does. The read grid then shows only
		 * what the object actually has, without the schema having to declare which
		 * fields belong to which variant.
		 *
		 * Only affects the read grid: a field being edited, a field with an unsaved
		 * change, and the full edit form all stay visible, so an empty field is always
		 * still reachable to fill in.
		 */
		hideEmpty: {
			type: Boolean,
			default: false,
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
			/** Name-labeled picker options per relation field key ({ id, label }[]). */
			relationOptions: {},
			/** Whether relation picker options are being fetched. */
			relationOptionsLoading: false,
			/** Whether the field set overflows its cell (drives the clip + toggle). */
			overflowing: false,
			/** Whether the user expanded the widget to see every field. */
			expanded: false,
			/**
			 * Pixel height to clip the collapsed grid at — chosen at a WHOLE-ROW
			 * boundary so the last visible row is never cut mid-text. `null`
			 * until measured / when not overflowing.
			 */
			collapsedMaxHeight: null,
		}
	},

	computed: {
		iconComponent() {
			return (this.icon && typeof this.icon !== 'string') ? this.icon : null
		},

		/** MDI icon NAME (String form of `icon`) — rendered via CnIcon. */
		iconName() {
			return typeof this.icon === 'string' ? this.icon : ''
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
			const withSpans = fields.map(field => ({
				...field,
				gridColumn: (this.overrides[field.key] && this.overrides[field.key].gridColumn) || 1,
				gridRow: (this.overrides[field.key] && this.overrides[field.key].gridRow) || 1,
			}))

			if (!this.hideEmpty) {
				return withSpans
			}

			// Keep a field the user is currently editing or has pending changes for,
			// otherwise it would vanish mid-edit the moment its value is cleared.
			return withSpans.filter(field => field.key === this.editingField
				|| field.key in this.dirtyFields
				|| !this.isEmptyValue((this.objectData || {})[field.key]))
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

		/**
		 * The grid style plus, when collapsed and overflowing, a `max-height`
		 * clip at the last WHOLE-ROW boundary (with overflow hidden via the
		 * `--clipped` wrapper class) so no field row is cut mid-text (ADR-062).
		 *
		 * @return {object}
		 */
		collapsedGridStyle() {
			const style = { ...this.gridStyle }
			if (this.overflowing && !this.expanded && this.collapsedMaxHeight != null) {
				style.maxHeight = this.collapsedMaxHeight + 'px'
			}
			return style
		},

		/** Pre-translated "Show all N fields" affordance label. */
		showAllFieldsLabel() {
			return t('nextcloud-vue', 'Show all {count} fields', { count: this.resolvedFields.length })
		},

		/** Pre-translated collapse label. */
		collapseFieldsLabel() {
			return t('nextcloud-vue', 'Show less')
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

	mounted() {
		this.resolveRelations()
		this.scheduleOverflowMeasure()
	},

	updated() {
		this.scheduleOverflowMeasure()
	},

	beforeDestroy() {
		if (this._overflowObserver) this._overflowObserver.disconnect()
		if (this._overflowTimer) clearTimeout(this._overflowTimer)
	},

	methods: {
		/** Pre-translated string helper exposed to the template. */
		t,

		/** Toggle the expand/collapse state and, on collapse, re-measure. */
		toggleExpanded() {
			this.expanded = !this.expanded
			if (!this.expanded) this.$nextTick(() => this.measureOverflow())
		},

		/**
		 * Debounced overflow measurement — coalesces the many `updated` ticks
		 * that a data load / relation resolution triggers into one measure, and
		 * (once) attaches a ResizeObserver on the host cell so the clip re-fits
		 * when the cell resizes.
		 *
		 * @return {void}
		 */
		scheduleOverflowMeasure() {
			if (typeof window === 'undefined') return
			if (!this._overflowObserver && typeof ResizeObserver !== 'undefined' && this.$refs.grid) {
				const content = this.$refs.grid.closest && this.$refs.grid.closest('.cn-widget-wrapper__content')
				if (content) {
					this._overflowObserver = new ResizeObserver(() => this.measureOverflow())
					this._overflowObserver.observe(content)
				}
			}
			clearTimeout(this._overflowTimer)
			this._overflowTimer = setTimeout(() => this.measureOverflow(), 60)
		},

		/**
		 * Measure whether the field grid overflows its cell and, if so, choose a
		 * WHOLE-ROW clip height so the collapsed state never cuts a row mid-text
		 * (ADR-062). No-op while expanded (the user opted to see everything) and
		 * in non-layout environments (jsdom) where every rect is zero.
		 *
		 * @return {void}
		 */
		measureOverflow() {
			if (this.expanded) return
			const grid = this.$refs.grid
			const content = grid && grid.closest && grid.closest('.cn-widget-wrapper__content')
			if (!grid || !content) { this.overflowing = false; this.collapsedMaxHeight = null; return }
			const avail = content.clientHeight
			// Natural (unclipped) grid height. `scrollHeight` ignores the
			// max-height clip so it reflects the full field set.
			const natural = grid.scrollHeight
			if (!avail || natural <= avail + 2) {
				this.overflowing = false
				this.collapsedMaxHeight = null
				return
			}
			// Reserve room for the fade + the "Show all" toggle button.
			const reserve = 30
			const budget = Math.max(avail - reserve, 0)
			const gridTop = grid.getBoundingClientRect().top
			const cells = Array.from(grid.querySelectorAll('.cn-object-data-widget__cell'))
			const clip = this.computeWholeRowClip(this.cellRowBottoms(cells, gridTop), budget)
			this.overflowing = true
			this.collapsedMaxHeight = clip
		},

		/**
		 * Group cells into rows (by their top offset, bucketed) and return each
		 * row's greatest bottom offset relative to the grid top — the candidate
		 * whole-row clip boundaries.
		 *
		 * @param {Element[]} cells The grid cell elements.
		 * @param {number} gridTop The grid's viewport top (getBoundingClientRect).
		 * @return {number[]} Sorted ascending row-bottom offsets (px, grid-relative).
		 */
		cellRowBottoms(cells, gridTop) {
			const rows = new Map()
			for (const cell of cells) {
				const r = cell.getBoundingClientRect()
				const topKey = Math.round((r.top - gridTop) / 4) * 4
				const bottom = r.bottom - gridTop
				rows.set(topKey, Math.max(rows.get(topKey) || 0, bottom))
			}
			return Array.from(rows.values()).sort((a, b) => a - b)
		},

		/**
		 * Pick the largest row-bottom that fits the budget — the whole-row clip
		 * boundary. Always keeps at least the first row so a single very tall
		 * row still shows (its overflow is the fade's job, not a mid-row cut).
		 * Pure — unit-tested directly.
		 *
		 * @param {number[]} rowBottoms Ascending row-bottom offsets.
		 * @param {number} budget The available height (px).
		 * @return {number} The clip height (px).
		 */
		computeWholeRowClip(rowBottoms, budget) {
			if (!rowBottoms.length) return budget
			let clip = rowBottoms[0]
			for (const b of rowBottoms) {
				if (b <= budget) clip = b
				else break
			}
			return clip
		},

		/**
		 * Raw (possibly dirty) value for a field.
		 * @param field
		 */
		rawOf(field) {
			const o = this.objectData || {}
			return (field.key in this.dirtyFields) ? this.dirtyFields[field.key] : o[field.key]
		},
		/**
		 * Classify a field's raw value for display so the template can pick a
		 * legible renderer (ADR-062: a structured value must never render as
		 * "[object Object]"). Relation fields are excluded here — their
		 * name-resolved label already flows through `displayValues`.
		 *
		 * @param {object} field Resolved field definition.
		 * @return {'object-array'|'scalar-array'|'object'|'scalar'} The value kind.
		 */
		fieldValueKind(field) {
			const prop = ((this.schema && this.schema.properties) || {})[field.key]
			if (this.isRelationField(prop)) return 'scalar'
			const raw = this.rawOf(field)
			if (Array.isArray(raw)) {
				if (raw.length === 0) return 'scalar'
				return raw.some((v) => v !== null && typeof v === 'object' && !Array.isArray(v))
					? 'object-array'
					: 'scalar-array'
			}
			if (raw !== null && typeof raw === 'object') return 'object'
			return 'scalar'
		},
		/**
		 * Column keys for an array-of-objects inline table: the union of the
		 * keys of the first three items, capped at five columns.
		 *
		 * @param {Array<object>} raw The array value.
		 * @return {string[]} Up to five column keys.
		 */
		objectArrayColumns(raw) {
			if (!Array.isArray(raw)) return []
			const keys = []
			for (const item of raw.slice(0, 3)) {
				if (item && typeof item === 'object') {
					for (const k of Object.keys(item)) {
						if (!keys.includes(k)) keys.push(k)
					}
				}
			}
			return keys.slice(0, 5)
		},
		/**
		 * The first five rows of an array-of-objects value (the table caps at
		 * five rows + an "N more" affordance).
		 *
		 * @param {Array<object>} raw The array value.
		 * @return {Array<object>} Up to five row objects.
		 */
		objectArrayRows(raw) {
			return Array.isArray(raw) ? raw.slice(0, 5) : []
		},
		/**
		 * `[key, value]` pairs of a single plain-object value, for the compact
		 * definition-list renderer.
		 *
		 * @param {object} raw The object value.
		 * @return {Array<[string, *]>} The entries.
		 */
		objectEntries(raw) {
			return (raw && typeof raw === 'object') ? Object.entries(raw) : []
		},
		/**
		 * Stringify a scalar cell value; a nested object/array collapses to
		 * compact JSON (never "[object Object]").
		 *
		 * @param {*} v The cell value.
		 * @return {string} The display string.
		 */
		stringifyCell(v) {
			if (v === null || v === undefined || v === '') return '—'
			if (typeof v === 'boolean') return v ? '✓' : '—'
			if (typeof v === 'object') {
				try {
					return JSON.stringify(v)
				} catch {
					return '[Object]'
				}
			}
			return String(v)
		},
		/**
		 * Whether a field should render as an image preview.
		 * @param field
		 */
		isImageField(field) {
			if (field.widget === 'image') return true
			const prop = this.schema.properties && this.schema.properties[field.key]
			const fmt = (prop && (prop.format || prop.contentMediaType)) || ''
			if (fmt === 'image' || String(fmt).indexOf('image/') === 0) return true
			return /(^|[._-])(photo|image|avatar|logo|thumb|picture)/i.test(field.key)
		},
		/**
		 * The x-openregister-relation block for a property (scalar or array), or null.
		 * @param prop
		 */
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
		/**
		 * Whether a property is a relation.
		 * @param prop
		 */
		isRelationField(prop) {
			return this.relationProp(prop) !== null
		},
		/**
		 * Whether a stored value counts as "no value" for `hideEmpty`.
		 *
		 * `false` and `0` are values, not absences, so they are deliberately kept —
		 * hiding a boolean because it is false would lose information.
		 *
		 * @param {*} value The raw value from objectData.
		 * @return {boolean} True when there is nothing to show.
		 */
		isEmptyValue(value) {
			if (value === null || value === undefined || value === '') {
				return true
			}
			if (Array.isArray(value)) {
				return value.length === 0
			}
			if (typeof value === 'object') {
				return Object.keys(value).length === 0
			}
			return false
		},
		/**
		 * Display label(s) for a relation value, using resolved names. While a
		 * name lookup is still in flight the placeholder '…' shows — a raw
		 * uuid must never flash before the name arrives (ADR-062). Failed
		 * lookups land in relatedLabels as the id itself (terminal fallback).
		 * @param {string|Array} raw The relation value(s).
		 * @return {string} Resolved name(s), '…' while loading.
		 */
		relationLabel(raw) {
			const one = (v) => this.relatedLabels[v] || '…'
			return Array.isArray(raw) ? raw.map(one).join(', ') : one(raw)
		},

		/**
		 * Whether a relation field's display name(s) are still being fetched
		 * (drives the skeleton placeholder in the display cell).
		 * @param {object} field Resolved field definition.
		 * @return {boolean}
		 */
		isRelationPending(field) {
			const prop = ((this.schema && this.schema.properties) || {})[field.key]
			if (!prop || this.relationProp(prop) === null) return false
			const raw = (this.objectData || {})[field.key]
			const ids = Array.isArray(raw) ? raw : (raw ? [raw] : [])
			return ids.some((id) => id && !(id in this.relatedLabels))
		},

		/**
		 * Whether a field is a SINGLE-VALUE relation (edited through the
		 * name-labeled object picker). Array relations keep the generic
		 * editor for now.
		 * @param {string} key Schema property key.
		 * @return {boolean}
		 */
		isSingleRelationField(key) {
			const prop = ((this.schema && this.schema.properties) || {})[key]
			if (!prop || prop.type === 'array') return false
			return this.relationProp(prop) !== null
		},

		/**
		 * Best display name for a referenced object.
		 * @param {object} obj The fetched object.
		 * @param {string} id Fallback id.
		 * @return {string}
		 */
		objectDisplayName(obj, id) {
			const self = (obj && obj['@self']) || {}
			let name = obj.name || obj.title || obj.displayName
			if (!name && (obj.firstName || obj.lastName)) name = ((obj.firstName || '') + ' ' + (obj.lastName || '')).trim()
			if (!name && self.name && self.name !== id) name = self.name
			return name || id
		},

		/**
		 * Load the picker options for a relation field from its target schema
		 * (first 200 objects, labeled by display name).
		 * @param {string} key Schema property key.
		 * @return {Promise<void>}
		 */
		async loadRelationOptions(key) {
			const prop = ((this.schema && this.schema.properties) || {})[key]
			const rel = this.relationProp(prop)
			if (!rel) return
			const parts = String(rel.target || '').split('/')
			if (parts.length < 2) return
			this.relationOptionsLoading = true
			try {
				const url = generateUrl('/apps/openregister/api/objects/{reg}/{sch}', { reg: parts[0], sch: parts[1] })
				const params = { _limit: 200 }
				// Declarative option scoping: `x-relation-filter` on the schema
				// property narrows the picker to objects that fit THIS object —
				// e.g. case.status: { "caseType": "@object.caseType" } offers
				// only the statuses of the case's own type. Values are
				// token-resolved (@objectId / @object.<field>); entries whose
				// token stays unresolved are dropped (unfiltered beats empty).
				const rawFilter = prop['x-relation-filter']
				if (rawFilter && typeof rawFilter === 'object') {
					// Dirty values win: picking a new caseType must immediately
					// scope the status options to it, before any save.
					const objData = { ...(this.objectData || {}), ...this.dirtyFields }
					const ctx = { objectId: ((this.objectData || {})['@self'] && (this.objectData || {})['@self'].id) || (this.objectData || {}).id, object: objData }
					const filter = resolveFilterTokens(rawFilter, ctx)
					for (const [fk, fv] of Object.entries(filter)) {
						if (typeof fv === 'string' && fv.charAt(0) === '@') continue
						if (fv && typeof fv === 'object') {
							for (const [op, ov] of Object.entries(fv)) params[`${fk}[${op}]`] = ov
						} else if (fv !== '' && fv !== null && fv !== undefined) {
							params[fk] = fv
						}
					}
				}
				const res = await axios.get(url, { params })
				const rows = (res && res.data && res.data.results) || []
				const opts = rows.map((o) => {
					const id = (o['@self'] && o['@self'].id) || o.id
					return { id, label: this.objectDisplayName(o, id) }
				}).filter((o) => o.id)
				this.$set(this.relationOptions, key, opts)
				// Cache the labels so display resolution reuses them.
				opts.forEach((o) => { if (!(o.id in this.relatedLabels)) this.$set(this.relatedLabels, o.id, o.label) })
			} catch (e) {
				this.$set(this.relationOptions, key, [])
			} finally {
				this.relationOptionsLoading = false
			}
		},

		/**
		 * The currently selected picker option for a relation field.
		 * @param {object} field Field descriptor.
		 * @return {object|null} `{ id, label }` or null when unset.
		 */
		relationSelectedOption(field) {
			const v = this.editData[field.key]
			if (!v) return null
			return { id: v, label: this.relatedLabels[v] || String(v) }
		},

		/**
		 * Apply a relation picker choice: store the referenced object's ID
		 * (the persisted value stays a uuid; only the display is a name).
		 * @param {object} field Field descriptor.
		 * @param {object|null} opt Chosen option or null (cleared).
		 */
		onRelationChange(field, opt) {
			if (opt && opt.id) this.$set(this.relatedLabels, opt.id, opt.label)
			this.updateField(field.key, opt ? opt.id : null)
		},
		/** Fetch related objects' display names into relatedLabels. */
		async resolveRelations() {
			// Collect every unresolved (target, id) pair first, then fetch them
			// ALL in parallel — sequential lookups made names trail the page by
			// seconds, leaving confusing placeholder values (ADR-062: names
			// must arrive with the page, uuids never show).
			const props = (this.schema && this.schema.properties) || {}
			const jobs = []
			for (const key of Object.keys(props)) {
				const rel = this.relationProp(props[key])
				if (!rel) continue
				const parts = String(rel.target || '').split('/')
				if (parts.length < 2) continue
				const raw = (this.objectData || {})[key]
				const ids = Array.isArray(raw) ? raw : (raw ? [raw] : [])
				for (const id of ids) {
					if (!id || (id in this.relatedLabels) || jobs.some((j) => j.id === id)) continue
					jobs.push({ reg: parts[0], sch: parts[1], id })
				}
			}
			await Promise.all(jobs.map(async ({ reg, sch, id }) => {
				try {
					const url = generateUrl('/apps/openregister/api/objects/{reg}/{sch}/{id}', { reg, sch, id })
					const res = await axios.get(url)
					const d = (res && res.data) ? res.data : {}
					const obj = (d.results && d.results[0]) ? d.results[0] : d
					this.$set(this.relatedLabels, id, this.objectDisplayName(obj, id))
				} catch (e) {
					this.$set(this.relatedLabels, id, id)
				}
			}))
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
			// Relation fields edit through a name-labeled object picker.
			// Options reload on every edit start: an `x-relation-filter` can
			// depend on the object's CURRENT values (e.g. status options scoped
			// to the just-changed caseType), so a per-field cache would serve
			// stale sets.
			if (this.isSingleRelationField(field.key)) {
				this.loadRelationOptions(field.key)
			}

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
		 * Commit the current inline edit — stage the field as dirty and persist
		 * it immediately so a click-to-edit confirm saves in one step (matching
		 * user expectation). The header Save/Discard still work for any remaining
		 * dirty state (e.g. checkbox edits queued without a per-field confirm).
		 */
		async commitEdit() {
			if (!this.editingField) return

			const key = this.editingField
			const newValue = this.editData[key]
			const originalValue = this.objectData[key]

			this.editingField = null

			// Only mark dirty if actually changed
			if (newValue !== originalValue) {
				this.dirtyFields = { ...this.dirtyFields, [key]: newValue }
			} else {
				// Remove from dirty if reverted to original
				const { [key]: _, ...rest } = this.dirtyFields
				this.dirtyFields = rest
				return
			}

			// Persist immediately (single-step inline save).
			await this.save()
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

/* Shimmering placeholder while a relation's display name resolves. */
.cn-object-data-widget__skeleton {
	display: inline-block;
	width: 90px;
	height: 1em;
	border-radius: 4px;
	background: linear-gradient(90deg, var(--color-background-dark) 25%, var(--color-background-hover) 50%, var(--color-background-dark) 75%);
	background-size: 200% 100%;
	animation: cn-odw-shimmer 1.2s ease-in-out infinite;
}

@keyframes cn-odw-shimmer {
	from { background-position: 200% 0; }
	to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
	.cn-object-data-widget__skeleton { animation: none; }
}

.cn-object-data-widget__grid-wrap {
	position: relative;
}

.cn-object-data-widget__grid {
	display: grid;
	gap: calc(2 * var(--default-grid-baseline, 4px)) calc(4 * var(--default-grid-baseline, 4px));
}

/* Collapsed + overflowing: the grid is clipped at a whole-row boundary
   (max-height set inline in collapsedGridStyle). No inner scrollbar. */
.cn-object-data-widget__grid-wrap--clipped .cn-object-data-widget__grid {
	overflow: hidden;
}

/* Bottom fade over the clipped boundary — signals more content. */
.cn-object-data-widget__fade {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 28px;
	height: 28px;
	pointer-events: none;
	background: linear-gradient(to bottom, rgba(0, 0, 0, 0), var(--color-main-background));
}

.cn-object-data-widget__toggle {
	display: block;
	width: 100%;
	margin-top: 4px;
	padding: 4px;
	background: none;
	border: none;
	color: var(--color-primary-element);
	cursor: pointer;
	font: inherit;
	font-weight: 600;
	text-align: center;
}

.cn-object-data-widget__toggle:hover,
.cn-object-data-widget__toggle:focus-visible {
	text-decoration: underline;
}

/* Expanded in place: the widget card lifts above its siblings and its content
   area stops clipping, so every field is legible even when the grid cell
   positions cards absolutely (ADR-062: expand as an anchored panel rather than
   an inner scrollbar). */
.cn-object-data-widget--expanded {
	z-index: 20;
}

.cn-object-data-widget--expanded ::v-deep .cn-widget-wrapper__content {
	overflow: visible;
}

.cn-object-data-widget__grid-wrap--expanded {
	background: var(--color-main-background);
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

/* Compact inline table for array-of-objects values. Dense + unstyled-simple;
   fits the card and participates in the whole-row overflow handling. */
.cn-object-data-widget__mini-table-wrap {
	max-width: 100%;
}

.cn-object-data-widget__mini-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 0.9em;
}

.cn-object-data-widget__mini-table th,
.cn-object-data-widget__mini-table td {
	text-align: start;
	padding: 2px 8px 2px 0;
	border-bottom: 1px solid var(--color-border);
	vertical-align: top;
	word-break: break-word;
}

.cn-object-data-widget__mini-table th {
	color: var(--color-text-maxcontrast);
	font-weight: 500;
}

.cn-object-data-widget__more {
	margin-top: 2px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

/* Comma-less chip row for array-of-scalars values. */
.cn-object-data-widget__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.cn-object-data-widget__chip {
	padding: 1px 8px;
	border-radius: 12px;
	background: var(--color-background-dark);
	font-size: 0.9em;
}

/* Key: value definition list for a single plain-object value. */
.cn-object-data-widget__deflist {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 2px 8px;
	margin: 0;
}

.cn-object-data-widget__deflist dt {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-object-data-widget__deflist dd {
	margin: 0;
	word-break: break-word;
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

<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-stat-widget-form">
		<!-- Data source. -->
		<h4 class="cn-stat-widget-form__section">
			{{ t('nextcloud-vue', 'Data source') }}
		</h4>

		<NcSelect
			:modelValue="kind"
			:options="kindOptions"
			:inputLabel="t('nextcloud-vue', 'Source type')"
			:clearable="false"
			@update:modelValue="updateField('kind', $event)">
			<template #option="{ label: id }">
				{{ kindLabel(id) }}
			</template>
			<template #selected-option="{ label: id }">
				{{ kindLabel(id) }}
			</template>
		</NcSelect>

		<!-- A field on the record this page is about: no register, no query. -->
		<template v-if="kind === 'record'">
			<NcTextField
				:modelValue="recordField"
				:label="t('nextcloud-vue', 'Property on this record')"
				placeholder="status"
				@update:modelValue="updateField('recordField', $event)" />
			<p class="cn-stat-widget-form__hint">
				{{ t('nextcloud-vue', 'The tile shows this value from the record the page is about.') }}
			</p>

			<label class="cn-stat-widget-form__sublabel">{{ t('nextcloud-vue', 'Look the value up in (optional)') }}</label>
			<div class="cn-stat-widget-form__row2">
				<CnRegisterSchemaSelect
					:register="recordResolve.register"
					:schema="recordResolve.schema"
					@update:register="updateResolve('register', $event)"
					@update:schema="updateResolve('schema', $event)" />
			</div>
			<div v-if="recordResolve.register && recordResolve.schema" class="cn-stat-widget-form__row2">
				<NcTextField
					:modelValue="recordResolve.labelField"
					:label="t('nextcloud-vue', 'Label property')"
					placeholder="name"
					@update:modelValue="updateResolve('labelField', $event)" />
				<NcTextField
					:modelValue="recordResolve.variantField"
					:label="t('nextcloud-vue', 'Colour property')"
					placeholder="isFinal"
					@update:modelValue="updateResolve('variantField', $event)" />
			</div>
			<template v-if="recordResolve.variantField">
				<label class="cn-stat-widget-form__sublabel">{{ t('nextcloud-vue', 'Colour per value') }}</label>
				<p class="cn-stat-widget-form__hint">
					{{ t('nextcloud-vue', 'Leave this empty when the colour property already holds a colour name.') }}
				</p>
				<div
					v-for="(row, i) in variantRows"
					:key="'variant-' + i"
					class="cn-stat-widget-form__rule"
					data-testid="cn-stat-widget-form-variant-row">
					<NcTextField
						:modelValue="row.value"
						:label="t('nextcloud-vue', 'Value')"
						placeholder="true"
						@update:modelValue="updateRow('variantRows', i, 'value', $event)" />
					<NcSelect
						:modelValue="row.variant"
						:options="variantOptions"
						:inputLabel="t('nextcloud-vue', 'Colour')"
						:clearable="false"
						@update:modelValue="updateRow('variantRows', i, 'variant', $event)">
						<template #option="{ label: id }">
							{{ variantLabel(id) }}
						</template>
						<template #selected-option="{ label: id }">
							{{ variantLabel(id) }}
						</template>
					</NcSelect>
					<NcButton
						variant="tertiary"
						:aria-label="t('nextcloud-vue', 'Remove colour')"
						@click="removeRow('variantRows', i)">
						<template #icon>
							<Close :size="18" />
						</template>
					</NcButton>
				</div>
				<NcButton variant="tertiary" @click="addRow('variantRows', { value: '', variant: 'success' })">
					<template #icon>
						<Plus :size="18" />
					</template>
					{{ t('nextcloud-vue', 'Add a colour') }}
				</NcButton>
			</template>
		</template>

		<!-- The query kinds: register, metric, field and filter. The record kind has none. -->
		<template v-else>
			<div class="cn-stat-widget-form__row2">
				<CnRegisterSchemaSelect
					:register="source.register"
					:schema="source.schema"
					@update:register="updateSource('register', $event)"
					@update:schema="updateSource('schema', $event)" />
			</div>

			<!-- Aggregate / Ratio share metric + field. Weighted uses field × weight. -->
			<div v-if="kind !== 'weighted'" class="cn-stat-widget-form__row2">
				<NcSelect
					:modelValue="metric"
					:options="metricOptions"
					:inputLabel="t('nextcloud-vue', 'Aggregation')"
					:clearable="false"
					@update:modelValue="updateField('metric', $event)" />
				<CnFieldPicker
					v-if="metric && metric !== 'count'"
					:value="field"
					:label="t('nextcloud-vue', 'Field')"
					:options="availableFields"
					placeholder="value"
					@update="updateField('field', $event)" />
			</div>
			<div v-else class="cn-stat-widget-form__row2">
				<CnFieldPicker
					:value="weighted.field"
					:label="t('nextcloud-vue', 'Field')"
					:options="availableFields"
					placeholder="value"
					@update="updateWeighted('field', $event)" />
				<CnFieldPicker
					:value="weighted.weightField"
					:label="t('nextcloud-vue', 'Weight field')"
					:options="availableFields"
					placeholder="probability"
					@update="updateWeighted('weightField', $event)" />
				<NcTextField
					:modelValue="String(weighted.divisor)"
					type="number"
					:label="t('nextcloud-vue', 'Weight divisor')"
					placeholder="100"
					@update:modelValue="updateWeighted('divisor', Number($event) || 1)" />
			</div>

			<!-- Aggregate + Weighted use one filter; Ratio + Computed use two parts. -->
			<template v-if="kind === 'ratio' || kind === 'computed'">
				<NcTextField
					v-if="kind === 'computed'"
					:modelValue="formula"
					:label="t('nextcloud-vue', 'Formula (A, B)')"
					placeholder="A/B*100"
					@update:modelValue="updateField('formula', $event)" />
				<label class="cn-stat-widget-form__sublabel">{{ kind === 'computed' ? t('nextcloud-vue', 'Part A') : t('nextcloud-vue', 'Numerator (the part)') }}</label>
				<CnFilterRowsEditor :value="numeratorRows" :fields="availableFields" @input="onRows('numeratorRows', $event)" />
				<label class="cn-stat-widget-form__sublabel">{{ kind === 'computed' ? t('nextcloud-vue', 'Part B') : t('nextcloud-vue', 'Denominator (the whole)') }}</label>
				<CnFilterRowsEditor :value="denominatorRows" :fields="availableFields" @input="onRows('denominatorRows', $event)" />
			</template>
			<CnFilterRowsEditor v-else
				:value="filterRows"
				:fields="availableFields"
				@input="onRows('filterRows', $event)" />
		</template>

		<!-- Presentation. -->
		<h4 class="cn-stat-widget-form__section">
			{{ t('nextcloud-vue', 'Display') }}
		</h4>

		<NcTextField
			:modelValue="label"
			:label="t('nextcloud-vue', 'Label')"
			placeholder="Revenue"
			@update:modelValue="updateField('label', $event)" />

		<CnIconBrowser
			:value="icon"
			:label="t('nextcloud-vue', 'Icon')"
			@input="updateField('icon', $event)" />

		<NcSelect
			:modelValue="display"
			:options="displayOptions"
			:inputLabel="t('nextcloud-vue', 'Show the value as')"
			:clearable="false"
			@update:modelValue="updateField('display', $event)">
			<template #option="{ label: id }">
				{{ displayLabel(id) }}
			</template>
			<template #selected-option="{ label: id }">
				{{ displayLabel(id) }}
			</template>
		</NcSelect>

		<NcTextField
			:modelValue="emptyText"
			:label="t('nextcloud-vue', 'Text when there is no value (optional)')"
			:placeholder="t('nextcloud-vue', 'Unknown')"
			@update:modelValue="updateField('emptyText', $event)" />

		<NcTextField
			:modelValue="caption"
			:label="t('nextcloud-vue', 'Caption (optional)')"
			:placeholder="t('nextcloud-vue', 'vs previous period')"
			@update:modelValue="updateField('caption', $event)" />

		<div class="cn-stat-widget-form__row2">
			<label class="cn-stat-widget-form__color-label">
				{{ t('nextcloud-vue', 'Value color') }}
				<CnColorPicker
					:value="valueColor"
					clearable
					@input="updateField('valueColor', $event.hex)"
					@clear="updateField('valueColor', '')" />
			</label>
			<label class="cn-stat-widget-form__color-label">
				{{ t('nextcloud-vue', 'Icon color') }}
				<CnColorPicker
					:value="iconColor"
					clearable
					@input="updateField('iconColor', $event.hex)"
					@clear="updateField('iconColor', '')" />
			</label>
		</div>

		<!-- Record overrides: a record in a special state shows that state. -->
		<h4 class="cn-stat-widget-form__section">
			{{ t('nextcloud-vue', 'Special states') }}
		</h4>
		<p class="cn-stat-widget-form__hint">
			{{ t('nextcloud-vue', 'When the record matches, the tile shows this label and colour instead. The first match wins.') }}
		</p>
		<div
			v-for="{ row, i } in shownOverrideRows"
			:key="'override-' + i"
			class="cn-stat-widget-form__rule"
			data-testid="cn-stat-widget-form-override-row">
			<NcTextField
				:modelValue="row.field"
				:label="t('nextcloud-vue', 'Property')"
				placeholder="suspended"
				@update:modelValue="updateRow('overrideRows', i, 'field', $event)" />
			<NcSelect
				:modelValue="row.op"
				:options="overrideOpOptions"
				:inputLabel="t('nextcloud-vue', 'Condition')"
				:clearable="false"
				@update:modelValue="updateRow('overrideRows', i, 'op', $event)">
				<template #option="{ label: id }">
					{{ overrideOpLabel(id) }}
				</template>
				<template #selected-option="{ label: id }">
					{{ overrideOpLabel(id) }}
				</template>
			</NcSelect>
			<NcTextField
				v-if="row.op !== 'truthy'"
				:modelValue="row.value"
				:label="t('nextcloud-vue', 'Value')"
				@update:modelValue="updateRow('overrideRows', i, 'value', $event)" />
			<NcTextField
				:modelValue="row.label"
				:label="t('nextcloud-vue', 'Label')"
				:placeholder="t('nextcloud-vue', 'Suspended')"
				@update:modelValue="updateRow('overrideRows', i, 'label', $event)" />
			<NcSelect
				:modelValue="row.variant"
				:options="variantOptions"
				:inputLabel="t('nextcloud-vue', 'Colour')"
				:clearable="false"
				@update:modelValue="updateRow('overrideRows', i, 'variant', $event)">
				<template #option="{ label: id }">
					{{ variantLabel(id) }}
				</template>
				<template #selected-option="{ label: id }">
					{{ variantLabel(id) }}
				</template>
			</NcSelect>
			<CnIconBrowser
				:value="row.icon"
				:label="t('nextcloud-vue', 'Icon (optional)')"
				@input="updateRow('overrideRows', i, 'icon', $event)" />
			<NcButton
				variant="tertiary"
				:aria-label="t('nextcloud-vue', 'Remove special state')"
				@click="removeRow('overrideRows', i)">
				<template #icon>
					<Close :size="18" />
				</template>
			</NcButton>
		</div>
		<NcButton variant="tertiary" @click="addRow('overrideRows', { field: '', op: 'truthy', value: '', valueRaw: undefined, label: '', variant: 'warning', icon: '', whenRest: {}, rest: {} })">
			<template #icon>
				<Plus :size="18" />
			</template>
			{{ t('nextcloud-vue', 'Add a special state') }}
		</NcButton>

		<!-- Number format. -->
		<h4 class="cn-stat-widget-form__section">
			{{ t('nextcloud-vue', 'Format') }}
		</h4>

		<div class="cn-stat-widget-form__row2">
			<NcSelect
				:modelValue="format.style"
				:options="styleOptions"
				:inputLabel="t('nextcloud-vue', 'Style')"
				:clearable="false"
				@update:modelValue="updateFormat('style', $event)" />
			<NcTextField
				v-if="format.style === 'currency'"
				:modelValue="format.currency"
				:label="t('nextcloud-vue', 'Currency')"
				placeholder="EUR"
				@update:modelValue="updateFormat('currency', $event)" />
			<NcTextField
				:modelValue="String(format.decimals)"
				type="number"
				:label="t('nextcloud-vue', 'Decimals')"
				@update:modelValue="updateFormat('decimals', Number($event) || 0)" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcSelect, NcTextField } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnColorPicker from '../CnColorPicker/CnColorPicker.vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnIconBrowser from '../CnIconBrowser/CnIconBrowser.vue'
import CnRegisterSchemaSelect from '../CnRegisterSchemaSelect/CnRegisterSchemaSelect.vue'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'
import { filterToRows, rowsToFilter } from '../CnFilterRowsEditor/filterRows.js'

const DEFAULT_CONTENT = Object.freeze({
	label: '',
	icon: 'Cash',
	iconColor: '',
	valueColor: '#0082c9',
	caption: '',
	format: { style: 'number', currency: 'EUR', decimals: 0 },
	source: { register: '', schema: '', metric: 'count', field: '', filter: {} },
})

/**
 * Content keys this form owns. Every other key on the edited content (an
 * `endpointSource`, a `variantWhen`, a `route`, …) passes through untouched,
 * so saving the form never drops config the form cannot show.
 *
 * @type {string[]}
 */
const OWNED_KEYS = ['label', 'icon', 'iconColor', 'valueColor', 'caption', 'format', 'source', 'objectField', 'display', 'emptyText', 'overrides']

/**
 * Seed the colour-per-value rows from a stored `variantMap`.
 *
 * @param {object|undefined} map The stored `{ value: variant }` map.
 * @return {Array<{value: string, variant: string}>} The editable rows.
 */
function variantMapToRows(map) {
	if (!map || typeof map !== 'object') {
		return []
	}
	return Object.entries(map).map(([value, variant]) => ({ value, variant: String(variant) }))
}

/**
 * The value an override row writes back.
 *
 * The editor's input is a text box, so what it hands back is always a string.
 * A row whose text is unchanged writes the value the manifest stored, type
 * included, so a number stays a number. A row somebody actually edited writes
 * the string they typed, which is the only honest reading of a text field.
 *
 * @param {{value: string, valueRaw: unknown}} row The override row.
 * @return {unknown} The value to store.
 */
function overrideValue(row) {
	if (row.valueRaw !== undefined && String(row.valueRaw) === row.value) {
		return row.valueRaw
	}
	return row.value
}

/**
 * Seed the special-state rows from stored `overrides`.
 *
 * @param {Array|undefined} overrides The stored overrides.
 * @return {Array<{field: string, op: string, value: string, label: string, variant: string}>} The editable rows.
 */
function overridesToRows(overrides) {
	if (!Array.isArray(overrides)) {
		return []
	}
	return overrides.map((o, index) => {
		// An override the form cannot draw is KEPT, not dropped. A `when` with
		// no `field` is a valid clause the grammar grows over time (an
		// `appInstalled` gate, say), and editing an unrelated row used to
		// delete every one of them on save.
		if (!o || typeof o !== 'object' || !o.when || typeof o.when.field !== 'string') {
			return { index, opaque: o }
		}
		const { field, op, value, ...whenRest } = o.when
		const { when, label, variant, icon, ...rest } = o
		const compares = Object.hasOwn(o.when, 'value') || Boolean(op)
		return {
			index,
			field,
			op: compares ? (op || 'eq') : 'truthy',
			value: compares && value !== undefined && value !== null ? String(value) : '',
			// The value the manifest actually stored, kept beside the text the
			// field edits. The input is a text box, so everything it produces
			// is a string, and a stored `{ op: 'gt', value: 5 }` round-tripped
			// to `'5'` merely by opening the editor. `5 > '5'` and `5 > 5` are
			// not the same comparison.
			valueRaw: compares ? value : undefined,
			label: label || '',
			variant: variant || 'warning',
			icon: icon || '',
			// Everything the form does not draw, carried through the round trip
			// so saving cannot quietly narrow a manifest-authored override.
			whenRest,
			rest,
		}
	})
}

/**
 * CnStatWidgetForm — the config sub-form for a `stat` widget (KPI tile).
 *
 * Edits the presentation (label / icon / value + icon colour / caption / number
 * format) and one of three data SOURCE kinds: **Aggregate** (count/sum/avg/min/
 * max with operator filters), **Ratio** (numerator ÷ denominator × 100 — e.g. a
 * win-rate), or **Weighted** (Σ field × weight ÷ divisor — e.g. a probability-
 * weighted forecast). A fifth kind, **Field on this record**, reads a property
 * off the bound detail-page record (`objectField`), optionally looked up in a
 * register and schema, with a colour taken from the looked-up row.
 *
 * The display section edits `display` (text or badge) and `emptyText`, and
 * the special-states list edits `overrides`: record conditions that swap the
 * shown label and colour. Keys the form does not own pass through unchanged.
 *
 * Emits `update:content` on every change; `validate()` requires a register +
 * schema, a field for non-count metrics, the weight field for the weighted
 * kind, and a property for the record kind. Used by both `CnAddWidgetModal`
 * and the cog `CnWidgetStyleEditorModal`.
 */
export default {
	name: 'CnStatWidgetForm',

	components: { NcButton, NcTextField, NcSelect, Plus, Close, CnFilterRowsEditor, CnFieldPicker, CnRegisterSchemaSelect, CnIconBrowser, CnColorPicker },

	props: {
		/**
		 * The placement being edited (pre-fills from `editingWidget.content`),
		 * or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},

		/**
		 * Initial content values when not editing (registry defaults).
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		const fmt = initial.format || {}
		const src = initial.source || {}
		const of = initial.objectField
		const ofResolve = (of && typeof of === 'object' && of.resolve) || {}
		const passthrough = {}
		for (const [key, v] of Object.entries(initial)) {
			if (!OWNED_KEYS.includes(key)) {
				passthrough[key] = v
			}
		}
		return {
			passthrough,
			recordField: typeof of === 'string' ? of : ((of && of.field) || ''),
			recordResolve: {
				register: ofResolve.register ?? '',
				schema: ofResolve.schema ?? '',
				labelField: ofResolve.labelField ?? '',
				variantField: ofResolve.variantField ?? '',
			},

			variantRows: variantMapToRows(ofResolve.variantMap),
			display: initial.display === 'badge' ? 'badge' : 'text',
			emptyText: initial.emptyText ?? '',
			overrideRows: overridesToRows(initial.overrides),
			label: initial.label ?? DEFAULT_CONTENT.label,
			icon: initial.icon ?? DEFAULT_CONTENT.icon,
			iconColor: initial.iconColor ?? DEFAULT_CONTENT.iconColor,
			valueColor: initial.valueColor ?? DEFAULT_CONTENT.valueColor,
			caption: initial.caption ?? DEFAULT_CONTENT.caption,
			format: {
				style: fmt.style ?? DEFAULT_CONTENT.format.style,
				currency: fmt.currency ?? DEFAULT_CONTENT.format.currency,
				decimals: Number.isFinite(fmt.decimals) ? fmt.decimals : 0,
			},

			kind: of ? 'record' : (src.kind || 'aggregate'),
			source: { register: src.register ?? '', schema: src.schema ?? '' },
			metric: src.metric ?? 'count',
			field: src.field ?? '',
			weighted: {
				field: src.field ?? '',
				weightField: src.weightField ?? '',
				divisor: Number.isFinite(src.divisor) ? src.divisor : 100,
			},

			filterRows: filterToRows(src.filter || {}),
			numeratorRows: filterToRows((src.numerator && src.numerator.filter) || (src.parts && src.parts.A && src.parts.A.filter) || {}),
			denominatorRows: filterToRows((src.denominator && src.denominator.filter) || (src.parts && src.parts.B && src.parts.B.filter) || {}),
			formula: src.formula ?? 'A/B*100',
			availableFields: [],
		}
	},

	computed: {
		/** Source-kind options. */
		kindOptions() {
			return ['aggregate', 'ratio', 'computed', 'weighted', 'record']
		},

		/** Display-mode options. */
		displayOptions() {
			return ['text', 'badge']
		},

		/** Colour variants a badge and a tile understand. */
		variantOptions() {
			return ['default', 'primary', 'success', 'warning', 'error', 'info']
		},

		/** Special-state conditions: a truthiness test or a comparison. */
		overrideOpOptions() {
			return ['truthy', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte']
		},

		/** Aggregation metric options. */
		metricOptions() {
			return ['count', 'sum', 'avg', 'min', 'max']
		},

		/** Number-format style options. */
		styleOptions() {
			return ['number', 'currency', 'percent']
		},

		/** The assembled content blob from the current field values. */
		assembledContent() {
			const base = { register: this.source.register, schema: this.source.schema }
			let source
			if (this.kind === 'ratio') {
				source = {
					...base,
					kind: 'ratio',
					metric: this.metric,
					field: this.field,
					numerator: { filter: rowsToFilter(this.numeratorRows) },
					denominator: { filter: rowsToFilter(this.denominatorRows) },
				}
			} else if (this.kind === 'computed') {
				source = {
					...base,
					kind: 'computed',
					formula: this.formula,
					parts: {
						A: { metric: this.metric, field: this.field, filter: rowsToFilter(this.numeratorRows) },
						B: { metric: this.metric, field: this.field, filter: rowsToFilter(this.denominatorRows) },
					},
				}
			} else if (this.kind === 'weighted') {
				source = {
					...base,
					kind: 'weighted',
					field: this.weighted.field,
					weightField: this.weighted.weightField,
					divisor: this.weighted.divisor,
					filter: rowsToFilter(this.filterRows),
				}
			} else if (this.kind !== 'record') {
				source = { ...base, metric: this.metric, field: this.field, filter: rowsToFilter(this.filterRows) }
			}
			const content = {
				...this.passthrough,
				label: this.label,
				icon: this.icon,
				iconColor: this.iconColor,
				valueColor: this.valueColor,
				caption: this.caption,
				format: { ...this.format },
			}
			if (this.kind === 'record') {
				content.objectField = this.assembledObjectField
			} else {
				content.source = source
			}
			// The new keys are written only when set, so a form that never
			// touches them emits exactly the blob it always has.
			if (this.display === 'badge') {
				content.display = 'badge'
			}
			if (this.emptyText) {
				content.emptyText = this.emptyText
			}
			const overrides = this.assembledOverrides
			if (overrides.length) {
				content.overrides = overrides
			}
			return content
		},

		/**
		 * The `objectField` config for the record kind: the plain property
		 * name, or `{ field, resolve }` once a lookup target is chosen.
		 *
		 * @return {string|object} The objectField value.
		 */
		assembledObjectField() {
			const r = this.recordResolve
			if (!r.register || !r.schema) {
				return this.recordField
			}
			const resolve = { register: r.register, schema: r.schema }
			if (r.labelField) {
				resolve.labelField = r.labelField
			}
			if (r.variantField) {
				resolve.variantField = r.variantField
				const map = {}
				for (const row of this.variantRows) {
					if (row.value !== '' && row.variant) {
						map[row.value] = row.variant
					}
				}
				if (Object.keys(map).length) {
					resolve.variantMap = map
				}
			}
			return { field: this.recordField, resolve }
		},

		/**
		 * The `overrides` list from the special-state rows. A row without a
		 * property is still being typed, so it is left out.
		 *
		 * @return {Array<object>} The overrides.
		 */
		/**
		 * The override rows the form can draw, each with its position in the
		 * stored list so an edit writes back to the right one. Rows the form
		 * cannot draw stay in `overrideRows` and are re-emitted untouched.
		 *
		 * @return {Array<{row: object, i: number}>} The drawable rows.
		 */
		shownOverrideRows() {
			return this.overrideRows
				.map((row, i) => ({ row, i }))
				.filter((entry) => entry.row.opaque === undefined)
		},

		assembledOverrides() {
			return this.overrideRows
				.filter((row) => row.opaque !== undefined || row.field)
				.map((row) => {
					if (row.opaque !== undefined) {
						return row.opaque
					}
					const when = row.op === 'truthy'
						? { ...row.whenRest, field: row.field }
						: { ...row.whenRest, field: row.field, op: row.op, value: overrideValue(row) }
					const override = { ...row.rest, when }
					if (row.label) {
						override.label = row.label
					}
					if (row.variant) {
						override.variant = row.variant
					}
					if (row.icon) {
						override.icon = row.icon
					}
					return override
				})
		},
	},

	watch: {
		'source.register': 'loadFields',
		'source.schema': 'loadFields',
	},

	mounted() {
		this.loadFields()
	},

	methods: {
		t,

		/** Resolve the schema's field names for the dropdowns. */
		async loadFields() {
			this.availableFields = await fetchSchemaProperties(this.source.register, this.source.schema)
		},

		/**
		 * Human label for a source kind.
		 *
		 * @param {'aggregate'|'ratio'|'computed'|'weighted'} id A `kindOptions` value.
		 * @return {string} The translated label; unknown ids fall back to "Aggregate".
		 */
		kindLabel(id) {
			if (id === 'ratio') {
				return t('nextcloud-vue', 'Ratio (%)')
			}
			if (id === 'computed') {
				return t('nextcloud-vue', 'Formula')
			}
			if (id === 'weighted') {
				return t('nextcloud-vue', 'Weighted sum')
			}
			if (id === 'record') {
				return t('nextcloud-vue', 'Field on this record')
			}
			return t('nextcloud-vue', 'Aggregate')
		},

		/**
		 * Human label for a display mode.
		 *
		 * @param {'text'|'badge'} id A `displayOptions` value.
		 * @return {string} The translated label.
		 */
		displayLabel(id) {
			return id === 'badge' ? t('nextcloud-vue', 'Badge') : t('nextcloud-vue', 'Text')
		},

		/**
		 * Human label for a colour variant.
		 *
		 * @param {string} id A `variantOptions` value.
		 * @return {string} The translated label.
		 */
		variantLabel(id) {
			const labels = {
				default: t('nextcloud-vue', 'Neutral'),
				primary: t('nextcloud-vue', 'Primary'),
				success: t('nextcloud-vue', 'Success'),
				warning: t('nextcloud-vue', 'Warning'),
				error: t('nextcloud-vue', 'Error'),
				info: t('nextcloud-vue', 'Information'),
			}
			return labels[id] || id
		},

		/**
		 * Human label for a special-state condition.
		 *
		 * @param {string} id An `overrideOpOptions` value.
		 * @return {string} The translated label.
		 */
		overrideOpLabel(id) {
			const labels = {
				truthy: t('nextcloud-vue', 'is set'),
				eq: t('nextcloud-vue', 'equals'),
				neq: t('nextcloud-vue', 'does not equal'),
				gt: t('nextcloud-vue', 'is greater than'),
				gte: t('nextcloud-vue', 'is at least'),
				lt: t('nextcloud-vue', 'is less than'),
				lte: t('nextcloud-vue', 'is at most'),
			}
			return labels[id] || id
		},

		/**
		 * Set a lookup (`objectField.resolve`) sub-field and emit.
		 *
		 * @param {'register'|'schema'|'labelField'|'variantField'} field The sub-key to write.
		 * @param {string} value The new value.
		 * @return {void}
		 */
		updateResolve(field, value) {
			this.recordResolve[field] = value
			this.emitChange()
		},

		/**
		 * Set one cell of an editable row list and emit.
		 *
		 * @param {'variantRows'|'overrideRows'} list Which row list.
		 * @param {number} index The row index.
		 * @param {string} key The cell to write.
		 * @param {string} value The new value.
		 * @return {void}
		 */
		updateRow(list, index, key, value) {
			this[list] = this[list].map((row, i) => (i === index ? { ...row, [key]: value } : row))
			this.emitChange()
		},

		/**
		 * Append a row to an editable row list and emit.
		 *
		 * @param {'variantRows'|'overrideRows'} list Which row list.
		 * @param {object} row The new row.
		 * @return {void}
		 */
		addRow(list, row) {
			this[list] = [...this[list], row]
			this.emitChange()
		},

		/**
		 * Remove a row from an editable row list and emit.
		 *
		 * @param {'variantRows'|'overrideRows'} list Which row list.
		 * @param {number} index The row index.
		 * @return {void}
		 */
		removeRow(list, index) {
			this[list] = this[list].filter((row, i) => i !== index)
			this.emitChange()
		},

		/**
		 * Set a top-level field and emit.
		 *
		 * @param {'label'|'icon'|'iconColor'|'valueColor'|'caption'|'kind'|'metric'|'field'|'formula'|'recordField'|'display'|'emptyText'} field The data key to write.
		 * @param {string} value The new value for that key.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.emitChange()
		},

		/**
		 * Set a format sub-field and emit.
		 *
		 * @param {'style'|'currency'|'decimals'} field The `format` sub-key to write.
		 * @param {string|number} value A `styleOptions` value, an ISO currency code,
		 *   or the decimal precision.
		 * @return {void}
		 */
		updateFormat(field, value) {
			this.format[field] = value
			this.emitChange()
		},

		/**
		 * Set a source sub-field and emit.
		 *
		 * @param {'register'|'schema'} field The `source` sub-key to write.
		 * @param {string} value The chosen register or schema slug.
		 * @return {void}
		 */
		updateSource(field, value) {
			this.source[field] = value
			this.emitChange()
		},

		/**
		 * Set a weighted sub-field and emit (the `weighted` source kind).
		 *
		 * @param {'field'|'weightField'|'divisor'} field The `weighted` sub-key to write.
		 * @param {string|number} value The value or weight property name, or the
		 *   numeric divisor applied to the weighted sum.
		 * @return {void}
		 */
		updateWeighted(field, value) {
			this.weighted[field] = value
			this.emitChange()
		},

		/**
		 * Receive updated filter rows from a shared editor (by data key).
		 *
		 * @param {'filterRows'|'numeratorRows'|'denominatorRows'} key Which row set
		 *   to replace — the plain filter, or the ratio's numerator/denominator.
		 * @param {Array<{key: string, op: string, value: string}>} rows The editor's
		 *   full row list, serialised by `rowsToFilter()`.
		 * @return {void}
		 */
		onRows(key, rows) {
			this[key] = rows
			this.emitChange()
		},

		/** Emit the assembled content. */
		emitChange() {
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			if (this.kind === 'record') {
				if (!this.recordField || this.recordField.trim() === '') {
					errors.push(t('nextcloud-vue', 'A property on the record is required'))
				}
				if (Boolean(this.recordResolve.register) !== Boolean(this.recordResolve.schema)) {
					errors.push(t('nextcloud-vue', 'Pick both a register and a schema to look the value up in'))
				}
				return errors
			}
			if (!this.source.register || !this.source.schema) {
				errors.push(t('nextcloud-vue', 'A register and schema are required'))
			}
			if (this.kind === 'weighted') {
				if (!this.weighted.field || !this.weighted.weightField) {
					errors.push(t('nextcloud-vue', 'A field and weight field are required'))
				}
			} else if (this.metric !== 'count' && (!this.field || this.field.trim() === '')) {
				errors.push(t('nextcloud-vue', 'A field is required for sum / avg / min / max'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-stat-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-stat-widget-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-stat-widget-form__sublabel {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-stat-widget-form__hint {
	margin: 0;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

/* One colour-per-value or special-state row: inputs share the width, the
   remove button keeps its own. Wraps on a narrow modal. */
.cn-stat-widget-form__rule {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: flex-end;
}

.cn-stat-widget-form__rule > :not(button) {
	flex: 1 1 120px;
	min-width: 0;
}

.cn-stat-widget-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-stat-widget-form__row2 > * {
	flex: 1;
	min-width: 0;
}

.cn-stat-widget-form__color-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-stat-widget-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}
</style>

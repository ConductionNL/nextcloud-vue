<template>
	<div class="cn-advanced-form-dialog__value-cell-wrapper">
		<!-- Edit mode -->
		<div
			v-if="isEditable && (resolvedWidget === 'boolean' || isEditing)"
			class="cn-advanced-form-dialog__value-input-container"
			@click.stop>
			<div
				v-if="resolvedWidget === 'boolean'"
				class="cn-advanced-form-dialog__boolean-input-row">
				<NcCheckboxRadioSwitch
					:checked="!!value"
					type="switch"
					class="cn-advanced-form-dialog__boolean-input-row__input"
					@update:checked="emit($event)">
					{{ displayName }}
				</NcCheckboxRadioSwitch>
				<InformationOutline
					v-if="schemaProp && schemaProp.description"
					v-tooltip="schemaProp.description"
					class="cn-advanced-form-dialog__info-icon"
					:size="16" />
			</div>
			<div
				v-else-if="resolvedWidget === 'color'"
				class="cn-advanced-form-dialog__color-input-row">
				<CnColorPicker
					:value="chromePickerValue"
					:disable-alpha="!hasAlpha"
					:mode="colorPickerMode"
					@input="onChromeColorInput" />
				<NcTextField
					ref="inputRef"
					:value="colorTextValue"
					:placeholder="colorPlaceholder"
					@update:value="onColorTextInput($event)" />
			</div>
			<NcDateTimePicker
				v-else-if="resolvedWidget === 'datetime'"
				:value="datetimeValue"
				:type="datetimePickerType"
				:placeholder="displayName"
				:input-label="displayName"
				@input="emitDatetime($event)" />
			<NcTextArea
				v-else-if="resolvedWidget === 'textarea'"
				ref="inputRef"
				:value="stringValue"
				:placeholder="displayName"
				:rows="textareaRows"
				:maxlength="maxLengthAttr"
				class="cn-advanced-form-dialog__textarea"
				@update:value="emit($event)" />
			<NcSelect
				v-else-if="resolvedWidget === 'select'"
				:value="effectiveSelectValue"
				:options="effectiveSelectOptions"
				:multiple="effectiveSelectMultiple"
				:taggable="effectiveSelectTaggable"
				:push-tags="effectiveSelectTaggable"
				:close-on-select="!effectiveSelectMultiple"
				:input-label="displayName"
				:placeholder="displayName"
				@input="emitSelect($event)" />
			<CnJsonViewer
				v-else-if="resolvedWidget === 'object'"
				:value="objectJsonString"
				:height="objectEditorHeight"
				language="json"
				@update:value="emitObject($event)" />
			<div
				v-else-if="resolvedWidget === 'objectArray'"
				class="cn-advanced-form-dialog__object-array">
				<div class="cn-advanced-form-dialog__object-array-chips">
					<button
						v-for="(item, idx) in objectArrayItems"
						:key="idx"
						type="button"
						class="cn-advanced-form-dialog__object-array-chip"
						:title="t('nextcloud-vue', 'Edit item')"
						@click.stop="openObjectArrayItem(idx)">
						<span class="cn-advanced-form-dialog__object-array-chip-label">{{ objectArrayItemLabel(item, idx) }}</span>
						<NcButton
							type="tertiary-no-background"
							:aria-label="t('nextcloud-vue', 'Remove item')"
							:title="t('nextcloud-vue', 'Remove item')"
							class="cn-advanced-form-dialog__object-array-chip-remove"
							@click.stop="removeObjectArrayItem(idx)">
							<template #icon>
								<Close :size="14" />
							</template>
						</NcButton>
					</button>
				</div>
				<NcButton
					type="secondary"
					class="cn-advanced-form-dialog__object-array-add"
					@click.stop="openObjectArrayItem(null)">
					<template #icon>
						<Plus :size="16" />
					</template>
					{{ t('nextcloud-vue', 'Add item') }}
				</NcButton>
				<CnAdvancedFormDialog
					v-if="objectArrayDialogOpen"
					:schema="schemaProp.items"
					:item="objectArrayDialogItem"
					:dialog-title="objectArrayDialogTitle"
					:show-metadata-tab="false"
					@confirm="onObjectArrayConfirm"
					@close="closeObjectArrayDialog" />
			</div>
			<NcTextField
				v-else
				ref="inputRef"
				:value="stringValue"
				:type="inputType"
				:placeholder="displayName"
				:min="minimum"
				:max="maximum"
				:step="step"
				:pattern="pattern"
				:minlength="minLengthAttr"
				:maxlength="maxLengthAttr"
				@update:value="emitConverted($event)" />
		</div>

		<!-- Display mode -->
		<div
			v-else
			:title="editabilityWarning">
			<pre
				v-if="typeof value === 'object' && value !== null"
				class="cn-advanced-form-dialog__json-value">{{ formattedObjectValue }}</pre>
			<span
				v-else-if="resolvedWidget === 'datetime' && isValidDate(value)">{{
				formattedDateValue
			}}</span>
			<span
				v-else-if="resolvedWidget === 'color' && value"
				class="cn-advanced-form-dialog__color-display">
				<span
					class="cn-advanced-form-dialog__color-swatch cn-advanced-form-dialog__color-swatch--readonly"
					:style="colorSwatchStyle" />
				<span>{{ displayValue }}</span>
			</span>
			<span v-else>{{ displayValue }}</span>
		</div>

		<!-- Help text: description + example -->
		<div
			v-if="showHelpText && (helpDescription || helpExample)"
			class="cn-advanced-form-dialog__field-help">
			<span
				v-if="helpDescription"
				class="cn-advanced-form-dialog__field-description">{{ helpDescription }}</span>
			<span
				v-if="helpExample"
				class="cn-advanced-form-dialog__field-example">{{ t('nextcloud-vue', 'e.g.') }} {{ helpExample }}</span>
		</div>

		<!-- Inline validation error -->
		<div
			v-if="showHelpText && fieldError"
			class="cn-advanced-form-dialog__field-error"
			role="alert">
			{{ fieldError }}
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcTextField,
	NcTextArea,
	NcCheckboxRadioSwitch,
	NcSelect,
	NcButton,
	NcDateTimePicker,
	Tooltip,
} from '@nextcloud/vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Close from 'vue-material-design-icons/Close.vue'
import { formatValue, validateValue } from '../../utils/schema.js'
import CnJsonViewer from '../CnJsonViewer/CnJsonViewer.vue'
import CnColorPicker from '../CnColorPicker/CnColorPicker.vue'

const SUPPORTED_WIDGETS = ['text', 'number', 'boolean', 'datetime', 'textarea', 'array', 'select', 'object', 'objectArray', 'color']

/** String formats that map to HTML5 `<input type="url">`. */
const URL_FORMATS = new Set([
	'url', 'uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template',
	'accessUrl', 'shareUrl', 'downloadUrl',
])

/** All color-related string formats — rendered with the `color` widget (swatch + text input). */
const COLOR_FORMATS = new Set([
	'color',
	'color-hex',
	'color-hex-alpha',
	'color-rgb',
	'color-rgba',
	'color-hsl',
	'color-hsla',
])

/** String formats that render as a multi-line textarea instead of a single-line input. */
const TEXTAREA_FORMATS = new Set(['html', 'markdown'])

export default {
	name: 'CnPropertyValueCell',

	directives: { tooltip: Tooltip },

	components: {
		NcTextField,
		NcTextArea,
		NcCheckboxRadioSwitch,
		NcSelect,
		NcButton,
		NcDateTimePicker,
		InformationOutline,
		Plus,
		Close,
		CnJsonViewer,
		CnColorPicker,
		// Lazy-required to break the circular dep with CnAdvancedFormDialog.
		CnAdvancedFormDialog: () => import('./CnAdvancedFormDialog.vue'),
	},

	props: {
		/** The schema property key */
		propertyKey: { type: String, required: true },
		/** Full JSON schema object */
		schema: { type: Object, default: null },
		/** Resolved current value (formData[key] ?? objectValue) */
		value: { type: [String, Number, Boolean, Object, Array], default: null },
		/** Whether this property is editable at all */
		isEditable: { type: Boolean, default: true },
		/** Whether this row is currently selected for editing */
		isEditing: { type: Boolean, default: false },
		/** Display name for the property (used in labels/placeholders) */
		displayName: { type: String, default: '' },
		/** Editability warning message shown as title when not editable */
		editabilityWarning: { type: String, default: null },
		/**
		 * Override the auto-detected widget for this cell. When null (default),
		 * the widget is derived from the schema (boolean/datetime/text/number),
		 * with auto-detection for `format: 'text'` (textarea) and `type: 'array'`.
		 * Accepted: 'text', 'number', 'boolean', 'datetime', 'textarea', 'array', 'select'.
		 */
		widget: {
			type: String,
			default: null,
			validator: (v) => v === null || SUPPORTED_WIDGETS.includes(v),
		},
		/** Options for the `select` widget. Each option may be a string, or `{ id, label }`. */
		selectOptions: { type: Array, default: null },
		/** Whether the `select` widget allows multiple values. */
		selectMultiple: { type: Boolean, default: true },
		/** Number of rows for the `textarea` widget. */
		textareaRows: { type: Number, default: 4 },
		/** CSS height for the `object` widget's CodeMirror editor. */
		objectEditorHeight: { type: String, default: '300px' },
	},

	data() {
		return {
			/**
			 * Optimistic color value while the user is dragging the native picker.
			 * Used for the swatch preview to feel instant; the upstream
			 * `update:value` emit is debounced so validation/re-renders don't
			 * fire on every drag tick.
			 */
			pendingColor: null,
			pendingColorTimer: null,
			colorPickerOpen: false,
			/** State for the object-array sub-dialog. `null` index means "add new". */
			objectArrayDialogOpen: false,
			objectArrayDialogIndex: null,
			objectArrayDialogItem: null,
		}
	},

	computed: {
		schemaProp() {
			return this.schema?.properties?.[this.propertyKey] || null
		},

		/**
		 * Resolved widget after applying explicit override + schema auto-detection.
		 * Arrays and string-with-enum become a `select` widget; the array/enum
		 * shape is inferred from the schema by the `effectiveSelect*` computeds.
		 * @return {string} one of SUPPORTED_WIDGETS
		 */
		resolvedWidget() {
			if (this.widget === 'array') return 'select'
			if (this.widget) return this.widget
			const prop = this.schemaProp
			if (!prop) return 'text'
			if (prop.type === 'boolean') return 'boolean'
			if (prop.type === 'array') {
				if (prop.items?.type === 'object') return 'objectArray'
				return 'select'
			}
			if (prop.type === 'object') return 'object'
			if (prop.type === 'string') {
				if (Array.isArray(prop.enum) && prop.enum.length > 0) return 'select'
				const fmt = prop.format || ''
				if (['date', 'time', 'date-time'].includes(fmt)) return 'datetime'
				if (TEXTAREA_FORMATS.has(fmt)) return 'textarea'
				if (COLOR_FORMATS.has(fmt)) return 'color'
			}
			if (prop.type === 'number' || prop.type === 'integer') return 'number'
			return 'text'
		},

		inputType() {
			const prop = this.schemaProp
			if (!prop) return 'text'
			const fmt = prop.format || ''
			if (prop.type === 'string') {
				if (fmt === 'email' || fmt === 'idn-email') return 'email'
				if (URL_FORMATS.has(fmt)) return 'url'
				if (fmt === 'password') return 'password'
				if (fmt === 'telephone' || fmt === 'phone') return 'tel'
			}
			if (prop.type === 'number' || prop.type === 'integer') return 'number'
			return 'text'
		},

		pattern() {
			const prop = this.schemaProp
			if (!prop || prop.type !== 'string') return undefined
			if (prop.pattern) return prop.pattern
			return undefined
		},

		colorPlaceholder() {
			const fmt = this.schemaProp?.format
			switch (fmt) {
			case 'color-hex': return '#rrggbb'
			case 'color-hex-alpha': return '#rrggbbaa'
			case 'color-rgb': return 'rgb(0, 0, 0)'
			case 'color-rgba': return 'rgba(0, 0, 0, 1)'
			case 'color-hsl': return 'hsl(0, 0%, 0%)'
			case 'color-hsla': return 'hsla(0, 0%, 0%, 1)'
			default: return this.displayName || '#rrggbb'
			}
		},

		/** CSS-renderable representation of the current color value (raw value works for all standard formats). */
		colorPreviewValue() {
			if (this.pendingColor) return this.pendingColor
			const v = this.stringValue
			if (!v) return ''
			return v
		},

		/** Text-field value: shows the optimistic pendingColor while the picker is dragging. */
		colorTextValue() {
			if (this.pendingColor) return this.pendingColor
			return this.stringValue
		},

		/** True when the schema-declared format includes an alpha channel. */
		hasAlpha() {
			const fmt = this.schemaProp?.format
			return fmt === 'color-hex-alpha' || fmt === 'color-rgba' || fmt === 'color-hsla'
		},

		/**
		 * Lock the picker's numeric-field mode to match the schema format so
		 * the user can't edit, say, an `rgba()` value via hex inputs.
		 */
		colorPickerMode() {
			const fmt = this.schemaProp?.format
			if (fmt === 'color-rgb' || fmt === 'color-rgba') return 'rgb'
			if (fmt === 'color-hsl' || fmt === 'color-hsla') return 'hsl'
			return 'hex'
		},

		/**
		 * Value passed to vue-color's `Chrome` picker. We feed the picker the
		 * latest displayable value (pending or committed) so dragging the
		 * picker stays smooth even while the upstream emit is debounced.
		 */
		chromePickerValue() {
			const v = this.pendingColor || this.stringValue
			if (v) return v
			return { hex: this.hexColorValue, a: 1 }
		},

		/**
		 * Inline style for the color swatch: layers a solid color over the checker
		 * background-image so alpha colors render against the checker pattern.
		 */
		colorSwatchStyle() {
			const c = this.colorPreviewValue
			if (!c) return {}
			const fill = `linear-gradient(${c}, ${c})`
			return {
				backgroundImage: `${fill}, var(--cn-color-swatch-checker)`,
				backgroundSize: '100% 100%, 8px 8px',
				backgroundPosition: '0 0, 0 0',
			}
		},

		/** Hex string used as the value of the native `<input type="color">`. */
		hexColorValue() {
			const v = this.stringValue
			if (!v) return '#000000'
			const trimmed = v.trim()
			const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
			if (hexMatch) {
				const h = hexMatch[1]
				if (h.length === 3 || h.length === 4) {
					return '#' + h.slice(0, 3).split('').map((c) => c + c).join('')
				}
				return '#' + h.slice(0, 6)
			}
			const computed = this.cssColorToHex(trimmed)
			return computed || '#000000'
		},

		minimum() {
			return this.schemaProp?.minimum
		},

		maximum() {
			return this.schemaProp?.maximum
		},

		step() {
			const prop = this.schemaProp
			if (prop?.type === 'integer') return '1'
			if (prop?.type === 'number') return 'any'
			return undefined
		},

		minLengthAttr() {
			const v = this.schemaProp?.minLength
			return typeof v === 'number' ? v : undefined
		},

		maxLengthAttr() {
			const v = this.schemaProp?.maxLength
			return typeof v === 'number' ? v : undefined
		},

		showHelpText() {
			return this.isEditable && (this.resolvedWidget === 'boolean' || this.isEditing)
		},

		helpDescription() {
			const prop = this.schemaProp
			if (!prop) return ''
			return prop.userDescription || prop.description || ''
		},

		helpExample() {
			const ex = this.schemaProp?.example
			if (ex === undefined || ex === null || ex === '') return ''
			if (typeof ex === 'object') {
				try { return JSON.stringify(ex) } catch { return '' }
			}
			return String(ex)
		},

		/**
		 * Inline validation message for the current value, or null when valid.
		 * Required-ness is owned by the parent form so it isn't surfaced here.
		 */
		fieldError() {
			const raw = validateValue(this.value, this.schemaProp || {})
			return raw ? t('nextcloud-vue', raw) : null
		},

		/** Resolved option list for the `select` widget (explicit prop, schema enum, or items.enum). */
		effectiveSelectOptions() {
			if (this.selectOptions) return this.selectOptions
			const prop = this.schemaProp
			if (!prop) return []
			if (Array.isArray(prop.enum) && prop.enum.length > 0) return prop.enum
			if (prop.type === 'array' && Array.isArray(prop.items?.enum) && prop.items.enum.length > 0) {
				return prop.items.enum
			}
			return []
		},

		/** Whether the `select` widget allows multiple values. */
		effectiveSelectMultiple() {
			if (this.widget === 'select') return this.selectMultiple
			if (this.widget === 'array') return true
			const prop = this.schemaProp
			if (prop?.type === 'array') return true
			return false
		},

		/** Whether the `select` widget accepts free-form tags (no fixed enum). */
		effectiveSelectTaggable() {
			if (this.widget === 'select') return false
			const prop = this.schemaProp
			const isArray = this.widget === 'array' || prop?.type === 'array'
			return isArray && this.effectiveSelectOptions.length === 0
		},

		/** Selected-value object(s) for NcSelect, mapping ids back to option objects when needed. */
		effectiveSelectValue() {
			const v = this.value
			const opts = this.effectiveSelectOptions
			const lookup = (id) => {
				const match = opts.find((o) => (typeof o === 'object' ? o.id : o) === id)
				return match !== undefined ? match : id
			}
			if (this.effectiveSelectMultiple) {
				if (!Array.isArray(v)) return []
				return v.map(lookup)
			}
			if (v == null || v === '') return null
			return lookup(v)
		},

		/** Items array for the `objectArray` widget. Always an array. */
		objectArrayItems() {
			return Array.isArray(this.value) ? this.value : []
		},

		/** Title shown in the sub-dialog when adding/editing an object item. */
		objectArrayDialogTitle() {
			const itemTitle = this.schemaProp?.items?.title || this.displayName || t('nextcloud-vue', 'Item')
			return this.objectArrayDialogIndex === null
				? t('nextcloud-vue', 'Add {title}', { title: itemTitle })
				: t('nextcloud-vue', 'Edit {title}', { title: itemTitle })
		},

		/**
		 * NcDateTimePicker `type` mapped from the schema's string `format`.
		 * Falls back to `datetime` for unknown date-ish formats.
		 */
		datetimePickerType() {
			const fmt = this.schemaProp?.format
			if (fmt === 'date') return 'date'
			if (fmt === 'time') return 'time'
			return 'datetime'
		},

		/** Current value as a `Date` instance for NcDateTimePicker, or null. */
		datetimeValue() {
			const v = this.value
			if (!v) return null
			// Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by the spec,
			// which shifts to the previous day in positive-UTC-offset timezones when
			// fed to a picker that renders in local time. Parse them as local midnight.
			if (this.schemaProp?.format === 'date'
				&& typeof v === 'string'
				&& /^\d{4}-\d{2}-\d{2}$/.test(v)) {
				const [year, month, day] = v.split('-').map(Number)
				return new Date(year, month - 1, day)
			}
			const d = new Date(v)
			return Number.isNaN(d.getTime()) ? null : d
		},

		stringValue() {
			const v = this.value
			if (v == null) return ''
			if (typeof v === 'string') return v
			if (typeof v === 'object') return JSON.stringify(v)
			return String(v)
		},

		objectJsonString() {
			const v = this.value
			if (v == null) return ''
			if (typeof v === 'string') return v
			try {
				return JSON.stringify(v, null, 2)
			} catch {
				return ''
			}
		},

		formattedObjectValue() {
			try {
				return JSON.stringify(this.value, null, 2)
			} catch {
				return formatValue(this.value, this.schemaProp || {})
			}
		},

		displayValue() {
			const prop = this.schemaProp
			if (prop?.const !== undefined) return prop.const
			const v = this.value
			if (v === null || v === undefined || v === '') return '—'
			return formatValue(v, prop || {})
		},

		formattedDateValue() {
			const v = this.value
			if (!v) return ''
			const fmt = this.schemaProp?.format
			// Same local-midnight parse as datetimeValue to avoid UTC-shift in display.
			if (fmt === 'date' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
				const [year, month, day] = v.split('-').map(Number)
				return new Date(year, month - 1, day).toLocaleDateString()
			}
			const d = new Date(v)
			if (Number.isNaN(d.getTime())) return String(v)
			if (fmt === 'date') return d.toLocaleDateString()
			if (fmt === 'time') return d.toLocaleTimeString()
			return d.toLocaleString()
		},
	},

	beforeDestroy() {
		if (this.pendingColorTimer) {
			clearTimeout(this.pendingColorTimer)
			this.pendingColorTimer = null
		}
	},

	methods: {
		t,

		/** Focus the underlying text input (called by parent after row click) */
		focus() {
			const ref = this.$refs.inputRef
			if (!ref) return
			const el = ref.$el || ref
			const input = el?.querySelector?.('input,textarea')
			if (input) {
				input.focus()
				if (typeof input.select === 'function') input.select()
			}
		},

		emit(newVal) {
			this.$emit('update:value', newVal)
		},

		emitConverted(newVal) {
			const prop = this.schemaProp
			let converted = newVal
			if (prop) {
				switch (prop.type) {
				case 'number':
					converted = newVal === '' ? null : parseFloat(newVal)
					if (Number.isNaN(converted)) converted = null
					break
				case 'integer':
					converted = newVal === '' ? null : parseInt(newVal, 10)
					if (Number.isNaN(converted)) converted = null
					break
				case 'boolean':
					converted = Boolean(newVal)
					break
				default:
					converted = newVal
				}
			}
			this.$emit('update:value', converted)
		},

		/**
		 * Emit a `Date` from NcDateTimePicker as the schema-appropriate string:
		 * `date` → `YYYY-MM-DD`, `time` → `HH:MM:SS`, `date-time` → ISO 8601.
		 * @param {Date|null} date - Date emitted by the picker.
		 */
		emitDatetime(date) {
			if (!date) {
				this.$emit('update:value', null)
				return
			}
			const fmt = this.schemaProp?.format
			if (fmt === 'date') {
				// Use local-time accessors — toISOString() converts to UTC first,
				// which shifts midnight local time to the previous day in UTC+n zones.
				const year = date.getFullYear()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				this.$emit('update:value', `${year}-${month}-${day}`)
				return
			}
			if (fmt === 'time') {
				this.$emit('update:value', date.toTimeString().slice(0, 8))
				return
			}
			this.$emit('update:value', date.toISOString())
		},

		emitObject(jsonString) {
			if (typeof jsonString !== 'string') {
				this.$emit('update:value', jsonString)
				return
			}
			const trimmed = jsonString.trim()
			if (trimmed === '') {
				this.$emit('update:value', null)
				return
			}
			try {
				this.$emit('update:value', JSON.parse(trimmed))
			} catch {
				// Invalid JSON: keep the raw string so the user sees what they typed.
				// CnJsonViewer surfaces a parse error inline; the parent's save path
				// can refuse non-object values if it requires structured data.
				this.$emit('update:value', jsonString)
			}
		},

		emitSelect(selected) {
			const toId = (item) => (item && typeof item === 'object' ? item.id : item)
			if (this.effectiveSelectMultiple) {
				const arr = Array.isArray(selected) ? selected : []
				const itemType = this.schemaProp?.items?.type
				// Coerce taggable input (always emitted as strings) to the
				// declared `items.type`. Drop entries that fail to coerce.
				const coerced = arr
					.map(toId)
					.map((v) => this.coerceItem(v, itemType))
					.filter((v) => v !== undefined)
				this.$emit('update:value', coerced)
				return
			}
			this.$emit('update:value', selected == null ? null : toId(selected))
		},

		/**
		 * Coerce a raw select-emitted value (typically a string from a
		 * taggable NcSelect) into the array's declared `items.type`. Returns
		 * `undefined` for entries that can't be coerced so the caller can drop
		 * them from the array.
		 * @param {*} v - The raw value.
		 * @param {string} [itemType] - Schema `items.type` (string, number, integer, boolean).
		 * @return {*}
		 */
		coerceItem(v, itemType) {
			if (v === null || v === undefined) return v
			// No declared item type — pass through untouched (preserves the
			// shape consumers may have set up via `selectOptions` etc).
			if (!itemType) return v
			// Already the right shape — pass through.
			if (itemType === 'number' && typeof v === 'number') return v
			if (itemType === 'integer' && typeof v === 'number' && Number.isInteger(v)) return v
			if (itemType === 'boolean' && typeof v === 'boolean') return v
			if (itemType === 'string' && typeof v === 'string') return v
			const s = String(v).trim()
			if (s === '') return undefined
			if (itemType === 'number') {
				const n = Number(s)
				return Number.isFinite(n) ? n : undefined
			}
			if (itemType === 'integer') {
				const n = Number(s)
				return Number.isFinite(n) && Number.isInteger(n) ? n : undefined
			}
			if (itemType === 'boolean') {
				if (/^(true|1|yes|on)$/i.test(s)) return true
				if (/^(false|0|no|off)$/i.test(s)) return false
				return undefined
			}
			return s
		},

		/**
		 * Open the sub-dialog to add a new object item or edit an existing
		 * one. `idx === null` means add.
		 * @param {number|null} idx - Index of the item to edit, or `null`.
		 */
		openObjectArrayItem(idx) {
			this.objectArrayDialogIndex = idx
			this.objectArrayDialogItem = idx === null
				? null
				: JSON.parse(JSON.stringify(this.objectArrayItems[idx] || {}))
			this.objectArrayDialogOpen = true
		},

		closeObjectArrayDialog() {
			this.objectArrayDialogOpen = false
			this.objectArrayDialogIndex = null
			this.objectArrayDialogItem = null
		},

		/**
		 * Confirmed object from the sub-dialog. Replace the existing item or
		 * append a new one, then emit the updated array.
		 * @param {object} formData - Form data emitted by CnAdvancedFormDialog.
		 */
		onObjectArrayConfirm(formData) {
			const next = [...this.objectArrayItems]
			if (this.objectArrayDialogIndex === null) {
				next.push(formData)
			} else {
				next.splice(this.objectArrayDialogIndex, 1, formData)
			}
			this.$emit('update:value', next)
			this.closeObjectArrayDialog()
		},

		/**
		 * Remove an item from the object array.
		 * @param {number} idx - Index of the item to remove.
		 */
		removeObjectArrayItem(idx) {
			const next = [...this.objectArrayItems]
			next.splice(idx, 1)
			this.$emit('update:value', next)
		},

		/**
		 * Pick a human-readable label for an item chip. Tries the schema-
		 * declared name field first, then the first non-empty primitive
		 * property, then falls back to "Item N".
		 * @param {object} item - The array item.
		 * @param {number} idx - Index of the item (used for fallback label).
		 * @return {string}
		 */
		objectArrayItemLabel(item, idx) {
			const items = this.schemaProp?.items
			const nameField = items?.objectConfiguration?.objectNameField
				|| items?.configuration?.objectNameField
			if (nameField && item && item[nameField] != null && item[nameField] !== '') {
				return String(item[nameField])
			}
			if (item && typeof item === 'object') {
				for (const v of Object.values(item)) {
					if (v == null || v === '') continue
					if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
						return String(v)
					}
				}
			}
			return t('nextcloud-vue', 'Item {n}', { n: idx + 1 })
		},

		isValidDate(v) {
			if (!v) return false
			const d = new Date(v)
			return d instanceof Date && !Number.isNaN(d.getTime())
		},

		/**
		 * Convert any CSS-recognized color string to a 6-digit hex string by
		 * round-tripping through a detached DOM node. Returns null when the
		 * browser cannot parse the input.
		 * @param {string} cssValue - The CSS color value to convert.
		 * @return {string|null}
		 */
		cssColorToHex(cssValue) {
			try {
				const el = document.createElement('div')
				el.style.color = ''
				el.style.color = cssValue
				if (!el.style.color) return null
				document.body.appendChild(el)
				const rgb = getComputedStyle(el).color
				document.body.removeChild(el)
				const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
				if (!m) return null
				const toHex = (n) => parseInt(n, 10).toString(16).padStart(2, '0')
				return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`
			} catch {
				return null
			}
		},

		/**
		 * Continuous handler for vue-color's `Chrome` picker. Updates the
		 * swatch + text input synchronously via `pendingColor`, but debounces
		 * the upstream `update:value` emit so validation and parent re-renders
		 * don't fire on every drag tick.
		 * @param {object} color - vue-color emitted color object.
		 * @param {string} color.hex - `#rrggbb`.
		 * @param {string} [color.hex8] - `#rrggbbaa`, when alpha is enabled.
		 * @param {object} color.rgba - RGBA components (`r`, `g`, `b`, `a`).
		 * @param {object} color.hsl - HSL components (`h`, `s`, `l`, `a`).
		 * @param {number} [color.a] - Alpha 0–1.
		 */
		onChromeColorInput(color) {
			this.pendingColor = this.chromeColorToFormatValue(color)
			if (this.pendingColorTimer) clearTimeout(this.pendingColorTimer)
			this.pendingColorTimer = setTimeout(() => this.flushPendingColor(), 120)
		},

		/**
		 * Translate vue-color's emitted color object into the schema-declared
		 * color format string.
		 * @param {object} color - vue-color color object.
		 * @return {string}
		 */
		chromeColorToFormatValue(color) {
			const fmt = this.schemaProp?.format || 'color-hex'
			const { rgba, hex, hex8 } = color || {}
			const r = rgba?.r ?? 0
			const g = rgba?.g ?? 0
			const b = rgba?.b ?? 0
			const a = rgba?.a ?? color?.a ?? 1
			if (fmt === 'color-hex' || fmt === 'color') return (hex || '#000000').toLowerCase()
			if (fmt === 'color-hex-alpha') {
				if (hex8) return hex8.toLowerCase()
				const aHex = Math.round(a * 255).toString(16).padStart(2, '0')
				return ((hex || '#000000') + aHex).toLowerCase()
			}
			if (fmt === 'color-rgb') return `rgb(${r}, ${g}, ${b})`
			if (fmt === 'color-rgba') return `rgba(${r}, ${g}, ${b}, ${this.formatAlpha(a)})`
			if (fmt === 'color-hsl' || fmt === 'color-hsla') {
				const { h, s, l } = this.rgbToHsl(r, g, b)
				if (fmt === 'color-hsla') {
					return `hsla(${h}, ${s}%, ${l}%, ${this.formatAlpha(a)})`
				}
				return `hsl(${h}, ${s}%, ${l}%)`
			}
			return hex || '#000000'
		},

		/** Emit the pending color upstream and clear local state. */
		flushPendingColor() {
			if (this.pendingColorTimer) {
				clearTimeout(this.pendingColorTimer)
				this.pendingColorTimer = null
			}
			if (this.pendingColor === null) return
			const out = this.pendingColor
			this.pendingColor = null
			this.$emit('update:value', out)
		},

		/**
		 * Manual text-field edit for a color value. Cancels any in-flight
		 * picker debounce so the typed value isn't immediately overwritten.
		 * @param {string} v - The new text value.
		 */
		onColorTextInput(v) {
			if (this.pendingColorTimer) {
				clearTimeout(this.pendingColorTimer)
				this.pendingColorTimer = null
			}
			this.pendingColor = null
			this.$emit('update:value', v)
		},

		/**
		 * Format an alpha 0–1 for CSS output (max 2 decimals, drops trailing zeros).
		 * @param {number} a - Alpha in 0–1 range.
		 * @return {string}
		 */
		formatAlpha(a) {
			return Number.isInteger(a) ? String(a) : a.toFixed(2).replace(/\.?0+$/, '') || '0'
		},

		rgbToHsl(r, g, b) {
			const rN = r / 255
			const gN = g / 255
			const bN = b / 255
			const max = Math.max(rN, gN, bN)
			const min = Math.min(rN, gN, bN)
			const l = (max + min) / 2
			let h = 0
			let s = 0
			if (max !== min) {
				const d = max - min
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
				switch (max) {
				case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break
				case gN: h = (bN - rN) / d + 2; break
				case bN: h = (rN - gN) / d + 4; break
				}
				h /= 6
			}
			return {
				h: Math.round(h * 360),
				s: Math.round(s * 100),
				l: Math.round(l * 100),
			}
		},
	},
}
</script>

<style scoped>
.cn-advanced-form-dialog__value-input-container {
	width: 100%;
	min-width: 0;
}

.cn-advanced-form-dialog__value-input-container :deep(.text-field) {
	margin: 0;
	padding: 0;
}

.cn-advanced-form-dialog__boolean-input-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-advanced-form-dialog__array-input-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-advanced-form-dialog__array-input-row > :first-child {
	flex: 1;
}

/* patch extreme size in field */
.cn-advanced-form-dialog__boolean-input-row__input > span {
	padding-left: 0;
	padding-block: 0;
}
.cn-advanced-form-dialog__boolean-input-row__input > input {
	margin: 0;
}

.cn-advanced-form-dialog__info-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	cursor: help;
}

.cn-advanced-form-dialog__json-value {
	max-height: 200px;
	overflow-y: auto;
	white-space: pre-wrap;
	font-family: monospace;
	font-size: 12px;
	background: var(--color-background-dark);
	padding: 8px;
	border-radius: 4px;
	margin: 0;
}

/* Textarea: keep it inside the table cell instead of overflowing.
   NcTextArea's wrapper has a fixed height (`calc(var(--default-clickable-area) * 2)`)
   that ignores the `rows` attribute, which causes the textarea to render with a
   too-small viewport. Let the wrapper grow with its content instead. */
.cn-advanced-form-dialog__textarea {
	width: 100%;
	box-sizing: border-box;
}

.cn-advanced-form-dialog__textarea :deep(.textarea__main-wrapper) {
	height: auto;
	min-height: var(--default-clickable-area);
}

.cn-advanced-form-dialog__textarea :deep(textarea) {
	width: 100%;
	max-width: 100%;
	box-sizing: border-box;
	resize: vertical;
	min-height: 80px;
	max-height: 240px;
	display: block;
}

/* Color widget: clickable swatch (native picker) + visible text input */
.cn-advanced-form-dialog__color-input-row {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
}

.cn-advanced-form-dialog__color-input-row > :last-child {
	flex: 1;
	min-width: 0;
}

.cn-advanced-form-dialog__color-swatch {
	--cn-color-swatch-checker:
		linear-gradient(45deg, var(--color-background-dark) 25%, transparent 25%),
		linear-gradient(-45deg, var(--color-background-dark) 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, var(--color-background-dark) 75%),
		linear-gradient(-45deg, transparent 75%, var(--color-background-dark) 75%);
	display: inline-block;
	width: 32px;
	height: 32px;
	flex-shrink: 0;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background-image: var(--cn-color-swatch-checker);
	background-size: 8px 8px;
	background-position: 0 0, 0 4px, 4px -4px, -4px 0;
	overflow: hidden;
	position: relative;
}

.cn-advanced-form-dialog__color-swatch:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-advanced-form-dialog__color-swatch--readonly {
	cursor: default;
	width: 20px;
	height: 20px;
	vertical-align: middle;
	margin-inline-end: 6px;
}

.cn-advanced-form-dialog__color-display {
	display: inline-flex;
	align-items: center;
}

/* Help text & inline validation under the input */
.cn-advanced-form-dialog__field-help {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-top: 4px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-advanced-form-dialog__field-example {
	font-style: italic;
}

.cn-advanced-form-dialog__field-error {
	margin-top: 4px;
	font-size: 0.85em;
	color: var(--color-error-text);
}

.cn-advanced-form-dialog__value-cell-wrapper {
	display: flex;
	flex-direction: column;
	width: 100%;
}

/* Object-array widget: chip list + add button */
.cn-advanced-form-dialog__object-array {
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
}

.cn-advanced-form-dialog__object-array-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.cn-advanced-form-dialog__object-array-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 4px 2px 10px;
	background: var(--color-background-dark);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-pill, 14px);
	color: var(--color-main-text);
	cursor: pointer;
	font: inherit;
	max-width: 240px;
}

.cn-advanced-form-dialog__object-array-chip:hover {
	background: var(--color-background-hover);
}

.cn-advanced-form-dialog__object-array-chip-label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-advanced-form-dialog__object-array-chip-remove {
	flex-shrink: 0;
}

.cn-advanced-form-dialog__object-array-add {
	align-self: flex-start;
}
</style>

<template>
	<span class="cn-cell-renderer" :class="cellClass">
		<!-- Consumer-registered cell widget (cnCellWidgets[column.widget]) -->
		<component
			:is="widgetComponent"
			v-if="widgetComponent"
			:value="value"
			:row="row"
			:property="property"
			:formatted="formattedValue"
			v-bind="widgetProps" />

		<!-- Built-in "badge" widget — renders the (possibly formatter-shaped) value as a status pill -->
		<template v-else-if="widget === 'badge'">
			<CnStatusBadge v-if="hasValue"
				:label="String(formattedValue)"
				:variant="badgeVariant"
				:color-map="badgeColorMap" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Built-in "fkResolve" widget — resolves a reference uuid to the related
		     object's display label via the object store (per-schema caching).
		     Config: widgetProps { register, schema, labelField }. -->
		<template v-else-if="widget === 'fkResolve'">
			<CnFkResolveCell
				v-if="hasValue"
				:value="value"
				:register="(widgetProps && widgetProps.register) || ''"
				:schema="(widgetProps && widgetProps.schema) || ''"
				:label-field="(widgetProps && widgetProps.labelField) || 'name'" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Built-in "link" widget — renders the (possibly formatter-shaped) value
		     as a router-link (when widgetProps.route is a manifest page id) or an
		     external anchor (when widgetProps.href is set). Falls back to plain
		     text + a once-per-session console.warn when neither resolves. -->
		<template v-else-if="widget === 'link'">
			<router-link
				v-if="linkRoute"
				:to="linkRoute"
				class="cn-cell-renderer__link">
				{{ formattedValue }}
			</router-link>
			<a
				v-else-if="linkHref"
				:href="linkHref"
				target="_blank"
				rel="noopener"
				class="cn-cell-renderer__link">
				{{ formattedValue }}
			</a>
			<span v-else :title="rawTitle">{{ formattedValue }}</span>
		</template>

		<!-- Explicit column formatter — overrides the type-aware paths below -->
		<template v-else-if="hasFormatter">
			<span :title="rawTitle">{{ formattedValue }}</span>
		</template>

		<!-- Declarative swatch — a colour dot (from a sibling row field) + text -->
		<template v-else-if="isSwatch">
			<span class="cn-cell-renderer__swatch-wrap">
				<span
					v-if="swatchColor"
					class="cn-cell-renderer__swatch-dot"
					:style="{ backgroundColor: swatchColor }"
					aria-hidden="true" />
				<span v-if="hasValue" :title="rawTitle">{{ formattedValue }}</span>
				<span v-else class="cn-cell-renderer__dash">—</span>
			</span>
		</template>

		<!-- Declarative built-in format (currency / duration / number / percent) -->
		<template v-else-if="hasBuiltinFormat">
			<span :title="rawTitle" class="cn-cell-renderer--number">{{ formattedValue }}</span>
		</template>

		<!-- Date / date-time: dynamic NcDateTime (relative time, absolute on hover) -->
		<template v-else-if="isDate">
			<NcDateTime v-if="dateTimestamp" :timestamp="dateTimestamp" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- URI / URL: external link -->
		<template v-else-if="isUri">
			<a
				v-if="uriHref"
				:href="uriHref"
				target="_blank"
				rel="noopener"
				class="cn-cell-renderer__link">
				{{ formattedValue }}
			</a>
			<span v-else-if="hasValue" :title="rawTitle">{{ formattedValue }}</span>
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Boolean: icon -->
		<template v-else-if="propertyType === 'boolean'">
			<CheckBold v-if="value" :size="16" class="cn-cell-renderer__icon cn-cell-renderer__icon--success" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Enum: status badge (auto-coloured from the property's optional colorMap) -->
		<template v-else-if="isEnum">
			<CnStatusBadge v-if="value" :label="String(value)" :color-map="enumColorMap" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Array: comma-joined or count -->
		<template v-else-if="propertyType === 'array'">
			<span v-if="!value || !value.length" class="cn-cell-renderer__dash">—</span>
			<span v-else :title="Array.isArray(value) ? value.join(', ') : ''">
				{{ formattedValue }}
			</span>
		</template>

		<!-- Default: formatted text -->
		<template v-else>
			<span :title="rawTitle">{{ formattedValue }}</span>
		</template>
	</span>
</template>

<script>
import { NcDateTime } from '@nextcloud/vue'
import CheckBold from 'vue-material-design-icons/CheckBold.vue'
import { safeHref } from '../../utils/safeHref.js'
import { formatValue } from '../../utils/schema.js'
import { safeCurrencyCode } from '../../utils/formatMetric.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'
import CnFkResolveCell from '../CnFkResolveCell/CnFkResolveCell.vue'

/**
 * Module-level set of column keys already warned about for a
 * `widget:"link"` declaration with no resolvable target — guarantees
 * one warning per (page, column-key) rather than per row × render.
 */
const WARNED_LINK_KEYS = new Set()

/**
 * CnCellRenderer — Type-aware cell renderer for schema-driven tables.
 *
 * Renders a single cell value based on its schema property definition.
 * Booleans render as icons, enums as status badges, dates as formatted strings,
 * and everything else as truncated text via `formatValue()`.
 *
 * ```vue
 * <CnCellRenderer :value="row.status" :property="schema.properties.status" />
 * ```
 */
export default {
	name: 'CnCellRenderer',

	components: {
		CnStatusBadge,
		CnFkResolveCell,
		CheckBold,
		NcDateTime,
	},

	inject: {
		/**
		 * Cell-formatter registry, provided by CnAppRoot (`cnFormatters`).
		 * Map of formatter-id → `(value, row, property) => string|number`.
		 * Defaults to an empty object so standalone use (no CnAppRoot
		 * ancestor) is unaffected.
		 */
		cnFormatters: { default: () => ({}) },
		/**
		 * Cell-widget registry, provided by CnAppRoot (`cnCellWidgets`).
		 * Map of widget-id → Vue component. Resolves a column's `widget` id;
		 * the built-in `"badge"` is handled inline (no registry entry needed).
		 * Defaults to an empty object.
		 */
		cnCellWidgets: { default: () => ({}) },
	},

	props: {
		/** The raw cell value */
		value: {
			type: [String, Number, Boolean, Array, Object],
			default: null,
		},
		/** Schema property definition: { type, format, enum, items, title } */
		property: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Optional cell-formatter id (e.g. `currency`, `automationTrigger`).
		 * When set and resolvable in the injected `cnFormatters` registry,
		 * the cell renders `cnFormatters[formatter](value, row, property,
		 * formatterOptions)` as text — an explicit override of the type-aware
		 * rendering below.
		 */
		formatter: {
			type: String,
			default: null,
		},
		/**
		 * Declarative options map passed as the formatter's fourth argument
		 * (e.g. `{ currency: 'USD' }` for the built-in `currency` formatter,
		 * or `{ negative, zero, positive }` phrases for `conditionalPhrase`).
		 * Undefined-safe: three-argument formatters simply ignore it.
		 */
		formatterOptions: {
			type: Object,
			default: null,
		},
		/**
		 * Optional cell-widget id (e.g. `badge`, or a consumer-registered
		 * name). When it resolves in `cnCellWidgets` the cell renders that
		 * component with `{ value, row, property, formatted, ...widgetProps }`;
		 * the built-in id `"badge"` renders `CnStatusBadge` and the built-in
		 * id `"fkResolve"` renders `CnFkResolveCell` (uuid → related object
		 * label, config via `widgetProps { register, schema, labelField }`).
		 * Takes precedence over `formatter`/the type-aware rendering, but the
		 * value handed to the widget is the formatter-shaped `formatted` when
		 * `formatter` is also set.
		 */
		widget: {
			type: String,
			default: null,
		},
		/** Extra props spread onto the resolved cell-widget component. */
		widgetProps: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Optional declarative cell-format spec — a no-code alternative to a
		 * registry `formatter`. Recognised `style` values:
		 *
		 * - `'currency'` → `Intl.NumberFormat` currency (e.g. `€ 1.234,56`),
		 *   honouring `currency` (ISO code, default `'EUR'`) and `decimals`
		 *   (default 2).
		 * - `'number'` / `'percent'` → localized number (percent appends `%`),
		 *   honouring `decimals` (default 0).
		 * - `'duration'` → a seconds value rendered compact (`1u 23m`, `45m 10s`,
		 *   `12s`); pass `unit: 'minutes'` / `'hours'` when the raw value is not
		 *   in seconds.
		 * - `'swatch'` → a colour dot read from a sibling row field named by
		 *   `colorField` (the value renders as the cell text beside it).
		 *
		 * `prefix` / `suffix` are prepended/appended to the numeric styles.
		 * Resolved AFTER `formatter` / `widget` (those win), but BEFORE the
		 * type-aware rendering, so a manifest column can opt into currency or a
		 * colour swatch without registering a function.
		 * @type {{style?: 'currency'|'number'|'percent'|'duration'|'swatch', currency?: string, decimals?: number, unit?: 'seconds'|'minutes'|'hours', prefix?: string, suffix?: string, colorField?: string}}
		 */
		format: {
			type: Object,
			default: null,
		},
		/**
		 * The full row object — passed so a formatter can be a function of
		 * the whole record (e.g. "days since `@self.updated`"), not just
		 * this one cell value.
		 */
		row: {
			type: Object,
			default: () => ({}),
		},
		/** Maximum string length before truncation */
		truncate: {
			type: Number,
			default: 100,
		},
		/**
		 * Row identifier field — used by the built-in `widget:"link"` when
		 * the manifest doesn't specify an explicit `widgetProps.params`
		 * map. Defaults to `'id'` so router-link param resolution works
		 * with the manifest convention (`/x/:id`).
		 */
		rowKey: {
			type: String,
			default: 'id',
		},
	},

	computed: {
		propertyType() {
			return this.property?.type || (typeof this.value)
		},

		isEnum() {
			return !!(this.property?.enum && this.property.enum.length > 0)
		},

		/** True when the property is a date / date-time (rendered via NcDateTime). */
		isDate() {
			return this.property?.format === 'date-time' || this.property?.format === 'date'
		},

		/**
		 * The cell value as a Date for NcDateTime, or `null` when absent or
		 * unparseable (the cell then falls back to a dash / plain text).
		 *
		 * @return {Date|null}
		 */
		dateTimestamp() {
			if (!this.hasValue) return null
			const date = new Date(this.value)
			return Number.isNaN(date.getTime()) ? null : date
		},

		/** True when the property is a URI / URL (rendered as an external link). */
		isUri() {
			return this.property?.format === 'uri' || this.property?.format === 'url'
		},

		/**
		 * Safe external href for a URI/URL cell, or `null` when the value is
		 * absent or fails `safeHref` validation (e.g. an unsafe scheme).
		 *
		 * @return {string|null}
		 */
		uriHref() {
			if (!this.hasValue) return null
			return safeHref(String(this.value))
		},

		/** True when the cell has a renderable value (not null/undefined/empty string). */
		hasValue() {
			return this.value !== null && this.value !== undefined && this.value !== ''
		},

		/**
		 * Resolved cell-widget component for this column, or `null`. A column's
		 * `widget` id resolves against the injected `cnCellWidgets` registry;
		 * the built-in `"badge"` is NOT resolved here (handled inline in the
		 * template) so apps can still override `"badge"` via the registry.
		 *
		 * @return {object|Function|null}
		 */
		widgetComponent() {
			if (!this.widget) return null
			const c = this.cnCellWidgets && this.cnCellWidgets[this.widget]
			return c || null
		},

		/** Variant for the built-in `badge` widget — `widgetProps.variant` or `'default'`. */
		badgeVariant() {
			return (this.widgetProps && this.widgetProps.variant) || 'default'
		},

		/**
		 * Color map for the built-in `badge` widget — `widgetProps.colorMap`,
		 * a `{ value: variant }` map (e.g. `{ placed: 'primary', delivered: 'success' }`)
		 * that CnStatusBadge resolves per label. Null when unset (falls back to
		 * `badgeVariant`). Lets a manifest colour a status column without code.
		 *
		 * @return {object|null}
		 */
		badgeColorMap() {
			return (this.widgetProps && this.widgetProps.colorMap) || null
		},

		/**
		 * Color map for the auto-rendered enum badge — read from the schema
		 * property's optional `colorMap` (or `x-color-map`). Null when unset, so
		 * enum cells stay the default grey unless the schema opts into colours.
		 *
		 * @return {object|null}
		 */
		enumColorMap() {
			return (this.property && (this.property.colorMap || this.property['x-color-map'])) || null
		},

		/**
		 * Resolved router-link target for the built-in `widget:"link"`. When
		 * `widgetProps.route` is set (a manifest page id), returns
		 * `{ name: route, params }`. Param map is `widgetProps.params`
		 * (a map of route-param-name → row-field-name); when omitted,
		 * defaults to `{ id: row[rowKey] }`. Returns null when `route`
		 * isn't set (the template falls through to `linkHref` or plain
		 * text).
		 *
		 * @return {object|null}
		 */
		linkRoute() {
			if (this.widget !== 'link') return null
			const route = this.widgetProps && this.widgetProps.route
			if (!route) return null
			const paramMap = (this.widgetProps && this.widgetProps.params)
				|| { id: this.rowKey || 'id' }
			const params = {}
			for (const [routeParam, rowField] of Object.entries(paramMap)) {
				params[routeParam] = this.row && this.row[rowField]
			}
			return { name: route, params }
		},

		/**
		 * Resolved external href for the built-in `widget:"link"` when
		 * `widgetProps.href` is set. `{key}` placeholders in the href
		 * are substituted from the row (`"/x/{id}"` + `row.id === "42"`
		 * → `"/x/42"`). The final computed value is validated with
		 * `safeHref` so row-injected values cannot introduce unsafe
		 * schemes. Returns null when `href` isn't set.
		 *
		 * @return {string|null}
		 */
		linkHref() {
			if (this.widget !== 'link') return null
			const href = this.widgetProps && this.widgetProps.href
			if (!href) return null
			return String(href).replace(/\{(\w+)\}/g, (_, key) =>
				this.row && this.row[key] != null ? String(this.row[key]) : '',
			)
		},

		/**
		 * Resolved formatter function for this cell, or `null`. A column's
		 * `formatter` id resolves against the injected `cnFormatters` registry.
		 *
		 * @return {Function|null}
		 */
		formatterFn() {
			const fn = this.formatter && this.cnFormatters && this.cnFormatters[this.formatter]
			return typeof fn === 'function' ? fn : null
		},

		/** True when an explicit formatter is in play for this cell. */
		hasFormatter() {
			return this.formatterFn !== null
		},

		/**
		 * The declarative format `style`, or null when no (recognised) `format`
		 * spec is set. Drives the built-in currency / duration / number / percent
		 * / swatch rendering paths.
		 *
		 * @return {string|null}
		 */
		formatStyle() {
			const s = this.format && this.format.style
			return typeof s === 'string' ? s : null
		},

		/** True when a built-in NUMERIC format (currency/number/percent/duration) applies. */
		hasBuiltinFormat() {
			return ['currency', 'number', 'percent', 'duration'].includes(this.formatStyle)
		},

		/** True when this cell renders as a colour swatch (`format.style:"swatch"`). */
		isSwatch() {
			return this.formatStyle === 'swatch'
		},

		/**
		 * The swatch colour — read from the sibling row field named by
		 * `format.colorField` (default `'color'`). Returns null when no usable
		 * colour string is present (the dot is then omitted).
		 *
		 * @return {string|null}
		 */
		swatchColor() {
			if (!this.isSwatch) return null
			const field = (this.format && this.format.colorField) || 'color'
			const c = this.row && this.row[field]
			return (typeof c === 'string' && c.trim() !== '') ? c : null
		},

		formattedValue() {
			if (this.formatterFn) {
				try {
					return this.formatterFn(this.value, this.row, this.property, this.formatterOptions || undefined)
				} catch (e) {
					// eslint-disable-next-line no-console
					console.warn(`[CnCellRenderer] formatter "${this.formatter}" threw; falling back`, e)
				}
			}
			if (this.hasBuiltinFormat) {
				return this.applyBuiltinFormat()
			}
			return formatValue(this.value, this.property, { truncate: this.truncate })
		},

		rawTitle() {
			// Show full value on hover if it was truncated
			const raw = this.value
			if (typeof raw === 'string' && raw.length > this.truncate) {
				return raw
			}
			return undefined
		},

		cellClass() {
			const classes = []
			if (this.propertyType === 'boolean') classes.push('cn-cell-renderer--boolean')
			if (this.isEnum) classes.push('cn-cell-renderer--enum')
			if (this.property?.format === 'date-time' || this.property?.format === 'date') {
				classes.push('cn-cell-renderer--date')
			}
			if (this.property?.format === 'uuid') classes.push('cn-cell-renderer--uuid')
			if (this.propertyType === 'integer' || this.propertyType === 'number') {
				classes.push('cn-cell-renderer--number')
			}
			return classes
		},
	},

	mounted() {
		// Warn once per column-property-name when `widget:"link"` resolves
		// to neither a `route` nor an `href` — silent fallback hides
		// manifest mistakes, an every-row warn is too noisy.
		if (
			this.widget === 'link'
			&& !this.linkRoute
			&& !this.linkHref
			&& this.widgetProps?.fallback !== 'silent'
		) {
			const key = this.property?.title || String(this.value).slice(0, 20)
			if (!WARNED_LINK_KEYS.has(key)) {
				WARNED_LINK_KEYS.add(key)
				// eslint-disable-next-line no-console
				console.warn(
					`[CnCellRenderer] widget:"link" on "${key}" has no resolvable target — set widgetProps.route (page id) or widgetProps.href (URL with optional {field} placeholders); cell falls back to plain text.`,
				)
			}
		}
	},

	methods: {
		/**
		 * Render the cell value per the declarative `format` spec (currency /
		 * number / percent / duration). Mirrors CnStatWidget's formatting so a
		 * KPI tile and a table column read identically. Non-numeric values fall
		 * back to `formatValue`; an empty value renders an em-dash.
		 *
		 * @return {string}
		 */
		applyBuiltinFormat() {
			if (!this.hasValue) return '—'
			const fmt = this.format || {}
			if (fmt.style === 'duration') return this.formatDuration()
			const num = Number(this.value)
			if (!Number.isFinite(num)) {
				return formatValue(this.value, this.property, { truncate: this.truncate })
			}
			const decimals = Number.isFinite(fmt.decimals)
				? fmt.decimals
				: (fmt.style === 'currency' ? 2 : 0)
			let body
			if (fmt.style === 'currency') {
				body = new Intl.NumberFormat(undefined, {
					style: 'currency',
					currency: safeCurrencyCode(fmt.currency),
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals,
				}).format(num)
			} else if (fmt.style === 'percent') {
				// Values are stored as the literal percent (83.3), not a 0–1 ratio.
				body = new Intl.NumberFormat(undefined, {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals,
				}).format(num) + '%'
			} else {
				body = new Intl.NumberFormat(undefined, {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals,
				}).format(num)
			}
			return `${fmt.prefix || ''}${body}${fmt.suffix || ''}`
		},
		/**
		 * Render a numeric duration compactly (`1u 23m`, `45m 10s`, `12s`). The
		 * raw value is seconds unless `format.unit` is `'minutes'` / `'hours'`.
		 * The hour suffix is `u` (uur) to read naturally under NL theming while
		 * staying digit-led for other locales.
		 *
		 * @return {string}
		 */
		formatDuration() {
			const fmt = this.format || {}
			let secs = Number(this.value)
			if (!Number.isFinite(secs)) {
				return formatValue(this.value, this.property, { truncate: this.truncate })
			}
			if (fmt.unit === 'minutes') secs *= 60
			else if (fmt.unit === 'hours') secs *= 3600
			secs = Math.round(secs)
			const sign = secs < 0 ? '-' : ''
			secs = Math.abs(secs)
			const h = Math.floor(secs / 3600)
			const m = Math.floor((secs % 3600) / 60)
			const s = secs % 60
			const parts = []
			if (h > 0) parts.push(`${h}u`)
			if (m > 0) parts.push(`${m}m`)
			if (s > 0 && h === 0) parts.push(`${s}s`)
			if (parts.length === 0) parts.push('0s')
			return `${fmt.prefix || ''}${sign}${parts.join(' ')}${fmt.suffix || ''}`
		},
	},
}
</script>

<style scoped>
.cn-cell-renderer--uuid {
	font-family: monospace;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer--number {
	font-variant-numeric: tabular-nums;
}

.cn-cell-renderer--date {
	white-space: nowrap;
}

.cn-cell-renderer__dash {
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer__icon--success {
	color: var(--color-success);
}

.cn-cell-renderer__swatch-wrap {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.cn-cell-renderer__swatch-dot {
	display: inline-block;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	flex-shrink: 0;
	border: 1px solid var(--color-border-dark);
}
</style>

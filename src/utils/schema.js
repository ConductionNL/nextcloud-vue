/**
 * Schema utility functions for auto-generating table columns, cell formatting,
 * form field definitions, and faceted filter definitions from OpenRegister
 * schema property definitions.
 *
 * @module utils/schema
 */

/**
 * Default column widths per property type/format.
 */
const DEFAULT_WIDTHS = {
	boolean: '80px',
	integer: '100px',
	number: '100px',
	'string:uuid': '140px',
	'string:date-time': '180px',
	'string:email': '200px',
}

/**
 * Get default width for a property type + format combination.
 *
 * @param {string} type Property type
 * @param {string} [format] Property format
 * @return {string|undefined} CSS width or undefined
 */
function getDefaultWidth(type, format) {
	if (format) {
		return DEFAULT_WIDTHS[`${type}:${format}`]
	}
	return DEFAULT_WIDTHS[type]
}

/**
 * Generate CnDataTable column definitions from a schema's properties.
 *
 * Reads `schema.properties` and creates column objects sorted by the `order`
 * hint (if present) then alphabetically. Filters out properties marked
 * `visible: false`. Supports include/exclude lists and per-column overrides.
 *
 * @param {object} schema The schema object with a `properties` field
 * @param {object} [options] Configuration options
 * @param {string[]} [options.exclude] Property keys to exclude
 * @param {string[]} [options.include] Property keys to include (whitelist mode)
 * @param {object} [options.overrides] Per-key column overrides, e.g. `{ status: { width: '200px' } }`
 * @param {(text: string) => string} [options.translate] Optional display-layer translation function applied to each column label. Schema property titles are authored in English as the canonical source; consumers pass their bound `t()` (via the injected `cnTranslate`) so the visible header follows the user's language. When omitted, the label is the English source string unchanged (pure, backward-compatible).
 * @return {Array<{key: string, label: string, sortable: boolean, type: string, format: string, width: string}>}
 */
export function columnsFromSchema(schema, options = {}) {
	const { exclude = [], include = null, overrides = {}, translate } = options
	const tr = typeof translate === 'function' ? translate : (text) => text

	if (!schema || !schema.properties) {
		return []
	}

	const entries = Object.entries(schema.properties)
		.filter(([key, prop]) => {
			// Skip properties marked as not visible
			if (prop.visible === false) return false
			// Apply exclude list
			if (exclude.includes(key)) return false
			// Apply include whitelist
			if (include && !include.includes(key)) return false
			// Skip complex object types by default (they don't render well in tables)
			if (prop.type === 'object') return false
			return true
		})
		.sort(([keyA, propA], [keyB, propB]) => {
			// Sort by order hint first, then alphabetically
			const orderA = typeof propA.order === 'number' ? propA.order : Infinity
			const orderB = typeof propB.order === 'number' ? propB.order : Infinity
			if (orderA !== orderB) return orderA - orderB
			return keyA.localeCompare(keyB)
		})

	return entries.map(([key, prop]) => {
		const column = {
			key,
			label: tr(prop.title || key),
			// The schema already explains what the property MEANS; carrying that
			// through as the header tooltip means a column like "Maturity" or a
			// computed score explains itself in place, instead of the description
			// living only in the schema editor where no reader of the table looks.
			description: prop.description ? tr(prop.description) : '',
			sortable: true,
			type: prop.type || 'string',
			format: prop.format || null,
		}

		// Apply default width
		const defaultWidth = getDefaultWidth(column.type, column.format)
		if (defaultWidth) {
			column.width = defaultWidth
		}

		// Store enum values for cell renderer
		if (prop.enum) {
			column.enum = prop.enum
		}

		// Store items type for arrays
		if (prop.items) {
			column.items = prop.items
		}

		// Apply per-column overrides
		if (overrides[key]) {
			Object.assign(column, overrides[key])
		}

		return column
	})
}

/**
 * Format a cell value based on its schema property definition.
 *
 * Handles dates, booleans, arrays, numbers, UUIDs, emails, and markdown.
 * Returns a plain string suitable for display in a table cell.
 *
 * @param {*} value The raw value
 * @param {object} [property] The schema property definition `{ type, format, enum, items }`
 * @param {object} [options] Formatting options
 * @param {number} [options.truncate] Maximum string length before truncation
 * @return {string} Formatted display string
 */
export function formatValue(value, property = {}, options = {}) {
	const { truncate = 100 } = options

	// Null/undefined/empty
	if (value === null || value === undefined || value === '') {
		return '—'
	}

	const { type = 'string', format } = property

	// Boolean
	if (type === 'boolean' || typeof value === 'boolean') {
		return value ? '✓' : '—'
	}

	// Number/Integer
	if (type === 'integer' || type === 'number') {
		const num = Number(value)
		if (Number.isNaN(num)) return String(value)
		return num.toLocaleString()
	}

	// Array
	if (type === 'array' || Array.isArray(value)) {
		if (!Array.isArray(value)) return String(value)
		if (value.length === 0) return '—'
		// Stringify each entry so an array of OBJECTS never collapses to the
		// useless "[object Object]" that `Array.prototype.join` produces — a
		// nested object renders as compact JSON instead (ADR-062: a value cell
		// must never show "[object Object]"). Rich array rendering (inline
		// tables / chips) lives in CnObjectDataWidget; this is the flat-string
		// fallback used by tables and truncated cells.
		const parts = value.map((v) => {
			if (v !== null && typeof v === 'object') {
				try {
					return JSON.stringify(v)
				} catch {
					return '[Object]'
				}
			}
			return String(v)
		})
		// For short arrays, join values
		if (parts.length <= 3) {
			return parts.join(', ')
		}
		return `${parts.slice(0, 3).join(', ')} +${parts.length - 3}`
	}

	// Object — render as JSON; tables truncate, multi-line value cells wrap with `<pre>`.
	if (type === 'object' || (typeof value === 'object' && value !== null)) {
		try {
			return truncateString(JSON.stringify(value, null, 2), truncate)
		} catch {
			return '[Object]'
		}
	}

	// String types
	const str = String(value)

	// Date-time
	if (format === 'date-time' || format === 'date') {
		try {
			const date = new Date(str)
			if (Number.isNaN(date.getTime())) return str
			if (format === 'date') {
				return date.toLocaleDateString(undefined, {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
			}
			return date.toLocaleDateString(undefined, {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			}) + ', ' + date.toLocaleTimeString(undefined, {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			})
		} catch {
			return str
		}
	}

	// UUID — truncate to first 8 chars
	if (format === 'uuid') {
		if (str.length > 8) {
			return str.substring(0, 8) + '...'
		}
		return str
	}

	// URI — show truncated
	if (format === 'uri' || format === 'url') {
		try {
			const url = new URL(str)
			return url.hostname + url.pathname.substring(0, 20)
		} catch {
			return truncateString(str, truncate)
		}
	}

	// Markdown — strip formatting
	if (format === 'markdown') {
		const stripped = str
			.replace(/#{1,6}\s+/g, '') // headings
			.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // bold/italic
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
			.replace(/`{1,3}[^`]*`{1,3}/g, '') // code
			.replace(/\n+/g, ' ') // newlines
			.trim()
		return truncateString(stripped, truncate)
	}

	// Email — display as-is (no truncation)
	if (format === 'email') {
		return str
	}

	// Plain string — truncate if needed
	return truncateString(str, truncate)
}

/**
 * Truncate a string to the given length, adding ellipsis if needed.
 *
 * @param {string} str The string to truncate
 * @param {number} maxLength Maximum length
 * @return {string} Truncated string
 */
function truncateString(str, maxLength) {
	if (str.length <= maxLength) return str
	return str.substring(0, maxLength) + '...'
}

/**
 * Resolve the form widget type for a JSON Schema property.
 *
 * Resolution priority (first match wins):
 * 1. Explicit `prop.widget` — pass-through custom widget name
 * 2. `prop.enum` → `'select'`
 * 3. OpenRegister object reference: `prop.$ref` (a string schema slug) →
 *    `'select'`; `array` + `items.$ref` → `'multiselect'`. The consuming
 *    surface (CnFormDialog) resolves the reference to a searchable dropdown
 *    of the referenced objects (label = human name, value = UUID).
 * 4. Nextcloud user reference: `referenceType: 'nextcloud-user'` (or
 *    `format: 'user'`/`'username'`) → `'user'`; an array of such
 *    properties → `'user-multiselect'`. CnFormDialog resolves these to a
 *    searchable dropdown of real Nextcloud users (label = display name,
 *    value = UID).
 * 5. Type-based: `boolean` → `'checkbox'`, `integer`/`number` → `'number'`,
 *    `array` + `items.enum` → `'multiselect'`, `array` → `'tags'`
 * 6. Format-based: `date-time` → `'datetime'`, `date` → `'date'`,
 *    `email` → `'email'`, `uri`/`url` → `'url'`,
 *    `markdown`/`textarea` → `'textarea'`
 * 7. Long text: `maxLength > 255` → `'textarea'`
 * 8. Fallback → `'text'`
 *
 * @param {object} prop The schema property definition (type, format, enum, widget, items, maxLength)
 * @return {string} Widget identifier: 'text'|'email'|'url'|'number'|'checkbox'|'select'|'multiselect'|'user'|'user-multiselect'|'tags'|'textarea'|'date'|'datetime' or a custom string
 */
/**
 * Normalise a JSON-Schema `$ref` value into an OpenRegister schema reference
 * identifier. OpenRegister authors a `$ref` as a schema *slug* (string) but
 * persists/serves it as the numeric schema *id* (e.g. `85`). Both forms are
 * valid object-reference targets (the objects API resolves either).
 *
 * The schema editor writes the JSON-Pointer form — `#/components/schemas/<slug>`
 * — so a `$ref` reaching here may be a pointer rather than a bare slug. Passing
 * the whole pointer through as the schema identifier made the object picker query
 * a schema literally named "#/components/schemas/cow", which matches nothing: the
 * dropdown rendered but came back empty. Take the tail after the last `/`, which
 * is what the editor itself does when it resolves a $ref back to a schema.
 *
 * @param {*} ref A `$ref` value (`prop.$ref` or `prop.items.$ref`).
 * @return {string|number|null} The reference identifier, or null.
 */
function normalizeRef(ref) {
	if (typeof ref === 'string' && ref !== '') {
		const tail = ref.includes('/') ? ref.substring(ref.lastIndexOf('/') + 1) : ref
		return tail !== '' ? tail : null
	}
	if (typeof ref === 'number' && !Number.isNaN(ref)) return ref
	return null
}

/**
 * Whether a (single-value) schema property represents a Nextcloud user.
 *
 * A property is a user field when it declares `referenceType: 'nextcloud-user'`
 * (preferred) OR `format: 'user'` / `format: 'username'`. The consuming surface
 * (CnFormDialog) renders such a property as a searchable dropdown of real
 * Nextcloud users (label = display name, value = UID) instead of a free-text box.
 *
 * @param {object} prop A schema property definition (or `items` for an array).
 * @return {boolean} True when the property marks a Nextcloud user.
 */
function isUserProp(prop) {
	if (!prop || typeof prop !== 'object') return false
	if (prop.referenceType === 'nextcloud-user') return true
	const format = prop.format || ''
	return format === 'user' || format === 'username'
}

function resolveWidget(prop) {
	// Explicit widget hint takes priority
	if (prop.widget) return prop.widget

	// Enum → select
	if (prop.enum) return 'select'

	const type = prop.type || 'string'
	const format = prop.format || ''

	// OpenRegister object reference (`$ref` is a schema slug or numeric id) →
	// a searchable dropdown of the referenced objects. An array of
	// references (`items.$ref`) → a multi-select. Checked before the
	// plain type/format fallback so a `{ type: 'string', format: 'uuid',
	// $ref: '<slug-or-id>' }` property renders as a dropdown, not a UUID box.
	if (normalizeRef(prop.$ref) !== null) return 'select'
	if (type === 'array' && prop.items && normalizeRef(prop.items.$ref) !== null) return 'multiselect'

	// Nextcloud user reference (referenceType 'nextcloud-user' or
	// format 'user'/'username'): a searchable dropdown of real Nextcloud
	// users (label = display name, value = UID). An array of users is a
	// multi-select. Checked before the plain type/format fallback so a
	// user-marked property renders as a picker, not a free-text box.
	if (isUserProp(prop)) return 'user'
	if (type === 'array' && isUserProp(prop.items)) return 'user-multiselect'

	// Boolean → switch/checkbox
	if (type === 'boolean') return 'checkbox'

	// Number types
	if (type === 'integer' || type === 'number') return 'number'

	// Array types
	if (type === 'array') {
		if (prop.items && prop.items.enum) return 'multiselect'
		return 'tags'
	}

	// Format-based widgets
	if (format === 'date-time') return 'datetime'
	if (format === 'date') return 'date'
	if (format === 'email') return 'email'
	if (format === 'uri' || format === 'url') return 'url'
	if (format === 'markdown' || format === 'textarea') return 'textarea'

	// Long text → textarea
	if (prop.maxLength && prop.maxLength > 255) return 'textarea'

	return 'text'
}

/**
 * Longest description rendered inline as helper text. Beyond this a field's
 * description is split — a short lead-in stays under the input, the full text
 * moves behind the info popover — because some schema properties document a
 * whole adapter dispatch table and would otherwise dwarf the field itself.
 */
const DESCRIPTION_INLINE_MAX = 120

/** Tokens ending in a period that do not end a sentence. */
const NON_TERMINAL_ABBREVIATIONS = ['e.g', 'i.e', 'etc', 'vs', 'cf', 'incl', 'approx', 'resp', 'no']

/**
 * The first sentence of `text`, or '' when it has no sentence boundary.
 *
 * @param {string} text The text to scan.
 * @return {string} The first sentence including its terminator.
 */
function firstSentenceOf(text) {
	const boundary = /[.!?](?=\s|$)/g
	let match
	while ((match = boundary.exec(text)) !== null) {
		const lastWord = text.slice(0, match.index).split(/\s+/).pop().toLowerCase()
		// "e.g." and single-letter initials carry a period mid-sentence.
		if (NON_TERMINAL_ABBREVIATIONS.includes(lastWord) || /^[a-z]$/i.test(lastWord)) continue
		return text.slice(0, match.index + 1)
	}
	return ''
}

/**
 * Truncate to `max` characters on a word boundary, with an ellipsis.
 *
 * @param {string} text The text to clamp.
 * @param {number} max The maximum length before the ellipsis.
 * @return {string} The clamped text.
 */
function clampToWord(text, max) {
	const cut = text.slice(0, max)
	const lastSpace = cut.lastIndexOf(' ')
	// Only honour the word boundary when it isn't hacking off most of the clamp.
	return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * Split a description into the part rendered inline and the full text.
 *
 * Short descriptions (the overwhelming majority — "Human-readable name") pass
 * through untouched with no long form. Longer ones yield their first sentence
 * as `short` when that alone fits, else a word-clamped prefix, and the whole
 * original as `long` for the caller to put behind an info affordance.
 *
 * @param {string} text The raw description.
 * @param {number} [max] Longest text kept inline.
 * @return {{short: string, long: string}} The inline text and the full text ('' when nothing was split off).
 */
export function splitDescription(text, max = DESCRIPTION_INLINE_MAX) {
	const full = typeof text === 'string' ? text.trim() : ''
	if (!full || full.length <= max) return { short: full, long: '' }

	const sentence = firstSentenceOf(full)
	return {
		short: sentence && sentence.length <= max ? sentence : clampToWord(full, max),
		long: full,
	}
}

/**
 * Generate form field definitions from a schema's properties.
 *
 * Reads `schema.properties` and creates field descriptor objects suitable
 * for auto-generating form UIs. Follows the same pattern as
 * `columnsFromSchema()` — filters, sorts, and supports overrides.
 *
 * @param {object} schema The schema object with a `properties` field
 * @param {object} [options] Configuration options
 * @param {string[]} [options.exclude] Property keys to exclude
 * @param {string[]} [options.include] Property keys to include (whitelist mode)
 * @param {object} [options.overrides] Per-key field overrides, e.g. `{ status: { widget: 'select' } }`. Recognised keys: `hidden` (true → drop the field), `order` (number → wins over the schema property's `order` for sorting), `readOnly` (false on a schema-readOnly key un-skips it), plus any field props to merge (`label`, `widget`, `enum`, …). A single overrides map therefore controls visibility, ordering and rendering on every surface that consumes this pipeline (data widget + form dialog).
 * @param {boolean} [options.includeReadOnly] Whether to include readOnly properties
 * @param {(text: string) => string} [options.translate] Optional display-layer translation function applied to each field's `label` and `description`. Schema property titles/descriptions are authored in English as the canonical source; consumers pass their bound `t()` (via the injected `cnTranslate`) so the rendered field label follows the user's language. When omitted, label/description are the English source strings unchanged (pure, backward-compatible).
 * @return {Array<{key: string, label: string, description: string, descriptionLong: string, type: string, format: string|null, widget: string, required: boolean, readOnly: boolean, default: *, enum: Array|null, items: object|null, referenceType: string|null, referenceSemanticType: string|null, referenceSemanticApp: string|null, reference: {schema: string|number, multiple: boolean}|null, userPicker: {multiple: boolean}|null, fillFrom: object|null, validation: object, order: number}>} `description` is the inline helper text (see `splitDescription`); `descriptionLong` carries the full text when it was too long to render inline, else ''.
 */
export function fieldsFromSchema(schema, options = {}) {
	const { exclude = [], include = null, overrides = {}, includeReadOnly = false, translate } = options
	const tr = typeof translate === 'function' ? translate : (text) => text

	if (!schema || !schema.properties) {
		return []
	}

	const requiredKeys = Array.isArray(schema.required) ? schema.required : []

	const entries = Object.entries(schema.properties)
		.filter(([key, prop]) => {
			// Skip properties marked as not visible
			if (prop.visible === false) return false
			// Per-key override visibility: `overrides[key].hidden === true` hides
			// the field on every surface that consumes this pipeline (data widget
			// + form dialog), so a single config map controls both.
			if (overrides[key]?.hidden === true) return false
			// Skip readOnly properties by default — UNLESS a per-key override
			// explicitly re-enables the field (`overrides[key].readOnly === false`).
			// This lets a consumer surface a schema-readOnly field (e.g. a
			// denormalised name that's read-only on edit but must be collected
			// on create) without flipping the whole form to includeReadOnly.
			if (prop.readOnly === true && !includeReadOnly && overrides[key]?.readOnly !== false) return false
			// Apply exclude list
			if (exclude.includes(key)) return false
			// Apply include whitelist
			if (include && !include.includes(key)) return false
			// Skip complex object types unless the caller opts in with an explicit widget
			// (e.g. `widget: 'json'` or `widget: 'code'` in CnFormDialog) — or unless the
			// property is an OpenRegister object REFERENCE (`$ref`). A reference is a
			// relation to another schema's object, which resolveWidget maps to a
			// searchable 'select'; dropping it here meant a related-object property
			// (e.g. cow.barn → barn) silently never rendered in the form at all.
			if (prop.type === 'object' && !prop.widget && normalizeRef(prop.$ref) === null) return false
			return true
		})
		.sort(([keyA, propA], [keyB, propB]) => {
			// Sort by EFFECTIVE order: a per-key `overrides[key].order` wins over
			// the schema property's own `order`, then alphabetically. Honouring the
			// override here means every consumer (data widget + form dialog) gets
			// the same ordering from one map — no per-component re-sort needed.
			const orderA = typeof overrides[keyA]?.order === 'number'
				? overrides[keyA].order
				: (typeof propA.order === 'number' ? propA.order : Infinity)
			const orderB = typeof overrides[keyB]?.order === 'number'
				? overrides[keyB].order
				: (typeof propB.order === 'number' ? propB.order : Infinity)
			if (orderA !== orderB) return orderA - orderB
			return keyA.localeCompare(keyB)
		})

	return entries.map(([key, prop]) => {
		const description = splitDescription(prop.description ? tr(prop.description) : '')
		const field = {
			key,
			label: tr(prop.title || key),
			description: description.short,
			descriptionLong: description.long,
			type: prop.type || 'string',
			format: prop.format || null,
			widget: resolveWidget(prop),
			// Icon picker (`widget: 'icon'`) config forwarded to CnIconBrowser via
			// CnFormDialog: which sources to offer (`iconSources`), consumer icon
			// catalogues (JSON entries — FontAwesome/OpenGemeenten data is usually
			// supplied via a fieldOverride instead), and whether custom-SVG is
			// enabled. `searchable` is obsolete — the browser always searches.
			// Omitted keys fall back to CnIconBrowser's own defaults, which include
			// the bundled NL-government sets.
			iconSources: prop.iconSources || undefined,
			catalogues: prop.catalogues || undefined,
			allowCustomSvg: prop.allowCustomSvg || undefined,
			searchable: prop.searchable,
			required: requiredKeys.includes(key),
			readOnly: prop.readOnly || false,
			default: prop.default !== undefined ? prop.default : null,
			enum: prop.enum || null,
			items: prop.items || null,
			// Pluggable integration registry marker (AD-18): a property
			// can declare `referenceType: '<integration-id>'` so consumer
			// surfaces (CnFormDialog, CnDetailGrid) render that
			// integration's single-entity widget instead of a plain input.
			referenceType: prop.referenceType || null,
			// Cross-app semantic reference (ADR-048): a property can declare
			// `referenceSemanticType: '<canonical-uri>'` (e.g.
			// 'https://schema.org/Organization') plus an optional
			// `referenceSemanticApp: '<appid>'` naming the app expected to
			// provide it. The consuming surface (CnFormDialog) resolves the
			// URI against OpenRegister's discovery endpoint: when SOME
			// installed schema implements it, the field renders as a
			// searchable object picker over that provider schema's register;
			// when NONE does, the field renders DISABLED with a tooltip. This
			// is the semantic sibling of `referenceType` (integration id).
			// `null` when the keys are absent (no behaviour change). Pure: no
			// resolution happens here.
			referenceSemanticType: prop.referenceSemanticType || null,
			referenceSemanticApp: prop.referenceSemanticApp || null,
			// OpenRegister object reference (`$ref`): when a property points
			// at another schema (`$ref: '<slug>'`, or `items.$ref` for an
			// array), record the referenced schema slug + whether it is a
			// multi-value reference. The consuming surface (CnFormDialog)
			// resolves this to a searchable dropdown of the referenced
			// objects, storing the chosen UUID(s). `null` for non-reference
			// properties. Pure: no fetching happens here.
			//
			// Cross-app object relation (ADR-066): a reference property may
			// carry `x-external-register: '<app>'` naming the register the
			// referenced schema lives in — a link into ANOTHER fleet app
			// (e.g. a procest case referencing a decidesk decision). When
			// present it is recorded as `reference.register` so the picker
			// resolves/scopes/creates against that register instead of the
			// form's own; absent, the reference stays same-register (the form's
			// `register` prop is used). Consolidates the ad-hoc caseReference /
			// approvalDecisionId / x-mirror-of variants onto one convention.
			reference: (normalizeRef(prop.$ref) !== null)
				? { schema: normalizeRef(prop.$ref), multiple: false, ...(prop['x-external-register'] ? { register: prop['x-external-register'] } : {}) }
				: (prop.type === 'array' && prop.items && normalizeRef(prop.items.$ref) !== null)
					? { schema: normalizeRef(prop.items.$ref), multiple: true, ...((prop.items['x-external-register'] || prop['x-external-register']) ? { register: prop.items['x-external-register'] || prop['x-external-register'] } : {}) }
					: null,
			// Nextcloud user reference: when a property marks a NC user
			// (`referenceType: 'nextcloud-user'`, or `format: 'user'`/
			// `'username'`), tag it so CnFormDialog renders a searchable
			// dropdown of real Nextcloud users (label = display name,
			// value = UID) instead of a free-text box. `multiple` is true
			// for an array of users (`items` marks the user). `null` for
			// non-user properties. Pure: no fetching happens here.
			userPicker: isUserProp(prop)
				? { multiple: false }
				: (prop.type === 'array' && isUserProp(prop.items))
					? { multiple: true }
					: null,
			// Conditional immutability (AD: x-openregister-readonly-when): a
			// property can declare it becomes read-only when another field on the
			// same object holds a given value — e.g. a hybrid app's identity
			// fields. Consumers (CnObjectDataWidget) evaluate this against the
			// object's current data. Shape: `{ field, equals }` or `{ field, in: [] }`.
			readOnlyWhen: prop['x-openregister-readonly-when'] || prop.readOnlyWhen || null,
			validation: {
				minLength: prop.minLength,
				maxLength: prop.maxLength,
				minimum: prop.minimum,
				maximum: prop.maximum,
				pattern: prop.pattern,
			},
			order: typeof prop.order === 'number' ? prop.order : Infinity,
		}

		// Apply per-field overrides
		if (overrides[key]) {
			Object.assign(field, overrides[key])
		}

		return field
	})
}

/**
 * Generate faceted filter definitions from a schema's facetable properties.
 *
 * Reads `schema.properties` and creates filter definitions for properties
 * marked with `facetable: true`. Maps property types to appropriate filter
 * widget types (select, checkbox, text).
 *
 * @param {object} schema The schema object with a `properties` field
 * @param {object} [options] Configuration options
 * @param {(text: string) => string} [options.translate] Optional display-layer translation function applied to each filter's `label` and `description`. Schema property titles are authored in English as the canonical source; consumers pass their bound `t()` (via the injected `cnTranslate`) so the rendered filter label follows the user's language. When omitted, label/description are the English source strings unchanged (pure, backward-compatible).
 * @return {Array<{key: string, label: string, type: string, propertyType: string, options: Array}>}
 */
export function filtersFromSchema(schema, options = {}) {
	if (!schema || !schema.properties) {
		return []
	}

	const { translate } = options
	const tr = typeof translate === 'function' ? translate : (text) => text

	return Object.entries(schema.properties)
		.filter(([, prop]) => {
			if (prop.facetable !== true) return false
			return true
		})
		.sort(([keyA, propA], [keyB, propB]) => {
			const orderA = typeof propA.order === 'number' ? propA.order : Infinity
			const orderB = typeof propB.order === 'number' ? propB.order : Infinity
			if (orderA !== orderB) return orderA - orderB
			return keyA.localeCompare(keyB)
		})
		.map(([key, prop]) => {
			const filter = {
				key,
				label: tr(prop.title || key),
				description: prop.description ? tr(prop.description) : '',
				propertyType: prop.type || 'string',
				options: [],
				value: null,
			}

			// Map property type to filter widget type
			if (prop.type === 'boolean') {
				filter.type = 'checkbox'
			} else if (prop.enum) {
				filter.type = 'select'
				filter.options = prop.enum.map((val) => ({
					id: val,
					label: val,
				}))
			} else {
				// Default to select — options loaded dynamically from facet API
				filter.type = 'select'
			}

			return filter
		})
}

/**
 * URL-like string formats — values must parse as a `URL` to be considered valid.
 */
const URL_FORMATS = new Set([
	'url', 'uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template',
	'accessUrl', 'shareUrl', 'downloadUrl',
])

/**
 * Regex-based validators for additional standard string formats.
 */
const FORMAT_PATTERNS = {
	email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
	'idn-email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
	uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
	ipv4: /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/,
	ipv6: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/i,
	hostname: /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
	semver: /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/,
	'color-hex': /^#[0-9a-f]{6}$/i,
	'color-hex-alpha': /^#[0-9a-f]{8}$/i,
	'color-rgb': /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i,
	'color-rgba': /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/i,
	'color-hsl': /^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$/i,
	'color-hsla': /^hsla\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*,\s*[\d.]+\s*\)$/i,
}

/**
 * Validate a single value against a JSON-Schema-style property definition.
 *
 * Returns null when the value is valid, otherwise a short English error
 * message describing the violation (caller is responsible for translation).
 * An empty value (`null`/`undefined`/`''`) is considered valid here unless
 * `options.required` is set; required-ness is typically enforced separately
 * by the form so an empty input doesn't show a redundant inline error.
 *
 * @param {*} value The value to validate.
 * @param {object} [property] The schema property definition.
 * @param {object} [options] Extra checks.
 * @param {boolean} [options.required] When true, an empty value is reported.
 * @return {string|null}
 */
export function validateValue(value, property = {}, options = {}) {
	const { required = false } = options
	const empty = value === null || value === undefined || value === ''
		|| (Array.isArray(value) && value.length === 0)
	if (empty) {
		return required ? 'This field is required.' : null
	}
	const type = property.type || 'string'
	if (type === 'integer') {
		if (typeof value !== 'number' || !Number.isInteger(value)) return 'Value must be an integer.'
	} else if (type === 'number') {
		if (typeof value !== 'number' || Number.isNaN(value)) return 'Value must be a number.'
	}
	if (type === 'integer' || type === 'number') {
		if (typeof property.minimum === 'number' && value < property.minimum) {
			return `Value must be at least ${property.minimum}.`
		}
		if (typeof property.maximum === 'number' && value > property.maximum) {
			return `Value must be at most ${property.maximum}.`
		}
	}
	if (type === 'string') {
		if (typeof value !== 'string') return 'Value must be a string.'
		if (typeof property.minLength === 'number' && value.length < property.minLength) {
			return `Must be at least ${property.minLength} characters.`
		}
		if (typeof property.maxLength === 'number' && value.length > property.maxLength) {
			return `Must be at most ${property.maxLength} characters.`
		}
		if (property.pattern) {
			try {
				if (!new RegExp(property.pattern).test(value)) {
					return 'Value does not match the required pattern.'
				}
			} catch {
				// Ignore broken schema patterns.
			}
		}
		if (property.const !== undefined && value !== property.const) {
			return `Value must be '${property.const}'.`
		}
		const fmtErr = validateStringFormat(property.format, value)
		if (fmtErr) return fmtErr
	}
	if (type === 'array') {
		if (!Array.isArray(value)) return 'Value must be a list.'
		if (typeof property.minItems === 'number' && value.length < property.minItems) {
			return `Select at least ${property.minItems} items.`
		}
		if (typeof property.maxItems === 'number' && value.length > property.maxItems) {
			return `Select at most ${property.maxItems} items.`
		}
		if (property.items && typeof property.items === 'object') {
			for (let i = 0; i < value.length; i++) {
				const itemErr = validateValue(value[i], property.items)
				if (itemErr) return `Item ${i + 1}: ${itemErr}`
			}
		}
	}
	if (type === 'boolean' && typeof value !== 'boolean') return 'Value must be a boolean.'
	if (Array.isArray(property.enum) && property.enum.length > 0 && !property.enum.includes(value)) {
		return 'Value must be one of the allowed options.'
	}
	return null
}

/**
 * Validate a string value against a JSON-Schema `format`.
 * @param {string} format Schema format identifier.
 * @param {string} value String value to validate.
 * @return {string|null} Error message or null when valid.
 */
function validateStringFormat(format, value) {
	if (!format) return null
	if (format === 'time') {
		// HTML5 `<input type="time">` produces `HH:MM` or `HH:MM:SS[.sss]`.
		// `new Date()` won't parse a bare time, so check the shape directly.
		return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(value)
			? null
			: 'Value must be a valid time.'
	}
	if (format === 'date' || format === 'date-time') {
		return Number.isNaN(new Date(value).getTime()) ? `Value must be a valid ${format}.` : null
	}
	if (URL_FORMATS.has(format)) {
		// Accept fully-qualified URLs (`https://example.com`) and protocol-less
		// shorthand (`example.com/path`) by retrying with an `https://` prefix.
		// Reject obviously non-URL inputs (whitespace, missing dots / authority).
		if (/\s/.test(value)) return 'Value must be a valid URL.'
		try {
			/* eslint-disable-next-line no-new */
			new URL(value)
			return null
		} catch {
			// Fall through to the prefix retry.
		}
		try {
			const parsed = new URL('https://' + value)
			if (parsed.hostname && parsed.hostname.includes('.')) return null
		} catch {
			// Fall through to the rejection below.
		}
		return 'Value must be a valid URL.'
	}
	const re = FORMAT_PATTERNS[format]
	if (re && !re.test(value)) return `Value must be a valid '${format}'.`
	return null
}

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
 * @return {Array<{key: string, label: string, sortable: boolean, type: string, format: string, width: string}>}
 */
export function columnsFromSchema(schema, options = {}) {
	const { exclude = [], include = null, overrides = {} } = options

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
			label: prop.title || key,
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
		// For short arrays, join values
		if (value.length <= 3) {
			return value.join(', ')
		}
		return `${value.slice(0, 3).join(', ')} +${value.length - 3}`
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
 * 3. Type-based: `boolean` → `'checkbox'`, `integer`/`number` → `'number'`,
 *    `array` + `items.enum` → `'multiselect'`, `array` → `'tags'`
 * 4. Format-based: `date-time` → `'datetime'`, `date` → `'date'`,
 *    `email` → `'email'`, `uri`/`url` → `'url'`,
 *    `markdown`/`textarea` → `'textarea'`
 * 5. Long text: `maxLength > 255` → `'textarea'`
 * 6. Fallback → `'text'`
 *
 * @param {object} prop The schema property definition (type, format, enum, widget, items, maxLength)
 * @return {string} Widget identifier: 'text'|'email'|'url'|'number'|'checkbox'|'select'|'multiselect'|'tags'|'textarea'|'date'|'datetime' or a custom string
 */
function resolveWidget(prop) {
	// Explicit widget hint takes priority
	if (prop.widget) return prop.widget

	// Enum → select
	if (prop.enum) return 'select'

	const type = prop.type || 'string'
	const format = prop.format || ''

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
 * @param {object} [options.overrides] Per-key field overrides, e.g. `{ status: { widget: 'select' } }`
 * @param {boolean} [options.includeReadOnly] Whether to include readOnly properties
 * @return {Array<{key: string, label: string, description: string, type: string, format: string|null, widget: string, required: boolean, readOnly: boolean, default: *, enum: Array|null, items: object|null, referenceType: string|null, validation: object, order: number}>}
 */
export function fieldsFromSchema(schema, options = {}) {
	const { exclude = [], include = null, overrides = {}, includeReadOnly = false } = options

	if (!schema || !schema.properties) {
		return []
	}

	const requiredKeys = Array.isArray(schema.required) ? schema.required : []

	const entries = Object.entries(schema.properties)
		.filter(([key, prop]) => {
			// Skip properties marked as not visible
			if (prop.visible === false) return false
			// Skip readOnly properties by default
			if (prop.readOnly === true && !includeReadOnly) return false
			// Apply exclude list
			if (exclude.includes(key)) return false
			// Apply include whitelist
			if (include && !include.includes(key)) return false
			// Skip complex object types unless the caller opts in with an explicit widget
			// (e.g. `widget: 'json'` or `widget: 'code'` in CnFormDialog).
			if (prop.type === 'object' && !prop.widget) return false
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
		const field = {
			key,
			label: prop.title || key,
			description: prop.description || '',
			type: prop.type || 'string',
			format: prop.format || null,
			widget: resolveWidget(prop),
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
 * @return {Array<{key: string, label: string, type: string, propertyType: string, options: Array}>}
 */
export function filtersFromSchema(schema) {
	if (!schema || !schema.properties) {
		return []
	}

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
				label: prop.title || key,
				description: prop.description || '',
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
	'url',
	'uri',
	'uri-reference',
	'iri',
	'iri-reference',
	'uri-template',
	'accessUrl',
	'shareUrl',
	'downloadUrl',
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
 *
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

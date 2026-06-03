/**
 * cnFormFieldRenderer — shared field-renderer helper used by
 * `CnFormPage` (and, in a follow-up, `CnSettingsPage`'s bare-fields
 * branch).
 *
 * Maps a `formField` shape (the `$def` shared by
 * `pages[].config.sections[].fields[]` for `type: "settings"` and
 * `pages[].config.fields[]` for `type: "form"`) to one of the
 * library's input components. Emitted to keep the input-rendering
 * logic in one place — the settings page used to inline this switch
 * (and still does, until a follow-up DRY pass migrates it); the form
 * page consumes the shared helper from day one.
 *
 * Field shapes:
 *
 *  | `field.type`  | Component / behaviour                              |
 *  |---------------|----------------------------------------------------|
 *  | `boolean`     | NcCheckboxRadioSwitch                              |
 *  | `number`      | NcTextField type=number, value coerced to Number   |
 *  | `password`    | NcTextField type=password                          |
 *  | `string`      | NcTextField (default), or NcTextArea when         |
 *  |               | `field.widget === "textarea"`                      |
 *  | `enum`        | NcSelect, options shaped from `field.enum`/`field.options` |
 *  | `json`        | CnJsonViewer (read-only display in this rev)       |
 *
 * Unknown `field.type` values fall back to NcTextField and emit a
 * single `console.warn` so the consumer notices the typo.
 *
 * The helper exports a render-function — components consume it via
 * `<component :is="cnRenderFormField(...).renderer" v-bind="cnRenderFormField(...).bindings" />`
 * — but for Vue 2 + the test toolchain we use a small functional
 * resolver pattern: the helper returns `{ tag, props, listeners }`
 * the parent template binds via `<component :is>`. This keeps the
 * template trivially mountable in jest with the same component stubs
 * tests already use for CnSettingsPage.
 *
 * @param {object} args
 * @param {object} args.field   The formField shape.
 * @param {*}      args.value   Current value for `field.key`.
 * @param {Function} args.onInput Callback invoked with the new value.
 * @param {Function} [args.t]   Optional translator for `field.label`.
 * @param {object}  [args.componentMap] Optional override map from
 *   widget id → Vue component. Defaults to the library's standard
 *   set (`NcCheckboxRadioSwitch`, `NcTextField`, `NcTextArea`,
 *   `NcSelect`, `CnJsonViewer`).
 *
 * @return {{ tag: object, props: object, listeners: object }}
 */
import {
	NcCheckboxRadioSwitch,
	NcSelect,
	NcTextField,
} from '@nextcloud/vue'
import CnJsonViewer from '../components/CnJsonViewer/CnJsonViewer.vue'

// NcTextArea is not always exported under the same path across
// @nextcloud/vue versions; falling back to NcTextField with a
// `multiline` prop hint keeps this resilient. The actual textarea
// rendering is delegated to the textarea fallback below.
let NcTextArea = null
try {
	// eslint-disable-next-line global-require
	NcTextArea = require('@nextcloud/vue').NcTextArea ?? null
} catch (_e) {
	NcTextArea = null
}

const DEFAULT_COMPONENT_MAP = Object.freeze({
	boolean: NcCheckboxRadioSwitch,
	number: NcTextField,
	password: NcTextField,
	string: NcTextField,
	'string-textarea': NcTextArea,
	enum: NcSelect,
	json: CnJsonViewer,
})

const KNOWN_TYPES = ['boolean', 'number', 'password', 'string', 'enum', 'json']

const warned = new Set()

/**
 * Coerce an enum field's options into the `{ label, value }` shape
 * NcSelect expects. Accepts:
 *  - `field.enum: ['a', 'b']` (preferred per the formField $def)
 *  - `field.options: [{ label, value }]` (legacy CnSettingsPage shape)
 *  - mixed `[{ label, value }, 'literal']`
 *
 * @param {object} field
 * @return {Array<{label: string, value: *}>}
 */
function resolveEnumOptions(field) {
	const raw = Array.isArray(field.enum)
		? field.enum
		: (Array.isArray(field.options) ? field.options : [])
	return raw.map((entry) => {
		if (entry && typeof entry === 'object' && 'value' in entry) {
			return { label: String(entry.label ?? entry.value), value: entry.value }
		}
		return { label: String(entry), value: entry }
	})
}

/**
 * Resolve render bindings for a single form field.
 *
 * @param {object} args See module docblock.
 * @return {{ tag: object|string, props: object, listeners: object, kind: string }}
 */
export function cnRenderFormField({ field, value, onInput, t, componentMap } = {}) {
	if (!field || typeof field !== 'object' || typeof field.key !== 'string') {
		return null
	}
	const map = { ...DEFAULT_COMPONENT_MAP, ...(componentMap || {}) }
	const translate = typeof t === 'function' ? t : (k) => k
	const label = translate(field.label || field.key)

	if (field.type === 'boolean') {
		return {
			kind: 'boolean',
			tag: map.boolean,
			props: {
				checked: !!value,
				label,
			},
			listeners: {
				'update:checked': (next) => onInput(next),
			},
			labelText: label,
		}
	}

	if (field.type === 'number') {
		return {
			kind: 'number',
			tag: map.number,
			props: {
				label,
				type: 'number',
				value: value === null || value === undefined ? '' : String(value),
			},
			listeners: {
				'update:value': (next) => onInput(next === '' ? null : Number(next)),
			},
		}
	}

	if (field.type === 'password') {
		return {
			kind: 'password',
			tag: map.password,
			props: {
				label,
				type: 'password',
				value: value === null || value === undefined ? '' : String(value),
			},
			listeners: {
				'update:value': (next) => onInput(next),
			},
		}
	}

	if (field.type === 'enum') {
		const options = resolveEnumOptions(field)
		const selected = options.find((o) => o.value === value) ?? null
		return {
			kind: 'enum',
			tag: map.enum,
			props: {
				inputLabel: label,
				options,
				value: selected,
			},
			listeners: {
				input: (next) => onInput(next?.value),
			},
		}
	}

	if (field.type === 'json') {
		return {
			kind: 'json',
			tag: map.json,
			props: {
				value: value ?? null,
				label,
			},
			listeners: {},
		}
	}

	if (field.type === 'string') {
		const isTextarea = field.widget === 'textarea'
		if (isTextarea) {
			// NcTextArea is preferred; otherwise fall back to a plain
			// <textarea> rendered via the host template. The renderer
			// returns `tag: 'textarea'` so the consumer's `<component :is>`
			// resolves to the native element.
			return {
				kind: 'string-textarea',
				tag: map['string-textarea'] || 'textarea',
				props: {
					label,
					value: value === null || value === undefined ? '' : String(value),
					rows: 4,
				},
				listeners: {
					'update:value': (next) => onInput(next),
					input: (event) => {
						// Native textarea path — `event` is the InputEvent.
						const next = event && event.target ? event.target.value : event
						onInput(next)
					},
				},
			}
		}
		return {
			kind: 'string',
			tag: map.string,
			props: {
				label,
				value: value === null || value === undefined ? '' : String(value),
			},
			listeners: {
				'update:value': (next) => onInput(next),
			},
		}
	}

	// Unknown type — warn ONCE per type and fall back to NcTextField.
	if (!KNOWN_TYPES.includes(field.type)) {
		if (!warned.has(field.type)) {
			warned.add(field.type)
			// eslint-disable-next-line no-console
			console.warn(
				`[cnRenderFormField] Unknown field.type "${field.type}" for field "${field.key}". Falling back to NcTextField. Known types: ${KNOWN_TYPES.join(', ')}.`,
			)
		}
		return {
			kind: 'fallback',
			tag: map.string,
			props: {
				label,
				value: value === null || value === undefined ? '' : String(value),
			},
			listeners: {
				'update:value': (next) => onInput(next),
			},
		}
	}

	// Should be unreachable given KNOWN_TYPES check above.
	return null
}

export default cnRenderFormField

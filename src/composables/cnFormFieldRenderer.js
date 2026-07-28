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
 * manifest-form-logic (REQ-MFL-11) adds an optional `error` argument.
 * When set, components in the `NcInputField` family (`string`, `number`,
 * `password`, and `string-textarea` when `NcTextArea` is available, plus
 * the unknown-type `fallback`) receive the NC-standard `error: true` +
 * `helperText: <message>` props, which paint the input's error state and
 * announce the message natively. `boolean` / `enum` / `json` bindings and
 * the native-`<textarea>` fallback are left untouched — `CnFormPage`
 * renders an adjacent `role="alert"` element for those instead.
 *
 * @param {object} args
 * @param {object} args.field   The formField shape.
 * @param {*}      args.value   Current value for `field.key`.
 * @param {Function} args.onInput Callback invoked with the new value.
 * @param {Function} [args.t]   Optional translator for `field.label`.
 * @param {string|null} [args.error] Optional validation failure message (REQ-MFL-11).
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
 * @param {object} field A formField descriptor carrying its choices on either
 *   `field.enum` (preferred) or the legacy `field.options`.
 * @return {Array<{label: string, value: *}>} The NcSelect options; bare literals
 *   become `{label: String(entry), value: entry}`.
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
 * @param {object} args.field The formField shape.
 * @param {*} args.value Current value for `field.key`.
 * @param {Function} args.onInput Callback invoked with the new value.
 * @param {Function} [args.t] Optional translator for `field.label`.
 * @param {string|null} [args.error] Optional validation failure message (REQ-MFL-11).
 * @param {object} [args.componentMap] Optional override map from widget id to Vue component.
 * @return {{ tag: object|string, props: object, listeners: object, kind: string }}
 */
export function cnRenderFormField({ field, value, onInput, t, error, componentMap } = {}) {
	if (!field || typeof field !== 'object' || typeof field.key !== 'string') {
		return null
	}
	const map = { ...DEFAULT_COMPONENT_MAP, ...(componentMap || {}) }
	const translate = typeof t === 'function' ? t : (k) => k
	const label = translate(field.label || field.key)

	let result = null

	if (field.type === 'boolean') {
		result = {
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
	} else if (field.type === 'number') {
		result = {
			kind: 'number',
			tag: map.number,
			props: {
				label,
				type: 'number',
				modelValue: value === null || value === undefined ? '' : String(value),
			},
			listeners: {
				'update:modelValue': (next) => onInput(next === '' ? null : Number(next)),
			},
		}
	} else if (field.type === 'password') {
		result = {
			kind: 'password',
			tag: map.password,
			props: {
				label,
				type: 'password',
				modelValue: value === null || value === undefined ? '' : String(value),
			},
			listeners: {
				'update:modelValue': (next) => onInput(next),
			},
		}
	} else if (field.type === 'enum') {
		const options = resolveEnumOptions(field)
		const selected = options.find((o) => o.value === value) ?? null
		result = {
			kind: 'enum',
			tag: map.enum,
			props: {
				inputLabel: label,
				options,
				modelValue: selected,
			},
			listeners: {
				// @nextcloud/vue 9's NcSelect declares `emits: [" ", "update:modelValue"]`
				// and never emits `input`. Because `input` is not a declared component
				// emit, Vue 3 does NOT treat `@input` as a component listener — it falls
				// through to the root element as a NATIVE DOM listener, firing on every
				// keystroke in NcSelect's `.vs__search` box with a raw Event (`next?.value`
				// reads `undefined` off it), silently overwriting the field on every
				// keypress. Same bug class as commit 05f540fa fixed elsewhere in this
				// library; this composable was missed. `update:modelValue` emits the
				// selected OPTION object here (no `reduce` prop), hence `next?.value`.
				'update:modelValue': (next) => onInput(next?.value),
			},
		}
	} else if (field.type === 'json') {
		result = {
			kind: 'json',
			tag: map.json,
			props: {
				value: value ?? null,
				label,
			},
			listeners: {},
		}
	} else if (field.type === 'string') {
		const isTextarea = field.widget === 'textarea'
		if (isTextarea) {
			// NcTextArea is preferred; otherwise fall back to a plain
			// <textarea> rendered via the host template. The renderer
			// returns `tag: 'textarea'` so the consumer's `<component :is>`
			// resolves to the native element.
			result = {
				kind: 'string-textarea',
				tag: map['string-textarea'] || 'textarea',
				props: {
					label,
					modelValue: value === null || value === undefined ? '' : String(value),
					rows: 4,
				},
				listeners: {
					'update:modelValue': (next) => onInput(next),
					input: (event) => {
						// Native textarea path — `event` is the InputEvent.
						const next = event && event.target ? event.target.value : event
						onInput(next)
					},
				},
			}
		} else {
			result = {
				kind: 'string',
				tag: map.string,
				props: {
					label,
					modelValue: value === null || value === undefined ? '' : String(value),
				},
				listeners: {
					'update:modelValue': (next) => onInput(next),
				},
			}
		}
	} else if (!KNOWN_TYPES.includes(field.type)) {
		// Unknown type — warn ONCE per type and fall back to NcTextField.
		if (!warned.has(field.type)) {
			warned.add(field.type)
			// eslint-disable-next-line no-console
			console.warn(
				`[cnRenderFormField] Unknown field.type "${field.type}" for field "${field.key}". Falling back to NcTextField. Known types: ${KNOWN_TYPES.join(', ')}.`,
			)
		}
		result = {
			kind: 'fallback',
			tag: map.string,
			props: {
				label,
				modelValue: value === null || value === undefined ? '' : String(value),
			},
			listeners: {
				'update:modelValue': (next) => onInput(next),
			},
		}
	}

	// Should be unreachable given the KNOWN_TYPES check above.
	if (!result) return null

	// manifest-form-logic (REQ-MFL-11): NcInputField-family kinds get the
	// NC-standard error props. `string-textarea` only qualifies when
	// NcTextArea resolved (native <textarea> has no such props — CnFormPage
	// renders the adjacent role="alert" fallback for that case instead).
	const supportsNativeError = ['string', 'number', 'password', 'fallback'].includes(result.kind)
		|| (result.kind === 'string-textarea' && result.tag !== 'textarea')
	if (error && supportsNativeError) {
		result.props = { ...result.props, error: true, helperText: error }
	}

	return result
}

export default cnRenderFormField

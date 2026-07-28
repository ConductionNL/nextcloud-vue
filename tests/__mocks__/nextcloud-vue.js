/**
 * Mock for @nextcloud/vue — provides stub components for CnAdvancedFormDialog tests.
 *
 * The stub renders default children plus every named slot so components that
 * place v-for blocks inside slots like `#list` or `#footer` (e.g. CnAppNav)
 * still execute their render expressions during mount.
 */
import { h } from 'vue'

/**
 * Native HTML boolean attributes: present means true, absent means false.
 *
 * Vue 2 removed ANY attribute whose bound value was `false` (`isFalsyAttrValue`
 * in its attrs module), whatever the element. Vue 3 only does that for the
 * attribute's real nature — a boolean DOM prop on a host element that has it
 * (`<button :disabled="false">` -> no attribute), or the short
 * `specialBooleanAttrs` list. Everything else is stringified, so a `<div>`
 * given `disabled: false` renders `disabled="false"`.
 *
 * These stubs render a `<div>` where the real component renders a `<button>` /
 * `<input>` / `<details>`, so without this filter `:disabled="!canSubmit"`
 * always produces a `disabled` attribute and `attributes('disabled')` is
 * truthy whether the button is enabled or not — the enabled/disabled specs
 * pass in BOTH directions and assert nothing.
 *
 * Only genuine boolean attributes are filtered. `aria-*` and `data-*` are
 * left alone: "false" is a meaningful value there and several specs assert it.
 */
const NATIVE_BOOLEAN_ATTRS = new Set([
	'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
	'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap',
	'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open',
	'playsinline', 'readonly', 'required', 'reversed', 'selected',
])

/**
 * Drop boolean attributes bound to `false`, mirroring what the real component's
 * host element does. See {@link NATIVE_BOOLEAN_ATTRS}.
 *
 * @param {object} attrs the fallthrough attributes.
 * @return {object} attributes safe to spread onto the stub's `<div>`.
 */
const withBooleanAttrSemantics = (attrs) => {
	const out = {}
	for (const [key, value] of Object.entries(attrs)) {
		if (value === false && NATIVE_BOOLEAN_ATTRS.has(key)) {
			continue
		}
		out[key] = value
	}
	return out
}

const createStub = (name) => ({
	name,
	inheritAttrs: false,
	setup(props, { slots, attrs }) {
		return () => {
			const children = []
			if (slots.default) {
				children.push(slots.default())
			}
			for (const key of Object.keys(slots)) {
				if (key === 'default') continue
				children.push(slots[key]())
			}
			return h('div', { class: ['stub', name], ...withBooleanAttrSemantics(attrs) }, children)
		}
	},
})

export const NcDialog = createStub('NcDialog')
export const NcModal = createStub('NcModal')
export const NcButton = createStub('NcButton')
export const NcNoteCard = createStub('NcNoteCard')
export const NcLoadingIcon = createStub('NcLoadingIcon')
export const NcTextField = createStub('NcTextField')
export const NcTextArea = createStub('NcTextArea')
export const NcCheckboxRadioSwitch = createStub('NcCheckboxRadioSwitch')
export const NcColorPicker = createStub('NcColorPicker')
export const NcAppNavigation = createStub('NcAppNavigation')
export const NcAppNavigationItem = createStub('NcAppNavigationItem')
export const NcContent = createStub('NcContent')
export const NcEmptyContent = createStub('NcEmptyContent')
export const NcActions = createStub('NcActions')
export const NcActionButton = createStub('NcActionButton')
export const NcActionCaption = createStub('NcActionCaption')
export const NcActionCheckbox = createStub('NcActionCheckbox')
export const NcActionSeparator = createStub('NcActionSeparator')

/**
 * NcActionInput needs a real stateful stub: the component under test binds
 * `:value` / `@update:value` and submits, and the real NcActionInput's input
 * carries no `name` attribute — so a stub that emits the typed text is what
 * keeps consumers honest about reading their own bound state.
 */
export const NcActionInput = {
	name: 'NcActionInput',
	props: { value: { type: String, default: '' } },
	emits: ['submit', 'update:value'],
	render() {
		return h('li', { class: ['stub', 'NcActionInput'] }, [
			h('form', {
				onSubmit: (event) => { event.preventDefault(); this.$emit('submit', event) },
			}, [
				h('input', {
					value: this.value,
					onInput: (event) => this.$emit('update:value', event.target.value),
				}),
			]),
		])
	},
}
/**
 * NcRichContenteditable needs a real stateful stub: the component under test
 * binds `:value` / `@update:value` and passes an `auto-complete` function that
 * the real component calls with `(searchText, callback)` when the user types
 * `@query`. This stub mirrors that contract on top of a plain <textarea> so
 * jsdom tests can drive typing, suggestion display, keyboard navigation
 * (ArrowUp/ArrowDown/Enter/Escape) and mouse selection. Token insertion uses
 * the same `@id` / `@"id"` convention as the real Tribute integration.
 */
export const NcRichContenteditable = {
	name: 'NcRichContenteditable',
	props: {
		value: { type: String, default: '' },
		autoComplete: { type: Function, default: () => [] },
		placeholder: { type: String, default: '' },
		multiline: { type: Boolean, default: false },
	},
	data() {
		return {
			suggestions: [],
			open: false,
			activeIndex: 0,
		}
	},
	methods: {
		onInput(event) {
			const text = event.target.value
			this.$emit('update:value', text)
			const match = text.match(/(?:^|\s)@([A-Za-z0-9_.'-]*)$/)
			if (match) {
				this.autoComplete(match[1], (results) => {
					this.suggestions = Array.isArray(results) ? results : []
					this.open = this.suggestions.length > 0
					this.activeIndex = 0
				})
			} else {
				this.close()
			}
		},
		onKeydown(event) {
			if (!this.open) return
			if (event.key === 'ArrowDown') {
				event.preventDefault()
				this.activeIndex = Math.min(this.activeIndex + 1, this.suggestions.length - 1)
			} else if (event.key === 'ArrowUp') {
				event.preventDefault()
				this.activeIndex = Math.max(this.activeIndex - 1, 0)
			} else if (event.key === 'Enter') {
				event.preventDefault()
				this.select(this.suggestions[this.activeIndex])
			} else if (event.key === 'Escape') {
				event.preventDefault()
				this.close()
			}
		},
		select(suggestion) {
			if (!suggestion) return
			const id = String(suggestion.id)
			const token = /^[A-Za-z0-9_.'-]+$/.test(id) ? `@${id}` : `@"${id}"`
			const newText = this.value.replace(/@[A-Za-z0-9_.'-]*$/, `${token} `)
			this.$emit('update:value', newText)
			this.close()
		},
		close() {
			this.open = false
			this.suggestions = []
			this.activeIndex = 0
		},
	},
	emits: ['update:value'],
	render() {
		const children = [
			h('textarea', {
				class: 'rich-contenteditable__input',
				value: this.value,
				placeholder: this.placeholder,
				onInput: this.onInput,
				onKeydown: this.onKeydown,
			}),
		]
		if (this.open) {
			children.push(h('ul', { class: 'tribute-container' }, this.suggestions.map((suggestion, index) => h('li', {
				class: ['tribute-item', { 'tribute-item--active': index === this.activeIndex }],
				key: suggestion.id,
				onClick: () => this.select(suggestion),
			}, suggestion.label || suggestion.id))))
		}
		return h('div', { class: ['stub', 'NcRichContenteditable'] }, children)
	},
}
export const NcSelect = createStub('NcSelect')
export const NcSettingsSection = createStub('NcSettingsSection')
export const NcAppSidebar = createStub('NcAppSidebar')
export const NcAppSidebarTab = createStub('NcAppSidebarTab')
// NcPopover needs more than the generic stub: the real component exposes ARIA
// attrs to its #trigger via a SCOPED slot ({ attrs }), so a functional stub that
// only renders non-scoped slots would drop a scoped trigger entirely. This stub
// mirrors that contract (trigger scope + popupRole→aria-haspopup) while keeping
// the generic behaviour for the default and other named slots.
export const NcPopover = {
	name: 'NcPopover',
	props: {
		shown: { type: Boolean, default: false },
		popupRole: { type: String, default: undefined },
	},
	render() {
		const vnodes = []
		// Vue 3 unifies scoped and normal slots — every slot is a function, so
		// the trigger scope is simply its argument.
		const triggerScope = {
			attrs: {
				'aria-haspopup': this.popupRole,
				'aria-expanded': String(!!this.shown),
			},
		}
		if (this.$slots.trigger) {
			vnodes.push(this.$slots.trigger(triggerScope))
		}
		if (this.$slots.default) {
			vnodes.push(this.$slots.default())
		}
		for (const name of Object.keys(this.$slots)) {
			if (name === 'default' || name === 'trigger') continue
			vnodes.push(this.$slots[name]())
		}
		return h('div', { class: ['stub', 'NcPopover'] }, vnodes)
	},
}
export const NcRichText = createStub('NcRichText')
export const NcAppContent = createStub('NcAppContent')
export const NcListItem = createStub('NcListItem')
export const NcAvatar = createStub('NcAvatar')
export const NcCounterBubble = createStub('NcCounterBubble')

/**
 * NcDateTime stub — renders its `timestamp` prop as text so tab/card
 * relative-time rows have observable content in jsdom.
 */
export const NcDateTime = {
	name: 'NcDateTime',
	props: { timestamp: { type: [String, Number, Date], default: undefined } },
	inheritAttrs: false,
	render() {
		const ts = this.timestamp
		// A Date instance is rendered as its ISO string (the real NcDateTime
		// emits a <time> element); other primitives are stringified as-is so
		// relative-time rows keep observable text. The `nc-date-time` class
		// hook (below) matches the real component so specs can target
		// `time.nc-date-time`.
		const text = ts === undefined || ts === null
			? ''
			: (ts instanceof Date ? ts.toISOString() : String(ts))
		return h('time', { class: ['stub', 'NcDateTime', 'nc-date-time'], ...this.$attrs }, text)
	},
}

export default {
	NcDialog,
	NcModal,
	NcButton,
	NcNoteCard,
	NcLoadingIcon,
	NcTextField,
	NcTextArea,
	NcCheckboxRadioSwitch,
	NcColorPicker,
	NcAppNavigation,
	NcAppNavigationItem,
	NcContent,
	NcEmptyContent,
	NcActions,
	NcActionButton,
	NcActionCaption,
	NcActionCheckbox,
	NcActionSeparator,
	NcSelect,
	NcSettingsSection,
	NcAppSidebar,
	NcAppSidebarTab,
	NcPopover,
	NcRichText,
	NcAppContent,
	NcListItem,
	NcAvatar,
	NcCounterBubble,
	NcDateTime,
	NcRichContenteditable,
}

/**
 * Mock for @nextcloud/vue — provides stub components for CnAdvancedFormDialog tests.
 *
 * The stub renders default children plus every named slot so components that
 * place v-for blocks inside slots like `#list` or `#footer` (e.g. CnAppNav)
 * still execute their render expressions during mount.
 */
const createStub = (name) => ({
	name,
	functional: true,
	render(h, { data, children, slots }) {
		const named = slots ? slots() : {}
		const namedVnodes = []
		for (const key of Object.keys(named)) {
			if (key === 'default') continue
			namedVnodes.push(named[key])
		}
		return h('div', { class: ['stub', name], ...data }, [...(children || []), ...namedVnodes])
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

/**
 * NcActionInput needs a real stateful stub: the component under test binds
 * `:value` / `@update:value` and submits, and the real NcActionInput's input
 * carries no `name` attribute — so a stub that emits the typed text is what
 * keeps consumers honest about reading their own bound state.
 */
export const NcActionInput = {
	name: 'NcActionInput',
	props: { value: { type: String, default: '' } },
	render(h) {
		return h('li', { class: ['stub', 'NcActionInput'] }, [
			h('form', {
				on: { submit: (event) => { event.preventDefault(); this.$emit('submit', event) } },
			}, [
				h('input', {
					domProps: { value: this.value },
					on: { input: (event) => this.$emit('update:value', event.target.value) },
				}),
			]),
		])
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
	render(h) {
		const vnodes = []
		const triggerScope = {
			attrs: {
				'aria-haspopup': this.popupRole,
				'aria-expanded': String(!!this.shown),
			},
		}
		if (this.$scopedSlots.trigger) {
			vnodes.push(this.$scopedSlots.trigger(triggerScope))
		} else if (this.$slots.trigger) {
			vnodes.push(this.$slots.trigger)
		}
		if (this.$slots.default) {
			vnodes.push(this.$slots.default)
		}
		for (const name of Object.keys(this.$slots)) {
			if (name === 'default' || name === 'trigger') continue
			vnodes.push(this.$slots[name])
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
	functional: true,
	render(h, { props, data }) {
		const ts = props && props.timestamp
		// Render an ISO string for a Date object (the canonical, stable form
		// the cell/card specs assert against); fall back to String() for a
		// numeric epoch. `nc-date-time` matches the real component's class
		// hook so specs can target `time.nc-date-time`.
		let text = ''
		if (ts !== undefined && ts !== null) {
			text = ts instanceof Date ? ts.toISOString() : String(ts)
		}
		return h('time', { class: ['stub', 'NcDateTime', 'nc-date-time'], ...data }, text)
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
}

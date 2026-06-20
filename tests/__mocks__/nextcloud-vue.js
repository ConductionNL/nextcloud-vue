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
export const NcSelect = createStub('NcSelect')
export const NcSettingsSection = createStub('NcSettingsSection')
export const NcAppSidebar = createStub('NcAppSidebar')
export const NcAppSidebarTab = createStub('NcAppSidebarTab')
export const NcPopover = createStub('NcPopover')
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

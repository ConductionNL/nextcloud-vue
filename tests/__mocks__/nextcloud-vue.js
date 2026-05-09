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
export const NcButton = createStub('NcButton')
export const NcNoteCard = createStub('NcNoteCard')
export const NcLoadingIcon = createStub('NcLoadingIcon')
export const NcTextField = createStub('NcTextField')
export const NcCheckboxRadioSwitch = createStub('NcCheckboxRadioSwitch')
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

export default {
	NcDialog,
	NcButton,
	NcNoteCard,
	NcLoadingIcon,
	NcTextField,
	NcCheckboxRadioSwitch,
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
}

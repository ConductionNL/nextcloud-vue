/**
 * Mock for @nextcloud/vue — provides stub components for CnAdvancedFormDialog tests.
 */
const createStub = (name) => ({
	name,
	functional: true,
	render(h, { data, children }) {
		return h('div', { class: ['stub', name], ...data }, children)
	},
})

export const NcDialog = createStub('NcDialog')
export const NcButton = createStub('NcButton')
export const NcNoteCard = createStub('NcNoteCard')
export const NcLoadingIcon = createStub('NcLoadingIcon')
export const NcTextField = createStub('NcTextField')
export const NcCheckboxRadioSwitch = createStub('NcCheckboxRadioSwitch')
export const NcActions = createStub('NcActions')
export const NcActionButton = createStub('NcActionButton')

export default {
	NcDialog,
	NcButton,
	NcNoteCard,
	NcLoadingIcon,
	NcTextField,
	NcCheckboxRadioSwitch,
	NcActions,
	NcActionButton,
}

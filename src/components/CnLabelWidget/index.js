import CnLabelWidget from './CnLabelWidget.vue'
import CnLabelWidgetForm from '../CnLabelWidgetForm/CnLabelWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('label', {
	renderer: CnLabelWidget,
	form: CnLabelWidgetForm,
	defaultContent: {
		text: '',
		fontSize: '16px',
		color: '',
		backgroundColor: '',
		fontWeight: 'bold',
		textAlign: 'center',
	},
	displayName: 'Label',
	icon: 'FormatTitle',
})

export { CnLabelWidget }
export default CnLabelWidget

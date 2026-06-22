import CnDividerWidget from './CnDividerWidget.vue'
import CnDividerWidgetForm from '../CnDividerWidgetForm/CnDividerWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('divider', {
	renderer: CnDividerWidget,
	form: CnDividerWidgetForm,
	defaultContent: {
		style: 'line',
		lineColor: '',
		lineThickness: 1,
		lineStyle: 'solid',
		whitespaceSize: 'medium',
		headingText: '',
	},
	displayName: 'Divider',
	icon: 'Minus',
})

export { CnDividerWidget }
export default CnDividerWidget

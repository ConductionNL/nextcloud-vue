import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnDividerWidgetForm = lazyComponent(() => import('../CnDividerWidgetForm/CnDividerWidgetForm.vue'), 'CnDividerWidgetForm')
const LazyCnDividerWidget = lazyComponent(() => import('./CnDividerWidget.vue'), 'CnDividerWidget')

registerDashboardWidget('divider', {
	renderer: LazyCnDividerWidget,
	form: LazyCnDividerWidgetForm,
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
	minHeight: 1,
	noChrome: true,
})

export { default as CnDividerWidget } from './CnDividerWidget.vue'
export { default } from './CnDividerWidget.vue'

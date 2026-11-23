import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnLabelWidgetForm = lazyComponent(() => import('../CnLabelWidgetForm/CnLabelWidgetForm.vue'), 'CnLabelWidgetForm')
const LazyCnLabelWidget = lazyComponent(() => import('./CnLabelWidget.vue'), 'CnLabelWidget')

registerDashboardWidget('label', {
	renderer: LazyCnLabelWidget,
	form: LazyCnLabelWidgetForm,
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

export { default as CnLabelWidget } from './CnLabelWidget.vue'
export { default } from './CnLabelWidget.vue'

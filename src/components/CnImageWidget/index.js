/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnImageWidget — self-registers the `image` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnImageWidgetForm = lazyComponent(() => import('../CnImageWidgetForm/CnImageWidgetForm.vue'), 'CnImageWidgetForm')
const LazyCnImageWidget = lazyComponent(() => import('./CnImageWidget.vue'), 'CnImageWidget')

registerDashboardWidget('image', {
	placeholder: 'block',
	renderer: LazyCnImageWidget,
	form: LazyCnImageWidgetForm,
	defaultContent: {
		url: '',
		alt: '',
		link: '',
		fit: 'cover',
	},
	displayName: 'Image',
	icon: 'Camera',
})

export { default as CnImageWidget } from './CnImageWidget.vue'
export { default } from './CnImageWidget.vue'

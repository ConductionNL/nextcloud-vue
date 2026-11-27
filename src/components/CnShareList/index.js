/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnShareList - self-registers the `share-list` widget type (the shares of a
 * record outside the organisation, with Copy link and Revoke) into the shared
 * dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnShareList = lazyComponent(() => import('./CnShareList.vue'), 'CnShareList')

registerDashboardWidget('share-list', {
	placeholder: 'rows',
	renderer: LazyCnShareList,
	form: null,
	defaultContent: { url: '', revoke: { url: '' } },
	displayName: 'Shares',
	icon: 'ShareVariantOutline',
	surfaces: ['detail-page', 'app-dashboard'],
})

export { default as CnShareList } from './CnShareList.vue'
export { default } from './CnShareList.vue'

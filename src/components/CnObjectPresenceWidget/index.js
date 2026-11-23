// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnObjectPresenceWidget = lazyComponent(() => import('./CnObjectPresenceWidget.vue'), 'CnObjectPresenceWidget')

// 🔑 `surfaces: ['detail-page']` AND NO FORM, DELIBERATELY. Presence is about
// the record a page is showing, so it means nothing on an app dashboard, and it
// has nothing to configure: its address comes from the surface. A renderer-only
// entry is excluded from the Add-widget picker by `listWidgetTypes()`, which is
// right — it is placed by a manifest, not chosen from a menu.
registerDashboardWidget('presence', {
	renderer: LazyCnObjectPresenceWidget,
	form: null,
	defaultContent: {},
	displayName: 'Who else is here',
	icon: 'AccountMultipleOutline',
	surfaces: ['detail-page'],
})

export { default } from './CnObjectPresenceWidget.vue'
export { default as CnObjectPresenceWidget } from './CnObjectPresenceWidget.vue'

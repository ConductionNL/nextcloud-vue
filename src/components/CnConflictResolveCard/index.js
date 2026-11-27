/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnConflictResolveCard - self-registers the `conflict-resolve` widget type
 * (the two versions of a conflict record side by side, one button per
 * version) into the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnConflictResolveCard = lazyComponent(() => import('./CnConflictResolveCard.vue'), 'CnConflictResolveCard')

registerDashboardWidget('conflict-resolve', {
	placeholder: 'block',
	renderer: LazyCnConflictResolveCard,
	form: null,
	defaultContent: {
		source: { register: '', schema: '', filter: { resolution: { isnull: true } } },
		resolve: { url: '' },
	},
	displayName: 'Conflict resolution',
	icon: 'AlertOctagonOutline',
	surfaces: ['detail-page', 'app-dashboard'],
})

export { default as CnConflictResolveCard } from './CnConflictResolveCard.vue'
export { default } from './CnConflictResolveCard.vue'

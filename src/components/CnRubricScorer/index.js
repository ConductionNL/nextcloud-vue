/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRubricScorer — self-registers the `rubric-scorer` widget type (scores a
 * record against a rubric's criteria and levels, saved in one request with an
 * optional transition after it) into the shared dashboardWidgetRegistry at
 * module load. Renderer only: declared in the manifest.
 */

import CnRubricScorer from './CnRubricScorer.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('rubric-scorer', {
	renderer: CnRubricScorer,
	form: null,
	defaultContent: {
		rubric: {},
		field: 'rubricScores',
		requireAll: true,
	},
	displayName: 'Rubric scorer',
	icon: 'TableCheck',
	surfaces: ['detail-page'],
})

export { CnRubricScorer }
export default CnRubricScorer

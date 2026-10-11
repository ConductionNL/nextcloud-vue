/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSectionsWidget — self-registers the `sections` widget type (several
 * widgets in one place, each under its own heading, optionally as cards in a
 * main and a side column) into the shared dashboardWidgetRegistry at module
 * load. Renderer only: the sections are declared in the manifest.
 */

import CnSectionsWidget from './CnSectionsWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('sections', {
	renderer: CnSectionsWidget,
	form: null,
	defaultContent: {
		sections: [],
		cards: false,
		hideEmpty: true,
	},
	displayName: 'Sections',
	icon: 'ViewSequential',
	// Renders OTHER widgets, so CnDetailWidgetHost hands it the surface's
	// sibling definitions and the context its children need.
	container: true,
	// The section headings are the titles; a card header above them would
	// name the group twice.
	ownsTitle: true,
	surfaces: ['detail-page'],
})

export { CnSectionsWidget }
export default CnSectionsWidget

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `mail` widget type (CnMailTab: drafts in Nextcloud Mail from
 * a template or empty, above the mail linked to the record) in the shared
 * dashboardWidgetRegistry. Renderer only: the endpoints and texts are
 * declared in the manifest. The file name keeps it in the package's
 * `sideEffects` allowlist, so a bundler does not drop the registration.
 *
 * @spec openspec/changes/mail-widget-kept-in-dist/specs/widget-registration/spec.md
 */

import CnMailTab from './CnMailTab.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('mail', {
	renderer: CnMailTab,
	form: null,
	defaultContent: {
		templates: null,
		draft: null,
		linkedMail: true,
	},
	displayName: 'Mail',
	icon: 'EmailOutline',
	surfaces: ['detail-page'],
})

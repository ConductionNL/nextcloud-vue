/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFilesWidget — self-registers the `files` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnFilesWidget from './CnFilesWidget.vue'
import CnFilesWidgetForm from '../CnFilesWidgetForm/CnFilesWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('files', {
	renderer: CnFilesWidget,
	form: CnFilesWidgetForm,
	defaultContent: {
		// Default to root so a new Files widget shows content + passes validation
		// out of the box (an empty path renders "Folder no longer exists").
		folderPath: '/',
		fileId: null,
		viewMode: 'list',
		showThumbnails: true,
		mimeTypeFilter: [],
		allowUpload: false,
		allowDelete: false,
		sortBy: 'name',
		sortDescending: false,
	},
	displayName: 'Files',
	icon: 'Folder',
})

export { CnFilesWidget }
export default CnFilesWidget

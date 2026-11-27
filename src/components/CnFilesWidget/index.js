/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFilesWidget — self-registers the `files` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnFilesWidgetForm = lazyComponent(() => import('../CnFilesWidgetForm/CnFilesWidgetForm.vue'), 'CnFilesWidgetForm')
const LazyCnFilesWidget = lazyComponent(() => import('./CnFilesWidget.vue'), 'CnFilesWidget')

registerDashboardWidget('files', {
	placeholder: 'rows',
	renderer: LazyCnFilesWidget,
	form: LazyCnFilesWidgetForm,
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

export { default as CnFilesWidget } from './CnFilesWidget.vue'
export { default } from './CnFilesWidget.vue'

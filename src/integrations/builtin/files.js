/**
 * Built-in `files` integration registration.
 *
 * Maps the always-available Nextcloud Files attachment integration
 * (PHP-side: `OCA\OpenRegister\Service\Integration\BuiltinProviders\
 * FilesProvider`, storage strategy `magic-column`) onto its existing
 * sidebar tab (`CnFilesTab`) and the compact `CnFilesCard` widget.
 *
 * The descriptor here mirrors the PHP provider's metadata so the
 * frontend and backend stay in lockstep (id / icon / group / order).
 *
 * @module integrations/builtin/files
 */

import { translate as t } from '@nextcloud/l10n'
import CnFilesTab from '../../components/CnObjectSidebar/CnFilesTab.vue'
import CnFilesCard from '../../components/CnFilesCard/CnFilesCard.vue'

/**
 * `files` integration descriptor — pass to `integrations.register()`.
 *
 * @type {object}
 */
export const filesIntegration = {
	id: 'files',
	label: t('nextcloud-vue', 'Files'),
	icon: 'Paperclip',
	requiredApp: null,
	order: 1,
	group: 'core',
	referenceType: 'files',
	tab: CnFilesTab,
	widget: CnFilesCard,
	defaultSize: { w: 4, h: 3 },
}

export default filesIntegration

/**
 * Built-in `tags` integration registration.
 *
 * Maps the always-available Nextcloud system-tags integration
 * (PHP-side: `TagsProvider`, storage strategy `link-table`) onto the
 * existing `CnTagsTab` sidebar tab and the compact `CnTagsCard`
 * widget.
 *
 * @module integrations/builtin/tags
 */

import { translate as t } from '@nextcloud/l10n'
import { lazyComponent } from '../../utils/lazyComponent.js'

const CnTagsTab = lazyComponent(() => import('../../components/CnObjectSidebar/CnTagsTab.vue'), 'CnTagsTab')
const CnTagsCard = lazyComponent(() => import('../../components/CnTagsCard/CnTagsCard.vue'), 'CnTagsCard')

/**
 * `tags` integration descriptor.
 *
 * @type {object}
 */
export const tagsIntegration = {
	id: 'tags',
	label: t('nextcloud-vue', 'Tags'),
	icon: 'TagOutline',
	requiredApp: null,
	order: 3,
	group: 'core',
	referenceType: 'tags',
	tab: CnTagsTab,
	widget: CnTagsCard,
	defaultSize: { w: 4, h: 2 },
}

export default tagsIntegration

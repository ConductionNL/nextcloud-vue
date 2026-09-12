/**
 * Built-in `audit-trail` integration registration.
 *
 * Maps the always-available, read-only audit-trail integration
 * (PHP-side: `AuditTrailProvider`, storage strategy `query-time` —
 * no link table, computed per request) onto the existing
 * `CnAuditTrailTab` sidebar tab and the compact `CnAuditTrailCard`
 * widget.
 *
 * @module integrations/builtin/audit-trail
 */

import { translate as t } from '@nextcloud/l10n'
import CnAuditTrailCard from '../../components/CnAuditTrailCard/CnAuditTrailCard.vue'
import CnAuditTrailTab from '../../components/CnObjectSidebar/CnAuditTrailTab.vue'

/**
 * `audit-trail` integration descriptor.
 *
 * @type {object}
 */
export const auditTrailIntegration = {
	id: 'audit-trail',
	label: t('nextcloud-vue', 'Audit trail'),
	icon: 'History',
	requiredApp: null,
	order: 5,
	group: 'core',
	referenceType: 'audit-trail',
	tab: CnAuditTrailTab,
	widget: CnAuditTrailCard,
	defaultSize: { w: 4, h: 3 },
}

export default auditTrailIntegration

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Built-in `version-history` integration registration.
 *
 * Distinct from the existing `audit-trail` integration (raw event
 * log) — `version-history` renders `CnVersionHistory`, a structural
 * field-by-field diff viewer built on the same audit-trail data
 * (query-time storage strategy per AD-22, no link table). Registered
 * under its own id so it is additive and never collides with or
 * replaces the existing `audit-trail` descriptor.
 *
 * @module integrations/builtin/version-history
 */

import { translate as t } from '@nextcloud/l10n'
import CnVersionHistory from '../../components/CnVersionHistory/CnVersionHistory.vue'

/**
 * `version-history` integration descriptor.
 *
 * @type {object}
 */
export const versionHistoryIntegration = {
	id: 'version-history',
	label: t('nextcloud-vue', 'Version history'),
	icon: 'FileCompare',
	requiredApp: null,
	order: 6,
	group: 'core',
	referenceType: 'version-history',
	tab: CnVersionHistory,
	widget: CnVersionHistory,
	defaultSize: { w: 4, h: 3 },
}

export default versionHistoryIntegration

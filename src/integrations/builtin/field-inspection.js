/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Built-in `field-inspection` integration registration (offline field
 * data-collection leaf).
 *
 * Surfaces the generic offline data-collection core (IndexedDB cache, mutation
 * queue, replay-on-reconnect, sync-state indicator — see
 * `src/integrations/offline/`) as a registry leaf with a sidebar tab and a
 * surface-aware widget. The checklist fields and the "today's planned items"
 * query are NOT hardcoded: they come from the integration's `offlineConfig`,
 * which a consuming app supplies when it registers an override of this id (or
 * relies on the per-object `integrationContext` for register/schema).
 *
 * Default registration uses the canonical `fieldInspection` / `checklistResult`
 * schema names; a consuming app (e.g. procest) registers the SAME id first with
 * its own `offlineConfig` to point the leaf at its schemas — AD-13 first-wins
 * collision policy keeps the consumer's config.
 *
 * @module integrations/builtin/field-inspection
 */

import { translate as t } from '@nextcloud/l10n'
import CnFieldInspectionTab from './field-inspection/CnFieldInspectionTab.vue'
import CnFieldInspectionCard from './field-inspection/CnFieldInspectionCard.vue'

/**
 * Default offline configuration for the field-inspection leaf.
 *
 * A consuming app overrides any of these by registering the `field-inspection`
 * id with its own `offlineConfig` before `registerBuiltinIntegrations()` runs.
 *
 * @type {object}
 */
export const DEFAULT_FIELD_INSPECTION_CONFIG = {
	// Schema holding the planned items (the inspections to do today).
	plannedSchema: 'fieldInspection',
	// Schema holding the checklist templates referenced by planned items.
	referenceSchema: 'inspectionChecklist',
	// Property on a planned item that references its checklist template.
	templateRefField: 'checklistTemplateRef',
	// Schema the completed checklist result is written back to (the queued create).
	resultSchema: 'checklistResult',
	// Planning filter: property holding the assignee + the scheduled-date field.
	assigneeField: 'inspectorRef',
	dateField: 'scheduledAt',
	// Property on a planned item used as its display title.
	titleField: 'caseRef',
}

/**
 * `field-inspection` integration descriptor.
 *
 * @type {object}
 */
export const fieldInspectionIntegration = {
	id: 'field-inspection',
	label: t('nextcloud-vue', 'Field inspections'),
	appName: t('nextcloud-vue', 'Field inspections'),
	icon: 'ClipboardCheckOutline',
	order: 68,
	group: 'workflow',
	referenceType: 'field-inspection',
	accentColor: '#21468B',
	offlineConfig: DEFAULT_FIELD_INSPECTION_CONFIG,
	tab: CnFieldInspectionTab,
	widget: CnFieldInspectionCard,
	defaultSize: { w: 4, h: 4 },
}

export default fieldInspectionIntegration

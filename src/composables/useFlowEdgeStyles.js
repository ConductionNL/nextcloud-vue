/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The routers a connection may be drawn with — the ONE list.
 *
 * `useFlowStore.canvasEdges` reads `edge.lineType` and CnFlowEdge switches on
 * it; the editor now lets an author change it from a context menu and from the
 * connection dialog. That is three readers and two writers of the same closed
 * vocabulary, which is exactly the shape that drifts: a fourth `step` router
 * offered by a menu but unknown to the edge would draw as the smoothstep
 * default and the control would silently do nothing.
 *
 * Labels are FUNCTIONS, not strings. `t()` has to run after the locale is
 * available, and a module-level constant evaluates at import time — which is
 * before a Nextcloud page has installed its translations, so every label would
 * be pinned to English for the life of the bundle.
 */
import { translate as t } from '@nextcloud/l10n'

/**
 * @type {Array<{id: string, label: Function}>}
 */
export const EDGE_LINE_TYPES = Object.freeze([
	{
		id: 'smoothstep',
		label: () => t('nextcloud-vue', 'Angled'),
	},
	{
		id: 'straight',
		label: () => t('nextcloud-vue', 'Straight'),
	},
	{
		id: 'default',
		label: () => t('nextcloud-vue', 'Curved'),
	},
])

/**
 * The router a line is drawn with when its edge does not name one.
 *
 * Stated here rather than defaulted separately in each reader: `canvasEdges`,
 * CnFlowEdge and both editing surfaces all had to agree that an absent
 * `lineType` means angled, and four independent `|| 'smoothstep'`s is three
 * chances to disagree.
 *
 * @type {string}
 */
export const DEFAULT_EDGE_LINE_TYPE = 'smoothstep'

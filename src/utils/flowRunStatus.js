/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * The run statuses a flow list distinguishes, as label and pill colour.
 *
 * The engine's own vocabulary (`FlowRun::STATUS_*`). A status the engine
 * adds later falls through to its raw value with the neutral colour rather
 * than disappearing.
 *
 * @return {Record<string, {label: string, variant: string}>} By engine status.
 */
export function flowRunStatuses() {
	return {
		completed: { label: t('nextcloud-vue', 'Finished'), variant: 'success' },
		failed: { label: t('nextcloud-vue', 'Failed'), variant: 'error' },
		dead_letter: { label: t('nextcloud-vue', 'Failed'), variant: 'error' },
		stopped: { label: t('nextcloud-vue', 'Stopped early'), variant: 'warning' },
		queued: { label: t('nextcloud-vue', 'Queued'), variant: 'info' },
		running: { label: t('nextcloud-vue', 'Running'), variant: 'info' },
		suspended: { label: t('nextcloud-vue', 'Waiting'), variant: 'info' },
		awaiting_consent: { label: t('nextcloud-vue', 'Awaiting consent'), variant: 'warning' },
	}
}

/**
 * The engine statuses a "with errors" filter counts as an error.
 */
export const FLOW_RUN_ERROR_STATUSES = ['failed', 'dead_letter']

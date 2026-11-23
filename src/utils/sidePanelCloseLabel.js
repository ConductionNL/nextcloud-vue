/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @module utils/sidePanelCloseLabel
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * Name an NcAppSidebar's close button "Close side panel" (nl "Zijpaneel
 * sluiten"), as the boards name the side panel. NcAppSidebar offers no prop
 * for it: it keeps the name in its `closeTranslated` data, which feeds both
 * the button's aria-label and its title.
 *
 * @param {object|null|undefined} sidebar The NcAppSidebar instance (a ref).
 * @return {void}
 * @spec openspec/changes/side-panel-close-label/specs/side-panel-close-label/spec.md
 */
export function labelSidePanelClose(sidebar) {
	if (sidebar && typeof sidebar === 'object' && 'closeTranslated' in sidebar) {
		sidebar.closeTranslated = t('nextcloud-vue', 'Close side panel')
	}
}

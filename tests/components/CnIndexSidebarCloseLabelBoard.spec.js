/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Boards DqZakenSorteren and DqFilterInMenu name the index sidebar's close
 * button "Zijpaneel sluiten"; Nextcloud's sidebar says "Zijbalk sluiten". The
 * board look renames it; the Nextcloud look keeps Nextcloud's word.
 *
 * @spec openspec/changes/sidebar-close-label-board/specs/index-sidebar/spec.md#requirement-the-board-look-names-the-close-button-close-side-panel
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

// The jest @nextcloud/vue mock has no close button; this stand-in keeps the
// real component's `closeTranslated` data and the button that reads it.
const NcAppSidebar = {
	name: 'NcAppSidebar',
	data: () => ({ closeTranslated: 'Close sidebar' }),
	template: '<aside><button class="app-sidebar__close" :aria-label="closeTranslated" :title="closeTranslated" /><slot /></aside>',
}

/**
 * @param {string} look The provided look.
 * @return {object} The wrapper.
 */
function mountSidebar(look) {
	return mount(CnIndexSidebar, {
		props: { open: true },
		global: { provide: { cnLook: look }, stubs: { NcSelect: true, NcAppSidebar, NcAppSidebarTab: { template: '<div><slot /></div>' } } },
	})
}

/**
 * @param {object} wrapper The mounted sidebar.
 * @return {string} The close button's accessible name.
 */
async function closeLabel(wrapper) {
	await nextTick()
	return wrapper.find('.app-sidebar__close').attributes('aria-label')
}

describe('the index sidebar close button', () => {
	it('reads "Close side panel" on the board look', async () => {
		expect(await closeLabel(mountSidebar('board'))).toBe('Close side panel')
	})

	it('keeps Nextcloud\'s label on the Nextcloud look', async () => {
		expect(await closeLabel(mountSidebar('nextcloud'))).toBe('Close sidebar')
	})
})

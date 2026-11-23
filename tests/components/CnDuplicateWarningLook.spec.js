/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The duplicate warning opened from code is mounted outside CnAppRoot, so it
 * takes the look from its caller or from the page (DqNieuweZaakDubbel: the
 * warning was drawn in the Nextcloud look, 400px wide, on a board page).
 */
import { flushPromises } from '@vue/test-utils'
import { openDuplicateWarning } from '../../src/utils/openDuplicateWarning.js'

jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

const MATCHES = [{ uuid: 'c-1', score: 1, matchedOn: ['requester', 'title'] }]

afterEach(() => {
	document.body.innerHTML = ''
})

describe('openDuplicateWarning look', () => {
	it('draws the warning in the board look on a board page', async () => {
		const page = document.createElement('div')
		page.className = 'cn-look-board'
		document.body.appendChild(page)
		const decided = openDuplicateWarning({ matches: MATCHES })
		await flushPromises()
		expect(document.querySelector('.cn-dialog-board')).not.toBeNull()
		document.querySelector('[data-testid="cn-duplicate-warning-cancel"]').click()
		await decided
	})

	it('keeps the Nextcloud look elsewhere', async () => {
		const decided = openDuplicateWarning({ matches: MATCHES })
		await flushPromises()
		expect(document.querySelector('.cn-dialog-board')).toBeNull()
		document.querySelector('[data-testid="cn-duplicate-warning-cancel"]').click()
		await decided
	})
})

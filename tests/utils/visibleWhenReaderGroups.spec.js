/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `readerGroups` in visibleWhen: the condition holds when the reader is in at
 * least one listed Nextcloud group (dossiq's advice request actions, shown to
 * bezwaarcommissie members and administrators only).
 *
 * @spec openspec/changes/visible-when-reader-groups/specs/visible-when-reader-groups/spec.md#requirement-a-visiblewhen-condition-can-require-the-reader-to-be-in-a-group
 */
import axios from '@nextcloud/axios'
import { computed } from 'vue'
import {
	evaluateVisibleWhen,
	evaluateVisibleWhenLocal,
	isLocallyDecidableVisibleWhen,
} from '../../src/utils/visibleWhen.js'
import { resetVisibilityCache } from '../../src/utils/widgetVisibility.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({
	generateOcsUrl: (path, params) => '/ocs/v2.php' + path.replace('{userId}', params && params.userId),
	generateUrl: (path) => path,
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const COMMITTEE = { readerGroups: ['bezwaarcommissie', 'admin'] }
const IN_DELIBERATION = {
	all: [
		COMMITTEE,
		{ field: 'status', op: 'eq', value: 'in-deliberation' },
	],
}
const RECORD = { status: 'in-deliberation' }

/**
 * Answer the groups request with these ids.
 *
 * @param {string[]} groups The group ids.
 */
function answerGroups(groups) {
	axios.get.mockResolvedValue({ data: { ocs: { data: { groups } } } })
}

describe('visibleWhen readerGroups', () => {
	beforeEach(() => {
		resetVisibilityCache()
		axios.get.mockReset()
		window.OC = { currentUser: 'anouk' }
	})

	it('shows the action to a committee member', async () => {
		answerGroups(['bezwaarcommissie'])
		expect(await evaluateVisibleWhen(IN_DELIBERATION, { object: RECORD })).toBe(true)
	})

	it('hides the action from a reader outside the listed groups', async () => {
		answerGroups(['behandelaars'])
		expect(await evaluateVisibleWhen(IN_DELIBERATION, { object: RECORD })).toBe(false)
	})

	it('shows the action to an administrator through the admin group', async () => {
		answerGroups(['admin'])
		expect(await evaluateVisibleWhen(IN_DELIBERATION, { object: RECORD })).toBe(true)
	})

	it('still needs the field condition next to it', async () => {
		answerGroups(['bezwaarcommissie'])
		expect(await evaluateVisibleWhen(IN_DELIBERATION, { object: { status: 'assigned' } })).toBe(false)
		expect(await evaluateVisibleWhen({ ...COMMITTEE, field: 'status', value: 'in-deliberation' }, { object: RECORD })).toBe(true)
		expect(await evaluateVisibleWhen({ ...COMMITTEE, field: 'status', value: 'assigned' }, { object: RECORD })).toBe(false)
	})

	it('is the whole condition on its own', async () => {
		answerGroups(['bezwaarcommissie'])
		expect(await evaluateVisibleWhen(COMMITTEE, {})).toBe(true)
	})

	it('reads false when the group lookup fails', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		expect(await evaluateVisibleWhen(COMMITTEE, {})).toBe(false)
	})

	it('reads false for a signed-out reader and for an empty list', async () => {
		answerGroups(['bezwaarcommissie'])
		expect(await evaluateVisibleWhen({ readerGroups: [] }, {})).toBe(false)
		window.OC = {}
		expect(await evaluateVisibleWhen(COMMITTEE, {})).toBe(false)
		expect(evaluateVisibleWhenLocal(COMMITTEE, {})).toBe(false)
	})

	it('fetches the groups once for every condition on the page', async () => {
		answerGroups(['bezwaarcommissie'])
		await Promise.all([
			evaluateVisibleWhen(IN_DELIBERATION, { object: RECORD }),
			evaluateVisibleWhen(COMMITTEE, {}),
			evaluateVisibleWhen({ ...COMMITTEE, field: 'status', value: 'assigned' }, { object: RECORD }),
		])
		evaluateVisibleWhenLocal(IN_DELIBERATION, RECORD)
		expect(axios.get).toHaveBeenCalledTimes(1)
	})

	it('stays hidden in the local evaluation while the groups load, then shows', async () => {
		answerGroups(['bezwaarcommissie'])
		const shown = computed(() => evaluateVisibleWhenLocal(IN_DELIBERATION, RECORD))
		expect(shown.value).toBe(false)
		await flush()
		expect(shown.value).toBe(true)
		expect(evaluateVisibleWhenLocal(IN_DELIBERATION, { status: 'assigned' })).toBe(false)
	})

	it('hides in the local evaluation for a non-member once the groups are known', async () => {
		answerGroups(['behandelaars'])
		evaluateVisibleWhenLocal(COMMITTEE, RECORD)
		await flush()
		expect(evaluateVisibleWhenLocal(COMMITTEE, RECORD)).toBe(false)
		expect(evaluateVisibleWhenLocal({ ...COMMITTEE, field: 'status', value: 'in-deliberation' }, RECORD)).toBe(false)
	})

	it('is locally decidable, so a surface that skips undecidable gates still hides it', () => {
		expect(isLocallyDecidableVisibleWhen(IN_DELIBERATION)).toBe(true)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The readiness rows of the closing setup step (board DqInstellenKlaar).
 *
 * @spec openspec/changes/setup-summary-readiness-rows/specs/setup-summary-readiness-rows/spec.md
 */

const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default

const { readinessRows } = CnSetupWizard.methods
const { stepConditionHolds } = CnSetupWizard.methods

function host(extra = {}) {
	return {
		isBoard: true,
		cnTranslate: (key) => key,
		summaryItems: [{ id: 'org', title: 'Organisation', value: 'Name: Zuiddrecht', done: true }],
		setupStatus: { mail: { configured: false } },
		stepConditionHolds,
		...extra,
	}
}

describe('readinessRows', () => {
	it('takes a step row from the recap of that step', () => {
		const rows = readinessRows.call(host(), { rows: [{ step: 'org', link: { label: 'General', href: '/x' } }] })
		expect(rows).toEqual([{ id: 'org', title: 'Organisation', detail: 'Name: Zuiddrecht', done: true, link: { label: 'General', href: '/x' } }])
	})

	it('reads a free row from the setup status and says what is open', () => {
		const step = { rows: [{ id: 'mail', title: 'E-mail', detail: 'Mail works', detailWhenOpen: 'No mail server', doneWhen: 'mail.configured' }] }
		expect(readinessRows.call(host(), step)[0]).toMatchObject({ done: false, detail: 'No mail server' })
		const ready = host({ setupStatus: { mail: { configured: true } } })
		expect(readinessRows.call(ready, step)[0]).toMatchObject({ done: true, detail: 'Mail works' })
	})

	it('holds a row without a condition open', () => {
		expect(readinessRows.call(host(), { rows: [{ id: 'x', title: 'X' }] })[0].done).toBe(false)
	})

	it('draws nothing outside the board look', () => {
		expect(readinessRows.call(host({ isBoard: false }), { rows: [{ step: 'org' }] })).toEqual([])
	})
})

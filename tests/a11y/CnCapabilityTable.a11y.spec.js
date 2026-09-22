/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnCapabilityTable`.
 *
 * 🔑 THIS LANE IS THE ONLY ONE THAT SEES THE REAL COMPONENTS. `jest.config.js`
 * mocks `@nextcloud/vue` down to permissive stubs, so the unit spec beside this
 * one asserts behaviour against a bare `<input>` and could never tell a labelled
 * field from an unlabelled one. Here the real `NcTextField` renders, which is
 * what makes the `label` assertion mean anything.
 *
 * 🔑 THE FILTER IS THE RISK. A table that rewrites its own body on every
 * keystroke is where headers, captions and row scope quietly go missing, so the
 * scan runs on the filtered state as well as the full one.
 *
 * 🔑 MADE TO FAIL BEFORE IT WAS TRUSTED, AND THE RESULT CHANGED THIS FILE.
 * Dropping the `label` prop from the search field reddens exactly one test,
 * "gives the search box a name a screen reader can read", on line 96. The four
 * axe scans above it stayed GREEN through that mutation: `NcInputField` warns
 * in the console and renders an input with no accessible name, and axe's own
 * label rule did not fire on it in jsdom. So the structural assertion is not a
 * belt beside a working brace, it is the only thing holding this up. Do not
 * delete it in favour of the scans.
 */

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnCapabilityTable = require('../../src/components/CnCapabilityTable/CnCapabilityTable.vue').default

const comparison = {
	systems: [
		{ key: 'dossiq', name: 'Dossiq', isSelf: true },
		{ key: 'opencase', name: 'OpenCase' },
	],
	areas: [
		{ key: 'intake', name: 'Intake' },
		{ key: 'documents', name: 'Documents' },
	],
	features: [
		{ key: 'case-types', name: 'Case types' },
		{ key: 'filing', name: 'Filing' },
	],
	providers: [
		{ key: 'dossiq', name: 'Dossiq', kind: 'self' },
		{ key: 'openregister', name: 'OpenRegister', kind: 'app' },
		{ key: 'nextcloud', name: 'Nextcloud', kind: 'platform' },
	],
	capabilities: [
		{ id: '1.1', area: 'intake', name: 'Citizen web form', dossiq: 'partial', opencase: 'no', provider: 'dossiq', feature: 'case-types' },
		{ id: '4.1', area: 'documents', name: 'Versioned documents', dossiq: 'yes', opencase: 'yes', provider: 'nextcloud', feature: 'filing', featureConfidence: 'low' },
		{ id: '4.2', area: 'documents', name: 'Retention schedule', dossiq: 'yes', opencase: 'unknown', provider: 'openregister', feature: 'filing' },
	],
}

const legacyComparison = {
	systems: [{ key: 'dossiq', name: 'Dossiq', isSelf: true }],
	areas: [{ key: 'intake', name: 'Intake' }],
	capabilities: [{ id: '1.1', area: 'intake', name: 'Citizen web form', dossiq: 'partial' }],
}

describe('CnCapabilityTable — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations with every optional field in the document', async () => {
		wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations on the document a consumer has today', async () => {
		wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison: legacyComparison } })

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations once a filter has emptied the table', async () => {
		wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })
		await wrapper.setData({ query: 'nothing matches this' })

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations grouped by area', async () => {
		wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison, groupBy: 'area' } })

		await expectAccessible(wrapper)
	})

	describe('the structure axe cannot check for you', () => {
		it('gives the search box a name a screen reader can read', () => {
			wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })

			const input = wrapper.element.querySelector('input')
			const labelledBy = input.getAttribute('aria-label')
				|| (input.id && wrapper.element.querySelector(`label[for="${input.id}"]`)?.textContent?.trim())
			expect(labelledBy).toContain('Search capabilities')
		})

		it('keeps every group a real table with a caption and column headers', () => {
			wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })

			const tables = [...wrapper.element.querySelectorAll('table')]
			expect(tables.length).toBe(2)
			tables.forEach((table) => {
				expect(table.querySelector('caption').textContent.trim()).not.toBe('')
				expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0)
				expect(table.querySelectorAll('tbody th[scope="row"]').length)
					.toBe(table.querySelectorAll('tbody tr').length)
			})
		})

		it('is still a table with headers after a filter has narrowed it', async () => {
			wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })
			await wrapper.setData({ query: 'retention' })

			const table = wrapper.element.querySelector('table')
			expect(table.querySelector('caption')).not.toBeNull()
			expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0)
			expect(table.querySelectorAll('tbody tr').length).toBe(1)
			expect(table.querySelector('tbody th[scope="row"]').textContent.trim())
				.toContain('Retention schedule')
		})

		it('announces the row count through a live region rather than silently', () => {
			wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })

			const status = wrapper.element.querySelector('[role="status"]')
			expect(status).not.toBeNull()
			expect(status.textContent.trim()).toBe('You see 3 capabilities of 3.')
		})

		it('says which kind of provider each row has in words, not in colour', () => {
			wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })

			const kinds = [...wrapper.element.querySelectorAll('.cn-capability-table__provider-kind')]
				.map((node) => node.textContent.trim())
			expect(kinds).toEqual(['this app', 'the platform', 'another app'])
		})

		it('gives the low-confidence marker words as well as a glyph', () => {
			wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })

			const marker = wrapper.element.querySelector('.cn-capability-table__confidence')
			expect(marker.getAttribute('title')).toBe('We matched this row to its feature by judgement.')
			expect(marker.querySelector('.cn-capability-table__sr-only').textContent.trim())
				.toBe('We matched this row to its feature by judgement.')
		})

		it('marks the active grouping with aria-pressed on a native button', () => {
			wrapper = mountAttached(CnCapabilityTable, { propsData: { comparison } })

			const group = wrapper.element.querySelector('.cn-capability-table__grouping')
			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-label')).toBe('Group the capabilities')
			const pressed = [...group.querySelectorAll('button')].map((b) => b.getAttribute('aria-pressed'))
			expect(pressed).toEqual(['true', 'false'])
		})
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An applied saved view lights the lens chip it narrows within: DqFilterInMenu
 * shows Pieter's "Termijn deze week" (handler me, deadline this week) with the
 * "Termijn deze week" chip active, not "Alles". The chip whose filter the
 * view's conditions hold, most specific first; none when no chip fits; and a
 * chip the reader picks afterwards wins.
 *
 * @spec openspec/changes/applied-view-lights-its-lens/specs/applied-view-lights-its-lens/spec.md
 */
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const BASE = { statusHiddenInLists: false, isDraft: false }
const TABS = [
	{ label: 'All', filter: { ...BASE }, default: true },
	{ label: 'Mine', filter: { assignee: '@me', isFinalStatus: false, ...BASE } },
	{ label: 'Due this week', filter: { isFinalStatus: false, ...BASE, 'deadline[gte]': '@today', 'deadline[lt]': '@today+7d' } },
	{ label: 'Waiting on the applicant', filter: { waitingOnApplicant: true, isFinalStatus: false, ...BASE } },
]
const WEEK = { id: 7, name: 'Termijn deze week', query: { filters: { assignee: '@me', isFinalStatus: false, ...BASE, 'deadline[gte]': '@today', 'deadline[lt]': '@today+7d' } } }
const WAITING = { id: 8, name: 'Wacht op inwoner', query: { filters: { waitingOnApplicant: true }, overrides: { lockedFilters: { isFinalStatus: false, ...BASE } } } }
const OTHER = { id: 9, name: 'Team', query: { filters: { assignedGroup: 'woo' } } }

/**
 * The page context for the two computeds.
 *
 * @param {object|null} view The applied view.
 * @param {boolean} byHand Whether the reader picked a chip after it.
 * @return {object} The context.
 */
function page(view, byHand = false) {
	const ctx = { tabStripEntries: TABS, appliedSavedView: view, lensChosenByHand: byHand, activeQuickFilterIndex: 0, quickFilterMultiple: false }
	ctx.appliedViewLensIndex = CnIndexPage.computed.appliedViewLensIndex.call(ctx)
	return ctx
}

describe('CnIndexPage, an applied view and the lens chips', () => {
	it('lights the most specific chip the view narrows within', () => {
		expect(CnIndexPage.computed.shownQuickFilterIndex.call(page(WEEK))).toBe(2)
	})

	it('reads a view\'s locked conditions too', () => {
		expect(CnIndexPage.computed.shownQuickFilterIndex.call(page(WAITING))).toBe(3)
	})

	it('keeps the active chip when no chip fits, without a view, or once the reader picked one', () => {
		expect(CnIndexPage.computed.shownQuickFilterIndex.call(page(OTHER))).toBe(0)
		expect(CnIndexPage.computed.shownQuickFilterIndex.call(page(null))).toBe(0)
		expect(CnIndexPage.computed.shownQuickFilterIndex.call(page(WEEK, true))).toBe(0)
	})
})

describe('CnIndexPage, the count line under an applied view', () => {
	/**
	 * The count line's context.
	 *
	 * @param {object|null} view The applied view.
	 * @param {string} savedViewCountText The page's template.
	 * @return {object} The context.
	 */
	function line(view, savedViewCountText = '{shown} of {total} open cases · {view} · sorted by deadline') {
		return {
			activeScopePresentation: {},
			countTextByView: null,
			currentViewMode: 'table',
			savedViewCountText,
			appliedSavedView: view,
			presented: () => '{shown} of {total} open cases in your teams, sorted by deadline',
			viewFilterSummary: () => 'Deadline within 7 days',
		}
	}

	it('names the applied view\'s conditions by its description', () => {
		const ctx = line({ ...WEEK, description: 'Mijn zaken, termijn binnen 7 dagen' })
		expect(CnIndexPage.computed.presentedCountText.call(ctx)).toBe('{shown} of {total} open cases · {view} · sorted by deadline')
		expect(CnIndexPage.computed.appliedViewConditionsText.call(ctx)).toBe('mijn zaken, termijn binnen 7 dagen')
	})

	it('falls back to the view\'s filter summary, and to the page line without a view or a template', () => {
		expect(CnIndexPage.computed.appliedViewConditionsText.call(line(WEEK))).toBe('deadline within 7 days')
		expect(CnIndexPage.computed.presentedCountText.call(line(null))).toBe('{shown} of {total} open cases in your teams, sorted by deadline')
		expect(CnIndexPage.computed.presentedCountText.call(line(WEEK, ''))).toBe('{shown} of {total} open cases in your teams, sorted by deadline')
	})
})

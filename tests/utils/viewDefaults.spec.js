/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Which view a person lands on, which columns they land with, and what a new
 * view starts from.
 *
 * The order is the whole rule and it is the same each time: what this person
 * chose wins, and what the administrator declared is where they start. Each
 * case below is a way to get that backwards and still look reasonable — a list
 * that moves out from under somebody, a Reset that has nothing to reset to, or
 * a per-role column list that quietly puts a field back on screen.
 */

const {
	VALUE_SOURCES,
	resolveColumns,
	resolveLandingView,
	startingStateForNewView,
} = require('../../src/utils/viewDefaults.js')

const VIEWS = [{ slug: 'alles' }, { slug: 'mijn' }, { slug: 'triage' }]

describe('the landing view', () => {
	it('is the personal choice when there is one', () => {
		const { slug, source } = resolveLandingView({
			personalSlug: 'mijn',
			administered: { behandelaar: 'triage' },
			roles: ['behandelaar'],
			views: VIEWS,
		})

		expect(slug).toBe('mijn')
		expect(source).toBe(VALUE_SOURCES.PERSONAL)
	})

	it('is the role default when there is no personal choice', () => {
		const { slug, source } = resolveLandingView({
			administered: { behandelaar: 'triage' },
			roles: ['behandelaar'],
			views: VIEWS,
		})

		expect(slug).toBe('triage')
		expect(source).toBe(VALUE_SOURCES.ADMINISTERED)
	})

	it('falls through when the personal choice no longer exists', () => {
		// Somebody deleted the view. Keeping the choice would land the person
		// on an empty state for ever with no way to notice why.
		const { slug, source } = resolveLandingView({
			personalSlug: 'weg',
			administered: { behandelaar: 'triage' },
			roles: ['behandelaar'],
			views: VIEWS,
		})

		expect(slug).toBe('triage')
		expect(source).toBe(VALUE_SOURCES.ADMINISTERED)
	})

	it('skips a role default that no longer exists too', () => {
		const { slug, source } = resolveLandingView({
			administered: { behandelaar: 'weg', beheerder: 'alles' },
			roles: ['behandelaar', 'beheerder'],
			views: VIEWS,
		})

		expect(slug).toBe('alles')
		expect(source).toBe(VALUE_SOURCES.ADMINISTERED)
	})

	it('answers nothing, named as a fallback, when neither applies', () => {
		// The caller needs to tell "land on this view" from "land on the page
		// as it comes", and an empty string alone does not say which.
		const { slug, source } = resolveLandingView({ views: VIEWS })

		expect(slug).toBe('')
		expect(source).toBe(VALUE_SOURCES.FALLBACK)
	})
})

describe('the columns', () => {
	const scope = ['id', 'title', 'status', 'assignee']

	it('are the personal choice when there is one', () => {
		const { columns, source } = resolveColumns({
			personal: ['id', 'title'],
			administered: { behandelaar: ['status'] },
			roles: ['behandelaar'],
			scopeColumns: scope,
		})

		expect(columns).toEqual(['id', 'title'])
		expect(source).toBe(VALUE_SOURCES.PERSONAL)
	})

	it('narrow the scope and never widen it', () => {
		// A per-role list that could ADD a column would be a second, quieter
		// way to put a field on screen that the scope deliberately left off.
		const { columns } = resolveColumns({
			administered: { behandelaar: ['status', 'bsn'] },
			roles: ['behandelaar'],
			scopeColumns: scope,
		})

		expect(columns).toEqual(['status'])
	})

	it('fall back to the scope, which is the control', () => {
		// Without this a resolver that always answered empty would pass the
		// narrowing test and render a table with no columns at all.
		const { columns, source } = resolveColumns({ scopeColumns: scope })

		expect(columns).toEqual(scope)
		expect(source).toBe(VALUE_SOURCES.FALLBACK)
	})
})

describe('a new view', () => {
	const templates = [
		{ slug: 'triage', columns: ['id', 'title'], sorting: { key: 'deadline' }, exportFields: ['id'] },
	]
	const current = { columns: ['a', 'b'], criteria: { open: true } }

	it('starts from the template when one is chosen', () => {
		const started = startingStateForNewView({ templateSlug: 'triage', templates, currentState: current })

		expect(started.columns).toEqual(['id', 'title'])
		expect(started.sorting).toEqual({ key: 'deadline' })
		// The parts the template says nothing about stay as the list has them.
		expect(started.criteria).toEqual({ open: true })
	})

	it('starts from the current list when no template is chosen', () => {
		// Today's behaviour, and what anybody who has used Save current view
		// expects it to mean.
		expect(startingStateForNewView({ templates, currentState: current })).toEqual(current)
	})

	it('starts from the current list when the template has gone', () => {
		// A template that no longer exists is not a reason to refuse the
		// save. The person still wants the list in front of them.
		expect(startingStateForNewView({ templateSlug: 'weg', templates, currentState: current })).toEqual(current)
	})
})

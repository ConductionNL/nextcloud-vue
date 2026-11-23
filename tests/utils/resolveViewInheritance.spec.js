/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a saved view shows once its parents have had their say.
 *
 * The spec marks this the pure-function half of the tree and excludes it from
 * e2e for that reason, so these tests are the whole coverage of the rule. Each
 * one below is a way the resolver can be wrong while still returning a
 * perfectly plausible view: the wrong part inherited, a cycle survived instead
 * of refused, or somebody else's permissions taking a person's own view away.
 */

const {
	DEFAULT_MAX_DEPTH,
	INHERITABLE_PARTS,
	RESOLUTION_ERRORS,
	inheritsPart,
	resolveViewInheritance,
} = require('../../src/utils/resolveViewInheritance.js')

/** The parent every case below hangs off: six columns, a sort, an export set. */
const PARENT = {
	slug: 'vergunningen',
	criteria: { caseType: 'vergunning' },
	columns: ['id', 'title', 'status', 'assignee', 'deadline', 'created'],
	sorting: { key: 'deadline', order: 'asc' },
	defaultSort: 'deadline',
	exportFields: ['id', 'title'],
}

describe('the five parts resolve separately', () => {
	it('lets a child narrow the criteria and keep the parent everything else', () => {
		// The motivating case, and the one an all-or-nothing resolver makes
		// impossible to express: "Vergunningen, in behandeling" is the
		// parent's six columns with one narrower filter.
		const child = {
			slug: 'vergunningen-in-behandeling',
			parent: 'vergunningen',
			inherits: ['columns', 'sorting', 'defaultSort', 'exportFields'],
			criteria: { caseType: 'vergunning', status: 'in-behandeling' },
		}

		const { resolved, error } = resolveViewInheritance({
			slug: child.slug,
			views: [PARENT, child],
		})

		expect(error).toBeNull()
		expect(resolved.criteria).toEqual({ caseType: 'vergunning', status: 'in-behandeling' })
		expect(resolved.columns).toEqual(PARENT.columns)
		expect(resolved.sorting).toEqual(PARENT.sorting)
		expect(resolved.exportFields).toEqual(PARENT.exportFields)
	})

	it('treats an absent inherits on a child as every part', () => {
		// The short form, because most children exist to narrow one thing.
		const child = { slug: 'alles', parent: 'vergunningen' }

		const { resolved } = resolveViewInheritance({ slug: 'alles', views: [PARENT, child] })

		for (const part of INHERITABLE_PARTS) {
			expect(resolved[part]).toEqual(PARENT[part])
		}
	})

	it('treats an empty inherits as none, so a child can hang under a parent for grouping alone', () => {
		const child = { slug: 'leeg', parent: 'vergunningen', inherits: [], columns: ['id'] }

		const { resolved } = resolveViewInheritance({ slug: 'leeg', views: [PARENT, child] })

		expect(resolved.columns).toEqual(['id'])
		// It took nothing else, which is the half that makes the assertion
		// above mean something.
		expect(resolved.criteria).toBeUndefined()
		expect(resolved.sorting).toBeUndefined()
	})

	it('lets a grandchild take a part through a parent that overrode another', () => {
		// The parent overrides the criteria and passes the columns through,
		// so the grandchild reads its grandparent's columns. A resolver that
		// stopped at the first parent would answer the grandchild's own
		// nothing and look fine.
		const parent = {
			slug: 'mid',
			parent: 'vergunningen',
			inherits: ['columns', 'sorting', 'defaultSort', 'exportFields'],
			criteria: { status: 'open' },
		}
		const grandchild = { slug: 'leaf', parent: 'mid' }

		const { resolved } = resolveViewInheritance({
			slug: 'leaf',
			views: [PARENT, parent, grandchild],
		})

		expect(resolved.columns).toEqual(PARENT.columns)
		expect(resolved.criteria).toEqual({ status: 'open' })
	})

	it('stops at a child that overrides a part and declares nothing for it', () => {
		// Overriding to empty is a real thing to want, and it is NOT the same
		// as inheriting. A resolver that carried on up would hand a triage
		// view its parent's twelve export fields.
		const child = { slug: 'geen-export', parent: 'vergunningen', inherits: ['columns'] }

		const { resolved } = resolveViewInheritance({ slug: 'geen-export', views: [PARENT, child] })

		expect(resolved.columns).toEqual(PARENT.columns)
		expect(resolved.exportFields).toBeUndefined()
	})
})

describe('a cycle is refused rather than survived', () => {
	it('names both views, because one of them is the one to go and look at', () => {
		const a = { slug: 'a', parent: 'b', columns: ['x'] }
		const b = { slug: 'b', parent: 'a' }

		const { error, resolved } = resolveViewInheritance({ slug: 'a', views: [a, b] })

		expect(error.code).toBe(RESOLUTION_ERRORS.CYCLE)
		expect(error.views).toContain('a')
		// On a refusal the view keeps its OWN parts. A half-walked mixture is
		// the one answer nobody could account for afterwards.
		expect(resolved.columns).toEqual(['x'])
	})

	it('refuses a chain deeper than the bound, and names the view', () => {
		const views = [{ slug: 'v0', columns: ['x'] }]
		for (let i = 1; i <= DEFAULT_MAX_DEPTH + 2; i++) {
			views.push({ slug: `v${i}`, parent: `v${i - 1}` })
		}
		const deepest = `v${DEFAULT_MAX_DEPTH + 2}`

		const { error } = resolveViewInheritance({ slug: deepest, views })

		expect(error.code).toBe(RESOLUTION_ERRORS.TOO_DEEP)
		expect(error.views).toEqual([deepest])
	})

	it('accepts a chain exactly at the bound, which is the control', () => {
		// Without this, a resolver that refused every chain would pass the
		// test above and make the whole feature unusable.
		const views = [{ slug: 'v0', columns: ['x'] }]
		for (let i = 1; i <= DEFAULT_MAX_DEPTH; i++) {
			views.push({ slug: `v${i}`, parent: `v${i - 1}` })
		}

		const { error, resolved } = resolveViewInheritance({
			slug: `v${DEFAULT_MAX_DEPTH}`,
			views,
		})

		expect(error).toBeNull()
		expect(resolved.columns).toEqual(['x'])
	})
})

describe('a parent the reader may not see', () => {
	it('resolves what it can and says which parts it could not', () => {
		// Shared with a group this reader is not in, so it never arrives.
		// Refusing here would take a person's own view away from them because
		// of somebody else's permissions.
		const child = {
			slug: 'kind',
			parent: 'onzichtbaar',
			criteria: { status: 'open' },
		}

		const { error, resolved, unresolvedParts, missingParent } = resolveViewInheritance({
			slug: 'kind',
			views: [child],
		})

		expect(error).toBeNull()
		expect(missingParent).toBe(true)
		expect(resolved.criteria).toEqual({ status: 'open' })
		expect(unresolvedParts).toEqual(['columns', 'sorting', 'defaultSort', 'exportFields'])
	})

	it('reports no missing parent when the parent is there', () => {
		// The control for the flag above: a resolver that always said true
		// would put "parts you cannot see" on every child in the tree.
		const child = { slug: 'kind', parent: 'vergunningen' }

		const { missingParent, unresolvedParts } = resolveViewInheritance({
			slug: 'kind',
			views: [PARENT, child],
		})

		expect(missingParent).toBe(false)
		expect(unresolvedParts).toEqual([])
	})
})

describe('inheritsPart', () => {
	it('says no for a view with no parent, whatever its inherits says', () => {
		// There is nothing above it to take a part from. The manifest
		// validator refuses this shape; a runtime view that arrives with it
		// must not quietly resolve against a parent it does not have.
		expect(inheritsPart({ slug: 'root', inherits: ['columns'] }, 'columns')).toBe(false)
	})

	it('says yes for every part when a child names none', () => {
		expect(inheritsPart({ slug: 'k', parent: 'p' }, 'columns')).toBe(true)
		expect(inheritsPart({ slug: 'k', parent: 'p' }, 'exportFields')).toBe(true)
	})
})

describe('a view that is not there', () => {
	it('answers empty rather than throwing', () => {
		const { view, resolved, error } = resolveViewInheritance({ slug: 'weg', views: [PARENT] })

		expect(view).toBeNull()
		expect(resolved).toEqual({})
		expect(error).toBeNull()
	})
})

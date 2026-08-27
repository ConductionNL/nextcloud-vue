/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

const { dropUnrenderableActions } = require('../../../src/cli/transforms/dropUnrenderableActions')

describe('dropUnrenderableActions', () => {
	it('drops bare-string actions', () => {
		// dossiq CaseTypes, verbatim.
		const page = {
			id: 'CaseTypes',
			config: { actions: ['create', 'edit', 'delete', { id: 'view', label: 'View', type: 'handler' }] },
		}
		const { page: out, count } = dropUnrenderableActions(page)

		expect(count).toBe(3)
		expect(out.config.actions).toEqual([{ id: 'view', label: 'View', type: 'handler' }])
	})

	it('drops key-only objects, which render just as blank as a bare string', () => {
		// dossiq Parafeerroutes / WmsLayers. `addExplicitActionTypes` gives
		// these a `type`, which makes them look more legitimate than they are
		// — a type without a label still draws nothing.
		const page = {
			id: 'Parafeerroutes',
			config: {
				actions: [
					{ id: 'view', label: 'View', type: 'handler' },
					{ key: 'edit', type: 'handler' },
					{ key: 'delete', type: 'handler' },
				],
			},
		}
		const { page: out, count } = dropUnrenderableActions(page)

		expect(count).toBe(2)
		expect(out.config.actions.map((a) => a.id)).toEqual(['view'])
	})

	it('drops an empty-string label — present is not the same as usable', () => {
		const { count } = dropUnrenderableActions({ id: 'P', config: { actions: [{ id: 'x', label: '' }] } })
		expect(count).toBe(1)
	})

	it('keeps every action that carries a label, whatever else it carries', () => {
		// decidesk `primary`, dossiq `permission`, shillinq `transition` +
		// `description`. None of those is this transform's business.
		const page = {
			id: 'Mixed',
			config: {
				actions: [
					{ id: 'provision', label: 'Provision', permission: 'admin' },
					{ id: 'promote', label: 'Promote', primary: true },
					{ id: 'activate', label: 'Try it', type: 'lifecycle-transition', transition: 'activate', description: 'Go' },
				],
			},
		}
		const { page: out, count } = dropUnrenderableActions(page)

		expect(count).toBe(0)
		expect(out.config.actions).toHaveLength(3)
	})

	it('cleans top-level page.actions too, not only config.actions', () => {
		const { page: out, count } = dropUnrenderableActions({ id: 'P', actions: ['edit', { id: 'a', label: 'A' }] })
		expect(count).toBe(1)
		expect(out.actions).toEqual([{ id: 'a', label: 'A' }])
	})

	it('leaves a page with no actions untouched', () => {
		const page = { id: 'P', config: { register: 'r', schema: 's' } }
		const { page: out, count } = dropUnrenderableActions(page)
		expect(count).toBe(0)
		expect(out).toBe(page)
	})

	it('does not mutate the input page', () => {
		const page = { id: 'P', config: { actions: ['edit'] } }
		dropUnrenderableActions(page)
		expect(page.config.actions).toEqual(['edit'])
	})

	it('is idempotent — a second pass drops nothing more', () => {
		const page = { id: 'P', config: { actions: ['edit', { id: 'a', label: 'A' }] } }
		const first = dropUnrenderableActions(page)
		const second = dropUnrenderableActions(first.page)

		expect(second.count).toBe(0)
		expect(second.page.config.actions).toEqual(first.page.config.actions)
	})
})

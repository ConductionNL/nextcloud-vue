import { resolveObjectTokenContext } from '../../src/utils/detailObjectContext.js'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * header-actions-read-page-context: a header action's local `visibleWhen`
 * can read `@context.<name>` (the records the page's conditions name, such as
 * the case type), which the object context carries apart from the record.
 *
 * @spec openspec/changes/header-actions-read-page-context/specs/detail-page/spec.md#requirement-a-header-action-can-gate-on-the-pages-context-records
 */
import { evaluateVisibleWhen } from '../../src/utils/visibleWhen.js'

const cond = { all: [
	{ field: '@self.archived', op: 'empty' },
	{ field: '@context.caseType.category', op: 'in', value: ['Sociaal domein', 'Jeugd', 'Jeugdhulp'] },
] }

describe('visibleWhen: @context in the object context', () => {
	it('shows the action when the context record matches', async () => {
		const ctx = resolveObjectTokenContext({ objectId: 'c-1', object: { '@self': {} }, context: { caseType: { category: 'Jeugdhulp' } } }, null)
		await expect(evaluateVisibleWhen(cond, ctx)).resolves.toBe(true)
	})

	it('hides it when the context record does not match', async () => {
		const ctx = resolveObjectTokenContext({ objectId: 'c-1', object: { '@self': {} }, context: { caseType: { category: 'Bezwaar en beroep' } } }, null)
		await expect(evaluateVisibleWhen(cond, ctx)).resolves.toBe(false)
	})

	it('hides it while the context records are not there', async () => {
		const ctx = resolveObjectTokenContext({ objectId: 'c-1', object: { '@self': {} } }, null)
		await expect(evaluateVisibleWhen(cond, ctx)).resolves.toBe(false)
	})
})

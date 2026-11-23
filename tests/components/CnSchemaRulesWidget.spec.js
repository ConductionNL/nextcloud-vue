/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The rules OpenRegister's engine holds for a schema, listed and tried: kinds
 * from the engine's vocabulary, a dry run with its trace, and a refusal said
 * in a sentence (dossiq's case-type rules, now any schema's).
 *
 * @spec openspec/changes/schema-rules-widget/specs/schema-rules-widget/spec.md
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { flushPromises, mount } from '@vue/test-utils'
import CnSchemaRulesWidget from '../../src/components/CnSchemaRulesWidget/CnSchemaRulesWidget.vue'
import { kindsByName, ruleEvaluateUrl, traceOf } from '../../src/components/CnSchemaRulesWidget/schemaRules.js'

const VOCABULARY = { kinds: [{ kind: 'field', description: 'Field rule' }], verdicts: [], actions: [] }

/**
 * @param {object} inventory What the inventory read answers, or an error to reject with.
 * @param {object} [props] Extra props.
 * @return {Promise<object>} The mounted widget.
 */
async function mountWidget(inventory, props = {}) {
	mockGet.mockImplementation((url) => {
		if (url.endsWith('/rules/vocabulary')) {
			return Promise.resolve({ data: VOCABULARY })
		}
		return inventory instanceof Error ? Promise.reject(inventory) : Promise.resolve({ data: inventory })
	})
	const w = mount(CnSchemaRulesWidget, { props: { register: 'app', schema: 'case', ...props } })
	await flushPromises()
	return w
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
})

describe('CnSchemaRulesWidget', () => {
	it('lists the schema\'s rules with the kind the engine names, and a kind it predates as written', async () => {
		const w = await mountWidget({ rules: [{ id: 'field:case:a', label: 'A', kind: 'field' }, { id: 'new:case:b', label: 'B', kind: 'new' }] })
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/schemas/case/rules')
		expect(w.findAll('[data-testid="cn-schema-rules-kind"]').map((c) => c.text())).toEqual(['Field rule', 'new'])
	})

	it('tries a rule against the object, writing nothing, and shows the trace', async () => {
		mockPost.mockResolvedValue({ data: { trace: { verdict: 'no_match', operand: 'status', operandValue: 'open' } } })
		const w = await mountWidget({ rules: [{ id: 'field:case:a', kind: 'field' }] }, { objectId: 'obj-1' })
		await w.find('[data-testid="cn-schema-rules-try-field:case:a"]').trigger('click')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/openregister/api/schemas/case/rules/field%3Acase%3Aa/evaluate', { register: 'app', objectId: 'obj-1' })
		expect(w.find('[data-testid="cn-schema-rules-trace"]').text()).toContain('The rule did not match this object.')
		expect(w.find('[data-testid="cn-schema-rules-operand"]').text()).toBe('It read status and found open.')
	})

	it('says a refusal in a sentence rather than an empty table', async () => {
		const w = await mountWidget(Object.assign(new Error('403'), { response: { status: 403 } }), { refusedText: 'Only an administrator can read the rules of a case.' })
		expect(w.find('[data-testid="cn-schema-rules-error"]').text()).toBe('Only an administrator can read the rules of a case.')
		expect(w.find('[data-testid="cn-schema-rules-table"]').exists()).toBe(false)
	})

	it('reads nothing while disabled', async () => {
		await mountWidget({ rules: [] }, { disabled: true })
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('keys a rule on its whole id and keeps the operand beside the verdict', () => {
		expect(ruleEvaluateUrl('case', 'field:case:a')).toBe('/index.php/apps/openregister/api/schemas/case/rules/field%3Acase%3Aa/evaluate')
		expect(kindsByName({ kinds: [{ kind: 'x' }] })).toEqual({})
		expect(traceOf({ error: { message: 'refused' } })).toEqual({ verdict: '', operand: '', operandValue: '', message: 'refused' })
	})
})

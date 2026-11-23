/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-live-values/tasks.md#task-5
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function manifestWith(fields) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.5.0',
		menu: [{ id: 'f', label: 'Form', route: 'f', order: 10 }],
		pages: [{ id: 'f', route: '/f', type: 'form', title: 'Form', config: { submitEndpoint: '/apps/x/api/y', fields } }],
	}
}

describe('form fields with live values in the manifest', () => {
	it('accepts assign rules, token defaults and calculate.inputs', () => {
		const out = validateManifest(manifestWith([
			{ key: 'country', label: 'Country', type: 'string' },
			{ key: 'currency', label: 'Currency', type: 'string', assign: [{ when: { field: 'country', op: 'eq', value: 'NL' }, value: 'EUR' }, { value: '@answer.country' }] },
			{ key: 'email', label: 'E-mail', type: 'string', default: '@me.email' },
			{ key: 'name', label: 'Name', type: 'string', default: '@me.displayName' },
			{ key: 'fee', label: 'Fee', type: 'string', calculate: { inputs: ['size'] } },
		]))
		expect(out.errors).toEqual([])
		expect(out.valid).toBe(true)
	})

	it('refuses an @-token outside the vocabulary and a malformed rule', () => {
		const badToken = validateManifest(manifestWith([{ key: 'a', label: 'A', type: 'string', default: '@me.password' }]))
		expect(badToken.valid).toBe(false)
		const noValue = validateManifest(manifestWith([{ key: 'a', label: 'A', type: 'string', assign: [{ when: { field: 'b' } }] }]))
		expect(noValue.valid).toBe(false)
		const noInputs = validateManifest(manifestWith([{ key: 'a', label: 'A', type: 'string', calculate: {} }]))
		expect(noInputs.valid).toBe(false)
	})
})

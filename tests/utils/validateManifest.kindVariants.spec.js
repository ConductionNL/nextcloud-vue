/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * detail-record-kind-variants in the manifest schema: a crumb takes
 * `visibleWhen`, and `nextStep` takes `variants`.
 *
 * @spec openspec/changes/detail-record-kind-variants/specs/detail-page/spec.md#requirement-a-crumb-can-show-for-one-kind-of-record
 * @spec openspec/changes/detail-record-kind-variants/specs/detail-page/spec.md#requirement-the-next-step-can-differ-per-kind-of-record
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'
const IS = { field: 'ticketType', op: 'eq', value: 'interaction' }

/**
 * @param {object} config The detail page's config.
 * @return {object} A minimal manifest.
 */
function manifestWith(config) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '1.0.0',
		menu: [{ id: 'tickets', label: 'Tickets', route: 'tickets', order: 10 }],
		pages: [{ id: 'ticket', route: '/tickets/:id', type: 'detail', title: 'Ticket', config: { register: 'app', schema: 'ticket', ...config } }],
	}
}

describe('the manifest schema: variants per kind of record', () => {
	it('accepts a crumb with visibleWhen', () => {
		const result = validateManifest(manifestWith({
			breadcrumb: [
				{ label: 'Questions and reports', route: 'Tickets', visibleWhen: { ...IS, op: 'neq' } },
				{ label: 'Contact moments', route: 'Tickets', query: { ticketType: 'interaction' }, currentField: 'reference', visibleWhen: IS },
			],
		}))
		expect(result.errors).toEqual([])
	})

	it('accepts next-step variants, and refuses one without when', () => {
		const stages = { in_progress: { checklist: [{ label: 'The outcome is noted', doneField: 'outcome' }] } }
		expect(validateManifest(manifestWith({ nextStep: { stages, variants: [{ when: IS, stages }] } })).errors).toEqual([])
		expect(validateManifest(manifestWith({ nextStep: { stages, variants: [{ stages }] } })).valid).toBe(false)
	})
})

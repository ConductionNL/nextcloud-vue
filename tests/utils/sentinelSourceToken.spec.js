/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `@source.<field>` names a field of the record a facts card shows. Without
 * it in the sentinel vocabulary a manifest that uses it in a facts action
 * payload or link failed validation, though the widget resolves it.
 *
 * @spec openspec/changes/actions-time-windows-and-endpoint-routes/specs/declarative-actions/spec.md#requirement-a-facts-card-names-the-record-it-shows-with-source
 */
import { classifyToken } from '../../src/utils/sentinelTokens.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

describe('@source.<field>', () => {
	it('is a known token', () => {
		expect(classifyToken('@source.paymentProvider')).toEqual({ status: 'known', context: 'source', deprecation: null })
		expect(classifyToken('@source.@self.id').status).toBe('known')
		expect(classifyToken('@sauce.x').status).toBe('unknown')
	})

	it('validates in a facts card link and action payload', () => {
		const manifest = {
			$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'P',
				route: '/p/:id',
				type: 'detail',
				title: 'P',
				config: {
					register: 'r',
					schema: 's',
					widgets: [{
						id: 'w',
						type: 'facts',
						content: {
							link: { label: 'Open', route: { name: 'X', params: { id: '@source.transactionUuid' } } },
							actions: [{ id: 'a', label: 'Retry', type: 'api-call', url: '/apps/x/api/p/@source.id/retry', payload: { provider: '@source.paymentProvider' } }],
						},
					}],
				},
			}],
		}
		expect(validateManifestV2(manifest).errors).toEqual([])
	})
})

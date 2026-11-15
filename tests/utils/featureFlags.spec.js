/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page, widget or action can follow a feature toggle: the manifest declares
 * `features`, the server's merged map arrives as initial state, and
 * `visibleIf.feature` / `visibleWhen.feature` read it (openregister
 * feature-toggle-surface 1.1, 2.2, 3.2b).
 *
 * @spec openspec/changes/feature-toggles/specs/feature-toggles/spec.md
 */
import { featureEnabled, setFeatureFlags } from '../../src/utils/featureFlags.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'
import { passesContextPredicates } from '../../src/utils/visibleIfContext.js'
import { evaluateVisibleWhen, evaluateVisibleWhenLocal } from '../../src/utils/visibleWhen.js'

const DECLARED = [
	{ key: 'payroll', label: 'Payroll', default: true },
	{ key: 'beta-reports', label: 'Beta reports', default: false, failMode: 'closed' },
	{ key: 'help', label: 'Help', default: false, failMode: 'open' },
]

describe('featureEnabled', () => {
	it('reads the server map first, then the default; an undeclared key is off', () => {
		setFeatureFlags({ declarations: DECLARED, values: { payroll: false, 'beta-reports': 'true' } })
		expect(featureEnabled('payroll')).toBe(false)
		expect(featureEnabled('beta-reports')).toBe(true)
		expect(featureEnabled('help')).toBe(false)
		expect(featureEnabled('nope')).toBe(false)
	})

	it('falls back to failMode, then the default, when the server served no map', () => {
		setFeatureFlags({ declarations: DECLARED, values: null })
		expect(featureEnabled('payroll')).toBe(true)
		expect(featureEnabled('beta-reports')).toBe(false)
		expect(featureEnabled('help')).toBe(true)
	})
})

describe('visibleIf.feature and visibleWhen.feature', () => {
	beforeEach(() => setFeatureFlags({ declarations: DECLARED, values: { payroll: false, 'beta-reports': true } }))

	it('hides a menu entry or page while its feature is off', () => {
		expect(passesContextPredicates({ feature: 'payroll' }, null)).toBe(false)
		expect(passesContextPredicates({ feature: 'beta-reports' }, null)).toBe(true)
		expect(passesContextPredicates({ feature: 'beta-reports', 'user.role': 'hr' }, { user: { role: 'hr' } })).toBe(true)
	})

	it('gates a widget or action, alone or with another condition', async () => {
		expect(evaluateVisibleWhenLocal({ feature: 'payroll' }, {})).toBe(false)
		expect(evaluateVisibleWhenLocal({ feature: 'beta-reports' }, {})).toBe(true)
		expect(evaluateVisibleWhenLocal({ feature: 'beta-reports', field: 'status', op: 'eq', value: 'open' }, { status: 'closed' })).toBe(false)
		expect(await evaluateVisibleWhen({ feature: 'payroll' }, {})).toBe(false)
		expect(await evaluateVisibleWhen({ feature: 'beta-reports' }, {})).toBe(true)
	})

	it('is accepted by the manifest schema', () => {
		const manifest = {
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			features: DECLARED,
			menu: [{ id: 'payroll', label: 'Payroll', route: 'Payroll', order: 1, visibleIf: { feature: 'payroll' } }],
			pages: [{ id: 'Payroll', route: '/payroll', type: 'index', title: 'Payroll', config: { register: 'r', schema: 's', headerActions: [{ id: 'x', label: 'X', type: 'api-call', url: '/x', visibleWhen: { feature: 'beta-reports' } }] } }],
		}
		expect(validateManifestV2(manifest).errors).toEqual([])
		expect(validateManifestV2({ ...manifest, features: [{ key: 'Bad Key', label: 'x' }] }).valid).toBe(false)
	})
})

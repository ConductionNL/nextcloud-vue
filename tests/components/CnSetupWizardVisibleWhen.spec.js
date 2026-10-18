/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A setup step can depend on the app's state (DqInstellen: the dwangsom step
 * only when the app pays penalties, five steps on the board where dossiq
 * offered six). `visibleWhen` names a path in the setup status document; the
 * step shows only while that value is truthy, or equals `equals`.
 */
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const { stepConditionHolds } = CnSetupWizard.methods
const holds = (step, setupStatus) => stepConditionHolds.call({ setupStatus }, step)

describe('CnSetupWizard visibleWhen', () => {
	const STATUS = { flags: { hasPayouts: false, region: 'nl' }, counts: { payouts: 3 } }

	it('always shows a step without a condition', () => {
		expect(holds({ id: 'a', type: 'info' }, STATUS)).toBe(true)
	})

	it('shows a step while the flag at the path is truthy', () => {
		expect(holds({ id: 'dwangsom', type: 'info', visibleWhen: 'flags.hasPayouts' }, STATUS)).toBe(false)
		expect(holds({ id: 'dwangsom', type: 'info', visibleWhen: 'flags.hasPayouts' }, { flags: { hasPayouts: true } })).toBe(true)
		expect(holds({ id: 'x', type: 'info', visibleWhen: 'counts.payouts' }, STATUS)).toBe(true)
	})

	it('compares with equals when given', () => {
		expect(holds({ id: 'x', type: 'info', visibleWhen: { path: 'flags.region', equals: 'nl' } }, STATUS)).toBe(true)
		expect(holds({ id: 'x', type: 'info', visibleWhen: { path: 'flags.region', equals: 'be' } }, STATUS)).toBe(false)
	})

	it('hides the step while the status is not there yet, or the path runs out', () => {
		expect(holds({ id: 'x', type: 'info', visibleWhen: 'flags.hasPayouts' }, undefined)).toBe(false)
		expect(holds({ id: 'x', type: 'info', visibleWhen: 'missing.deeper.flag' }, STATUS)).toBe(false)
	})

	it('leaves a hidden step out of the steps it offers', () => {
		const steps = [{ id: 'a', type: 'info' }, { id: 'dwangsom', type: 'info', visibleWhen: 'flags.hasPayouts' }]
		const ctx = { setupStatus: STATUS, skippedSteps: [], declaredSteps: steps }
		ctx.stepConditionHolds = (step) => stepConditionHolds.call(ctx, step)
		expect(CnSetupWizard.computed.setupSteps.call(ctx).map((s) => s.id)).toEqual(['a'])
	})

	it('is a manifest key: a path, or a path with equals', () => {
		const manifest = (visibleWhen) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [],
			observability: {},
			setup: { steps: [{ id: 'dwangsom', type: 'info', visibleWhen }] },
		})
		expect(validateManifestV2(manifest('flags.hasPayouts')).valid).toBe(true)
		expect(validateManifestV2(manifest({ path: 'flags.region', equals: 'nl' })).valid).toBe(true)
		expect(validateManifestV2(manifest({ equals: 'nl' })).valid).toBe(false)
	})
})

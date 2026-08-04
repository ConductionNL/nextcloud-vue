/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Saving a schema edit that OpenRegister classifies as BREAKING.
 *
 * Reported live: setting an existing `barn` property to a related object turned it
 * from `string` into `object`, which the backend classifies as breaking and refuses
 * with 409 unless the request carries `acknowledgeBreaking`. The save path never
 * sent it and offered no way to, so the dialog just echoed the server's message and
 * the edit was IMPOSSIBLE to make from the UI.
 *
 * 409 body:
 *   { error: "Schema change classified breaking; acknowledgeBreaking required.",
 *     classification: "breaking",
 *     changes: [{ property: "barn", kind: "type_changed", old: "string", new: "object" }] }
 */
const CnEditDataModal = require('../../src/dialogs/CnEditDataModal.vue').default
const { onSchemaConfirm, confirmBreaking, cancelBreaking, describeBreakingChange } = CnEditDataModal.methods
const { breakingChanges } = CnEditDataModal.computed

const breaking409 = () => ({
	message: 'Request failed with status code 409',
	response: {
		status: 409,
		data: {
			error: 'Schema change classified breaking; acknowledgeBreaking required.',
			classification: 'breaking',
			changes: [{ property: 'barn', kind: 'type_changed', old: 'string', new: 'object' }],
		},
	},
})

const axios = require('@nextcloud/axios').default

/**
 * Options-API stand-in carrying the real methods.
 *
 * @return {object} The harness context.
 */
function harness() {
	return {
		busy: false,
		error: '',
		pendingBreaking: null,
		showSchemaDialog: true,
		editingSchema: { id: 4506, title: 'Cow' },
		selectedRegister: { id: 2466, schemas: [4506] },
		headers: () => ({}),
		loadSchemas: jest.fn(),
		linkSchema: jest.fn(),
		onSchemaConfirm,
		confirmBreaking,
		cancelBreaking,
		describeBreakingChange,
	}
}

describe('CnEditDataModal — breaking schema change', () => {
	beforeEach(() => { jest.resetAllMocks() })

	it('offers the acknowledgement instead of a dead end', async () => {
		axios.put = jest.fn().mockRejectedValue(breaking409())
		const ctx = harness()

		await ctx.onSchemaConfirm({ title: 'Cow' })

		expect(ctx.pendingBreaking).toBeTruthy()
		expect(ctx.pendingBreaking.changes).toEqual([
			{ property: 'barn', kind: 'type_changed', old: 'string', new: 'object' },
		])
		// The editor is hidden so the confirmation is not painted under it.
		expect(ctx.showSchemaDialog).toBe(false)
		expect(ctx.error).toBe('')
	})

	it('the first save NEVER acknowledges on the user\'s behalf', async () => {
		axios.put = jest.fn().mockRejectedValue(breaking409())
		const ctx = harness()

		await ctx.onSchemaConfirm({ title: 'Cow' })

		expect(axios.put.mock.calls[0][0]).not.toContain('acknowledgeBreaking')
	})

	it('confirming re-saves WITH acknowledgeBreaking, and it lands', async () => {
		axios.put = jest.fn().mockRejectedValueOnce(breaking409())
		const ctx = harness()
		await ctx.onSchemaConfirm({ title: 'Cow' })

		axios.put = jest.fn().mockResolvedValue({ data: {} })
		await ctx.confirmBreaking()

		expect(axios.put.mock.calls[0][0]).toContain('acknowledgeBreaking=true')
		expect(ctx.pendingBreaking).toBeNull()
		expect(ctx.showSchemaDialog).toBe(false)
		expect(ctx.loadSchemas).toHaveBeenCalled()
	})

	it('cancelling returns to the editor rather than binning the edits', async () => {
		axios.put = jest.fn().mockRejectedValue(breaking409())
		const ctx = harness()
		await ctx.onSchemaConfirm({ title: 'Cow' })

		ctx.cancelBreaking()

		expect(ctx.pendingBreaking).toBeNull()
		expect(ctx.showSchemaDialog).toBe(true)
	})

	// The mistake made once already on the delete-cascade: re-arming the prompt on a
	// refusal that ALREADY carried the acknowledgement = an endless confirm loop.
	it('an acknowledged save that STILL 409s errors out — it must not re-prompt', async () => {
		axios.put = jest.fn().mockRejectedValue(breaking409())
		const ctx = harness()

		await ctx.onSchemaConfirm({ title: 'Cow' })
		expect(ctx.pendingBreaking).toBeTruthy()

		await ctx.confirmBreaking() // still refused, even acknowledged

		expect(ctx.pendingBreaking).toBeNull()
		expect(ctx.error).toBeTruthy()
	})

	it('a non-breaking failure is reported as-is', async () => {
		axios.put = jest.fn().mockRejectedValue({ response: { status: 403, data: { error: 'forbidden' } } })
		const ctx = harness()

		await ctx.onSchemaConfirm({ title: 'Cow' })

		expect(ctx.pendingBreaking).toBeNull()
		expect(ctx.error).toBeTruthy()
	})

	it('describes each flagged change in plain language', () => {
		const ctx = harness()
		const text = ctx.describeBreakingChange({ property: 'barn', kind: 'type_changed', old: 'string', new: 'object' })
		expect(text).toContain('barn')
		expect(text).toContain('string')
		expect(text).toContain('object')
		expect(text).not.toContain('type_changed') // underscores de-snaked
		expect(text).not.toContain('{property}') // NC l10n vars actually substituted
	})

	it('breakingChanges is empty when nothing is pending', () => {
		expect(breakingChanges.call({ pendingBreaking: null })).toEqual([])
	})
})

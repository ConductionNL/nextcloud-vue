/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnCredentials — specifically that the add-credential form can
 * actually be submitted.
 *
 * THE BUG THIS PINS. The submit button was written as
 * `<NcButton native-type="submit">`. `native-type` is the @nextcloud/vue 8
 * prop name; v9's NcButton does not declare it, so it fell through as an inert
 * HTML attribute and the button rendered with the prop default `type="button"`.
 * A `type="button"` inside a <form> does not submit it — so clicking
 * "Add credential" produced NO submit event, NO onCreate call and NO request.
 * The form looked complete, the button looked enabled, and nothing happened.
 *
 * Reported from hermiq's user settings: "the add credential button doesn't
 * work" — with the giveaway detail that the browser's network tab showed no
 * POST at all. That distinction (no request, versus a request that fails) is
 * what located the defect: a failing request would have been a backend or
 * payload problem, but the absence of one meant the handler never ran.
 *
 * The rendered-type assertion is deliberately not "does clicking call the
 * handler" alone — the native `type` attribute IS the mechanism, so it is
 * asserted directly. A future prop rename that silently reverts to
 * `type="button"` fails this test rather than shipping a dead button again.
 */

import { mount } from '@vue/test-utils'
import axios from '@nextcloud/axios'
import CnCredentials from '../../src/components/CnCredentials/CnCredentials.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
		patch: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => p,
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Mount the component and walk the wizard to the filled-in add form.
 *
 * @return {Promise<object>} The mounted wrapper, on the form step.
 */
async function mountOnAddForm() {
	const wrapper = mount(CnCredentials, {
		propsData: { scope: 'personal', appId: 'hermiq', appName: 'Hermiq' },
	})
	await flush()

	// Jump straight to the form step with a chosen provider — the wizard's
	// provider list is catalogue-driven and not what this spec is about.
	await wrapper.setData({
		wizardStep: 'form',
		adding: true,
		form: { name: 'Claude CLI', provider: 'anthropic-cli', secret: 'sk-ant-oat01-x', allowedApps: [] },
	})
	await flush()
	return wrapper
}

describe('CnCredentials — the add form must be submittable', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('passes a native submit type to the button, under the name v9 actually reads', async () => {
		// NOTE ON WHAT THIS CAN AND CANNOT PROVE. NcButton is STUBBED in this
		// suite, so it renders as <div class="stub NcButton"> and never becomes
		// a real <button>. This assertion therefore checks the PROP WE PASS, not
		// the browser behaviour it produces — it cannot catch a future
		// @nextcloud/vue release that renames the prop again.
		//
		// It is still the assertion worth having, because the prop name IS the
		// defect: `native-type` (v8) is silently ignored by v9's NcButton, which
		// then falls back to its own default of type="button" and stops
		// submitting. Pinning the name catches a revert; only an e2e click can
		// catch a further upstream rename.
		const wrapper = await mountOnAddForm()
		const form = wrapper.find('form.cn-credentials__form')
		expect(form.exists()).toBe(true)

		const submit = form.findAll('.NcButton').wrappers
			.find((b) => /Add credential/.test(b.text()))
		expect(submit).toBeTruthy()

		expect(submit.attributes('type')).toBe('submit')
		// The v8 name must not come back — it renders an inert attribute.
		expect(submit.attributes('native-type')).toBeUndefined()
	})

	it('POSTs the credential when the form is submitted', async () => {
		const wrapper = await mountOnAddForm()
		await wrapper.find('form.cn-credentials__form').trigger('submit')
		await flush()

		expect(axios.post).toHaveBeenCalledTimes(1)
		const [, body] = axios.post.mock.calls[0]
		expect(body).toMatchObject({
			name: 'Claude CLI',
			provider: 'anthropic-cli',
			secret: 'sk-ant-oat01-x',
		})
	})

	it('does not submit while a required field is empty', async () => {
		const wrapper = await mountOnAddForm()
		await wrapper.setData({ form: { name: 'Claude CLI', provider: 'anthropic-cli', secret: '', allowedApps: [] } })
		await flush()

		await wrapper.find('form.cn-credentials__form').trigger('submit')
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
	})
})

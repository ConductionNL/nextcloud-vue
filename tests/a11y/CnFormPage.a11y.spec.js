/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnFormPage` — the schema-driven form
 * primitive that renders one accessible input per field via
 * `cnRenderFormField` (real `NcTextField` / `NcTextArea` /
 * `NcCheckboxRadioSwitch` / `NcSelect`). This is the anchor's proof for
 * the FORM-INPUT surface: every field type must produce a properly
 * labelled control (WCAG 1.3.1 / 3.3.2 / 4.1.2). Part of the
 * `wcag-a11y-anchor` sample.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), put: jest.fn() },
}))

const { mountAttached } = require('./support/mountAttached.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const CnFormPage = require('../../src/components/CnFormPage/CnFormPage.vue').default

/**
 * Mount CnFormPage attached to the document with the mocked router.
 *
 * @param {object} propsData Component props.
 * @return {object} Vue Test Utils wrapper.
 */
function mountForm(propsData) {
	return mountAttached(CnFormPage, {
		propsData: { submitEndpoint: '/apps/x/api/y', submitMethod: 'POST', ...propsData },
		mocks: { $route: { params: {} }, $router: { push: jest.fn() } },
		provide: { cnCustomComponents: {} },
	})
}

describe('CnFormPage — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.destroy()
	})

	it('has no WCAG 2.1 AA violations across every field type', async () => {
		wrapper = mountForm({
			title: 'Edit profile',
			fields: [
				{ key: 'name', type: 'string', label: 'Full name' },
				{ key: 'bio', type: 'string', widget: 'textarea', label: 'Biography' },
				{ key: 'agree', type: 'boolean', label: 'I agree to the terms' },
				{ key: 'rating', type: 'number', label: 'Rating' },
				{ key: 'pw', type: 'password', label: 'Password' },
				{ key: 'role', type: 'enum', label: 'Role', enum: ['admin', 'user'] },
			],
		})
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations when a field surfaces a validation error', async () => {
		wrapper = mountForm({
			title: 'Edit profile',
			fields: [{ key: 'name', type: 'string', label: 'Full name', required: true }],
		})
		await wrapper.vm.$nextTick()
		// Drive the component into its error state (empty required field).
		wrapper.vm.fieldErrors = { name: 'This field is required.' }
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with per-field help text', async () => {
		wrapper = mountForm({
			title: 'Edit profile',
			fields: [{ key: 'slug', type: 'string', label: 'URL slug', help: 'Lowercase, no spaces.' }],
		})
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})
})

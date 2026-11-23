/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFilesCard passes its `actions` slot to the card header, scoped with
 * `refresh` (opencatalogi OcBijlageToevoegen: "Add attachment").
 *
 * @spec openspec/changes/files-card-header-actions/specs/files-card-header-actions/spec.md#requirement-a-files-card-carries-header-actions
 */
const { flushPromises, mount } = require('@vue/test-utils')
const { h } = require('vue')
const CnFilesCard = require('../../src/components/CnFilesCard/CnFilesCard.vue').default

describe('CnFilesCard header actions', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) })
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the actions slot in the card header and refreshes on request', async () => {
		let refresh = null
		const wrapper = mount(CnFilesCard, {
			props: { register: 'r1', schema: 's1', objectId: 'o1' },
			slots: {
				actions: (scope) => {
					refresh = scope.refresh
					return h('button', { class: 'add-attachment' }, 'Add attachment')
				},
			},
		})
		await flushPromises()

		const header = wrapper.find('.cn-detail-card__header')
		expect(header.find('.add-attachment').exists()).toBe(true)
		expect(global.fetch).toHaveBeenCalledTimes(1)

		await refresh()
		expect(global.fetch).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})
})

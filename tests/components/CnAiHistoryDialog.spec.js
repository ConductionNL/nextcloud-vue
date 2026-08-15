/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Tests for CnAiHistoryDialog.vue — the conversation-history browser.
 *
 * Focus: the conversation-list URL resolves against the `chatAppId` prop, so the
 * dialog hits the same backend as the chat stream (chat-appid-flip). NcDialog /
 * NcEmptyContent / NcLoadingIcon come from the @nextcloud/vue mock.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(),
	},
}))

// eslint-disable-next-line n/no-missing-require -- ESM-only package; jest resolves it via moduleNameMapper (tests/__mocks__/nextcloud-axios.js)
const axios = require('@nextcloud/axios').default
const CnAiHistoryDialog = require('../../src/dialogs/CnAiHistoryDialog.vue').default

function mountDialog(propsData = {}) {
	return mount(CnAiHistoryDialog, {
		propsData: { open: false, ...propsData },
	})
}

describe('CnAiHistoryDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('fetches the conversation list from the default backend app id (hermiq)', async () => {
		const wrapper = mountDialog()
		await wrapper.vm.fetchConversations()

		expect(axios.get).toHaveBeenCalledWith(
			'/index.php/apps/hermiq/api/conversations',
			expect.objectContaining({ params: expect.objectContaining({ limit: 50 }) }),
		)
	})

	it('fetches the conversation list from an overridden chatAppId (openregister compat window)', async () => {
		const wrapper = mountDialog({ chatAppId: 'openregister' })
		await wrapper.vm.fetchConversations()

		expect(axios.get).toHaveBeenCalledWith(
			'/index.php/apps/openregister/api/conversations',
			expect.objectContaining({ params: expect.objectContaining({ limit: 50 }) }),
		)
	})
})

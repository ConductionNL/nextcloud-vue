/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A proposal card names the proposal, the reason and the two buttons; the
 * DqZaakAssistent board draws no reach on it. The approval's raw reach
 * ("instance", "write") shows only when the host asks for it.
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(),
	},
}))

const CnAiChatPanel = require('../../src/components/CnAiCompanion/CnAiChatPanel.vue').default

const APPROVAL = {
	id: 'ap-1',
	kind: 'toolcall',
	title: 'Voorstel: taak aanmaken',
	app: 'dossiq',
	reach: 'instance',
	reason: 'Taak Offerte beoordelen voor Pieter Jansen, klaar op 10 okt.',
	agentId: 'agent-1',
	resolveUrl: '/index.php/apps/hermiq/api/approvals/ap-1',
}

/**
 * Mount the embedded panel with one pending approval.
 *
 * @param {object} [props] Extra props.
 * @return {object} The wrapper.
 */
function mountWithApproval(props = {}) {
	return mount(CnAiChatPanel, {
		propsData: {
			visible: true,
			embedded: true,
			streamState: { isStreaming: false, currentText: '', toolCalls: [], error: null, messages: [], conversationUuid: 's-1', pendingApprovals: [APPROVAL] },
			...props,
		},
	})
}

describe('CnAiChatPanel approval reach', () => {
	it('draws the card without the reach by default, as the board does', () => {
		const card = mountWithApproval().find('[data-testid="cn-ai-panel-approvals"]')
		expect(card.text()).toContain('Voorstel: taak aanmaken')
		expect(card.text()).toContain(APPROVAL.reason)
		expect(card.find('.cn-ai-approval__reach').exists()).toBe(false)
		expect(card.text()).not.toContain('instance')
	})

	it('shows the reach when the host asks for it', () => {
		const card = mountWithApproval({ showApprovalReach: true }).find('[data-testid="cn-ai-panel-approvals"]')
		expect(card.find('.cn-ai-approval__reach').text()).toBe('instance')
	})
})

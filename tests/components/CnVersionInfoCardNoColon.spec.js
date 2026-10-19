/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The compact board card (dossiq's, DqInstellingenAlgemeen) draws its labels
 * without a colon ("Versie 0.4.47"); PqBeheer's board card and the Nextcloud
 * look keep "Version:".
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))

const { mount } = require('@vue/test-utils')
const CnVersionInfoCard = require('../../src/components/CnVersionInfoCard/CnVersionInfoCard.vue').default

const SECTION = { props: ['name', 'description'], template: '<div><slot /></div>' }

/**
 * @param {string} look The look.
 * @param {boolean} [compact] The compact board card.
 * @return {Array<string>} The label texts.
 */
function labels(look, compact = false) {
	const w = mount(CnVersionInfoCard, {
		props: { appName: 'Dossiq', appVersion: '0.4.47', configuredVersion: '0.4.47', look, compact, additionalItems: [{ label: 'Channel', value: 'stable' }] },
		global: { stubs: { NcSettingsSection: SECTION } },
	})
	return w.findAll('.cn-version-info__label').map((l) => l.text())
}

describe('CnVersionInfoCard label colons', () => {
	it('draws the labels without a colon on the compact board card', () => {
		const texts = labels('board', true)
		expect(texts).toContain('Version')
		expect(texts.every((text) => !text.endsWith(':'))).toBe(true)
	})

	it('keeps the colon on the full board card and in the Nextcloud look', () => {
		for (const texts of [labels('board'), labels('nextcloud'), labels('nextcloud', true)]) {
			expect(texts).toContain('Version:')
			expect(texts.every((text) => text.endsWith(':'))).toBe(true)
		}
	})
})

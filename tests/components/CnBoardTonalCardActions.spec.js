/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a card's own actions as the light-blue tonal pill
 * (PqKassabon "Bon printen", PqKassadienst "Goedkeuren", PqIntegrations
 * "Instellen", PqLead "Product toevoegen"). A facts card's `actions[]` take
 * `variant: "tonal"` through CnActionButtons (tested there); here: an object
 * list's Add with `content.addVariant: "tonal"`, and a connection that is not
 * set up yet.
 *
 * @spec openspec/changes/board-tonal-card-actions/specs/board-tonal-card-actions/spec.md
 */
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnConnectionsPanel from '../../src/components/CnConnectionsPanel/CnConnectionsPanel.vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))
const { fetchReferenceObjects } = require('../../src/utils/boardReferenceColumns.js')

/**
 * Mount an object list over a content block.
 *
 * @param {object} content Extra content.
 * @return {object} The wrapper.
 */
function mountList(content) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'pipelinq', schema: 'leadProduct', columns: [{ key: 'title', label: 'Title' }], addLabel: 'Add product', ...content } },
		stubs: { CnDataTable: true },
	})
}

/**
 * The footer Add buttons of a list, rows present.
 *
 * @param {object} content Extra content.
 * @return {Promise<Array<object>>} The NcButton wrappers in the add footer.
 */
async function footerButtons(content) {
	const wrapper = mountList(content)
	await wrapper.setData({ loading: false, rows: [{ id: 'r1', title: 'Product' }] })
	return wrapper.findAll('.cn-object-list-widget__add > *')
}

describe('board tonal card actions', () => {
	it('🔴 an object list draws its Add as the tonal pill with addVariant "tonal"', async () => {
		const buttons = await footerButtons({ addVariant: 'tonal' })
		expect(buttons.length).toBeGreaterThan(0)
		expect(buttons[0].classes()).toContain('cn-button--tonal')
		expect([undefined, 'false']).toContain(buttons[0].attributes('wide'))
	})

	it('🔴 the extra adds follow addVariant too', async () => {
		const buttons = await footerButtons({ addVariant: 'tonal', addActions: [{ label: 'Add bundle' }] })
		expect(buttons).toHaveLength(2)
		expect(buttons[1].classes()).toContain('cn-button--tonal')
	})

	it('keeps the wide tertiary Add without addVariant', async () => {
		const buttons = await footerButtons({})
		expect(buttons[0].classes()).not.toContain('cn-button--tonal')
		expect(['', 'true']).toContain(buttons[0].attributes('wide'))
	})

	it('🔴 a connection that is not set up offers Set up as the tonal pill', async () => {
		fetchReferenceObjects.mockResolvedValue([
			{ id: '1', key: 'cti', title: 'Telephony', status: 'configured', order: 1, settingsUrl: '/settings/admin/pipelinq' },
			{ id: '2', key: 'social-bluesky', title: 'Bluesky', status: 'unconfigured', order: 2, settingsUrl: '/apps/pipelinq/social-accounts' },
		])
		const wrapper = mount(CnConnectionsPanel, {
			props: { app: 'pipelinq', appName: 'Pipelinq' },
			global: { stubs: { CnIcon: true } },
		})
		await flushPromises()
		const foots = wrapper.findAll('[data-testid="cn-connections-card"]').map((card) => card.findComponent({ name: 'NcButton' }))
		expect(foots).toHaveLength(2)
		expect(foots[0].classes()).not.toContain('cn-button--tonal')
		expect(foots[1].classes()).toContain('cn-button--tonal')
	})

	it('🔴 a board card draws its title-row Add as the tonal pill with addVariant "tonal"', () => {
		const { catalogAddTonal } = CnDetailWidgetHost.computed
		expect(typeof catalogAddTonal).toBe('function')
		expect(catalogAddTonal.call({ content: { addVariant: 'tonal' } })).toBe(true)
		expect(catalogAddTonal.call({ content: {} })).toBe(false)
		const source = fs.readFileSync(path.resolve(__dirname, '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'), 'utf8')
		const template = source.slice(0, source.indexOf('<script'))
		expect(template.match(/'cn-button--tonal': catalogAddTonal/g)).toHaveLength(2)
	})
})

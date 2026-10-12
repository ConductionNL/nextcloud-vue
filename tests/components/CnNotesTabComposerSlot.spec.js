/**
 * The `composer-before` slot: an app's own control above the note composer.
 *
 * Why it exists. Dossiq offers note templates (starter-content-and-templates,
 * task 7.2): a handler picks "Hoorzitting gepland" and the composer fills with
 * its text. The notes tab rendered its composer with nowhere to put a picker,
 * so the offer existed and was mounted nowhere.
 *
 *  - no slot changes nothing, so every existing consumer is untouched;
 *  - the slot renders above the composer and is handed `setText` and `text`;
 *  - `setText` fills the composer, and the send button sees the filled text.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnNotesTab from '../../src/components/CnObjectSidebar/CnNotesTab.vue'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn(),
}))

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'note',
}

beforeEach(() => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: () => Promise.resolve({ results: [] }),
	})
})

describe('CnNotesTab composer-before slot', () => {
	it('renders nothing extra without the slot', () => {
		const wrapper = mount(CnNotesTab, { propsData: DEFAULT_PROPS })

		expect(wrapper.find('[data-testid="note-template"]').exists()).toBe(false)
	})

	it('hands the slot setText and the current text, and setText fills the composer', async () => {
		let scope = null
		const wrapper = mount(CnNotesTab, {
			propsData: DEFAULT_PROPS,
			scopedSlots: {
				'composer-before': (props) => {
					scope = props
					return h('button', { 'data-testid': 'note-template' }, 'Template')
				},
			},
		})

		expect(wrapper.find('[data-testid="note-template"]').exists()).toBe(true)
		expect(scope.text).toBe('')

		scope.setText('Hoorzitting gepland op')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.newNoteText).toBe('Hoorzitting gepland op')
		expect(scope.text).toBe('Hoorzitting gepland op')
	})

	it('treats an empty template as an empty composer, never the string "null"', async () => {
		let scope = null
		const wrapper = mount(CnNotesTab, {
			propsData: DEFAULT_PROPS,
			scopedSlots: {
				'composer-before': (props) => {
					scope = props
					return h('span')
				},
			},
		})

		scope.setText(null)
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.newNoteText).toBe('')
	})
})

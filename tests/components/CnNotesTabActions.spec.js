/**
 * The per-note seam: an app's own action on ONE note.
 *
 * Why it exists. Dossiq built an endpoint that sends a single case note to a
 * neighbouring ZGW register, guarded it, routed it and tested it, and then
 * could not call it, because this component rendered its own edit, history
 * and delete actions and offered nowhere to put a fourth. The app's change
 * recorded that as a blocker in its own tasks file rather than declaring a
 * prop nothing read.
 *
 * So these tests are about reachability, not decoration:
 *
 *  - an empty list changes nothing, so every existing consumer is untouched;
 *  - an entry renders a real button carrying the app's own label;
 *  - clicking it emits `note-action` with the whole note, which is the only
 *    way an app can act on the note the reader picked;
 *  - an action shows up on a note nobody may edit, because a note somebody
 *    else wrote is exactly the one you want to send on.
 */

import { mount } from '@vue/test-utils'
import CnNotesTab from '../../src/components/CnObjectSidebar/CnNotesTab.vue'
import { searchNextcloudUsers } from '../../src/utils/userAutocomplete.js'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn(),
}))

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'note',
}

const SEND_ACTION = { id: 'send-onward', label: 'Send to the neighbouring register' }

/**
 * Flush pending promise callbacks a few times.
 *
 * @param {object} wrapper The mounted wrapper to settle.
 * @param {number} times How many tick rounds to run.
 * @return {Promise<void>}
 */
async function flush(wrapper, times = 4) {
	for (let i = 0; i < times; i++) {
		await wrapper.vm.$nextTick()
	}
}

/**
 * Answer the notes read with one note.
 *
 * @param {object} note The note the backend reports.
 * @return {void}
 */
function serveOneNote(note) {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: () => Promise.resolve({ results: [note] }),
	})
}

const OWN_NOTE = { id: 4, message: 'Applicant called', actorId: 'admin', versionCount: 0 }
const SOMEONE_ELSES_NOTE = { id: 5, message: 'Passed to housing', actorId: 'anna', versionCount: 0 }

describe('CnNotesTab per-note app actions', () => {
	beforeEach(() => {
		global.OC = { currentUser: 'admin' }
		searchNextcloudUsers.mockReset()
		searchNextcloudUsers.mockResolvedValue([])
	})

	afterEach(() => {
		delete global.fetch
		delete global.OC
	})

	it('an empty list adds no action anywhere', async () => {
		serveOneNote(SOMEONE_ELSES_NOTE)
		const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)

		// Nobody may edit this note and nobody edited it, so the whole menu
		// stays away. This is the state every consumer that passes nothing is
		// in, and it must be the state it was in before this prop existed.
		expect(wrapper.findAll('[data-testid^="cn-note-action-"]')).toHaveLength(0)
		expect(wrapper.find('[data-testid="cn-note-history-action"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it("renders one button per entry, carrying the app's own label", async () => {
		serveOneNote(OWN_NOTE)
		const wrapper = mount(CnNotesTab, {
			propsData: { ...DEFAULT_PROPS, noteActions: [SEND_ACTION] },
		})
		await flush(wrapper)

		const button = wrapper.find('[data-testid="cn-note-action-send-onward"]')
		expect(button.exists()).toBe(true)
		expect(button.text()).toContain('Send to the neighbouring register')
		wrapper.unmount()
	})

	it('clicking one emits note-action with the whole note', async () => {
		serveOneNote(OWN_NOTE)
		const wrapper = mount(CnNotesTab, {
			propsData: { ...DEFAULT_PROPS, noteActions: [SEND_ACTION] },
		})
		await flush(wrapper)

		await wrapper.find('[data-testid="cn-note-action-send-onward"]').trigger('click')
		await flush(wrapper)

		const emitted = wrapper.emitted('note-action')
		expect(emitted).toHaveLength(1)
		expect(emitted[0][0].action).toBe('send-onward')
		// The WHOLE note, not its id: an app that has to fetch the note back
		// to act on it is an app that can act on the wrong one.
		expect(emitted[0][0].note).toEqual(OWN_NOTE)
		wrapper.unmount()
	})

	it('an app action reaches a note the reader may not edit', async () => {
		serveOneNote(SOMEONE_ELSES_NOTE)
		const wrapper = mount(CnNotesTab, {
			propsData: { ...DEFAULT_PROPS, noteActions: [SEND_ACTION] },
		})
		await flush(wrapper)

		// A colleague's note is the one most worth sending on, and before this
		// the menu was rendered only for a note you could edit or one that had
		// been edited. Without this the seam would exist and still be dark on
		// most of the list.
		await wrapper.find('[data-testid="cn-note-action-send-onward"]').trigger('click')
		await flush(wrapper)

		expect(wrapper.emitted('note-action')[0][0].note.id).toBe(5)
		wrapper.unmount()
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTimelineWidget `manage: true`: OpenRegister's timeline on an object with
 * kind chips (filtering without a second read), CSV export of what the chips
 * show, the write controls only when the read answers canManage, pin and
 * follow-up as PATCHes read back, the composer sending a text block rather
 * than its body, a failed read shown as one, and an entry action that opens a
 * registry modal and closes the follow-up once it reports done.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const fs = require('fs')
const path = require('path')
const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const { defineComponent, h } = require('vue')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const TIMELINE = '/index.php/apps/openregister/api/objects/reg/case/c-1/timeline'

const ENTRIES = [
	{ id: 'e1', message: 'Gebeld', kind: 'telefoon', author: 'ann', created: '2026-10-01T09:00:00Z', visibility: 'internal' },
	{ id: 'e2', message: 'Say "hi"', kind: '', author: 'bob', created: '2026-10-02T09:00:00Z', visibility: 'public' },
	{ id: 'e3', message: 'Vraag', kind: 'portal-in', author: 'cit', created: '2026-10-03T09:00:00Z', visibility: 'public', followUp: 'open', fields: { subject: 'Over mijn aanvraag' } },
]

const ReplyDialog = defineComponent({
	name: 'ReplyDialog',
	props: ['open', 'recordId', 'subject'],
	emits: ['sent', 'close'],
	render() {
		return h('div', { class: 'reply-dialog', 'data-record': this.recordId, 'data-subject': this.subject })
	},
})

const stubs = {
	NcButton: { props: ['disabled', 'type', 'variant'], emits: ['click'], template: '<button v-bind="$attrs" :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	NcSelect: true,
	NcLoadingIcon: true,
	NcEmptyContent: { props: ['name'], template: '<div v-bind="$attrs">{{ name }}</div>' },
	NcNoteCard: { template: '<div v-bind="$attrs"><slot /></div>' },
	NcCheckboxRadioSwitch: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" v-bind="$attrs" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)">' },
}

/**
 * Answer the reads.
 *
 * @param {object} options `{canManage, entries, fail}`.
 */
function reads({ canManage = true, entries = ENTRIES, fail = false } = {}) {
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/timeline/kinds')) {
			return Promise.resolve({ data: { results: [{ slug: 'telefoon', title: 'Phone call' }, { slug: 'portal-in', title: 'Portal message' }] } })
		}
		if (url.endsWith('/timeline/text-blocks')) {
			return Promise.resolve({ data: { results: [{ slug: 'received', title: 'Received, we are on it' }] } })
		}
		if (url === TIMELINE) {
			return fail ? Promise.reject(new Error('down')) : Promise.resolve({ data: { canManage, results: entries } })
		}
		return Promise.reject(new Error(`unexpected ${url}`))
	})
}

async function mountManage(content = {}) {
	const wrapper = mount(CnTimelineWidget, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', content: { manage: true, ...content } },
		global: { stubs, provide: { cnRegistry: { ReplyDialog: { kind: 'modal', component: ReplyDialog } } } },
	})
	await flushPromises()
	return wrapper
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	axios.patch.mockReset()
})

describe('CnTimelineWidget manage mode', () => {
	it('renders the manage view instead of the read view', async () => {
		reads()
		const wrapper = await mountManage()
		expect(wrapper.find('[data-testid="cn-timeline-manage"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-timeline-widget"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-timeline-entry"]')).toHaveLength(3)
	})

	it('starts with All and lists only the kinds present, with counts, and filters without reading again', async () => {
		reads()
		const wrapper = await mountManage()
		const chips = wrapper.findAll('[data-testid^="cn-timeline-chip-"]')
		expect(chips.map((chip) => chip.text().replace(/\s+/g, ' '))).toEqual(['All 3', 'Note 1', 'Phone call 1', 'Portal message 1'])
		expect(chips[0].attributes('aria-pressed')).toBe('true')

		const reads0 = axios.get.mock.calls.length
		await wrapper.find('[data-testid="cn-timeline-chip-telefoon"]').trigger('click')
		expect(wrapper.findAll('[data-testid="cn-timeline-entry"]')).toHaveLength(1)
		expect(wrapper.find('[data-testid="cn-timeline-chip-telefoon"]').attributes('aria-pressed')).toBe('true')
		expect(axios.get.mock.calls.length).toBe(reads0)
		expect(wrapper.find('[data-testid="cn-timeline-count"]').text()).toBe('1 of 3 events')

		await wrapper.find('[data-testid="cn-timeline-chip-all"]').trigger('click')
		expect(wrapper.findAll('[data-testid="cn-timeline-entry"]')).toHaveLength(3)
	})

	it('exports the entries the chips show as CSV, quotes escaped', async () => {
		reads()
		const wrapper = await mountManage()
		await wrapper.find('[data-testid="cn-timeline-chip-note"]').trigger('click')
		const manage = wrapper.findComponent({ name: 'CnTimelineManage' })
		const [head, row] = manage.vm.entriesCsv().split('\r\n')
		expect(head).toBe('"When","Kind","Who","Visibility","Message"')
		expect(row).toBe('"2026-10-02T09:00:00Z","Note","bob","public","Say ""hi"""')
	})

	it('draws no write control for a reader who may not manage', async () => {
		reads({ canManage: false })
		const wrapper = await mountManage()
		expect(wrapper.find('[data-testid="cn-timeline-composer"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-timeline-pin-e1"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-timeline-export"]').exists()).toBe(true)
	})

	it('says a failed read failed rather than showing an empty history', async () => {
		reads({ fail: true })
		const wrapper = await mountManage()
		expect(wrapper.find('[data-testid="cn-timeline-error"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-timeline-empty"]').exists()).toBe(false)
	})

	it('pins through a PATCH and reads the order back', async () => {
		reads()
		axios.patch.mockResolvedValue({ data: {} })
		const wrapper = await mountManage()
		await wrapper.find('[data-testid="cn-timeline-pin-e1"]').trigger('click')
		await flushPromises()
		expect(axios.patch).toHaveBeenCalledWith(`${TIMELINE}/e1`, { pinned: true })
		expect(axios.get.mock.calls.filter(([url]) => url === TIMELINE)).toHaveLength(2)
	})

	it('sends a picked standard note as its block, not its body', async () => {
		reads()
		axios.post.mockResolvedValue({ data: {} })
		const wrapper = await mountManage()
		const manage = wrapper.findComponent({ name: 'CnTimelineManage' })
		manage.vm.pickBlock({ id: 'received', label: 'Received, we are on it' })
		await wrapper.vm.$nextTick()
		await wrapper.find('[data-testid="cn-timeline-composer"]').trigger('submit')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith(TIMELINE, { visibility: 'internal', textBlock: 'received' })
	})

	it('writes an own note with its visibility', async () => {
		reads()
		axios.post.mockResolvedValue({ data: {} })
		const wrapper = await mountManage()
		await wrapper.find('[data-testid="cn-timeline-draft"]').setValue('Called back')
		await wrapper.find('[data-testid="cn-timeline-draft-public"]').setValue(true)
		await wrapper.find('[data-testid="cn-timeline-composer"]').trigger('submit')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith(TIMELINE, { visibility: 'public', message: 'Called back' })
		const label = wrapper.find('label[for^="cn-timeline-draft-"]')
		expect(label.attributes('for')).toBe(wrapper.find('[data-testid="cn-timeline-draft"]').attributes('id'))
	})

	it('offers an entry action on its kinds only, and closes the follow-up once the modal reports done', async () => {
		reads()
		axios.patch.mockResolvedValue({ data: {} })
		const wrapper = await mountManage({
			entryActions: [{
				id: 'reply',
				label: 'Reply',
				kinds: ['portal-in'],
				modal: 'ReplyDialog',
				props: { open: true, recordId: '@objectId', subject: '@row.fields.subject' },
				doneEvent: 'sent',
				closesFollowUp: true,
			}],
		})
		expect(wrapper.find('[data-testid="cn-timeline-action-reply-e1"]').exists()).toBe(false)
		await wrapper.find('[data-testid="cn-timeline-action-reply-e3"]').trigger('click')
		const dialog = wrapper.findComponent(ReplyDialog)
		expect(dialog.props()).toMatchObject({ open: true, recordId: 'c-1', subject: 'Over mijn aanvraag' })

		dialog.vm.$emit('sent')
		await flushPromises()
		expect(axios.patch).toHaveBeenCalledWith(`${TIMELINE}/e3`, { followUp: 'done' })
		expect(wrapper.findComponent(ReplyDialog).exists()).toBe(false)
	})

	it('keeps the board look of the history heading and chips', () => {
		const source = fs.readFileSync(path.resolve(__dirname, '../../src/components/CnTimelineWidget/CnTimelineManage.vue'), 'utf8')
		const ruleFor = (selector) => {
			const start = source.indexOf(`${selector} {`)
			return start === -1 ? '' : source.slice(start, source.indexOf('}', start))
		}
		expect(ruleFor('.cn-timeline-manage__heading')).toContain('gap: 4px')
		expect(ruleFor('.cn-timeline-manage__title')).toContain('font-size: 17px')
		expect(ruleFor('.cn-timeline-manage__title')).toContain('font-weight: 700')
		expect(ruleFor('.cn-timeline-manage__header')).toContain('margin-block-end: 16px')
		expect(ruleFor('.cn-timeline-manage__chip')).toContain('height: 36px')
		expect(ruleFor('.cn-timeline-manage__chip')).toContain('border-radius: 18px')
		expect(ruleFor('.cn-timeline-manage__chip--active')).toContain('border: 0')
		expect(ruleFor('.cn-timeline-manage__chip-count')).toContain('border-radius: 10px')
	})
})

describe('CnTimelineWidget manage mode: the composer in the board\'s words (DqZaakHistorie)', () => {
	it('names the composer, its template picker, its note field, its switch and its button as the board does', async () => {
		reads()
		const wrapper = await mountManage()
		const composer = wrapper.find('[data-testid="cn-timeline-composer"]')
		expect(composer.find('.cn-timeline-manage__composer-title').text()).toBe('Add note')
		expect(composer.find('[data-testid="cn-timeline-block"]').attributes('inputlabel')).toBe('Template')
		expect(composer.find('.cn-timeline-manage__draft-label').text()).toBe('Note')
		expect(wrapper.findComponent({ name: 'CnTimelineManage' }).vm.publicLabel).toBe('Visible to the requester')
		expect(composer.find('[data-testid="cn-timeline-save"]').text()).toBe('Add it to the timeline')
	})

	it('reads them in Dutch as the board does', () => {
		const nl = JSON.parse(fs.readFileSync(path.join(__dirname, '../../l10n/nl.json'), 'utf8')).translations
		expect(nl['Add note']).toBe('Notitie toevoegen')
		expect(nl.Template).toBe('Sjabloon')
		expect(nl.Note).toBe('Notitie')
		expect(nl['Visible to the requester']).toBe('Zichtbaar voor de verzoeker')
		expect(nl['Add it to the timeline']).toBe('Aan de tijdlijn toevoegen')
	})
})

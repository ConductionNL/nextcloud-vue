/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMailTab: the template row that opens a Nextcloud Mail draft through the
 * app's endpoint, above the record's linked mail.
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

const { flushPromises, mount } = require('@vue/test-utils')
const { invalidateEndpointSourceCache } = require('../../src/composables/useEndpointSource.js')
const CnMailTab = require('../../src/components/CnMailTab/CnMailTab.vue').default
const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
require('../../src/components/CnMailTab/index.js')

const CONTENT = {
	heading: 'Email',
	description: 'Mail linked to this case',
	hint: 'You send it from Mail.',
	templates: { url: '/apps/app/api/types/@object.caseType/email-templates', responsePath: 'results' },
	noTemplatesText: 'No templates for this type yet',
	draft: { url: '/apps/app/api/cases/@objectId/email-templates/{templateId}/draft' },
	closedWhen: { field: 'endDate', op: 'notEmpty' },
	linkedMail: false,
}

/**
 * Mount the tab on a record.
 *
 * @param {object} content The widget content.
 * @param {object} record The bound record.
 * @return {object} The wrapper.
 */
function mountTab(content = CONTENT, record = { id: 'c1', caseType: 't1' }) {
	return mount(CnMailTab, {
		propsData: { content, objectId: record.id, objectData: record, register: 'app', schema: 'case' },
		global: { stubs: { CnEmailTab: { name: 'CnEmailTab', props: ['objectId', 'register', 'schema'], template: '<div class="linked-mail-stub" />' } } },
	})
}

beforeEach(() => {
	invalidateEndpointSourceCache()
	mockGet.mockReset()
	mockPost.mockReset()
	global.fetch = jest.fn()
})

afterEach(() => {
	delete global.fetch
})

describe('CnMailTab', () => {
	it('is registered as the `mail` widget type', () => {
		expect(getWidgetTypeEntry('mail').renderer).toBe(CnMailTab)
	})

	it('reads the templates from the record-scoped URL and draws the row', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'tpl-1', name: 'Receipt' }] } })
		const wrapper = mountTab()
		await flushPromises()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/app/api/types/t1/email-templates', { params: {} })
		expect(wrapper.find('.cn-mail-tab__title').text()).toBe('Email')
		expect(wrapper.find('.cn-mail-tab__subtitle').text()).toBe('Mail linked to this case')
		expect(wrapper.find('.cn-mail-tab__hint').text()).toBe('You send it from Mail.')
		expect(wrapper.vm.templates).toEqual([{ id: 'tpl-1', name: 'Receipt' }])
		expect(wrapper.find('[data-testid="cn-mail-tab-draft-template"]').exists()).toBe(true)
		expect(wrapper.find('.linked-mail-stub').exists()).toBe(false)
		wrapper.unmount()
	})

	it('names the empty template list with the configured text', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const wrapper = mountTab()
		await flushPromises()
		expect(wrapper.vm.templatePlaceholder).toBe('No templates for this type yet')
		wrapper.unmount()
	})

	it('posts the chosen template, opens the draft and lists the unresolved fields', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'tpl-1', name: 'Receipt' }] } })
		mockPost.mockResolvedValue({ data: { draftUrl: 'https://mail/draft/1', unresolved: ['zaaknummer'] } })
		const open = jest.spyOn(window, 'open').mockImplementation(() => null)
		const wrapper = mountTab()
		await flushPromises()
		wrapper.vm.selectedTemplate = { id: 'tpl-1', name: 'Receipt' }
		await wrapper.vm.draftFromTemplate()
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/app/api/cases/c1/email-templates/tpl-1/draft', {})
		expect(open).toHaveBeenCalledWith('https://mail/draft/1', '_blank', 'noopener')
		expect(wrapper.find('[data-testid="cn-mail-tab-unresolved"]').text()).toContain('{{zaaknummer}}')
		expect(wrapper.emitted('drafted')).toHaveLength(1)
		open.mockRestore()
		wrapper.unmount()
	})

	it('posts the blank template id for an empty draft', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		mockPost.mockResolvedValue({ data: {} })
		const wrapper = mountTab({ ...CONTENT, draft: { ...CONTENT.draft, blankTemplateId: 'none' } })
		await flushPromises()
		await wrapper.vm.draftBlank()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/app/api/cases/c1/email-templates/none/draft', {})
		wrapper.unmount()
	})

	it('drafts nothing while closedWhen holds', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const wrapper = mountTab(CONTENT, { id: 'c1', caseType: 't1', endDate: '2026-10-01' })
		await flushPromises()
		expect(wrapper.vm.closed).toBe(true)
		await wrapper.vm.draftBlank()
		expect(mockPost).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('says Mail is not available when the draft endpoint answers 404', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		mockPost.mockRejectedValue({ response: { status: 404, data: {} } })
		const wrapper = mountTab()
		await flushPromises()
		await wrapper.vm.draftBlank()
		await flushPromises()
		expect(wrapper.vm.unavailable).toBe(true)
		expect(wrapper.find('[data-testid="cn-mail-tab-template-row"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the server message when a draft fails', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		mockPost.mockRejectedValue({ response: { status: 500, data: { message: 'No mail account' } } })
		const wrapper = mountTab()
		await flushPromises()
		await wrapper.vm.draftBlank()
		await flushPromises()
		expect(wrapper.vm.error).toBe('No mail account')
		wrapper.unmount()
	})

	it('offers only the empty draft without templates, and the linked mail by default', async () => {
		const wrapper = mountTab({ draft: CONTENT.draft })
		await flushPromises()
		expect(mockGet).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-mail-tab-draft-template"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-mail-tab-draft-blank"]').exists()).toBe(true)
		expect(wrapper.find('.linked-mail-stub').exists()).toBe(true)
		wrapper.unmount()
	})

	describe('header actions', () => {
		const openPicker = jest.fn()
		const LINKED_STUB = { name: 'CnEmailTab', props: ['objectId', 'register', 'schema', 'showActions'], template: '<div class="linked-mail-stub" />', methods: { openPicker } }

		/**
		 * Mount the tab with header actions and the linked mail.
		 *
		 * @param {object} content The widget content.
		 * @return {object} The wrapper.
		 */
		function mountWithActions(content) {
			return mount(CnMailTab, {
				propsData: { content, objectId: 'c1', objectData: { id: 'c1', caseType: 't1' }, register: 'app', schema: 'case' },
				global: { stubs: { CnEmailTab: LINKED_STUB } },
			})
		}

		beforeEach(() => openPicker.mockReset())

		it('draws "Link mail" and "Compose mail" in the header and drops the row\'s empty draft', async () => {
			const wrapper = mountWithActions({ heading: 'Email', draft: CONTENT.draft, headerActions: ['compose', 'link'] })
			await flushPromises()
			const header = wrapper.find('[data-testid="cn-mail-tab-header"]')
			expect(header.find('.cn-mail-tab__title').text()).toBe('Email')
			expect(header.find('[data-testid="cn-mail-tab-header-link"]').text()).toBe('Link mail')
			expect(header.find('[data-testid="cn-mail-tab-header-compose"]').text()).toBe('Compose mail')
			expect(wrapper.find('[data-testid="cn-mail-tab-draft-blank"]').exists()).toBe(false)
			expect(wrapper.findComponent({ name: 'CnEmailTab' }).props('showActions')).toBe(false)
			wrapper.unmount()
		})

		it('opens the empty draft from "Compose mail"', async () => {
			mockPost.mockResolvedValue({ data: {} })
			const wrapper = mountWithActions({ draft: CONTENT.draft, headerActions: ['compose'] })
			await flushPromises()
			await wrapper.find('[data-testid="cn-mail-tab-header-compose"]').trigger('click')
			await flushPromises()
			expect(mockPost).toHaveBeenCalledWith('/index.php/apps/app/api/cases/c1/email-templates/blank/draft', {})
			wrapper.unmount()
		})

		it('opens the linked mail\'s picker from "Link mail"', async () => {
			const wrapper = mountWithActions({ headerActions: ['link'] })
			await flushPromises()
			await wrapper.find('[data-testid="cn-mail-tab-header-link"]').trigger('click')
			expect(openPicker).toHaveBeenCalledTimes(1)
			wrapper.unmount()
		})

		it('composes in Mail when the app has no draft endpoint', async () => {
			const wrapper = mountWithActions({ headerActions: ['compose'] })
			await flushPromises()
			expect(wrapper.find('[data-testid="cn-mail-tab-header-compose"]').attributes('href')).toContain('/apps/mail/box/draft')
			wrapper.unmount()
		})

		it('offers no "Link mail" without the linked mail, and no header without actions', async () => {
			const linkless = mountWithActions({ headerActions: ['link'], linkedMail: false })
			await flushPromises()
			expect(linkless.find('[data-testid="cn-mail-tab-header-link"]').exists()).toBe(false)
			linkless.unmount()
			const plain = mountWithActions({ draft: CONTENT.draft })
			await flushPromises()
			expect(plain.find('[data-testid="cn-mail-tab-header-compose"]').exists()).toBe(false)
			expect(plain.find('[data-testid="cn-mail-tab-draft-blank"]').exists()).toBe(true)
			expect(plain.findComponent({ name: 'CnEmailTab' }).props('showActions')).toBe(true)
			plain.unmount()
		})
	})
})

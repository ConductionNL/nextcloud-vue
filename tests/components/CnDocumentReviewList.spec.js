/**
 * Tests for CnDocumentReviewList: files that each need a verdict, and how far
 * along you are. Also covers the `document-review` detail widget.
 */

const { mount } = require('@vue/test-utils')
const CnDocumentReviewList = require('../../src/components/CnDocumentReviewList/CnDocumentReviewList.vue').default
const CnDocumentReviewWidget = require('../../src/components/CnDocumentReviewList/CnDocumentReviewWidget.vue').default

const documents = [
	{ id: 1, name: 'Advice on street lighting', meta: 'PDF', reviewStatus: 'public' },
	{ id: 2, name: 'Mail from the contractor', meta: 'E-mail', reviewStatus: 'partly-public' },
	{ id: 3, name: 'Budget note', meta: 'Word' },
	{ id: 4, name: 'Quote', reviewStatus: 'to-review', href: '/f/4' },
	{ id: 5, name: 'Odd one', reviewStatus: 'something-else' },
]

const mountList = (propsData, options = {}) => mount(CnDocumentReviewList, { propsData: { documents, ...propsData }, ...options })

describe('CnDocumentReviewList', () => {
	it('renders one row per document with its name and meta', () => {
		const wrapper = mountList()
		const rows = wrapper.findAll('[data-testid="cn-document-review-row"]')
		expect(rows).toHaveLength(5)
		expect(rows[0].text()).toContain('Advice on street lighting')
		expect(rows[0].text()).toContain('PDF')
	})

	it('counts the reviewed rows in the summary', () => {
		expect(mountList().find('[data-testid="cn-document-review-summary"]').text()).toBe('2 of 5 reviewed')
	})

	it('gives a document with no status, or an unknown one, the first unreviewed status', () => {
		const badges = mountList().findAll('.cn-status-badge').map((badge) => badge.text())
		expect(badges).toEqual(['Public', 'Partly public', 'To review', 'To review', 'To review'])
	})

	it('colours the badge through the status variant', () => {
		const badges = mountList().findAll('.cn-status-badge')
		expect(badges[0].classes()).toContain('cn-status-badge--success')
		expect(badges[1].classes()).toContain('cn-status-badge--warning')
		expect(badges[2].classes()).toContain('cn-status-badge--default')
	})

	it('takes its status field and values from configuration', () => {
		const wrapper = mountList({
			documents: [{ id: 1, name: 'A', verdict: 'OK' }, { id: 2, name: 'B', verdict: 'open' }],
			statusField: 'verdict',
			statuses: [
				{ value: 'ok', label: 'Approved', variant: 'success', reviewed: true },
				{ value: 'open', label: 'Open' },
			],
		})
		expect(wrapper.findAll('.cn-status-badge').map((badge) => badge.text())).toEqual(['Approved', 'Open'])
		expect(wrapper.find('[data-testid="cn-document-review-summary"]').text()).toBe('1 of 2 reviewed')
	})

	it('honours defaultStatus for a document that carries none', () => {
		const wrapper = mountList({ documents: [{ id: 1, name: 'A' }], defaultStatus: 'public' })
		expect(wrapper.find('.cn-status-badge').text()).toBe('Public')
	})

	it('makes the name a link only when the row has an href', () => {
		const wrapper = mountList()
		expect(wrapper.findAll('a')).toHaveLength(1)
		expect(wrapper.find('a').attributes('href')).toBe('/f/4')
		expect(wrapper.find('a').text()).toBe('Quote')
	})

	it('names each row action after its document and emits the document', async () => {
		const wrapper = mountList()
		const actions = wrapper.findAll('[data-testid="cn-document-review-action"]')
		expect(actions).toHaveLength(5)
		expect(actions[2].attributes('aria-label')).toBe('Review: Budget note')
		await actions[2].trigger('click')
		expect(wrapper.emitted('row-action')[0]).toEqual([documents[2]])
	})

	it('renders no row action when its label is empty', () => {
		expect(mountList({ rowActionLabel: '' }).find('[data-testid="cn-document-review-action"]').exists()).toBe(false)
	})

	it('says so when there is nothing to review, and shows no summary', () => {
		const wrapper = mountList({ documents: [] })
		expect(wrapper.find('[data-testid="cn-document-review-empty"]').text()).toBe('No documents to review.')
		expect(wrapper.find('[data-testid="cn-document-review-summary"]').exists()).toBe(false)
		expect(wrapper.find('ul').exists()).toBe(false)
	})

	it('labels the region with its heading, or with a fallback name', () => {
		const titled = mountList({ title: 'Review documents' })
		expect(titled.find('section').attributes('aria-labelledby')).toBe(titled.find('h3').attributes('id'))
		expect(mountList().find('section').attributes('aria-label')).toBe('Documents to review')
	})
})

describe('CnDocumentReviewWidget (document-review widget type)', () => {
	it('reads the documents from the configured field on the record', () => {
		const wrapper = mount(CnDocumentReviewWidget, {
			propsData: { content: { field: 'files', title: 'Review' }, objectData: { files: documents } },
		})
		expect(wrapper.findAll('[data-testid="cn-document-review-row"]')).toHaveLength(5)
		expect(wrapper.find('[data-testid="cn-document-review-action"]').exists()).toBe(false)
	})

	it('renders the empty state when the record has no such list', () => {
		const wrapper = mount(CnDocumentReviewWidget, { propsData: { content: {}, objectData: null } })
		expect(wrapper.find('[data-testid="cn-document-review-empty"]').exists()).toBe(true)
	})

	it('opens the row action\'s route with the row key as id', async () => {
		const push = jest.fn()
		const wrapper = mount(CnDocumentReviewWidget, {
			propsData: {
				content: { field: 'files', rowAction: { label: 'Review', route: 'DocumentDetail' } },
				objectData: { files: documents },
			},
			global: { mocks: { $router: { push } } },
		})
		await wrapper.findAll('[data-testid="cn-document-review-action"]')[1].trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'DocumentDetail', params: { id: '2' } })
	})
})

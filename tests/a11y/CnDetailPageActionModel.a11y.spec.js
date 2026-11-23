/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnDetailPage`'s action model: the stage's
 * primary button, quick actions, the "what now" card, header pills and the
 * side column, against the real `@nextcloud/vue`.
 *
 * Beside the scan: every action the model puts on the page has to be a native
 * control a keyboard reaches, there has to be exactly one primary button, and
 * the skip link has to land on it wherever it sits.
 */

const { reactive } = require('vue')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const HostStub = { name: 'CnDetailWidgetHost', props: ['widget'], template: '<section :aria-label="widget.title"><h3>{{ widget.title }}</h3><p>27 days</p></section>' }

const baseProps = {
	title: 'Case',
	register: 'r',
	schema: 's',
	objectId: 'o1',
	isAdmin: false,
	headerActions: [
		{ id: 'message', type: 'open-modal', label: 'Message', target: 'M' },
		{ id: 'document', type: 'open-modal', label: 'Document', target: 'D' },
		{ id: 'hand-over', type: 'open-modal', label: 'Hand over', target: 'H', group: 'Case' },
	],
	quickActions: ['message', 'document'],
	primaryActionByStage: { handling: { id: 'continue', type: 'open-modal', label: 'Continue reviewing', target: 'C' } },
	actionsMenu: { showRefresh: false, showHelpLinks: false, label: 'More' },
	typePill: { field: 'caseType', variant: 'error' },
	statusPill: { field: 'status', colorMap: { handling: 'primary' }, labels: { handling: 'Handling' } },
	sideColumn: [{ id: 'term', type: 'text', title: 'Term' }],
}

const nextStep = {
	stages: {
		handling: {
			title: 'What now? Step 2: handling',
			after: 'Then: step 3, decision',
			checklist: [{ label: 'Confirm receipt', doneField: 'receipt' }, { label: 'Review the documents' }],
		},
	},
}

/**
 * @param {object} [props] Extra props.
 * @return {Promise<object>} The mounted page, with its actions published.
 */
async function mountPage(props = {}) {
	const store = reactive({
		objects: { 'r-s': { o1: { id: 'o1', status: 'handling', caseType: 'Woo request', receipt: true } } },
		schemas: {},
		registerObjectType: () => {},
		fetchObject: async () => null,
		fetchSchema: async () => null,
	})
	const wrapper = mountAttached(CnDetailPage, {
		propsData: { ...baseProps, objectStore: store, ...props },
		global: { stubs: { CnDetailWidgetHost: HostStub, CnBuildiqEditButton: true } },
	})
	await flush()
	await flush()
	return wrapper
}

describe('CnDetailPage action model: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations with the button in the header', async () => {
		wrapper = await mountPage()
		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with the "what now" card', async () => {
		wrapper = await mountPage({ nextStep })
		await expectAccessible(wrapper)
	})

	it('offers the primary action and every quick action as a native button', async () => {
		wrapper = await mountPage()
		const header = wrapper.element.querySelector('.cn-detail-page__header-actions')
		const names = [...header.querySelectorAll('button')].map((button) => button.textContent.trim())
		expect(names).toEqual(expect.arrayContaining(['Continue reviewing', 'Message', 'Document']))
		for (const button of header.querySelectorAll('button')) {
			expect(button.getAttribute('tabindex')).not.toBe('-1')
		}
	})

	it('has exactly one primary button, and the skip link lands on it in the card', async () => {
		wrapper = await mountPage({ nextStep })
		const primary = wrapper.element.querySelectorAll('[data-testid="cn-detail-page-primary-action"]')
		expect(primary).toHaveLength(1)
		expect(wrapper.element.querySelector('[data-testid="cn-detail-page-next-step"]').contains(primary[0])).toBe(true)

		const link = wrapper.element.querySelector('[data-testid="cn-detail-page-skip-link"]')
		expect(link.getAttribute('href')).toBe(`#${primary[0].id}`)
		link.click()
		expect(document.activeElement).toBe(primary[0])
	})

	it('names the side column as a complementary region', async () => {
		wrapper = await mountPage()
		const side = wrapper.element.querySelector('aside')
		expect(side.getAttribute('aria-label')).toBe('Details')
	})

	it('says the type and the status in text', async () => {
		wrapper = await mountPage()
		const pills = [...wrapper.element.querySelectorAll('[data-testid^="cn-detail-page-pill-"]')].map((pill) => pill.textContent.trim())
		expect(pills).toEqual(['Woo request', 'Handling'])
	})
})

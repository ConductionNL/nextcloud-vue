/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailWidgetHost: record tokens in an integration widget's `props`.
 *
 * A manifest can mount an integration for another object than the page's:
 * the decisions on the case a ticket became are
 * `props: { schema: "case", objectId: "@object.caseReference" }`. The host
 * spread `widget.props` as written, so the leaf received the literal string
 * "@object.caseReference" as its object id.
 *
 * The load-bearing assertions are the negative ones. A leaf that gets an empty
 * object id falls back to the page's object, so "the ticket has no case" must
 * read as "nothing is mounted", never as a second list of the ticket's own
 * decisions.
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { integrations } from '../../src/integrations/registry.js'

/** A component-mode leaf that shows what it was handed. */
const Leaf = {
	name: 'TokenLeaf',
	inheritAttrs: false,
	props: ['register', 'schema', 'objectId', 'objectLabel', 'filter'],
	template: '<div data-testid="token-leaf" :data-object="objectId" :data-register="register" :data-schema="schema" :data-label="objectLabel" />',
}

/**
 * Mount the host on a ticket.
 *
 * @param {object} widget The widget definition.
 * @param {object|null} object The ticket, or null while it loads.
 * @return {object} The wrapper.
 */
function mountOnTicket(widget, object) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget,
			surface: 'detail-page',
			objectId: 'ticket-1',
			register: 'pipelinq',
			schema: 'ticket',
			object,
		},
		global: { stubs: { CnIcon: true } },
	})
}

const CASE_WIDGET = {
	id: 'case-decisions',
	type: 'integration',
	integrationId: 'decisions',
	props: { register: 'dossiq', schema: 'case', objectId: '@object.caseReference', objectLabel: '@object.title' },
}

describe('CnDetailWidgetHost: tokens in an integration widget\'s props', () => {
	afterEach(() => integrations.__resetForTests())

	it('hands a component-mode leaf the object the props name', () => {
		integrations.register({ id: 'decisions', label: 'Decisions', requiredApp: null, tab: Leaf, widget: Leaf })
		const wrapper = mountOnTicket(CASE_WIDGET, { id: 'ticket-1', title: 'Street party', caseReference: 'case-9' })

		const leaf = wrapper.find('[data-testid="token-leaf"]')
		expect(leaf.exists()).toBe(true)
		expect(leaf.attributes('data-object')).toBe('case-9')
		expect(leaf.attributes('data-register')).toBe('dossiq')
		expect(leaf.attributes('data-schema')).toBe('case')
		expect(leaf.attributes('data-label')).toBe('Street party')
	})

	it('resolves @objectId and tokens inside a nested prop', () => {
		integrations.register({ id: 'decisions', label: 'Decisions', requiredApp: null, tab: Leaf, widget: Leaf })
		const wrapper = mountOnTicket({
			id: 'own',
			type: 'integration',
			integrationId: 'decisions',
			props: { objectLabel: '@objectId', filter: { subject: '@object.caseReference' } },
		}, { id: 'ticket-1', caseReference: 'case-9' })

		const leaf = wrapper.findComponent({ name: 'TokenLeaf' })
		expect(leaf.props('objectLabel')).toBe('ticket-1')
		expect(leaf.props('filter')).toEqual({ subject: 'case-9' })
		// The page's own object stays the host where the props name no other.
		expect(leaf.props('objectId')).toBe('ticket-1')
	})

	it.each([
		['the record has not loaded', null],
		['the record does not hold the field', { id: 'ticket-1', title: 'Street party' }],
		['the field is null', { id: 'ticket-1', title: 'Street party', caseReference: null }],
		['the field is empty', { id: 'ticket-1', title: 'Street party', caseReference: '' }],
	])('mounts nothing while %s', (label, object) => {
		integrations.register({ id: 'decisions', label: 'Decisions', requiredApp: null, tab: Leaf, widget: Leaf })
		const wrapper = mountOnTicket(CASE_WIDGET, object)

		expect(wrapper.find('[data-testid="token-leaf"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-widget-props-pending"]').exists()).toBe(true)
	})

	it('mounts once the record gains the field', async () => {
		integrations.register({ id: 'decisions', label: 'Decisions', requiredApp: null, tab: Leaf, widget: Leaf })
		const wrapper = mountOnTicket(CASE_WIDGET, { id: 'ticket-1', title: 'Street party' })
		expect(wrapper.find('[data-testid="token-leaf"]').exists()).toBe(false)

		await wrapper.setProps({ object: { id: 'ticket-1', title: 'Street party', caseReference: 'case-9' } })

		expect(wrapper.find('[data-testid="token-leaf"]').attributes('data-object')).toBe('case-9')
	})

	it('leaves literal props alone, an empty string included', () => {
		integrations.register({ id: 'decisions', label: 'Decisions', requiredApp: null, tab: Leaf, widget: Leaf })
		const wrapper = mountOnTicket({
			id: 'own',
			type: 'integration',
			integrationId: 'decisions',
			props: { objectLabel: '' },
		}, { id: 'ticket-1' })

		const leaf = wrapper.findComponent({ name: 'TokenLeaf' })
		expect(leaf.exists()).toBe(true)
		expect(leaf.props('objectId')).toBe('ticket-1')
		expect(leaf.props('register')).toBe('pipelinq')
	})

	describe('a mount-mode leaf', () => {
		/**
		 * Register a mount-mode leaf that records what it was mounted with.
		 *
		 * @return {Array<object>} The prop bags, one per mount.
		 */
		function registerMountLeaf() {
			const mounts = []
			integrations.register({
				id: 'decisions',
				label: 'Decisions',
				requiredApp: null,
				renderMode: 'mount',
				mount: (el, props) => { mounts.push(props) },
				unmount: () => {},
			})
			return mounts
		}

		it('gets the named object as props and as integrationContext', () => {
			const mounts = registerMountLeaf()
			mountOnTicket(CASE_WIDGET, { id: 'ticket-1', title: 'Street party', caseReference: 'case-9' })

			expect(mounts).toHaveLength(1)
			expect(mounts[0]).toMatchObject({
				register: 'dossiq',
				schema: 'case',
				objectId: 'case-9',
				integrationContext: { register: 'dossiq', schema: 'case', objectId: 'case-9' },
			})
		})

		it('is not mounted on a ticket without a case', () => {
			const mounts = registerMountLeaf()
			mountOnTicket(CASE_WIDGET, { id: 'ticket-1', title: 'Street party' })

			expect(mounts).toHaveLength(0)
		})

		it('keeps the page object as its context without props', () => {
			const mounts = registerMountLeaf()
			mountOnTicket({ id: 'own', type: 'integration', integrationId: 'decisions' }, { id: 'ticket-1' })

			expect(mounts[0].integrationContext).toEqual({ register: 'pipelinq', schema: 'ticket', objectId: 'ticket-1' })
		})
	})
})

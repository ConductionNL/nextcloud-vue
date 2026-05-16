/**
 * Tests for CnCellRenderer's column-formatter and column-widget resolution.
 *
 * - `formatter`: id resolves against the injected `cnFormatters` registry;
 *   when resolvable the cell renders `cnFormatters[formatter](value, row, property)`
 *   as text. Unknown ids / missing registry / throwing formatters fall back.
 * - `widget`: id resolves against `cnCellWidgets` (consumer registry); the
 *   built-in `"badge"` renders `CnStatusBadge`; unknown widget ids fall back.
 */

import { mount } from '@vue/test-utils'

const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default
const { CnStatusBadge } = require('../../src/components/CnStatusBadge/index.js')

/**
 * Mount helper.
 *
 * @param {object} propsData Component props.
 * @param {object} [provide] Provide map (e.g. `{ cnFormatters, cnCellWidgets }`); omit for none.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountRenderer(propsData, provide) {
	return mount(CnCellRenderer, {
		propsData,
		...(provide !== undefined ? { provide } : {}),
	})
}

describe('CnCellRenderer — column formatters', () => {
	it('renders a registered formatter with (value, row, property)', () => {
		const seen = []
		const wrapper = mountRenderer(
			{
				value: 'lead.created',
				property: { type: 'string' },
				formatter: 'humanTrigger',
				row: { trigger: 'lead.created', name: 'Welcome flow' },
			},
			{
				cnFormatters: {
					humanTrigger: (value, row, property) => {
						seen.push({ value, row, property })
						return 'Lead created'
					},
				},
			},
		)
		expect(wrapper.text()).toBe('Lead created')
		expect(seen).toHaveLength(1)
		expect(seen[0].value).toBe('lead.created')
		expect(seen[0].row).toEqual({ trigger: 'lead.created', name: 'Welcome flow' })
		expect(seen[0].property).toEqual({ type: 'string' })
	})

	it('falls back to type-aware rendering when the formatter id is unknown', () => {
		const wrapper = mountRenderer(
			{ value: 'plain text', property: { type: 'string' }, formatter: 'nope' },
			{ cnFormatters: { humanTrigger: () => 'unreachable' } },
		)
		expect(wrapper.text()).toBe('plain text')
	})

	it('falls back when no cnFormatters registry is provided', () => {
		const wrapper = mountRenderer({ value: 'plain text', property: { type: 'string' }, formatter: 'humanTrigger' })
		expect(wrapper.text()).toBe('plain text')
	})

	it('renders unchanged when no formatter is set (regression)', () => {
		const wrapper = mountRenderer({ value: 42, property: { type: 'integer' } }, { cnFormatters: { humanTrigger: () => 'x' } })
		expect(wrapper.text()).toBe('42')
	})

	it('falls back and warns when the formatter throws', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountRenderer(
			{ value: 'plain text', property: { type: 'string' }, formatter: 'boom' },
			{ cnFormatters: { boom: () => { throw new Error('kaboom') } } },
		)
		expect(wrapper.text()).toBe('plain text')
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('CnCellRenderer — column widgets', () => {
	it('renders the built-in "badge" widget as a CnStatusBadge', () => {
		const wrapper = mountRenderer({ value: 'open', property: { type: 'string' }, widget: 'badge' })
		const badge = wrapper.findComponent(CnStatusBadge)
		expect(badge.exists()).toBe(true)
		expect(badge.props('label')).toBe('open')
		expect(badge.props('variant')).toBe('default')
	})

	it('passes widgetProps.variant through to the built-in badge', () => {
		const wrapper = mountRenderer({ value: 'failed', property: { type: 'string' }, widget: 'badge', widgetProps: { variant: 'error' } })
		expect(wrapper.findComponent(CnStatusBadge).props('variant')).toBe('error')
	})

	it('renders a dash for the built-in badge when the value is empty', () => {
		const wrapper = mountRenderer({ value: null, property: { type: 'string' }, widget: 'badge' })
		expect(wrapper.findComponent(CnStatusBadge).exists()).toBe(false)
		expect(wrapper.text()).toBe('—')
	})

	it('renders a consumer-registered widget with { value, row, property, formatted, ...widgetProps }', () => {
		const Pill = {
			name: 'TestPill',
			props: ['value', 'row', 'property', 'formatted', 'tone'],
			render(h) {
				return h('span', { attrs: { 'data-test': 'pill', 'data-tone': this.tone } }, `${this.formatted}|${this.row.id}`)
			},
		}
		const wrapper = mountRenderer(
			{ value: 'x', property: { type: 'string' }, widget: 'pill', widgetProps: { tone: 'cool' }, row: { id: 7 } },
			{ cnCellWidgets: { pill: Pill } },
		)
		const el = wrapper.find('[data-test="pill"]')
		expect(el.exists()).toBe(true)
		expect(el.text()).toBe('x|7')
		expect(el.attributes('data-tone')).toBe('cool')
	})

	it('a consumer widget receives the formatter-shaped value as `formatted` when formatter is also set', () => {
		const Plain = { name: 'Plain', props: ['formatted'], render(h) { return h('span', { attrs: { 'data-test': 'p' } }, this.formatted) } }
		const wrapper = mountRenderer(
			{ value: 'lead.created', property: { type: 'string' }, formatter: 'human', widget: 'plain' },
			{ cnFormatters: { human: () => 'Lead created' }, cnCellWidgets: { plain: Plain } },
		)
		expect(wrapper.find('[data-test="p"]').text()).toBe('Lead created')
	})

	it('falls back to type-aware rendering when the widget id is unknown', () => {
		const wrapper = mountRenderer({ value: 42, property: { type: 'integer' }, widget: 'nope' }, { cnCellWidgets: {} })
		expect(wrapper.text()).toBe('42')
	})
})

describe('CnCellRenderer — built-in "link" widget (REQ-MIPFU-2)', () => {
	// Stub vue-router's RouterLink globally so `<router-link>` resolves
	// in the test environment (CnCellRenderer renders one for the
	// `widgetProps.route` case).
	const RouterLinkStub = {
		name: 'RouterLink',
		props: ['to'],
		render(h) {
			return h('a', { attrs: { 'data-test': 'router-link', 'data-to': JSON.stringify(this.to) } }, this.$slots.default)
		},
	}

	function mountLink(propsData) {
		return mount(CnCellRenderer, {
			propsData,
			stubs: { 'router-link': RouterLinkStub, RouterLink: RouterLinkStub },
		})
	}

	it('renders a router-link when widgetProps.route is set (default param id from rowKey)', () => {
		const wrapper = mountLink({
			value: 'Acme',
			property: { type: 'string' },
			widget: 'link',
			widgetProps: { route: 'ContactDetail' },
			row: { id: 'abc-123', title: 'Acme' },
		})
		const link = wrapper.find('[data-test="router-link"]')
		expect(link.exists()).toBe(true)
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'ContactDetail', params: { id: 'abc-123' } })
		expect(link.text()).toBe('Acme')
	})

	it('honours an explicit widgetProps.params map', () => {
		const wrapper = mountLink({
			value: 'C1',
			property: { type: 'string' },
			widget: 'link',
			widgetProps: { route: 'CohortTimetable', params: { cohortId: 'id' } },
			row: { id: 'cohort-7', title: 'C1' },
		})
		const link = wrapper.find('[data-test="router-link"]')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'CohortTimetable', params: { cohortId: 'cohort-7' } })
	})

	it('renders an external anchor when widgetProps.href is set (with {key} substitution)', () => {
		const wrapper = mountLink({
			value: 'X',
			property: { type: 'string' },
			widget: 'link',
			widgetProps: { href: 'https://x.example/{id}' },
			row: { id: '42', title: 'X' },
		})
		const a = wrapper.find('a[target="_blank"]')
		expect(a.exists()).toBe(true)
		expect(a.attributes('href')).toBe('https://x.example/42')
		expect(a.attributes('rel')).toContain('noopener')
		expect(a.text()).toBe('X')
	})

	it('falls back to plain text + warns once when no target resolves', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			const wrapper = mountLink({
				value: 'no-target',
				property: { type: 'string', title: 'NoTargetCol' },
				widget: 'link',
			})
			expect(wrapper.find('[data-test="router-link"]').exists()).toBe(false)
			expect(wrapper.find('a[target="_blank"]').exists()).toBe(false)
			expect(wrapper.text()).toBe('no-target')
			const calls = warn.mock.calls.filter((c) => String(c[0]).includes('widget:"link"'))
			expect(calls.length).toBeGreaterThanOrEqual(1)
		} finally {
			warn.mockRestore()
		}
	})

	it('uses the formatter-shaped value as the link text when formatter is also set', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: {
				value: 'raw',
				property: { type: 'string' },
				widget: 'link',
				widgetProps: { route: 'X' },
				row: { id: '1' },
				formatter: 'upper',
			},
			provide: { cnFormatters: { upper: (v) => String(v).toUpperCase() } },
			stubs: { 'router-link': RouterLinkStub, RouterLink: RouterLinkStub },
		})
		expect(wrapper.find('[data-test="router-link"]').text()).toBe('RAW')
	})
})

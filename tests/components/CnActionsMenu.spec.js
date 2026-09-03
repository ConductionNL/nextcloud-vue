/**
 * Tests for CnActionsMenu — the shared "…" overflow Actions menu that
 * renders Refresh plus the MANDATORY trio (Request a feature / Report a bug /
 * Documentation) and auto-mounts the CnSuggestFeatureModal. Used by
 * CnWidgetWrapper and the page-level headers of CnDetailPage /
 * CnDashboardPage.
 *
 * Covers: item visibility + the testidBase prefix, the unconditional trio and
 * its per-widget docs deep-link, the forge-derived bug-report link, default
 * Refresh handler (event-bus emit on the configured channel) with
 * preventDefault suppression, default Request-a-feature handler (modal mount /
 * repo-missing warn), and the refresh spinner (disabled + loading icon driven
 * solely by `:refreshing`).
 */

import { mount } from '@vue/test-utils'
import { emit as emitOnBus } from '@nextcloud/event-bus'
import CnActionsMenu from '../../src/components/CnActionsMenu/CnActionsMenu.vue'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

const NcActionButtonStub = {
	name: 'NcActionButton',
	inheritAttrs: false,
	template: '<button :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\', $event)"><slot /></button>',
}
const NcActionLinkStub = {
	name: 'NcActionLink',
	inheritAttrs: false,
	props: ['href', 'target', 'rel'],
	template: '<a :data-testid="$attrs[\'data-testid\']" :href="href" :target="target" :rel="rel"><slot /></a>',
}
const NcActionsStub = {
	name: 'NcActions',
	// Forward an `data-testid` from attrs so we can assert the container
	// testid honours the configurable testidBase prop.
	inheritAttrs: false,
	template: '<div class="nc-actions-stub" :data-testid="$attrs[\'data-testid\']"><slot /></div>',
}

const baseStubs = {
	NcActions: NcActionsStub,
	NcActionButton: NcActionButtonStub,
	NcActionLink: NcActionLinkStub,
	DotsHorizontal: true,
	Refresh: true,
	LightbulbOutline: true,
	BookOpenVariant: true,
	BugOutline: true,
	CnSuggestFeatureModal: { name: 'CnSuggestFeatureModal', props: ['repo', 'specRef', 'app', 'page', 'surface', 'conductionSubmitEnabled'], template: '<div class="suggest-modal-stub" />' },
}

const mountMenu = (propsData = {}, opts = {}) => mount(CnActionsMenu, {
	propsData: { widgetId: 'w1', title: 'My widget', surface: 'widget:w1', ...propsData },
	stubs: baseStubs,
	mocks: { $route: { name: 'Dashboard' } },
	provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq', ...(opts.provide || {}) },
	...opts,
})

describe('CnActionsMenu — visibility & testidBase', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	// The whole point of the change: a host that configures NOTHING still
	// gets all three. Before, Documentation rendered only when the host
	// passed a URL, which is how OpenRegister's widgets shipped without it.
	it('renders Refresh plus the mandatory trio with no configuration at all', () => {
		const wrapper = mountMenu()
		expect(wrapper.find('[data-testid="cn-actions-menu-action-refresh"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-actions-menu-action-request-feature"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-actions-menu-action-report-bug"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-actions-menu-action-documentation"]').exists()).toBe(true)
	})

	it('honours testidBase on the container and items', () => {
		const wrapper = mountMenu({ testidBase: 'cn-detail-page' })
		expect(wrapper.find('[data-testid="cn-detail-page-actions"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-detail-page-action-refresh"]').exists()).toBe(true)
	})

	it('hides the whole menu when everything is opted out and no action-items slot', () => {
		const wrapper = mountMenu({ showRefresh: false, showRequestFeature: false, showReportBug: false, showDocumentation: false })
		expect(wrapper.find('[data-testid="cn-actions-menu-actions"]').exists()).toBe(false)
	})

	it('renders the menu when only an action-items slot is provided', () => {
		const wrapper = mountMenu(
			{ showRefresh: false, showRequestFeature: false, showReportBug: false, showDocumentation: false },
			{ slots: { 'action-items': '<button data-testid="custom-item">X</button>' } },
		)
		expect(wrapper.find('[data-testid="cn-actions-menu-actions"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="custom-item"]').exists()).toBe(true)
	})
})

describe('CnActionsMenu — Documentation link', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	it('renders a new-tab link when documentationUrl is set', () => {
		const wrapper = mountMenu({ documentationUrl: 'https://docs.example.test' })
		const link = wrapper.find('[data-testid="cn-actions-menu-action-documentation"]')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe('https://docs.example.test')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
	})

	it('uses the documentationLabel prop for the link text', () => {
		const wrapper = mountMenu({ documentationUrl: 'https://docs.example.test', documentationLabel: 'Guide' })
		expect(wrapper.find('[data-testid="cn-actions-menu-action-documentation"]').text()).toContain('Guide')
	})

	// The reported defect was a docs link that landed on the homepage rather
	// than on the widget being asked about; docsAnchor is what fixes that.
	it('deep-links the app-wide docs base to THIS widget via docsAnchor', () => {
		const wrapper = mountMenu(
			{ docsAnchor: 'open-cases' },
			{ provide: { cnAppId: 'dossiq', cnFeatureRequestRepo: 'ConductionNL/dossiq', cnDocumentationBaseUrl: 'https://dossiq.conduction.nl/docs/widgets' } },
		)
		expect(wrapper.find('[data-testid="cn-actions-menu-action-documentation"]').attributes('href'))
			.toBe('https://dossiq.conduction.nl/docs/widgets#open-cases')
	})

	it('treats a path-shaped docsAnchor as a path and an absolute one as the whole URL', () => {
		const asPath = mountMenu(
			{ docsAnchor: '/widgets/open-cases' },
			{ provide: { cnAppId: 'dossiq', cnFeatureRequestRepo: 'ConductionNL/dossiq', cnDocumentationBaseUrl: 'https://dossiq.conduction.nl/docs/' } },
		)
		expect(asPath.find('[data-testid="cn-actions-menu-action-documentation"]').attributes('href'))
			.toBe('https://dossiq.conduction.nl/widgets/open-cases')

		const absolute = mountMenu({ docsAnchor: 'https://elsewhere.test/x' })
		expect(absolute.find('[data-testid="cn-actions-menu-action-documentation"]').attributes('href'))
			.toBe('https://elsewhere.test/x')
	})

	it('falls back to the app id\'s docs site so the item is never absent', () => {
		const wrapper = mountMenu({ docsAnchor: 'traffic' })
		expect(wrapper.find('[data-testid="cn-actions-menu-action-documentation"]').attributes('href'))
			.toBe('https://pipelinq.conduction.nl/docs#traffic')
	})
})

describe('CnActionsMenu — Report a bug', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	// No CnAppRoot ancestor, so no forge is injected: the host comes from
	// resolveForge's default, which is the same GitHub the Request-a-feature
	// item uses. This asserted codeberg.org while that item already built a
	// github.com link, because the menu kept its own copy of the host map.
	it('builds a forge new-issue link for the reporting surface', () => {
		const wrapper = mountMenu({ title: 'Traffic' })
		const link = wrapper.find('[data-testid="cn-actions-menu-action-report-bug"]')
		const u = new URL(link.attributes('href'))
		expect(u.origin + u.pathname).toBe('https://github.com/ConductionNL/pipelinq/issues/new')
		expect(u.searchParams.get('title')).toBe('[BUG] widget:w1')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
	})

	// A translated title in the headline made a report from a Russian or Greek
	// UI unreadable to a maintainer, while the stable slug sat one prop away.
	// With no dashboard ancestor to supply the authored string, the slug is
	// the headline — never the translated prop.
	it('keeps the translated surface title out of the link entirely', () => {
		const wrapper = mountMenu({ title: 'Секреты' })
		const href = wrapper.find('[data-testid="cn-actions-menu-action-report-bug"]').attributes('href')
		expect(new URL(href).searchParams.get('title')).toBe('[BUG] widget:w1')
		expect(href).not.toContain('%D0%A1') // no Cyrillic anywhere in the URL
	})

	it('honours the forge type provided by CnAppRoot', () => {
		const wrapper = mountMenu({ title: 'Traffic' }, {
			provide: {
				cnAppId: 'pipelinq',
				cnFeatureRequestRepo: 'ConductionNL/pipelinq',
				cnFeatureRequestForge: { type: 'github' },
			},
		})
		const u = new URL(wrapper.find('[data-testid="cn-actions-menu-action-report-bug"]').attributes('href'))
		expect(u.origin + u.pathname).toBe('https://github.com/ConductionNL/pipelinq/issues/new')
	})

	// Without `template`, GitHub serves the BLANK issue form and every
	// in-product report arrives with no steps, no expected/actual and no
	// severity — the reporter never sees the fields.
	it('targets the bug-report issue form, not the blank one', () => {
		const wrapper = mountMenu({ title: 'Traffic' })
		const href = wrapper.find('[data-testid="cn-actions-menu-action-report-bug"]').attributes('href')
		expect(new URL(href).searchParams.get('template')).toBe('bug-report.yml')
	})

	// Forgejo/Gitea/Codeberg have no per-field deep-link, so the template is
	// omitted there rather than pointing at a form the forge will not render.
	it('omits the issue-form template on a non-GitHub forge', () => {
		const wrapper = mountMenu({ title: 'Traffic' }, {
			provide: {
				cnAppId: 'pipelinq',
				cnFeatureRequestRepo: 'ConductionNL/pipelinq',
				cnFeatureRequestForge: { type: 'codeberg' },
			},
		})
		const href = wrapper.find('[data-testid="cn-actions-menu-action-report-bug"]').attributes('href')
		expect(href.startsWith('https://codeberg.org/ConductionNL/pipelinq/issues/new?')).toBe(true)
		expect(new URL(href).searchParams.get('template')).toBeNull()
		expect(new URL(href).searchParams.get('title')).toBe('[BUG] widget:w1')
	})

	it('an explicit reportBugUrl wins over the derived one', () => {
		const wrapper = mountMenu({ reportBugUrl: 'https://tracker.example.test/new' })
		expect(wrapper.find('[data-testid="cn-actions-menu-action-report-bug"]').attributes('href'))
			.toBe('https://tracker.example.test/new')
	})
})

describe('CnActionsMenu — default Refresh handler', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	it('emits on the configured refreshChannel when no host suppresses it', async () => {
		const wrapper = mountMenu({ widgetId: 'w1', title: 'My widget', refreshChannel: 'cn:page:refresh' })
		await wrapper.find('[data-testid="cn-actions-menu-action-refresh"]').trigger('click')
		expect(emitOnBus).toHaveBeenCalledWith('cn:page:refresh', { widgetId: 'w1', title: 'My widget' })
	})

	it('host listener can suppress the default via event.preventDefault()', async () => {
		const onRefresh = jest.fn((_p, ev) => ev.preventDefault())
		const wrapper = mountMenu({}, { listeners: { refresh: onRefresh } })
		await wrapper.find('[data-testid="cn-actions-menu-action-refresh"]').trigger('click')
		expect(onRefresh).toHaveBeenCalled()
		expect(emitOnBus).not.toHaveBeenCalled()
	})
})

describe('CnActionsMenu — default Request-a-feature handler', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	it('mounts CnSuggestFeatureModal with the forwarded surface + context', async () => {
		const wrapper = mountMenu({ surface: 'detail:cases', specRef: 'cases' })
		await wrapper.find('[data-testid="cn-actions-menu-action-request-feature"]').trigger('click')
		const modal = wrapper.findComponent({ name: 'CnSuggestFeatureModal' })
		expect(modal.exists()).toBe(true)
		expect(modal.props()).toMatchObject({
			repo: 'ConductionNL/pipelinq',
			specRef: 'cases',
			app: 'pipelinq',
			page: 'Dashboard',
			surface: 'detail:cases',
		})
	})

	it('warns and does not mount the modal when no repo inject', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountMenu({}, { provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: '' } })
		await wrapper.find('[data-testid="cn-actions-menu-action-request-feature"]').trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot open feature request modal'))
	})

	it('host preventDefault suppresses the modal', async () => {
		const onRequest = jest.fn((_p, ev) => ev.preventDefault())
		const wrapper = mountMenu({}, { listeners: { 'request-feature': onRequest } })
		await wrapper.find('[data-testid="cn-actions-menu-action-request-feature"]').trigger('click')
		expect(onRequest).toHaveBeenCalled()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
	})
})

describe('CnActionsMenu — refresh spinner', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	// Stubs that render the #icon slot and expose `disabled`, so we can
	// assert the icon swap + disabled state the host can't see otherwise.
	const iconStubs = () => {
		const ActionButtonIconStub = {
			name: 'NcActionButton',
			inheritAttrs: false,
			props: ['disabled'],
			template: '<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
		}
		return { ...baseStubs, NcActionButton: ActionButtonIconStub, Refresh: { name: 'Refresh', template: '<span class="refresh-icon-stub" />' }, NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading-icon-stub" />' } }
	}
	const mountWithIcons = (propsData = {}) => mount(CnActionsMenu, {
		propsData: { widgetId: 'w1', title: 'My widget', surface: 'widget:w1', ...propsData },
		stubs: iconStubs(),
		mocks: { $route: { name: 'Dashboard' } },
		provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq' },
	})

	// A boolean attribute is asserted by PRESENCE, not truthiness. Vue 2 wrote
	// `disabled="disabled"` via setAttribute; Vue 3 recognises `disabled` as a
	// DOM property of <button> and assigns `el.disabled = true`, whose reflected
	// attribute value is the EMPTY STRING. So `attributes('disabled')` flipped
	// from "disabled" (truthy) to "" (falsy) with no behaviour change, silently
	// inverting toBeTruthy/toBeFalsy. toBeDefined/toBeUndefined say what the
	// spec means and are stricter: absent is `undefined`, present is `""`.
	it('does NOT spin or disable on click alone — the spinner only follows :refreshing', async () => {
		const wrapper = mountWithIcons()
		const refreshBtn = wrapper.find('[data-testid="cn-actions-menu-action-refresh"]')
		await refreshBtn.trigger('click')
		expect(refreshBtn.attributes('disabled')).toBeUndefined()
		expect(wrapper.findComponent({ name: 'NcLoadingIcon' }).exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'Refresh' }).exists()).toBe(true)
	})

	it('while :refreshing the Refresh item is disabled and shows the loading spinner (not the static icon)', async () => {
		const wrapper = mountWithIcons({ refreshing: true })
		const refreshBtn = wrapper.find('[data-testid="cn-actions-menu-action-refresh"]')
		expect(refreshBtn.attributes('disabled')).toBeDefined()
		expect(wrapper.findComponent({ name: 'NcLoadingIcon' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'Refresh' }).exists()).toBe(false)

		await wrapper.setProps({ refreshing: false })
		expect(refreshBtn.attributes('disabled')).toBeUndefined()
		expect(wrapper.findComponent({ name: 'NcLoadingIcon' }).exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'Refresh' }).exists()).toBe(true)
	})

	// Regression guard: the async CnSuggestFeatureModal factory must resolve to
	// the (extensible) component options, not a module namespace. Under some
	// webpack chunk layouts the resolved namespace is frozen and untagged, so
	// Vue 2's ensureCtor calls Vue.extend() on it and throws "Cannot add
	// property _Ctor, object is not extensible" — silently breaking the
	// Request-a-feature modal. The `.then(m => m.default || m)` unwrap fixes it.
	it('resolves the CnSuggestFeatureModal async factory to component options, not a module namespace', async () => {
		const factory = CnActionsMenu.components.CnSuggestFeatureModal
		expect(typeof factory).toBe('function')
		const resolved = await factory()
		// Must be the component definition itself (has a name), not a `{ default }` wrapper.
		expect(resolved.default).toBeUndefined()
		expect(resolved.name).toBe('CnSuggestFeatureModal')
	})
})

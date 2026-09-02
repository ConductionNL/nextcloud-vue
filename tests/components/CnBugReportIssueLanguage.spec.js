/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The in-product "Report a bug" link must produce an ENGLISH issue title,
 * whatever language the reporter's UI is in.
 *
 * Reported from a French instance: clicking Report a bug in the "Activité
 * récente" widget opened
 *   /issues/new?template=bug-report.yml&title=%5BBUG%5D+Activit%C3%A9+r%C3%A9cente
 * A French or German title a maintainer can usually muddle through; the same
 * report from a Russian or Greek instance is Cyrillic or Greek and the issue
 * is effectively unreadable — while the English msgid ("Recent activity") was
 * sitting in the app manifest the whole time.
 *
 * The leak was one hop: CnDashboardPage's getWidgetTitle() is the display-time
 * chokepoint and runs the manifest title through the host translate function,
 * so every widget renderer — and therefore CnWidgetWrapper and the
 * CnActionsMenu inside it — only ever saw the TRANSLATED string. The dashboard
 * now also provides the authored source string under `cnWidgetTitleSource`,
 * resolved by widget id so no renderer has to forward a second prop.
 *
 * These tests pin the whole chain, because every piece of it is a plausible
 * place for the translation to creep back in.
 */

import { mount } from '@vue/test-utils'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

const FRENCH = { 'Recent activity': 'Activité récente' }
const RUSSIAN = { 'Recent activity': 'Недавняя активность' }

/**
 * Mount a widget the way a dashboard does: the `title` prop it receives is
 * ALREADY translated, and the authored string is only reachable through the
 * provided resolver.
 *
 * @param {object} opts Options.
 * @param {object} opts.catalogue Msgid → translation map for the UI language.
 * @param {boolean} [opts.withSource] Whether a dashboard ancestor provides the resolver.
 * @return {object} The wrapper.
 */
function mountWidget({ catalogue, withSource = true }) {
	const translate = (key) => catalogue[key] || key
	return mount(CnWidgetWrapper, {
		propsData: {
			// What CnDashboardPage passes: getWidgetTitle()'s output.
			title: translate('Recent activity'),
			widgetId: 'recent-activity-feed',
			translate,
		},
		mocks: { $route: { name: 'Dashboard' } },
		provide: {
			cnAppId: 'keepiq',
			cnFeatureRequestRepo: 'ConductionNL/keepiq',
			cnFeatureRequestForge: { type: 'github' },
			...(withSource
				? {
					cnWidgetTitleSource: (id) =>
						(id === 'recent-activity-feed' ? 'Recent activity' : ''),
				}
				: {}),
		},
	})
}

/**
 * The report-bug link's parsed URL.
 *
 * @param {object} wrapper Mounted wrapper.
 * @return {URL} The parsed href.
 */
function reportUrl(wrapper) {
	const link = wrapper.find('[data-testid="cn-widget-wrapper-action-report-bug"]')
	return new URL(link.attributes('href'))
}

describe('Report a bug — issue language', () => {
	it('titles the issue in English while the widget header stays French', () => {
		const wrapper = mountWidget({ catalogue: FRENCH })

		// The UI itself must stay localized — this is not a regression on l10n.
		expect(wrapper.find('.cn-widget-wrapper__title').text()).toBe('Activité récente')
		expect(reportUrl(wrapper).searchParams.get('title')).toBe('[BUG] Recent activity')
	})

	it('titles the issue in English for a non-Latin UI language', () => {
		const wrapper = mountWidget({ catalogue: RUSSIAN })

		expect(wrapper.find('.cn-widget-wrapper__title').text()).toBe('Недавняя активность')
		expect(reportUrl(wrapper).searchParams.get('title')).toBe('[BUG] Recent activity')
	})

	// The exact URL from the French bug report, as a string, so a regression
	// is recognisable against what was pasted in the issue.
	it('produces the expected href for the reported French case', () => {
		const href = mountWidget({ catalogue: FRENCH })
			.find('[data-testid="cn-widget-wrapper-action-report-bug"]')
			.attributes('href')

		expect(href.startsWith(
			'https://github.com/ConductionNL/keepiq/issues/new'
			+ '?template=bug-report.yml&title=%5BBUG%5D+Recent+activity',
		)).toBe(true)
		// The French must not survive anywhere in the link.
		expect(href).not.toContain('Activit')
	})

	// The link is handed to a human and sits in their address bar. An earlier
	// cut prefilled the form's `environment` field with app/route/surface/
	// language/localized-title and hit ~400 characters of percent-encoding,
	// all of it implied by the headline or by reading the report.
	it('carries the template and title and nothing else', () => {
		const u = reportUrl(mountWidget({ catalogue: FRENCH }))

		expect([...u.searchParams.keys()].sort()).toEqual(['template', 'title'])
		expect(u.href.length).toBeLessThan(150)
	})

	// A widget outside a dashboard (detail page, standalone mount) has no
	// resolver. The slug is English by construction, so it beats falling back
	// to the translated prop.
	it('falls back to the surface slug, never the translated title', () => {
		const u = reportUrl(mountWidget({ catalogue: RUSSIAN, withSource: false }))

		expect(u.searchParams.get('title')).toBe('[BUG] widget:recent-activity-feed')
		expect(u.searchParams.get('title')).not.toContain('Недавняя')
	})

	// A resolver that throws must not take the menu down with it.
	it('survives a host resolver that throws', () => {
		const wrapper = mount(CnWidgetWrapper, {
			propsData: {
				title: 'Activité récente',
				widgetId: 'recent-activity-feed',
				translate: (k) => FRENCH[k] || k,
			},
			mocks: { $route: { name: 'Dashboard' } },
			provide: {
				cnAppId: 'keepiq',
				cnFeatureRequestRepo: 'ConductionNL/keepiq',
				cnFeatureRequestForge: { type: 'github' },
				cnWidgetTitleSource: () => { throw new Error('host blew up') },
			},
		})

		expect(reportUrl(wrapper).searchParams.get('title'))
			.toBe('[BUG] widget:recent-activity-feed')
	})
})

/**
 * The dashboard end of the same chain: it must expose the AUTHORED title, and
 * it must not accidentally translate it on the way out. Instantiated bare
 * (no mount) because only the resolver's precedence is under test.
 */
describe('CnDashboardPage — getWidgetTitleSource', () => {
	const CnDashboardPage = require('../../src/components/CnDashboardPage/CnDashboardPage.vue').default

	/**
	 * Call the method against a minimal fake instance.
	 *
	 * @param {object} ctx Fake `this` (layout + getWidgetDef + translate).
	 * @param {string} id Widget id to resolve.
	 * @return {string} The resolved source title.
	 */
	const resolve = (ctx, id) =>
		CnDashboardPage.methods.getWidgetTitleSource.call(ctx, id)

	// A translate function that would corrupt the result if it were used.
	const translate = () => 'TRANSLATED'

	it('returns the def title untranslated', () => {
		const ctx = {
			layout: [{ widgetId: 'w1' }],
			getWidgetDef: () => ({ title: 'Recent activity' }),
			effectiveTranslate: translate,
		}
		expect(resolve(ctx, 'w1')).toBe('Recent activity')
	})

	// customTitle is a person's own words typed into the style editor, in
	// whatever language they chose — there is no msgid to recover, so it is
	// returned as typed rather than looked up.
	it('prefers a placement customTitle, as typed', () => {
		const ctx = {
			layout: [{ widgetId: 'w1', customTitle: 'Mijn eigen titel' }],
			getWidgetDef: () => ({ title: 'Recent activity' }),
			effectiveTranslate: translate,
		}
		expect(resolve(ctx, 'w1')).toBe('Mijn eigen titel')
	})

	it('falls back to the def customTitle before the def title', () => {
		const ctx = {
			layout: [{ widgetId: 'w1' }],
			getWidgetDef: () => ({ customTitle: 'Cog title', title: 'Recent activity' }),
			effectiveTranslate: translate,
		}
		expect(resolve(ctx, 'w1')).toBe('Cog title')
	})

	it('returns empty string when nothing names the widget', () => {
		const ctx = { layout: [], getWidgetDef: () => null, effectiveTranslate: translate }
		expect(resolve(ctx, 'unknown')).toBe('')
	})
})

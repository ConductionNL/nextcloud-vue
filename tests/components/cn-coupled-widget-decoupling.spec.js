/**
 * Decoupling guard for the app-coupled dashboard widget renderers
 * (cn-widget-library Waves 2+3). None of these library renderers may import a
 * sibling-app module path (financeq / procest / launchpad / mydash) nor a
 * launchpad widgetBridge / api / spendAnalytics service — external data must
 * flow only via props/injection, @nextcloud/* helpers, or the OCA.Dashboard
 * global.
 */

import fs from 'fs'
import path from 'path'

const RENDERERS = [
	'CnPeopleWidget/CnPeopleWidget.vue',
	'CnCalendarWidget/CnCalendarWidget.vue',
	'CnNcWidgetWidget/CnNcWidgetWidget.vue',
	'CnSpendAnalyticsWidget/CnSpendAnalyticsWidget.vue',
]

const FORBIDDEN = [
	/from\s+['"][^'"]*\bfinanceq\b/,
	/from\s+['"][^'"]*\bprocest\b/,
	/from\s+['"][^'"]*\blaunchpad\b/,
	/from\s+['"][^'"]*\bmydash\b/,
	/from\s+['"][^'"]*widgetBridge/,
	/from\s+['"][^'"]*services\/api/,
	/from\s+['"][^'"]*services\/spendAnalytics/,
]

const componentsDir = path.resolve(__dirname, '../../src/components')

describe('coupled widget renderer decoupling', () => {
	RENDERERS.forEach((rel) => {
		it(`${rel} imports no forbidden sibling-app path`, () => {
			const source = fs.readFileSync(path.join(componentsDir, rel), 'utf8')
			FORBIDDEN.forEach((pattern) => {
				expect(source).not.toMatch(pattern)
			})
		})
	})
})

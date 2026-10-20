/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Register an app's Nextcloud Dashboard widgets from configuration.
 *
 * @module utils/registerNcDashboardWidgets
 */

import { translate } from '@nextcloud/l10n'
import { createApp } from 'vue'
import CnNcDashboardList from '../components/CnNcDashboardList/CnNcDashboardList.vue'

/**
 * Register each widget with `OCA.Dashboard.register(id, …)`. A widget mounts
 * CnNcDashboardList with its `config`, or its own `component` with `props`
 * and the widget's `title`, as its own Vue app with the app's translate provided as `cnTranslate`. The
 * Dashboard host draws the widget's title, so the component must not.
 *
 * The widget ids are the ones the app's PHP `IWidget::getId()` returns; the
 * server side stays the app's.
 *
 * @spec openspec/changes/nc-dashboard-widgets/specs/nc-dashboard-widgets/spec.md#requirement-dashboard-widgets-are-configuration
 * @param {Array<{id: string, config?: object, component?: object, props?: object}>} widgets The widgets.
 * @param {object} options Options.
 * @param {string} options.appId The app id, for its translations.
 * @param {(app: object) => void} [options.setup] Called on each widget's Vue app before mounting (to `use` a pinia, say).
 * @param {object} [options.dashboard] The `OCA.Dashboard` registry (default `window.OCA.Dashboard`).
 * @return {string[]} The ids registered; none when the Dashboard is absent.
 */
export function registerNcDashboardWidgets(widgets, options = {}) {
	const dashboard = options.dashboard || (typeof window !== 'undefined' && window.OCA && window.OCA.Dashboard) || null
	if (!dashboard || typeof dashboard.register !== 'function' || !Array.isArray(widgets)) {
		return []
	}
	const appId = options.appId || 'nextcloud-vue'
	const cnTranslate = (key, vars) => translate(appId, key, vars)
	const registered = []
	for (const widget of widgets) {
		if (!widget || typeof widget.id !== 'string' || widget.id === '') {
			continue
		}
		dashboard.register(widget.id, (el, context = {}) => {
			const title = context.widget && context.widget.title ? context.widget.title : ''
			const app = widget.component
				? createApp(widget.component, { ...(widget.props || {}), title })
				: createApp(CnNcDashboardList, { config: widget.config || {} })
			app.provide('cnTranslate', cnTranslate)
			if (typeof options.setup === 'function') {
				options.setup(app)
			}
			app.mount(el)
		})
		registered.push(widget.id)
	}
	return registered
}

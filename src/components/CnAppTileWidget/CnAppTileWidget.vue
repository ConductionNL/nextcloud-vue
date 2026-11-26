<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-app-tile-widget" data-testid="cn-app-tile-widget">
		<CnAppTile
			v-if="app"
			:href="app.href"
			:label="app.label"
			:icon="app.icon"
			:glyph="content.icon || ''"
			:appId="app.id"
			:colour="content.colour || ''"
			:count="count"
			:pinned="content.pinned === true"
			:down="content.status === 'down'" />
		<p
			v-else-if="!loading"
			class="cn-app-tile-widget__missing"
			data-testid="cn-app-tile-widget-missing">
			{{ t('nextcloud-vue', 'This app is not available to you') }}
		</p>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateOcsUrl } from '@nextcloud/router'
import CnAppTile from '../CnAppTile/CnAppTile.vue'
import { fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { navigationApps, notificationCountsByApp } from '../../utils/nextcloudApps.js'

/**
 * CnAppTileWidget: one app of the reader's Nextcloud navigation as one
 * square, coloured tile (the `app-tile` widget type). The app comes from the
 * navigation the reader sees, so an app they may not open never shows as a
 * tile: the cell then says the app is not available.
 *
 * `content` keys:
 *
 * - `appId` (required): the app the tile opens.
 * - `colour`: a key of the app tile palette; empty uses the app's default.
 * - `showCount` (default true): show a count on the tile: the app's own
 *   counter when `countSource` names one, else the reader's notifications
 *   for the app.
 * - `countSource`: the app's own counter, either an OpenRegister list
 *   (`{register, schema, filter}`, counted as the reader, `@me` allowed) or a
 *   Nextcloud dashboard widget whose items are counted
 *   (`{dashboardWidget: 'mail-unread'}`).
 * - `icon`: a glyph from the widget icon set drawn in place of the app's own
 *   icon (LpVandaag draws a briefcase for the case system).
 * - `pinned`: draw a pin on the tile.
 * - `status`: `"down"` draws the outage dot in place of the count; the host
 *   sets it from its availability check.
 *
 * @spec openspec/changes/app-tile/specs/app-tile/spec.md
 */
export default {
	name: 'CnAppTileWidget',

	components: { CnAppTile },

	props: {
		/** The widget's content (see the component description). */
		content: {
			type: Object,
			default: () => ({}),
		},

		/* eslint-disable vue/no-unused-properties -- part of the widget contract: the dashboard pages bind :placement on every widget, so declaring it keeps it out of $attrs */
		/** The placement, reserved to match the renderer contract. */
		placement: {
			type: Object,
			default: null,
		},
		/* eslint-enable vue/no-unused-properties */
	},

	data() {
		return {
			navigation: [],
			counts: {},
			ownCount: null,
			loading: true,
		}
	},

	computed: {
		/** @return {object|null} The navigation entry of the configured app. */
		app() {
			const id = String(this.content?.appId || '')
			return id === '' ? null : (this.navigation.find((entry) => entry.id === id) || null)
		},

		/** @return {number|null} The count to show, null for none. */
		count() {
			if (!this.app || this.content?.showCount === false) {
				return null
			}
			if (this.ownCount !== null) {
				return this.ownCount
			}
			return this.counts[this.app.id] || null
		},
	},

	async mounted() {
		try {
			this.navigation = await navigationApps(axios)
		} finally {
			this.loading = false
		}
		if (!this.app || this.content?.showCount === false) {
			return
		}
		const source = this.content?.countSource
		if (source && typeof source === 'object') {
			this.ownCount = await this.fetchOwnCount(source)
			if (this.ownCount !== null) {
				return
			}
		}
		this.counts = await notificationCountsByApp(axios)
	},

	methods: {
		t,

		/**
		 * The app's own counter, or null when it cannot be read (the tile then
		 * falls back to the reader's notifications).
		 *
		 * @param {object} source The `countSource` content.
		 * @return {Promise<number|null>}
		 */
		async fetchOwnCount(source) {
			try {
				if (source.dashboardWidget) {
					// The dashboard API refuses a limit above 30.
					const url = generateOcsUrl('/apps/dashboard/api/v2/widget-items')
					const { data } = await axios.get(url, { params: { 'widgets[]': source.dashboardWidget, limit: 30 } })
					const items = data?.ocs?.data?.[source.dashboardWidget]?.items
					return Array.isArray(items) ? items.length : null
				}
				if (source.register && source.schema) {
					return await fetchListTotal(source.register, source.schema, source.filter || {}, {})
				}
			} catch {
				return null
			}
			return null
		},
	},
}
</script>

<style scoped>
.cn-app-tile-widget {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	container-type: size;
}

.cn-app-tile-widget > .cn-app-tile {
	width: min(100cqw, 100cqh);
}

.cn-app-tile-widget__missing {
	margin: 0;
	padding: 8px;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
	text-align: center;
}
</style>

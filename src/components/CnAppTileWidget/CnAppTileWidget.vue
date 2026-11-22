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
import CnAppTile from '../CnAppTile/CnAppTile.vue'
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
 * - `showCount` (default true): show the reader's notifications for the app
 *   as a count.
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
			return this.counts[this.app.id] || null
		},
	},

	async mounted() {
		try {
			this.navigation = await navigationApps(axios)
		} finally {
			this.loading = false
		}
		if (this.app && this.content?.showCount !== false) {
			this.counts = await notificationCountsByApp(axios)
		}
	},

	methods: { t },
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

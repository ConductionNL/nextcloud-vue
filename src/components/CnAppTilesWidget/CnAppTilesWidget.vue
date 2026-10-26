<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section
		class="cn-app-tiles"
		:aria-labelledby="title ? `${domId}-title` : undefined"
		data-testid="cn-app-tiles">
		<div class="cn-app-tiles__head">
			<h2
				v-if="title"
				:id="`${domId}-title`"
				class="cn-app-tiles__title">
				{{ title }}
			</h2>
			<div v-if="showFilter" class="cn-app-tiles__filter">
				<label :for="`${domId}-filter`" class="cn-app-tiles__sr-only">
					{{ filterLabel }}
				</label>
				<Magnify :size="16" class="cn-app-tiles__filter-icon" aria-hidden="true" />
				<input
					:id="`${domId}-filter`"
					v-model="query"
					type="search"
					class="cn-app-tiles__filter-input"
					:placeholder="filterLabel"
					data-testid="cn-app-tiles-filter">
			</div>
		</div>

		<div
			v-if="mostUsed.length > 0"
			class="cn-app-tiles__most"
			data-testid="cn-app-tiles-most-used">
			<span class="cn-app-tiles__most-label">{{ t('nextcloud-vue', 'Most used') }}</span>
			<a
				v-for="app in mostUsed"
				:key="app.id"
				:href="app.href"
				class="cn-app-tiles__chip"
				:data-testid="`cn-app-tiles-most-used-${app.id}`"
				@click="recordUse(app)">
				{{ app.label }}
				<span class="cn-app-tiles__chip-count">{{ n('nextcloud-vue', '%n time', '%n times', uses[app.id]) }}</span>
			</a>
		</div>

		<p v-if="loading" class="cn-app-tiles__state">
			{{ t('nextcloud-vue', 'Loading…') }}
		</p>
		<p v-else-if="shownApps.length === 0" class="cn-app-tiles__state" data-testid="cn-app-tiles-empty">
			{{ query ? t('nextcloud-vue', 'No tile matches the filter') : t('nextcloud-vue', 'No apps to show') }}
		</p>
		<ul v-else class="cn-app-tiles__grid" data-testid="cn-app-tiles-grid">
			<li v-for="app in shownApps" :key="app.id" class="cn-app-tiles__cell">
				<a
					:href="app.href"
					class="cn-app-tiles__tile"
					:title="app.label"
					:data-testid="`cn-app-tiles-tile-${app.id}`"
					@click="recordUse(app)">
					<Pin
						v-if="app.pinned"
						:size="14"
						class="cn-app-tiles__pin"
						:title="t('nextcloud-vue', 'Pinned')" />
					<span
						class="cn-app-tiles__dot"
						:class="{ 'cn-app-tiles__dot--down': app.down }"
						role="img"
						:aria-label="app.down ? t('nextcloud-vue', 'Outage') : t('nextcloud-vue', 'Available')" />
					<span class="cn-app-tiles__icon" :class="{ 'cn-app-tiles__icon--down': app.down }" aria-hidden="true">
						<span
							v-if="app.icon"
							class="cn-app-tiles__glyph"
							:style="{ '--cn-app-tiles-icon': `url(&quot;${app.icon}&quot;)` }" />
						<ViewGridOutline v-else :size="22" />
					</span>
					<span class="cn-app-tiles__name">{{ app.label }}</span>
					<span v-if="app.down" class="cn-app-tiles__badge">{{ t('nextcloud-vue', 'Outage') }}</span>
				</a>
			</li>
		</ul>
	</section>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import Pin from 'vue-material-design-icons/Pin.vue'
import ViewGridOutline from 'vue-material-design-icons/ViewGridOutline.vue'
import { navigationApps } from '../../utils/nextcloudApps.js'

let domIdCounter = 0

/** Where a reader's tile use is counted, per account. */
const USAGE_KEY_PREFIX = 'cn-app-tiles-usage:'

/**
 * CnAppTilesWidget: the apps a person can open, as a grid of tiles (LpVandaag
 * "Apps"). Each tile has the app's icon, its name and a status dot; a pinned
 * app comes first with a pin, an app reported down carries "Outage". Above the
 * tiles a filter field narrows them by name, and a "Most used" row offers the
 * apps this reader opened most from here, with how often.
 *
 * Without `content.apps` the tiles are the apps of Nextcloud's navigation, so
 * the widget works with no configuration. `content` keys, all optional:
 *
 * - `title` (i18n key): the card's heading, drawn beside the filter.
 * - `apps`: `[{ id, label, href, icon?, status? }]` instead of the navigation;
 *   `icon` is an image URL, `status: "down"` marks an outage.
 * - `pinned`: app ids drawn first, with a pin.
 * - `exclude`: app ids left out.
 * - `status`: `{ [appId]: "down" }`, an outage for an app of the navigation.
 * - `showFilter` (default true), `showMostUsed` (default true),
 *   `mostUsedLimit` (default 4).
 *
 * The use counts are this reader's own, kept in the browser
 * (`localStorage`), so "Most used" needs no server and is empty on a new
 * browser.
 *
 * @spec openspec/changes/lpvandaag-start-page/specs/lpvandaag-start-page/spec.md#requirement-the-apps-a-person-can-open-are-tiles
 */
export default {
	name: 'CnAppTilesWidget',

	components: {
		Magnify,
		Pin,
		ViewGridOutline,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

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
			domId: `cn-app-tiles-${++domIdCounter}`,
			navigation: [],
			loading: false,
			query: '',
			uses: readUses(),
		}
	},

	computed: {
		/**
		 * The card's heading, translated.
		 *
		 * @return {string}
		 */
		title() {
			const value = this.content?.title
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/** @return {boolean} Whether the filter field shows. */
		showFilter() {
			return this.content?.showFilter !== false
		},

		/** @return {string} The filter field's label and placeholder. */
		filterLabel() {
			return t('nextcloud-vue', 'Filter tiles')
		},

		/**
		 * Every app the widget offers, pinned first, with its status.
		 *
		 * @return {Array<object>}
		 */
		apps() {
			const configured = Array.isArray(this.content?.apps) ? this.content.apps : null
			return arrangeApps(configured ?? this.navigation, {
				pinned: this.content?.pinned,
				exclude: this.content?.exclude,
				status: this.content?.status,
			}).map((app) => ({ ...app, label: configured ? this.cnTranslate(app.label) : app.label }))
		},

		/**
		 * The apps the filter leaves.
		 *
		 * @return {Array<object>}
		 */
		shownApps() {
			const query = this.query.trim().toLocaleLowerCase()
			if (query === '') {
				return this.apps
			}
			return this.apps.filter((app) => app.label.toLocaleLowerCase().includes(query))
		},

		/**
		 * The apps this reader opened most from here, most first.
		 *
		 * @return {Array<object>}
		 */
		mostUsed() {
			if (this.content?.showMostUsed === false) {
				return []
			}
			const limit = Number.isFinite(this.content?.mostUsedLimit) ? this.content.mostUsedLimit : 4
			return mostUsedApps(this.apps, this.uses, limit)
		},
	},

	mounted() {
		if (!Array.isArray(this.content?.apps)) {
			this.loadNavigation()
		}
	},

	methods: {
		t,
		n,

		/**
		 * Read the apps of Nextcloud's navigation.
		 *
		 * @return {Promise<void>}
		 */
		async loadNavigation() {
			this.loading = true
			try {
				this.navigation = await navigationApps(axios)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Count one use of an app for this reader.
		 *
		 * @param {object} app The app opened.
		 * @return {void}
		 */
		recordUse(app) {
			this.uses = { ...this.uses, [app.id]: (this.uses[app.id] || 0) + 1 }
			writeUses(this.uses)
		},
	},
}

/**
 * The storage key of the current reader's use counts.
 *
 * @return {string}
 */
function usageKey() {
	try {
		return USAGE_KEY_PREFIX + (getCurrentUser()?.uid || '')
	} catch {
		return USAGE_KEY_PREFIX
	}
}

/**
 * This reader's use counts by app id; empty when the browser keeps none.
 *
 * @return {Record<string, number>}
 */
export function readUses() {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(usageKey()) || '{}')
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
	} catch {
		return {}
	}
}

/**
 * Keep this reader's use counts in the browser. A browser that refuses
 * keeps nothing, and the tiles work as before.
 *
 * @param {Record<string, number>} uses The counts.
 * @return {void}
 */
function writeUses(uses) {
	try {
		window.localStorage.setItem(usageKey(), JSON.stringify(uses))
	} catch {
		// Storage is unavailable or full; the counts are a convenience.
	}
}

/**
 * The apps in the order the tiles draw them: the pinned ones first in the
 * order `pinned` names them, then the rest in their own order, without the
 * excluded ones and without an app that has no id, name or link. Each app
 * carries `pinned` and `down`.
 *
 * @param {Array<object>} apps The apps.
 * @param {{ pinned?: string[], exclude?: string[], status?: object }} options The arrangement.
 * @return {Array<object>}
 */
export function arrangeApps(apps, { pinned = [], exclude = [], status = {} } = {}) {
	const pins = Array.isArray(pinned) ? pinned.map(String) : []
	const left = new Set(Array.isArray(exclude) ? exclude.map(String) : [])
	const states = status && typeof status === 'object' ? status : {}
	const usable = (Array.isArray(apps) ? apps : [])
		.filter((app) => app && app.id && app.label && app.href && !left.has(String(app.id)))
		.map((app) => ({
			id: String(app.id),
			label: String(app.label),
			href: String(app.href),
			icon: typeof app.icon === 'string' ? app.icon : '',
			pinned: pins.includes(String(app.id)),
			down: (app.status ?? states[app.id]) === 'down',
		}))
	const first = pins.map((id) => usable.find((app) => app.id === id)).filter(Boolean)
	return [...first, ...usable.filter((app) => !app.pinned)]
}

/**
 * The apps used at least once, most used first, at most `limit` of them.
 *
 * @param {Array<object>} apps The apps on offer.
 * @param {Record<string, number>} uses The use counts by app id.
 * @param {number} limit The most to return.
 * @return {Array<object>}
 */
export function mostUsedApps(apps, uses, limit) {
	return apps
		.filter((app) => Number(uses?.[app.id]) > 0)
		.sort((a, b) => uses[b.id] - uses[a.id])
		.slice(0, Math.max(0, limit))
}
</script>

<style scoped>
.cn-app-tiles {
	display: flex;
	flex-direction: column;
	gap: 10px;
	height: 100%;
	min-height: 0;
	box-sizing: border-box;
}

.cn-app-tiles__head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

.cn-app-tiles__title {
	flex: 1 1 auto;
	margin: 0;
	font-size: 16px;
	font-weight: 700;
	line-height: 1.3;
}

.cn-app-tiles__filter {
	position: relative;
	flex: 0 1 240px;
	min-width: 160px;
	margin-inline-start: auto;
}

.cn-app-tiles__filter-icon {
	position: absolute;
	inset-inline-start: 10px;
	top: 50%;
	transform: translateY(-50%);
	color: var(--color-text-maxcontrast);
	pointer-events: none;
}

.cn-app-tiles__filter-input {
	width: 100%;
	height: 36px;
	min-height: 36px;
	margin: 0;
	box-sizing: border-box;
	padding-block: 0;
	padding-inline: 34px 10px;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
	font-size: 14px;
}

.cn-app-tiles__most {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-app-tiles__most-label {
	margin-inline-end: 4px;
	font-size: 13px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
}

.cn-app-tiles__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 30px;
	padding: 0 12px;
	border-radius: 15px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 13px;
	font-weight: 500;
	text-decoration: none;
}

.cn-app-tiles__chip:hover,
.cn-app-tiles__chip:focus-visible {
	background: var(--color-background-darker);
}

.cn-app-tiles__chip-count {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-app-tiles__state {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-app-tiles__grid {
	display: grid;
	flex: 1 1 auto;
	grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
	align-content: start;
	gap: 10px;
	min-height: 0;
	margin: 0;
	padding: 0;
	overflow: auto;
	list-style: none;
	scrollbar-width: thin;
}

.cn-app-tiles__tile {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	height: 100%;
	box-sizing: border-box;
	padding: 12px 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 10px);
	color: var(--color-main-text);
	text-align: center;
	text-decoration: none;
}

.cn-app-tiles__tile:hover,
.cn-app-tiles__tile:focus-visible {
	border-color: var(--color-primary-element);
	background: var(--color-background-hover);
}

.cn-app-tiles__pin {
	position: absolute;
	top: 6px;
	inset-inline-start: 6px;
	color: var(--color-primary-element);
}

.cn-app-tiles__dot {
	position: absolute;
	top: 8px;
	inset-inline-end: 8px;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color-success, #2d7b41);
}

.cn-app-tiles__dot--down {
	background: var(--color-error, #d91812);
}

.cn-app-tiles__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
}

.cn-app-tiles__icon--down {
	background: color-mix(in srgb, var(--color-error, #d91812) 12%, transparent);
	color: var(--color-error-text, #a30000);
}

/* Nextcloud's navigation icons are drawn for the dark header (white); as a
   mask they take the chip's text colour instead. */
.cn-app-tiles__glyph {
	width: 22px;
	height: 22px;
	background-color: currentColor;
	mask: var(--cn-app-tiles-icon) center / contain no-repeat;
}

.cn-app-tiles__name {
	font-size: 13px;
	font-weight: 600;
	line-height: 1.2;
	overflow-wrap: anywhere;
}

.cn-app-tiles__badge {
	padding: 1px 8px;
	border-radius: 10px;
	background: color-mix(in srgb, var(--color-error, #d91812) 12%, transparent);
	color: var(--color-error-text, #a30000);
	font-size: 12px;
	font-weight: 600;
}

.cn-app-tiles__sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>

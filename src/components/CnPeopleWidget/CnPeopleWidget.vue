<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-people-widget" :class="layoutClass">
		<header class="cn-people-widget__header">
			<input
				v-model="search"
				type="search"
				class="cn-people-widget__search"
				:aria-label="t('nextcloud-vue', 'Search by name or email')"
				:placeholder="t('nextcloud-vue', 'Search by name or email…')">
			<button
				type="button"
				class="cn-people-widget__refresh"
				:title="t('nextcloud-vue', 'Refresh')"
				:aria-label="t('nextcloud-vue', 'Refresh')"
				@click="forceRefresh">
				&#x21bb;
			</button>
		</header>

		<div v-if="loading && users.length === 0" class="cn-people-widget__state">
			{{ t('nextcloud-vue', 'Loading…') }}
		</div>

		<div v-else-if="error" class="cn-people-widget__state cn-people-widget__state--error">
			<p>{{ t('nextcloud-vue', 'Failed to load users') }}</p>
			<button type="button" class="cn-people-widget__retry" @click="forceRefresh">
				{{ t('nextcloud-vue', 'Retry') }}
			</button>
		</div>

		<div v-else-if="!hasSource" class="cn-people-widget__state">
			{{ t('nextcloud-vue', 'No people directory available') }}
		</div>

		<div v-else-if="filteredUsers.length === 0" class="cn-people-widget__state">
			{{ search ? t('nextcloud-vue', 'No users match your search') : t('nextcloud-vue', 'No people to show') }}
		</div>

		<div
			v-else
			class="cn-people-widget__items"
			:style="gridStyle"
			role="list">
			<a
				v-for="user in filteredUsers"
				:key="user.uid"
				:href="profileUrl(user.uid)"
				class="cn-people-widget__item"
				role="listitem">
				<img
					v-if="user.avatarUrl"
					:src="user.avatarUrl"
					:width="avatarSize"
					:height="avatarSize"
					:alt="''"
					class="cn-people-widget__avatar">
				<div class="cn-people-widget__meta">
					<strong class="cn-people-widget__name">{{ user.displayName || user.uid }}</strong>
					<span v-if="layout !== 'grid' && user.role" class="cn-people-widget__sub">{{ user.role }}</span>
					<span v-if="layout !== 'grid' && (user.organisation || user.department)" class="cn-people-widget__sub">
						{{ user.organisation || user.department }}
					</span>
					<span v-if="layout !== 'grid' && user.email" class="cn-people-widget__sub">{{ user.email }}</span>
				</div>
			</a>
		</div>

		<footer v-if="hasMore && !error" class="cn-people-widget__footer">
			<button
				type="button"
				class="cn-people-widget__load-more"
				:disabled="loading"
				@click="loadMore">
				{{ loading ? t('nextcloud-vue', 'Loading…') : t('nextcloud-vue', 'Load more') }}
			</button>
		</footer>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

const ALLOWED_LAYOUTS = ['card', 'grid', 'list']
const DEFAULT_LAYOUT = 'grid'
const PAGE_SIZE = 50

/**
 * CnPeopleWidget — renders a paginated, group-filterable user directory in one
 * of three layout modes (`card`, `grid`, `list`).
 *
 * Data origin (decoupling seam): the people directory is read through a
 * consumer-supplied `dataSource` prop OR the `cnPeopleSource` injection — an
 * object exposing `fetchPeople({ offset, limit, filters, excludeDisabled,
 * sortBy }) => Promise<{ users, total, hasMore }>`. The canonical backing is a
 * Nextcloud user-provisioning / Contacts source surfaced by the consuming app;
 * this renderer never imports a sibling-app module path nor assumes a backend
 * route. When neither prop nor injection is supplied the widget degrades to an
 * empty state ("No people directory available") and performs no request.
 *
 * Search is a client-side substring filter on the loaded page (name + email).
 * Pagination is offset-based: each "Load more" appends one {@link PAGE_SIZE}
 * page. A single failed fetch surfaces a retryable error state rather than
 * throwing.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnPeopleWidget',

	inject: {
		cnPeopleSource: {
			default: null,
		},
	},

	props: {
		/**
		 * Persisted widget content `{layout, filters, excludeDisabled,
		 * sortBy, columns}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Consumer-supplied data source overriding the `cnPeopleSource`
		 * injection. Must expose `fetchPeople(args) => Promise<{users, total,
		 * hasMore}>`. When `null` the injection (then the empty state) is used.
		 *
		 * @type {object|null}
		 */
		dataSource: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			users: [],
			total: 0,
			hasMore: false,
			loading: false,
			error: null,
			search: '',
		}
	},

	computed: {
		/**
		 * The active data source (prop wins over injection).
		 *
		 * @return {object|null} the resolved source, or `null`.
		 */
		source() {
			const candidate = this.dataSource || this.cnPeopleSource
			return candidate && typeof candidate.fetchPeople === 'function' ? candidate : null
		},

		/**
		 * Whether a usable people source is configured.
		 *
		 * @return {boolean} true when a source exists.
		 */
		hasSource() {
			return this.source !== null
		},

		/**
		 * The validated layout mode (defaults to `grid`).
		 *
		 * @return {string} one of card/grid/list.
		 */
		layout() {
			const value = this.content && this.content.layout
			return ALLOWED_LAYOUTS.includes(value) ? value : DEFAULT_LAYOUT
		},

		/**
		 * The layout CSS modifier class.
		 *
		 * @return {string} the layout class.
		 */
		layoutClass() {
			return `cn-people-widget--${this.layout}`
		},

		/**
		 * The validated grid column count.
		 *
		 * @return {number} the column count.
		 */
		columns() {
			const raw = this.content && this.content.columns
			if (typeof raw === 'number' && [2, 3, 4].includes(raw)) {
				return raw
			}
			return this.layout === 'grid' ? 4 : 3
		},

		/**
		 * The inline grid style (no columns in list mode).
		 *
		 * @return {object} the style object.
		 */
		gridStyle() {
			if (this.layout === 'list') {
				return {}
			}
			return { 'grid-template-columns': `repeat(${this.columns}, minmax(0, 1fr))` }
		},

		/**
		 * The avatar pixel size for the current layout.
		 *
		 * @return {number} the avatar size.
		 */
		avatarSize() {
			if (this.layout === 'card') {
				return 80
			}
			if (this.layout === 'list') {
				return 44
			}
			return 64
		},

		/**
		 * The client-side search filter result.
		 *
		 * @return {object[]} the filtered users.
		 */
		filteredUsers() {
			if (!this.search) {
				return this.users
			}
			const needle = this.search.toLowerCase()
			return this.users.filter((user) => {
				const name = (user.displayName || '').toLowerCase()
				const email = (user.email || '').toLowerCase()
				return name.includes(needle) || email.includes(needle)
			})
		},

		/**
		 * The fetch arguments derived from content (drives the reload watch).
		 *
		 * @return {object} the fetch argument shape.
		 */
		fetchArgs() {
			const filters = Array.isArray(this.content && this.content.filters) ? this.content.filters : []
			return {
				filters,
				excludeDisabled: !(this.content && this.content.excludeDisabled === false),
				sortBy: (this.content && this.content.sortBy) || 'displayName',
			}
		},
	},

	watch: {
		fetchArgs: {
			deep: true,
			handler() {
				this.forceRefresh()
			},
		},
	},

	mounted() {
		this.fetchPage(0)
	},

	methods: {
		t,

		/**
		 * Build a profile link for a uid.
		 *
		 * @param {string} uid the user id.
		 * @return {string} the profile URL.
		 */
		profileUrl(uid) {
			return `/u/${encodeURIComponent(uid)}`
		},

		/**
		 * Append the next page of users.
		 *
		 * @return {Promise<void>}
		 */
		async loadMore() {
			if (this.loading || !this.hasMore) {
				return
			}
			await this.fetchPage(this.users.length)
		},

		/**
		 * Clear the loaded set and refetch from the first page.
		 *
		 * @return {void}
		 */
		forceRefresh() {
			this.users = []
			this.total = 0
			this.hasMore = false
			this.fetchPage(0)
		},

		/**
		 * Fetch one page from the configured source. A missing source or a
		 * fetch failure degrades to the empty / error state without throwing.
		 *
		 * @param {number} offset the page offset.
		 * @return {Promise<void>}
		 */
		async fetchPage(offset) {
			if (!this.source) {
				this.users = []
				return
			}
			this.loading = true
			this.error = null
			try {
				const data = await this.source.fetchPeople({
					offset,
					limit: PAGE_SIZE,
					...this.fetchArgs,
				}) || {}
				const incoming = Array.isArray(data.users) ? data.users : []
				this.users = offset === 0 ? incoming : this.users.concat(incoming)
				this.total = typeof data.total === 'number' ? data.total : this.users.length
				this.hasMore = data.hasMore === true
			} catch (err) {
				this.error = err
				if (offset === 0) {
					this.users = []
				}
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-people-widget {
	display: flex;
	flex-direction: column;
	height: 100%;
	gap: 8px;
	padding: 8px;
	overflow: hidden;
}

.cn-people-widget__header {
	display: flex;
	gap: 6px;
	align-items: center;
	flex: 0 0 auto;
}

.cn-people-widget__search {
	flex: 1 1 auto;
	padding: 4px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-people-widget__refresh,
.cn-people-widget__retry,
.cn-people-widget__load-more {
	border: 1px solid var(--color-border);
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
	padding: 2px 8px;
	cursor: pointer;
	font-size: 14px;
	color: var(--color-main-text);
}

.cn-people-widget__items {
	flex: 1 1 auto;
	overflow-y: auto;
	display: grid;
	gap: 8px;
}

.cn-people-widget--list .cn-people-widget__items {
	display: flex;
	flex-direction: column;
}

.cn-people-widget__item {
	display: flex;
	gap: 8px;
	align-items: center;
	padding: 6px;
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	text-decoration: none;
	border: 1px solid transparent;
}

.cn-people-widget--card .cn-people-widget__item,
.cn-people-widget--grid .cn-people-widget__item {
	flex-direction: column;
	text-align: center;
}

.cn-people-widget--card .cn-people-widget__item {
	border: 1px solid var(--color-border);
	background: var(--color-main-background);
	min-height: 200px;
}

.cn-people-widget__item:hover {
	background: var(--color-background-hover);
	border-color: var(--color-border);
}

.cn-people-widget__avatar {
	border-radius: 50%;
	object-fit: cover;
	background: var(--color-background-darker);
}

.cn-people-widget__meta {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-people-widget__name {
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.cn-people-widget__sub {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-people-widget__state {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	padding: 16px;
	text-align: center;
}

.cn-people-widget__footer {
	flex: 0 0 auto;
	display: flex;
	justify-content: center;
	padding-top: 4px;
}
</style>

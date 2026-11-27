<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-people-widget" :class="layoutClass">
		<header v-if="showSearch" class="cn-people-widget__header">
			<input
				v-model="search"
				type="search"
				class="cn-people-widget__search"
				:aria-label="t('nextcloud-vue', 'Search by name or email')"
				:placeholder="searchPlaceholder">
			<button
				type="button"
				class="cn-people-widget__refresh"
				:title="t('nextcloud-vue', 'Refresh')"
				:aria-label="t('nextcloud-vue', 'Refresh')"
				@click="forceRefresh">
				&#x21bb;
			</button>
		</header>

		<div v-if="(loading || searchPending) && displayedUsers.length === 0" class="cn-people-widget__state">
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

		<div v-else-if="isNewMode && newConfigured === false"
			class="cn-people-widget__state"
			data-testid="cn-people-no-start-field">
			{{ t('nextcloud-vue', 'The administrator has not set a start date field.') }}
		</div>

		<div v-else-if="displayedUsers.length === 0" class="cn-people-widget__state">
			{{ search.trim() ? t('nextcloud-vue', 'No users match your search') : t('nextcloud-vue', 'No matching users.') }}
		</div>

		<div
			v-else
			class="cn-people-widget__items"
			:class="{ 'cn-board-ruled-rows': layout === 'list' }"
			:style="gridStyle"
			role="list">
			<div
				v-for="user in displayedUsers"
				:key="user.uid"
				class="cn-people-widget__item"
				role="listitem">
				<a :href="profileUrl(user.uid)" class="cn-people-widget__link">
					<img
						v-if="showAvatar && user.avatarUrl"
						:src="user.avatarUrl"
						:width="avatarSize"
						:height="avatarSize"
						alt=""
						class="cn-people-widget__avatar">
					<div class="cn-people-widget__meta">
						<strong class="cn-people-widget__name">{{ user.displayName || user.uid }}</strong>
						<template v-if="layout !== 'grid'">
							<span v-if="shows('role') && user.role" class="cn-people-widget__sub">{{ user.role }}</span>
							<span v-if="startsLabel(user)" class="cn-people-widget__sub cn-people-widget__starts" data-testid="cn-people-starts">
								{{ startsLabel(user) }}
							</span>
							<span v-if="shows('organisation') && (user.organisation || user.department)" class="cn-people-widget__sub">
								{{ user.organisation || user.department }}
							</span>
							<span v-if="shows('email') && user.email" class="cn-people-widget__sub">{{ user.email }}</span>
							<span v-if="shows('phone') && user.phone" class="cn-people-widget__sub">{{ user.phone }}</span>
						</template>
					</div>
				</a>
				<div v-if="layout !== 'grid' && customFieldsOf(user).length > 0" class="cn-people-widget__fields">
					<template v-for="field in customFieldsOf(user)" :key="field.key">
						<ul
							v-if="field.type === 'tags'"
							class="cn-people-widget__tags"
							:aria-label="field.label">
							<li v-for="tag in field.values" :key="tag">
								<button
									type="button"
									class="cn-people-widget__tag"
									:class="{ 'cn-people-widget__tag--match': tagMatches(tag) }"
									:aria-label="t('nextcloud-vue', 'Find everyone tagged {tag}', { tag })"
									@click="searchTag(tag)">
									{{ tag }}
								</button>
							</li>
						</ul>
						<span v-else class="cn-people-widget__sub cn-people-widget__field">
							{{ field.label }}: {{ field.values.join(', ') }}
						</span>
					</template>
				</div>
			</div>
		</div>

		<footer v-if="canLoadMore && !error" class="cn-people-widget__footer">
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
import { getLanguage, translate as t } from '@nextcloud/l10n'
import { clearPeoplePages, readPeoplePage, storePeoplePage } from './peopleCache.js'

const ALLOWED_LAYOUTS = ['card', 'grid', 'list']
const DEFAULT_LAYOUT = 'grid'
const PAGE_SIZE = 50
const MIN_SERVER_QUERY = 2
const SEARCH_DEBOUNCE_MS = 300
const NEW_SINCE_DEFAULT = 30
const NEW_UNTIL_DEFAULT = 14

/**
 * A whole number of days inside [min, max], or the default when unset.
 *
 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md#requirement-the-people-widget-lists-new-colleagues
 * @param {number|string|undefined} value The stored value.
 * @param {number} fallback The default.
 * @param {number} min The lowest allowed.
 * @param {number} max The highest allowed.
 * @return {number}
 */
function clampDays(value, fallback, min, max) {
	const number = Number(value)
	if (value === undefined || value === null || value === '' || !Number.isFinite(number)) {
		return fallback
	}
	return Math.min(max, Math.max(min, Math.round(number)))
}

/**
 * CnPeopleWidget — renders a paginated, group-filterable user directory in one
 * of three layout modes (`card`, `grid`, `list`).
 *
 * Data origin (decoupling seam): the people directory is read through a
 * consumer-supplied `dataSource` prop OR the `cnPeopleSource` injection — an
 * object exposing `fetchPeople({ offset, limit, filters, excludeDisabled,
 * sortBy, showBirthdays }) => Promise<{ users, total, hasMore }>` and,
 * optionally, `searchPeople({ q, ...same }) => Promise<{ users, total,
 * hasMore }>` for a directory-wide search. When neither prop nor injection is
 * supplied the widget degrades to an empty state ("No people directory
 * available") and performs no request.
 *
 * Search: with a `searchPeople` source, a query of {@link MIN_SERVER_QUERY} or
 * more characters is asked of the source (debounced, never cached, a late
 * answer to an older query is dropped); shorter queries, and sources without
 * `searchPeople`, filter the loaded page on name and email. A tag on a card is
 * a button that searches for it; tags matching the query are highlighted.
 *
 * Fields: `content.showFields` picks the role, organisation, email and phone
 * lines on card and list layouts. When it is an object, only the keys set to
 * `true` show; the avatar and each custom profile field (`user.customFields`,
 * `[{key, label, type: 'text'|'tags', values}]`) show unless their key is
 * explicitly `false`. The grid layout shows avatar and name only.
 *
 * Pages are cached in memory for 60 seconds per argument set, across
 * remounts; Refresh drops the cache and fetches again. Pagination is
 * offset-based: each "Load more" appends one {@link PAGE_SIZE} page. A failed
 * fetch surfaces a retryable error state rather than throwing.
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
		 * showBirthdays, sortBy, columns, showFields, showSearch}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Consumer-supplied data source overriding the `cnPeopleSource`
		 * injection. Must expose `fetchPeople(args)` and may expose
		 * `searchPeople(args)`. When `null` the injection (then the empty
		 * state) is used.
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
			searchResults: [],
			searchHasMore: false,
			searchPending: false,
			searchTimer: null,
			searchSeq: 0,
			pageSeq: 0,
			// New colleagues mode: whether a start date field exists (null until asked).
			newConfigured: null,
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
		 * Whether the source can search the whole directory.
		 *
		 * @return {boolean} true when it exposes `searchPeople`.
		 */
		canSearchServer() {
			return this.source !== null && typeof this.source.searchPeople === 'function'
		},

		/**
		 * The search box placeholder.
		 *
		 * @return {string} the localised placeholder.
		 */
		searchPlaceholder() {
			return this.canSearchServer
				? t('nextcloud-vue', 'Search by name, email or expertise…')
				: t('nextcloud-vue', 'Search by name or email…')
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
		 * The `showFields` map when one is configured, else `null` (show all).
		 *
		 * @return {object|null} the field map.
		 */
		showFields() {
			const value = this.content && this.content.showFields
			return value && typeof value === 'object' && !Array.isArray(value) ? value : null
		},

		/**
		 * Whether avatars show (unless `showFields.avatar` is `false`).
		 *
		 * @return {boolean} true when avatars show.
		 */
		showAvatar() {
			return !(this.showFields && this.showFields.avatar === false)
		},

		/**
		 * Whether the search box (and its refresh button) shows: unless
		 * `content.showSearch` is `false`. A list of new colleagues or of
		 * birthdays is read, not searched (board LpVandaag).
		 *
		 * @spec openspec/specs/people-widget/spec.md#requirement-a-people-widget-can-leave-out-its-search-box
		 * @return {boolean}
		 */
		showSearch() {
			return !(this.content && this.content.showSearch === false)
		},

		/**
		 * The trimmed query when it goes to the source, else ''.
		 *
		 * @return {string} the server query.
		 */
		serverQuery() {
			if (!this.canSearchServer) {
				return ''
			}
			const query = (this.search || '').trim()
			return query.length >= MIN_SERVER_QUERY ? query : ''
		},

		/**
		 * The users to show: server results for a server query, else the
		 * loaded pages filtered on name and email.
		 *
		 * @return {object[]} the users.
		 */
		displayedUsers() {
			if (this.serverQuery) {
				return this.searchResults
			}
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
		 * Whether another page can be appended.
		 *
		 * @return {boolean} true when Load more applies.
		 */
		canLoadMore() {
			return this.serverQuery ? this.searchHasMore : this.hasMore
		},

		/**
		 * The fetch arguments derived from content (drives the reload watch).
		 *
		 * @return {object} the fetch argument shape.
		 */
		/**
		 * Whether the placement lists new colleagues (`selectionMode: 'new'`)
		 * and the source can answer it (`fetchNewPeople`).
		 *
		 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md#requirement-the-people-widget-lists-new-colleagues
		 * @return {boolean}
		 */
		isNewMode() {
			return this.content?.selectionMode === 'new' && this.source !== null && typeof this.source.fetchNewPeople === 'function'
		},

		fetchArgs() {
			const filters = Array.isArray(this.content && this.content.filters) ? this.content.filters : []
			if (this.content?.selectionMode === 'new') {
				return {
					selectionMode: 'new',
					since: clampDays(this.content.newSinceDays, NEW_SINCE_DEFAULT, 1, 90),
					until: clampDays(this.content.newUntilDays, NEW_UNTIL_DEFAULT, 0, 30),
					filters,
					excludeDisabled: !(this.content && this.content.excludeDisabled === false),
				}
			}
			return {
				filters,
				excludeDisabled: !(this.content && this.content.excludeDisabled === false),
				showBirthdays: !(this.content && this.content.showBirthdays === false),
				sortBy: (this.content && this.content.sortBy) || 'displayName',
			}
		},

		/**
		 * The cache key of the current argument set.
		 *
		 * @return {string} the serialised arguments.
		 */
		cacheKey() {
			return JSON.stringify({ ...this.fetchArgs, limit: PAGE_SIZE })
		},
	},

	watch: {
		fetchArgs: {
			deep: true,
			handler() {
				this.resetPages()
				this.fetchPage(0)
				if (this.serverQuery) {
					this.fetchSearch(0)
				}
			},
		},

		serverQuery(query) {
			clearTimeout(this.searchTimer)
			this.searchSeq++
			this.searchResults = []
			this.searchHasMore = false
			this.searchPending = query !== ''
			if (query) {
				this.searchTimer = setTimeout(() => this.fetchSearch(0), SEARCH_DEBOUNCE_MS)
			}
		},
	},

	mounted() {
		this.fetchPage(0)
	},

	beforeUnmount() {
		clearTimeout(this.searchTimer)
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
		 * Whether a standard field line shows under `showFields`.
		 *
		 * @param {string} field the field name.
		 * @return {boolean} true when it shows.
		 */
		shows(field) {
			return this.showFields === null || this.showFields[field] === true
		},

		/**
		 * The custom profile fields of a user that have values and are not
		 * switched off in `showFields`.
		 *
		 * @param {object} user the user record.
		 * @return {object[]} the fields.
		 */
		customFieldsOf(user) {
			if (!Array.isArray(user.customFields)) {
				return []
			}
			return user.customFields.filter((field) => field
				&& Array.isArray(field.values)
				&& field.values.length > 0
				&& !(this.showFields && this.showFields[field.key] === false))
		},

		/**
		 * Whether a tag holds the current query, for highlighting.
		 *
		 * @param {string} tag the tag.
		 * @return {boolean} true when it matches.
		 */
		tagMatches(tag) {
			const query = (this.search || '').trim().toLowerCase()
			return query.length >= MIN_SERVER_QUERY && String(tag).toLowerCase().includes(query)
		},

		/**
		 * Search for everyone with this tag.
		 *
		 * @param {string} tag the tag.
		 * @return {void}
		 */
		searchTag(tag) {
			this.search = String(tag)
		},

		/**
		 * Append the next page of users or search results.
		 *
		 * @return {Promise<void>}
		 */
		async loadMore() {
			if (this.loading || !this.canLoadMore) {
				return
			}
			if (this.serverQuery) {
				await this.fetchSearch(this.searchResults.length)
				return
			}
			await this.fetchPage(this.users.length)
		},

		/**
		 * Forget the loaded pages (not the cache).
		 *
		 * @return {void}
		 */
		resetPages() {
			this.users = []
			this.total = 0
			this.hasMore = false
		},

		/**
		 * Drop the cache and refetch from the first page.
		 *
		 * @return {void}
		 */
		forceRefresh() {
			clearPeoplePages(this.cacheKey)
			this.resetPages()
			this.fetchPage(0)
			if (this.serverQuery) {
				this.fetchSearch(0)
			}
		},

		/**
		 * Fetch one page from the configured source, or take it from the
		 * cache while fresh. A missing source or a fetch failure degrades to
		 * the empty / error state without throwing.
		 *
		 * @param {number} offset the page offset.
		 * @return {Promise<void>}
		 */
		async fetchPage(offset) {
			if (!this.source) {
				this.users = []
				return
			}
			if (this.isNewMode) {
				await this.fetchNew()
				return
			}
			const cacheKey = this.cacheKey
			const cached = readPeoplePage(cacheKey, offset)
			if (cached) {
				this.applyPage(cached, offset)
				return
			}
			const seq = ++this.pageSeq
			this.loading = true
			this.error = null
			try {
				const data = await this.source.fetchPeople({
					offset,
					limit: PAGE_SIZE,
					...this.fetchArgs,
				}) || {}
				if (seq !== this.pageSeq) {
					return
				}
				const page = {
					users: Array.isArray(data.users) ? data.users : [],
					total: data.total,
					hasMore: data.hasMore === true,
				}
				storePeoplePage(cacheKey, offset, page)
				this.applyPage(page, offset)
			} catch (err) {
				if (seq !== this.pageSeq) {
					return
				}
				this.error = err
				if (offset === 0) {
					this.users = []
				}
			} finally {
				if (seq === this.pageSeq) {
					this.loading = false
				}
			}
		},

		/**
		 * Read the new colleagues: one answer, newest start first, never paged.
		 * `configured: false` means no start date field exists.
		 *
		 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md#requirement-the-people-widget-lists-new-colleagues
		 * @return {Promise<void>}
		 */
		async fetchNew() {
			const seq = ++this.pageSeq
			this.loading = true
			this.error = null
			try {
				const data = await this.source.fetchNewPeople({ ...this.fetchArgs }) || {}
				if (seq !== this.pageSeq) {
					return
				}
				this.newConfigured = data.configured !== false
				const users = (Array.isArray(data.users) ? data.users : [])
					.map((user) => ({ ...user, uid: user.uid || user.id }))
					.filter((user) => typeof user.uid === 'string' && user.uid !== '')
				this.applyPage({ users, total: users.length, hasMore: false }, 0)
			} catch (err) {
				if (seq !== this.pageSeq) {
					return
				}
				this.error = err
				this.users = []
			} finally {
				if (seq === this.pageSeq) {
					this.loading = false
				}
			}
		},

		/**
		 * "Starts Monday" for a new colleague who has not started yet, else ''.
		 *
		 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md#requirement-the-people-widget-lists-new-colleagues
		 * @param {object} user The person (`starts`, `startDate` YYYY-MM-DD).
		 * @return {string}
		 */
		startsLabel(user) {
			if (!this.isNewMode || user?.starts !== true || typeof user.startDate !== 'string') {
				return ''
			}
			const date = new Date(`${user.startDate}T12:00:00Z`)
			if (isNaN(date.getTime())) {
				return ''
			}
			const weekday = date.toLocaleDateString(getLanguage(), { weekday: 'long', timeZone: 'UTC' })
			return t('nextcloud-vue', 'Starts {weekday}', { weekday })
		},

		/**
		 * Put a fetched or cached page into the loaded set.
		 *
		 * @param {object} page the `{users, total, hasMore}` page.
		 * @param {number} offset the page offset.
		 * @return {void}
		 */
		applyPage(page, offset) {
			this.error = null
			this.users = offset === 0 ? page.users : this.users.concat(page.users)
			this.total = typeof page.total === 'number' ? page.total : this.users.length
			this.hasMore = page.hasMore
		},

		/**
		 * Fetch one page of directory-wide search results. Never cached; a late
		 * answer to an older query is dropped.
		 *
		 * @param {number} offset the index of the first match.
		 * @return {Promise<void>}
		 */
		async fetchSearch(offset) {
			const query = this.serverQuery
			if (!query) {
				return
			}
			const seq = ++this.searchSeq
			this.loading = true
			this.error = null
			try {
				const data = await this.source.searchPeople({
					q: query,
					offset,
					limit: PAGE_SIZE,
					...this.fetchArgs,
				}) || {}
				if (seq !== this.searchSeq) {
					return
				}
				const incoming = Array.isArray(data.users) ? data.users : []
				this.searchResults = offset === 0 ? incoming : this.searchResults.concat(incoming)
				this.searchHasMore = data.hasMore === true
			} catch (err) {
				if (seq === this.searchSeq) {
					this.error = err
				}
			} finally {
				if (seq === this.searchSeq) {
					this.loading = false
					this.searchPending = false
				}
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
	flex-direction: column;
	gap: 6px;
	padding: 6px;
	border-radius: var(--border-radius);
	border: 1px solid transparent;
}

.cn-people-widget--list .cn-people-widget__item {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
}

.cn-people-widget__link {
	display: flex;
	gap: 8px;
	align-items: center;
	min-width: 0;
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-people-widget--list .cn-people-widget__link {
	flex: 1 1 auto;
}

.cn-people-widget--card .cn-people-widget__link,
.cn-people-widget--grid .cn-people-widget__link {
	flex-direction: column;
	text-align: center;
}

.cn-people-widget__fields {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-people-widget--card .cn-people-widget__fields {
	align-items: center;
	text-align: center;
}

.cn-people-widget__tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-people-widget--card .cn-people-widget__tags {
	justify-content: center;
}

.cn-people-widget__tag {
	padding: 0 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-pill, 999px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 12px;
	line-height: 20px;
	cursor: pointer;
}

.cn-people-widget__tag:hover,
.cn-people-widget__tag:focus-visible {
	background: var(--color-background-hover);
}

.cn-people-widget__tag--match {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-main-text));
	font-weight: 600;
}

.cn-people-widget--card .cn-people-widget__item {
	border: 1px solid var(--color-border);
	background: var(--color-main-background);
	min-height: 200px;
}

.cn-people-widget__item:hover,
.cn-people-widget__item:focus-within {
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

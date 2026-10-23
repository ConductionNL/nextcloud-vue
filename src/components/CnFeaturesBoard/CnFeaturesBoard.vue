<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-features-board" :class="`cn-features-board--${layout}`" data-testid="cn-features-board">
		<header class="cn-features-board__header">
			<div class="cn-features-board__title-row">
				<h1 class="cn-features-board__title">
					{{ resolvedTitle }}
				</h1>
				<div class="cn-features-board__header-actions">
					<NcButton
						v-if="documentationButton && documentationUrl"
						variant="secondary"
						:href="documentationUrl"
						target="_blank"
						rel="noopener noreferrer"
						data-testid="cn-features-board-docs">
						<template #icon>
							<BookOpenVariant :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Documentation') }}
					</NcButton>
					<CnBuildiqEditButton />
					<NcButton
						v-if="suggestUrl && suggestButton"
						variant="primary"
						:href="suggestUrl"
						target="_blank"
						rel="noopener noreferrer"
						data-testid="cn-features-board-suggest">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Suggest feature') }}
					</NcButton>
					<NcActions
						v-if="!tabs && actionsMenu"
						:menuName="t('nextcloud-vue', 'Actions')"
						:forceName="true"
						data-testid="cn-features-board-actions">
						<template #icon>
							<DotsHorizontal :size="20" />
						</template>
						<NcActionLink
							v-for="action in menuLinks"
							:key="action.key"
							:href="action.href"
							target="_blank">
							{{ action.label }}
						</NcActionLink>
						<NcActionButton @click="onSupport">
							{{ t('nextcloud-vue', 'Support this app') }}
						</NcActionButton>
					</NcActions>
				</div>
			</div>
			<p v-if="resolvedSubtitle" class="cn-features-board__subtitle" data-testid="cn-features-board-subtitle">
				{{ resolvedSubtitle }}
			</p>
		</header>

		<div v-if="tabs" class="cn-features-board__tab-row">
			<div
				class="cn-features-board__tabs"
				role="tablist"
				:aria-label="resolvedTitle"
				@keydown="onTabKeydown">
				<button
					v-for="tab in tabList"
					:id="`${uid}-tab-${tab.key}`"
					:key="tab.key"
					ref="tabButtons"
					type="button"
					role="tab"
					class="cn-features-board__tab"
					:class="{ 'cn-features-board__tab--active': activeTab === tab.key }"
					:aria-selected="activeTab === tab.key ? 'true' : 'false'"
					:aria-controls="`${uid}-panel`"
					:tabindex="activeTab === tab.key ? 0 : -1"
					:data-testid="`cn-features-board-tab-${tab.key}`"
					@click="activeTab = tab.key">
					{{ tab.label }}
				</button>
			</div>
			<NcActions
				v-if="actionsMenu"
				:menuName="t('nextcloud-vue', 'Actions')"
				:forceName="true"
				class="cn-features-board__tab-actions"
				data-testid="cn-features-board-actions">
				<template #icon>
					<DotsHorizontal :size="20" />
				</template>
				<NcActionLink
					v-for="action in menuLinks"
					:key="action.key"
					:href="action.href"
					target="_blank">
					{{ action.label }}
				</NcActionLink>
				<NcActionButton @click="onSupport">
					{{ t('nextcloud-vue', 'Support this app') }}
				</NcActionButton>
			</NcActions>
		</div>

		<div
			:id="`${uid}-panel`"
			class="cn-features-board__panel"
			:class="{ 'cn-features-board__panel--tabbed': tabs }"
			:role="tabs ? 'tabpanel' : null"
			:aria-labelledby="tabs ? `${uid}-tab-${activeTab}` : null">
			<CnRoadmapTab v-if="tabs && activeTab === 'roadmap'" :repo="repo" />
			<template v-else>
				<div
					class="cn-features-board__filter"
					:class="`cn-features-board__filter--${filter}`"
					role="group"
					:aria-label="filterLabel ? tr(filterLabel) : t('nextcloud-vue', 'Status')"
					data-testid="cn-features-board-filter">
					<button
						v-for="option in filterOptions"
						:key="option.key"
						type="button"
						class="cn-features-board__filter-option"
						:class="{ 'cn-features-board__filter-option--active': status === option.key }"
						:aria-pressed="status === option.key ? 'true' : 'false'"
						:data-status="option.key"
						@click="status = option.key">
						{{ option.label }}<span
							v-if="filter === 'chips'"
							class="cn-features-board__filter-count"
							data-testid="cn-features-board-filter-count">{{ ' ' + option.count }}</span>
					</button>
				</div>

				<div class="cn-features-board__body">
					<div class="cn-features-board__groups" :class="`cn-features-board__groups--${layout}`">
						<p v-if="shownGroups.length === 0" class="cn-features-board__empty" data-testid="cn-features-board-empty">
							{{ t('nextcloud-vue', 'No features with this status') }}
						</p>
						<section
							v-for="group in shownGroups"
							:key="group.key"
							class="cn-features-board__group"
							:aria-labelledby="group.label ? `${uid}-group-${group.key}` : null"
							:aria-label="group.label ? null : resolvedTitle"
							data-testid="cn-features-board-group"
							:data-group="group.key">
							<div v-if="group.label" class="cn-features-board__group-head">
								<h2 :id="`${uid}-group-${group.key}`" class="cn-features-board__group-title">
									{{ group.label }}
								</h2>
								<span
									v-if="layout === 'cards'"
									class="cn-features-board__group-caption"
									data-testid="cn-features-board-group-caption">{{ groupCaption(group) }}</span>
							</div>
							<div v-if="layout === 'cards'" class="cn-features-board__cards">
								<article
									v-for="feature in group.shown"
									:key="feature.slug"
									class="cn-features-board__card"
									data-testid="cn-features-board-feature">
									<div class="cn-features-board__card-head">
										<h3 class="cn-features-board__card-title">
											{{ feature.title }}
										</h3>
										<CnStatusBadge
											:label="statusText(feature)"
											:variant="variantOf(feature.status)"
											data-testid="cn-features-board-status" />
									</div>
									<p v-if="feature.summary" class="cn-features-board__card-summary">
										{{ feature.summary }}
									</p>
									<div v-if="readMoreHref(feature)" class="cn-features-board__card-footer">
										<a
											class="cn-features-board__read-more"
											:href="readMoreHref(feature)"
											target="_blank"
											rel="noopener noreferrer"
											:aria-label="t('nextcloud-vue', 'Learn more about {title}', { title: feature.title })">
											{{ t('nextcloud-vue', 'Learn more') }}
										</a>
									</div>
								</article>
							</div>
							<ul v-else class="cn-features-board__rows">
								<li
									v-for="feature in group.shown"
									:key="feature.slug"
									class="cn-features-board__row"
									data-testid="cn-features-board-feature">
									<span class="cn-features-board__row-text">
										<span class="cn-features-board__row-title">{{ feature.title }}</span>
										<span v-if="summaries && feature.summary" class="cn-features-board__row-summary">{{ feature.summary }}</span>
									</span>
									<CnStatusBadge
										:label="statusText(feature)"
										:variant="variantOf(feature.status)"
										data-testid="cn-features-board-status" />
								</li>
							</ul>
						</section>
					</div>

					<aside
						v-if="next > 0 && repo"
						class="cn-features-board__next"
						:aria-label="t('nextcloud-vue', 'Next on the roadmap')"
						data-testid="cn-features-board-next">
						<section class="cn-features-board__next-card">
							<div class="cn-features-board__next-head">
								<RoadVariant :size="20" />
								<h2 class="cn-features-board__next-title">
									{{ t('nextcloud-vue', 'Coming next') }}
								</h2>
							</div>
							<p class="cn-features-board__next-lead">
								{{ t('nextcloud-vue', 'The most requested items from the issue tracker.') }}
							</p>
							<ol v-if="nextIssues.length > 0" class="cn-features-board__next-list">
								<li
									v-for="issue in nextIssues"
									:key="issue.number"
									class="cn-features-board__next-item"
									data-testid="cn-features-board-next-item">
									<a
										class="cn-features-board__next-link"
										:href="safeHref(issue.html_url)"
										target="_blank"
										rel="noopener noreferrer">{{ issue.title }}</a>
									<div class="cn-features-board__next-meta">
										<CnStatusBadge
											v-if="issue.status"
											:label="statusLabel(issue.status)"
											:variant="variantOf(issue.status)" />
										<span v-if="issue.opened" class="cn-features-board__next-opened">
											<CalendarBlankOutline :size="14" />{{ t('nextcloud-vue', 'Opened {date}', { date: issue.opened }) }}
										</span>
										<span>#{{ issue.number }}</span>
									</div>
								</li>
							</ol>
							<p v-else-if="!issuesLoading" class="cn-features-board__next-lead" data-testid="cn-features-board-next-empty">
								{{ t('nextcloud-vue', 'No roadmap items yet') }}
							</p>
							<a
								v-if="tabs"
								href="#"
								class="cn-features-board__next-more"
								data-testid="cn-features-board-whole-roadmap"
								@click.prevent="activeTab = 'roadmap'">
								{{ t('nextcloud-vue', 'See the whole roadmap') }}<ChevronRight :size="16" />
							</a>
							<a
								v-if="documentationUrl"
								:href="documentationUrl"
								target="_blank"
								rel="noopener noreferrer"
								class="cn-features-board__next-more">
								{{ t('nextcloud-vue', 'Documentation') }}<ChevronRight :size="16" />
							</a>
						</section>
					</aside>
				</div>

				<NcNoteCard v-if="notice"
					type="info"
					class="cn-features-board__notice"
					data-testid="cn-features-board-notice">
					<template v-if="noticeParts.link">
						{{ noticeParts.before }}<a
							:href="noticeParts.link.href"
							target="_blank"
							rel="noopener noreferrer"
							data-testid="cn-features-board-notice-link">{{ noticeParts.link.text }}</a>{{ noticeParts.after }}
					</template>
					<template v-else>
						{{ noticeParts.before }}
					</template>
				</NcNoteCard>
			</template>
		</div>
	</div>
</template>

<script>
import { getLanguage, translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActionLink, NcActions, NcButton, NcNoteCard } from '@nextcloud/vue'
import BookOpenVariant from 'vue-material-design-icons/BookOpenVariant.vue'
import CalendarBlankOutline from 'vue-material-design-icons/CalendarBlankOutline.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import RoadVariant from 'vue-material-design-icons/RoadVariant.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnRoadmapTab from '../CnRoadmapTab/CnRoadmapTab.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { formatBoardDate } from '../../utils/boardDate.js'
import { countByStatus, FEATURE_STATUS_VARIANTS, FEATURE_STATUSES, groupFeatures } from '../../utils/featureCatalog.js'
import { fetchRoadmapIssues, issueStatus } from '../../utils/roadmapIssues.js'
import { safeHref } from '../../utils/safeHref.js'

let featuresBoardUid = 0

/**
 * Read the reader's language, which @nextcloud/l10n throws on outside a
 * Nextcloud page.
 *
 * @return {string} The language tag, or ''.
 */
function readerLanguage() {
	try {
		return getLanguage() || ''
	} catch {
		return ''
	}
}

/**
 * CnFeaturesBoard - the Features and roadmap page in the board look.
 *
 * A title with a subtitle, optional folder tabs (Features, Roadmap), a status
 * filter (count chips or a segmented control), the features grouped by
 * category (as two-up cards or as rows inside one card per group), an
 * optional "Next" card with the most requested forge issues, and an optional
 * notice under the groups. The links the default look puts in its right-hand
 * sidebar (suggest, buildiq, AI skills, support) sit in an Actions menu.
 *
 * Rendered by CnFeaturesAndRoadmapView when the page is in the board look.
 *
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md
 *
 * @event support Emitted when the reader picks "Support this app" in the Actions menu.
 */
export default {
	name: 'CnFeaturesBoard',

	components: {
		BookOpenVariant,
		CalendarBlankOutline,
		ChevronRight,
		CnBuildiqEditButton,
		CnRoadmapTab,
		CnStatusBadge,
		DotsHorizontal,
		NcActionButton,
		NcActionLink,
		NcActions,
		NcButton,
		NcNoteCard,
		Plus,
		RoadVariant,
	},

	inject: {
		/** The app's translate function, provided by CnAppRoot. Identity outside one. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The features: `{ slug, title, summary, status, category, expected, docsUrl, title_<lang>, summary_<lang> }`. */
		features: { type: Array, default: () => [] },
		/** Category key to caption; sets the order of the groups. */
		categories: { type: Object, default: () => ({}) },
		/** `cards`: a section per category with two-up feature cards. `rows`: one card per category with a row per feature. */
		layout: {
			type: String,
			default: 'cards',
			validator: (value) => ['cards', 'rows'].includes(value),
		},

		/** Show the Features and Roadmap folder tabs. */
		tabs: { type: Boolean, default: true },
		/** Show the Actions menu (suggest, buildiq, AI skills, support), in the header or the tab row; false draws none. */
		actionsMenu: { type: Boolean, default: true },
		/** `chips`: pill buttons with a count. `segmented`: a segmented control without counts. */
		filter: {
			type: String,
			default: 'chips',
			validator: (value) => ['chips', 'segmented'].includes(value),
		},

		/** The status filter's accessible name, through the host translate (DqFunctionaliteiten "Toon"); empty: "Status". */
		filterLabel: { type: String, default: '' },
		/** Overrides of the status labels, by key (`all`, `available`, `beta`, `in_progress`, `planned`). */
		statusLabels: { type: Object, default: () => ({}) },
		/** Overrides of the status tones, by key, as CnStatusBadge variants (DqFunctionaliteiten: `{ planned: 'default' }`). */
		statusVariants: { type: Object, default: () => ({}) },
		/** How many issues the Next card lists; 0 hides the card. */
		next: { type: Number, default: 3 },
		/** Forge label to issue status (`in_progress`, `planned`) for the badges in the Next card. */
		issueLabels: { type: Object, default: () => ({}) },
		/** `<owner>/<repo>` on the forge, for the Roadmap tab and the Next card. */
		repo: { type: String, default: '' },
		/** Page title. */
		title: { type: String, default: '' },
		/** Subtitle template; `{count}` is the number of features and `{appVersion}` the app version. */
		subtitle: { type: String, default: '' },
		/** The app version, for `{appVersion}` in the subtitle. */
		appVersion: { type: String, default: '' },
		/** An info notice under the groups. */
		notice: { type: String, default: '' },
		/** The app's documentation site: the Next card's link and the target of "Learn more". */
		documentationUrl: { type: String, default: '' },
		/** Show a Documentation button in the header. */
		documentationButton: { type: Boolean, default: false },
		/** The feature-request form; the header's primary button. */
		suggestUrl: { type: String, default: '' },
		/** Show the feature-request form as the header's primary button; without it, it is an entry in the Actions menu. */
		suggestButton: { type: Boolean, default: true },
		/** In the `rows` layout, draw each feature's summary under its title; false shows the title and status only. */
		summaries: { type: Boolean, default: true },
		/** A link inside the notice: `{ text, href }`; the first occurrence of `text` in the translated notice opens `href` in a new tab. Only http(s) and site-relative hrefs link. */
		noticeLink: { type: Object, default: null },
		/** Target of the OpenBuilt entry in the Actions menu. */
		openbuiltUrl: { type: String, default: '' },
		/** Target of the AI skills entry in the Actions menu. */
		llmSkillsUrl: { type: String, default: '' },
	},

	emits: ['support'],

	data() {
		featuresBoardUid += 1
		return {
			uid: `cn-features-board-${featuresBoardUid}`,
			activeTab: 'features',
			status: 'all',
			issues: [],
			issuesLoading: false,
		}
	},

	computed: {
		language() {
			return readerLanguage()
		},

		/** The groups, their captions through the app's translate function. */
		groups() {
			return groupFeatures(this.features, this.categories, this.language)
				.map((group) => ({ ...group, label: group.label ? this.tr(group.label) : '' }))
		},

		allFeatures() {
			return this.groups.flatMap((group) => group.features)
		},

		counts() {
			return countByStatus(this.allFeatures)
		},

		/** The groups with the features the filter lets through; an emptied group is left out. */
		shownGroups() {
			return this.groups
				.map((group) => ({
					...group,
					shown: this.status === 'all' ? group.features : group.features.filter((feature) => feature.status === this.status),
				}))
				.filter((group) => group.shown.length > 0)
		},

		/** All, then each status; `in_progress` only when a feature has it. */
		filterOptions() {
			const options = [{ key: 'all', label: this.statusLabel('all'), count: this.counts.all }]
			for (const key of FEATURE_STATUSES) {
				if (key === 'in_progress' && this.counts.in_progress === 0) {
					continue
				}
				options.push({ key, label: this.statusLabel(key), count: this.counts[key] })
			}
			return options
		},

		tabList() {
			return [
				{ key: 'features', label: t('nextcloud-vue', 'Features') },
				{ key: 'roadmap', label: t('nextcloud-vue', 'Roadmap') },
			]
		},

		resolvedTitle() {
			return this.title ? this.tr(this.title) : t('nextcloud-vue', 'Features and roadmap')
		},

		/**
		 * The notice split around its link: the text before, the link and the
		 * text after. Without a usable `noticeLink` (no match in the
		 * translated notice, or an href that is not http(s) or site-relative)
		 * `before` is the whole notice.
		 *
		 * @return {{before: string, link: ({text: string, href: string}|null), after: string}} The parts.
		 */
		noticeParts() {
			const text = this.notice ? this.tr(this.notice) : ''
			const link = this.noticeLink
			const label = link && typeof link.text === 'string' ? this.tr(link.text) : ''
			const href = link && typeof link.href === 'string' ? link.href.trim() : ''
			const index = label ? text.indexOf(label) : -1
			const allowed = (/^https?:\/\//i.test(href) || href.startsWith('/')) && safeHref(href) === href
			if (index === -1 || !allowed) {
				return { before: text, link: null, after: '' }
			}
			return { before: text.slice(0, index), link: { text: label, href }, after: text.slice(index + label.length) }
		},

		resolvedSubtitle() {
			if (!this.subtitle) {
				return ''
			}
			return this.tr(this.subtitle)
				.replace(/\{count\}/g, String(this.counts.all))
				.replace(/\{appVersion\}/g, this.appVersion)
		},

		menuLinks() {
			const links = []
			if (this.suggestUrl && !this.suggestButton) {
				links.push({ key: 'suggest', href: this.suggestUrl, label: t('nextcloud-vue', 'Suggest feature') })
			}
			if (this.openbuiltUrl) {
				links.push({ key: 'openbuilt', href: this.openbuiltUrl, label: t('nextcloud-vue', 'Build on this app') })
			}
			if (this.llmSkillsUrl) {
				links.push({ key: 'llm', href: this.llmSkillsUrl, label: t('nextcloud-vue', 'AI skills') })
			}
			return links
		},

		nextIssues() {
			return this.issues.slice(0, this.next).map((issue) => ({
				number: issue.number,
				title: issue.title,
				html_url: issue.html_url,
				status: issueStatus(issue, this.issueLabels),
				opened: issue.created_at ? formatBoardDate(issue.created_at) : '',
			}))
		},
	},

	mounted() {
		if (this.next > 0 && this.repo) {
			this.loadIssues()
		}
	},

	methods: {
		t,
		safeHref,

		/**
		 * Run an app-supplied string through the app's translate function.
		 *
		 * @param {string} key The string.
		 * @return {string} The translated string.
		 */
		tr(key) {
			return this.cnTranslate(key)
		},

		/**
		 * The label of a status, or of `all`: the app's override, else the library's.
		 *
		 * @param {string} key The status key.
		 * @return {string} The label.
		 */
		statusLabel(key) {
			if (typeof this.statusLabels[key] === 'string' && this.statusLabels[key] !== '') {
				return this.tr(this.statusLabels[key])
			}
			return {
				all: t('nextcloud-vue', 'All'),
				available: t('nextcloud-vue', 'Available'),
				beta: t('nextcloud-vue', 'Beta'),
				in_progress: t('nextcloud-vue', 'In progress'),
				planned: t('nextcloud-vue', 'Planned'),
			}[key] || key
		},

		/**
		 * The badge text of a feature: its status, with the expected moment
		 * when it has one ("Planned, Q4 2026").
		 *
		 * @param {{status: string, expected: string}} feature The feature.
		 * @return {string} The badge text.
		 */
		statusText(feature) {
			const label = this.statusLabel(feature.status)
			return feature.expected ? t('nextcloud-vue', '{status}, {expected}', { status: label, expected: feature.expected }) : label
		},

		/**
		 * The badge variant of a status.
		 *
		 * @param {string} status The status key.
		 * @return {string} The CnStatusBadge variant.
		 */
		variantOf(status) {
			return this.statusVariants[status] || FEATURE_STATUS_VARIANTS[status] || 'default'
		},

		/**
		 * "14 features, 14 available": the group's size, then each status it holds.
		 *
		 * @param {{features: Array<{status: string}>}} group The group.
		 * @return {string} The caption.
		 */
		groupCaption(group) {
			const counts = countByStatus(group.features)
			const parts = [n('nextcloud-vue', '%n feature', '%n features', counts.all)]
			for (const key of FEATURE_STATUSES) {
				if (counts[key] > 0) {
					parts.push(`${counts[key]} ${this.statusLabel(key).toLocaleLowerCase()}`)
				}
			}
			return parts.join(', ')
		},

		/**
		 * Where "Learn more" goes: the feature's own page when it is a web
		 * address, else the documentation site, else nowhere.
		 *
		 * @param {{docsUrl: string}} feature The feature.
		 * @return {string} The address, or ''.
		 */
		readMoreHref(feature) {
			if (/^https?:\/\//i.test(feature.docsUrl)) {
				return safeHref(feature.docsUrl)
			}
			return this.documentationUrl ? safeHref(this.documentationUrl) : ''
		},

		/** Ask the host to open the support dialog. */
		onSupport() {
			/**
			 * @event support Emitted when the reader picks "Support this app" in the Actions menu.
			 */
			this.$emit('support')
		},

		/** Fetch the forge issues for the Next card. */
		async loadIssues() {
			this.issuesLoading = true
			const { items } = await fetchRoadmapIssues(this.repo)
			this.issues = items
			this.issuesLoading = false
		},

		/**
		 * Arrow keys, Home and End move between the folder tabs.
		 *
		 * @param {KeyboardEvent} event The key press.
		 */
		onTabKeydown(event) {
			const keys = this.tabList.map((tab) => tab.key)
			const index = keys.indexOf(this.activeTab)
			const target = {
				ArrowRight: (index + 1) % keys.length,
				ArrowLeft: (index - 1 + keys.length) % keys.length,
				Home: 0,
				End: keys.length - 1,
			}[event.key]
			if (target === undefined) {
				return
			}
			event.preventDefault()
			this.activeTab = keys[target]
			this.$nextTick(() => this.$refs.tabButtons?.[target]?.focus())
		},
	},
}
</script>

<style scoped>
.cn-features-board {
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: var(--cn-board-section-gap, 20px);
	padding: var(--cn-board-content-padding, 24px 28px);
	max-width: 1240px;
	width: 100%;
}

.cn-features-board__header {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 4px 0 8px;
}

.cn-features-board__title-row {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: flex-start;
	gap: 12px 24px;
}

.cn-features-board__title {
	flex: 1 1 320px;
	min-width: 0;
	margin: 0;
	font-size: 28px;
	font-weight: 700;
	line-height: 1.2;
}

.cn-features-board__header-actions {
	flex: none;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

/* The board's meta line: 14px muted, also under a theme that sets every <p>
   through the paragraph tokens with !important. */
.cn-features-board__subtitle {
	--nldesign-color-on-surface: var(--color-text-maxcontrast);
	--nldesign-component-paragraph-font-size: 14px;
	--nldesign-component-paragraph-color: var(--color-text-maxcontrast);
	margin: 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-features-board__tab-row {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	margin-bottom: calc(-1 * var(--cn-board-section-gap, 20px));
}

.cn-features-board__tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-features-board__tab {
	display: inline-flex;
	align-items: center;
	box-sizing: border-box;
	min-height: 34px;
	margin: 0 0 -1px;
	padding: 8px 12px;
	border: 1px solid var(--cn-board-hairline, var(--color-border));
	border-bottom: none;
	border-radius: 8px 8px 0 0;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 14px;
	font-weight: 400;
	cursor: pointer;
	white-space: nowrap;
}

.cn-features-board__tab--active {
	position: relative;
	background: var(--color-main-background);
	border-bottom: 1px solid var(--color-main-background);
	font-weight: 700;
}

.cn-features-board__tab-actions {
	flex: none;
	align-self: flex-start;
	margin: 0 8px 8px 0;
}

.cn-features-board__panel {
	display: flex;
	flex-direction: column;
	gap: 22px;
}

.cn-features-board__panel--tabbed {
	padding: 22px;
	border: 1px solid var(--color-border);
	border-radius: 0 var(--cn-board-card-radius, 12px) var(--cn-board-card-radius, 12px) var(--cn-board-card-radius, 12px);
	background: var(--color-main-background);
}

.cn-features-board__filter {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-features-board__filter-option {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
}

.cn-features-board__filter--chips .cn-features-board__filter-option {
	height: 36px;
	padding: 0 14px;
	border: 1px solid var(--color-border-dark);
	border-radius: 18px;
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-features-board__filter--chips .cn-features-board__filter-option--active {
	border-color: var(--color-main-text);
	background: var(--color-main-text);
	color: var(--color-main-background);
}

.cn-features-board__filter-count {
	font-weight: 400;
	color: var(--color-text-maxcontrast);
}

.cn-features-board__filter--chips .cn-features-board__filter-option--active .cn-features-board__filter-count {
	color: var(--color-border-dark);
}

.cn-features-board__filter--segmented {
	display: inline-flex;
	align-self: flex-start;
	gap: 2px;
	padding: 3px;
	border-radius: 8px;
	background: var(--color-background-dark);
}

/* `margin: 0`: Nextcloud's core sheet gives every plain button a 3px margin,
   which set the options 5px apart instead of the board's 2px. An option at
   rest is in the board's softer ink, the open one in the main ink. */
.cn-features-board__filter--segmented .cn-features-board__filter-option {
	height: 34px;
	margin: 0;
	padding: 0 14px;
	border: 0;
	border-radius: 6px;
	background: transparent;
	color: var(--cn-board-text-soft, var(--color-main-text));
}

.cn-features-board__filter--segmented .cn-features-board__filter-option--active {
	color: var(--color-main-text);
	background: var(--color-main-background);
	box-shadow: 0 1px 2px rgba(27, 28, 29, 0.12);
}

.cn-features-board__body {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 24px;
}

.cn-features-board__groups {
	flex: 999 1 520px;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 26px;
}

.cn-features-board__groups--rows {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
	gap: 20px;
}

.cn-features-board__group {
	display: flex;
	flex-direction: column;
	gap: 12px;
	max-width: none;
	margin: 0;
}

.cn-features-board__groups--rows .cn-features-board__group {
	padding: var(--cn-board-card-padding, 20px 22px);
	border: 1px solid var(--color-border);
	border-radius: var(--cn-board-card-radius, 12px);
	background: var(--color-main-background);
}

.cn-features-board__group-head {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 10px;
}

.cn-features-board__group-title {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.cn-features-board__groups--rows .cn-features-board__group-title {
	font-size: 17px;
	line-height: normal;
}

.cn-features-board__group-caption {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-features-board__cards {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 16px;
}

.cn-features-board__card {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 18px;
	border: 1px solid var(--color-border);
	border-radius: var(--cn-board-card-radius, 12px);
	background: var(--color-main-background);
}

.cn-features-board__card-head {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
}

.cn-features-board__card-title {
	margin: 0;
	font-size: 17px;
	font-weight: 700;
	line-height: 1.3;
}

.cn-features-board__card-summary {
	margin: 0;
	font-size: 14px;
	color: var(--color-main-text);
}

.cn-features-board__card-footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	min-height: 34px;
	margin-top: auto;
	padding-top: 10px;
	border-top: 1px solid var(--color-background-dark);
}

.cn-features-board__read-more {
	display: inline-flex;
	align-items: center;
	height: 34px;
	padding: 0 12px;
	border: 1px solid var(--color-border-dark);
	border-radius: 8px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 14px;
	font-weight: 600;
	text-decoration: none;
}

.cn-features-board__rows {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-features-board__row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 16px;
	padding: 10px 0;
	border-top: 1px solid var(--color-background-dark);
}

.cn-features-board__row-text {
	flex: 1 1 240px;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-features-board__row-title {
	font-size: 15px;
	font-weight: 500;
}

.cn-features-board__row-summary {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-features-board__next {
	flex: 1 1 280px;
	min-width: 0;
	max-width: 340px;
}

.cn-features-board__next-card {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 18px;
	border: 1px solid var(--color-border);
	border-radius: var(--cn-board-card-radius, 12px);
	background: var(--color-background-hover);
}

.cn-features-board__next-head {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-features-board__next-title {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.cn-features-board__next-lead {
	margin: 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-features-board__next-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-features-board__next-item {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 12px 14px;
	border: 1px solid var(--color-border);
	border-radius: 10px;
	background: var(--color-main-background);
}

.cn-features-board__next-link {
	font-size: 15px;
	font-weight: 600;
	line-height: 1.3;
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-features-board__next-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-features-board__next-opened {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.cn-features-board__next-more {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 14px;
	font-weight: 600;
}

.cn-features-board__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-features-board__notice {
	margin: 0;
}
</style>

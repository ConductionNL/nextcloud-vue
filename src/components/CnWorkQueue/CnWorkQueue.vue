<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-work-queue" data-testid="cn-work-queue">
		<div v-if="title || $slots.actions" class="cn-work-queue__head">
			<h2 v-if="title" class="cn-work-queue__title">
				{{ title }}
			</h2>
			<div class="cn-work-queue__actions">
				<!-- @slot Buttons beside the title ("Plan an item"). -->
				<slot name="actions" />
			</div>
		</div>

		<NcNoteCard v-for="source in unavailable"
			:key="source.source"
			type="warning"
			:data-testid="`cn-work-queue-unavailable-${source.source}`">
			{{ t('nextcloud-vue', '{source} could not be read, so this list is incomplete.', { source: source.label || source.source }) }}
		</NcNoteCard>

		<NcLoadingIcon v-if="loading" :size="32" />
		<NcEmptyContent v-else-if="error"
			:name="t('nextcloud-vue', 'This queue could not be read')"
			:description="error"
			data-testid="cn-work-queue-error">
			<template #action>
				<NcButton @click="load">
					{{ t('nextcloud-vue', 'Try again') }}
				</NcButton>
			</template>
		</NcEmptyContent>
		<template v-else>
			<p v-if="shownGroups.length === 0" class="cn-work-queue__muted" data-testid="cn-work-queue-empty">
				{{ text(content.emptyText) || t('nextcloud-vue', 'Nothing is waiting on you.') }}
			</p>
			<section v-for="group in shownGroups"
				:key="group.key"
				class="cn-work-queue__group"
				:data-testid="`cn-work-queue-group-${group.key}`">
				<div class="cn-work-queue__group-head">
					<h3 class="cn-work-queue__group-title">
						{{ group.label }}
						<span class="cn-work-queue__count">{{ group.items.length }}</span>
					</h3>
					<NcButton v-if="content.hide"
						variant="secondary"
						:aria-label="t('nextcloud-vue', 'Hide this group until tomorrow')"
						:data-testid="`cn-work-queue-hide-${group.key}`"
						@click="setHidden(group.key, true)">
						{{ t('nextcloud-vue', 'Hide until tomorrow') }}
					</NcButton>
				</div>
				<p v-if="group.closesWhen" class="cn-work-queue__muted">
					{{ group.closesWhen }}
				</p>
				<ul class="cn-work-queue__items">
					<li v-for="item in group.items"
						:key="item.id"
						class="cn-work-queue__item"
						:class="{ 'cn-work-queue__item--late': item.deadlineTier === 'overdue' }"
						:data-testid="`cn-work-queue-item-${item.id}`">
						<span class="cn-work-queue__avatar" aria-hidden="true">{{ initials(item.title) }}</span>
						<span class="cn-work-queue__body">
							<a :href="hrefOf(item) || '#'" class="cn-work-queue__link" @click="onOpen(item, $event)">{{ item.title }}</a>
							<span v-if="item.covered || waitingText(item)" class="cn-work-queue__sub">
								<span v-if="item.covered">{{ t('nextcloud-vue', 'Covering for {person}', { person: String(item.coveredFor || '') }) }}</span>
								<span v-if="waitingText(item)" :data-testid="`cn-work-queue-waiting-${item.id}`">{{ waitingText(item) }}</span>
							</span>
						</span>
						<span v-if="item.dueAt" class="cn-work-queue__muted">{{ item.dueAt }}</span>
					</li>
				</ul>
			</section>
		</template>

		<section v-if="content.hide && hidden.length" class="cn-work-queue__group" data-testid="cn-work-queue-hidden">
			<h3 class="cn-work-queue__group-title">
				{{ t('nextcloud-vue', 'Hidden until tomorrow') }}
			</h3>
			<NcButton v-for="key in hidden"
				:key="key"
				variant="tertiary"
				:data-testid="`cn-work-queue-show-${key}`"
				@click="setHidden(key, false)">
				{{ t('nextcloud-vue', 'Show {group} again', { group: labelOf(key) }) }}
			</NcButton>
		</section>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { openRowTarget } from '../../utils/linkNavigation.js'

/**
 * CnWorkQueue — one list of everything waiting on the reader: tasks,
 * consultations, mentions, calendar items, work they cover for a colleague,
 * from as many sources as the server declares. The component names no
 * source: the server answers the groups (`key`, `label`, `closesWhen`,
 * `items`), so a new kind of work needs no change here. A source that could
 * not be read is named at the top rather than folded into "nothing is
 * waiting". A group can be hidden until tomorrow, through the server, so the
 * choice follows the reader to another device. dossiq's personal queue is
 * the first; pipelinq's queue has the same shape. It reads again on
 * `cn:page:refresh`, so work planned or closed in a dialog shows at once.
 *
 * `content`:
 * - `source`: an endpointSource answering `{ groups, hiddenGroups?, unavailable? }`.
 *   An item is `{ id, title, dueAt?, deadlineTier?, covered?, coveredFor?,
 *   waiting?: { on, days, chases }, route?, href? }`.
 * - `hide`, `show`: url templates with `{group}` that hide a group until
 *   tomorrow and show it again, each answering `{ hiddenGroups }`; without
 *   `hide` no group can be hidden.
 * - `itemHref`: a template filled from an item, when items carry no `route`/`href`.
 * - `waitingParties`: words for `waiting.on` (`{ applicant: "the applicant" }`).
 * - `emptyText`: through the host translate.
 */
export default {
	name: 'CnWorkQueue',

	components: { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The queue's configuration (see the component docs).
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The heading above the queue; none when empty. */
		title: {
			type: String,
			default: '',
		},
	},

	emits: ['open'],

	data() {
		return {
			loading: true,
			error: '',
			groups: [],
			hidden: [],
			unavailable: [],
		}
	},

	computed: {
		/**
		 * The groups not hidden today.
		 *
		 * @spec openspec/changes/work-queue/specs/work-queue/spec.md#requirement-one-queue-over-every-source
		 * @return {Array<object>}
		 */
		shownGroups() {
			const hidden = new Set(this.hidden.map(String))
			return this.groups.filter((group) => !hidden.has(String(group.key)))
		},
	},

	mounted() {
		subscribe('cn:page:refresh', this.load)
		this.load()
	},

	beforeUnmount() {
		unsubscribe('cn:page:refresh', this.load)
	},

	methods: {
		t,

		/**
		 * A config text through the host translate.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * Read the queue; a failed read is an error with a retry.
		 *
		 * @spec openspec/changes/work-queue/specs/work-queue/spec.md#requirement-one-queue-over-every-source
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = ''
			try {
				const data = (await fetchEndpointSource(this.content.source, {}, { fresh: true })) || {}
				this.groups = (Array.isArray(data.groups) ? data.groups : [])
					.filter((g) => g && g.key !== undefined)
					.map((g) => ({ ...g, items: Array.isArray(g.items) ? g.items : [] }))
				this.hidden = Array.isArray(data.hiddenGroups) ? data.hiddenGroups.map(String) : []
				this.unavailable = Array.isArray(data.unavailable) ? data.unavailable.filter((s) => s && s.source) : []
			} catch (failure) {
				const body = failure && failure.response && failure.response.data
				this.error = String((body && (body.message || body.error)) || (failure && failure.message) || failure)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Hide a group until tomorrow, or show it again, through the server.
		 *
		 * @spec openspec/changes/work-queue/specs/work-queue/spec.md#requirement-one-queue-over-every-source
		 * @param {string} key The group key.
		 * @param {boolean} hide Hide (true) or show (false).
		 * @return {Promise<void>}
		 */
		async setHidden(key, hide) {
			const template = hide ? this.content.hide : this.content.show
			if (!template) {
				return
			}
			try {
				const { data } = await axios.post(generateUrl(fillTemplate(template, { group: encodeURIComponent(key) })), {})
				this.hidden = Array.isArray(data && data.hiddenGroups) ? data.hiddenGroups.map(String) : this.hidden
			} catch {
				// The group stays as it was; the server decides.
			}
		},

		/**
		 * A group's label by key, for a hidden group.
		 *
		 * @param {string} key The key.
		 * @return {string}
		 */
		labelOf(key) {
			const group = this.groups.find((g) => String(g.key) === String(key))
			return group && group.label ? group.label : String(key)
		},

		/**
		 * An item's page as an href.
		 *
		 * @param {object} item The item.
		 * @return {string}
		 */
		hrefOf(item) {
			if (item.route && this.$router) {
				try {
					return this.$router.resolve(item.route).href
				} catch {
					return ''
				}
			}
			if (item.href) {
				return String(item.href)
			}
			return this.content.itemHref ? generateUrl(fillTemplate(this.content.itemHref, item)) : ''
		},

		/**
		 * Open an item: its route through the router, else its href like a link, else tell the host.
		 *
		 * @param {object} item The item.
		 * @param {MouseEvent} event The click.
		 */
		onOpen(item, event) {
			if (item.route && this.$router && event && !(event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1)) {
				event.preventDefault()
				this.$router.push(item.route).catch(() => {})
				return
			}
			const href = this.hrefOf(item)
			if (href) {
				if (event) {
					event.preventDefault()
				}
				openRowTarget(event, href)
				return
			}
			if (event) {
				event.preventDefault()
			}
			/** @event open An item without a route or href was opened. Payload: the item. */
			this.$emit('open', item)
		},

		/**
		 * Who the item waits on, for how long and how often chased.
		 *
		 * @param {object} item The item.
		 * @return {string}
		 */
		waitingText(item) {
			const waiting = item && item.waiting
			if (!waiting || typeof waiting !== 'object' || !waiting.on) {
				return ''
			}
			const parties = {
				applicant: t('nextcloud-vue', 'the applicant'),
				thirdParty: t('nextcloud-vue', 'a third party'),
				us: t('nextcloud-vue', 'us'),
			}
			const own = this.content.waitingParties && this.content.waitingParties[waiting.on]
			const party = own ? this.cnTranslate(own) : (parties[waiting.on] || String(waiting.on))
			const days = Number.isFinite(waiting.days) ? waiting.days : 0
			const chases = Number.isFinite(waiting.chases) ? waiting.chases : 0
			if (chases === 0) {
				return t('nextcloud-vue', 'Waiting on {party} for {days} days', { party, days })
			}
			if (chases === 1) {
				return t('nextcloud-vue', 'Waiting on {party} for {days} days, chased once', { party, days })
			}
			return t('nextcloud-vue', 'Waiting on {party} for {days} days, chased {chases} times', { party, days, chases })
		},

		/**
		 * Up to two initials of a title.
		 *
		 * @param {string} title The title.
		 * @return {string}
		 */
		initials(title) {
			return String(title ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
		},
	},
}
</script>

<style scoped>
.cn-work-queue {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.cn-work-queue__head,
.cn-work-queue__group-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.cn-work-queue__title {
	margin: 0;
	font-size: 28px;
	font-weight: 700;
}

.cn-work-queue__actions {
	display: flex;
	gap: 8px;
}

.cn-work-queue__group {
	padding: 20px 24px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background: var(--color-main-background);
}

.cn-work-queue__group-title {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.cn-work-queue__count {
	padding: 0 8px;
	border-radius: 10px;
	background: var(--color-background-dark);
	font-size: 12px;
	font-weight: 600;
}

.cn-work-queue__muted {
	margin: 4px 0 8px;
	color: var(--color-text-maxcontrast);
}

.cn-work-queue__items {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-work-queue__item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 12px 0;
	border-block-end: 1px solid var(--color-border);
}

.cn-work-queue__item:last-child {
	border-block-end: none;
}

.cn-work-queue__avatar {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 700;
}

.cn-work-queue__body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-width: 0;
}

.cn-work-queue__link {
	color: var(--color-main-text);
	font-weight: 700;
	text-decoration: none;
}

.cn-work-queue__link:hover {
	text-decoration: underline;
}

.cn-work-queue__item--late .cn-work-queue__link {
	color: var(--color-error);
}

.cn-work-queue__sub {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}
</style>

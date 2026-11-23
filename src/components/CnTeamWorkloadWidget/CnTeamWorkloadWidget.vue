<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="!(content.hideWhenEmpty && members.length === 0)" class="cn-team-workload" data-testid="cn-team-workload">
		<p v-if="loading && members.length === 0" class="cn-team-workload__state-line" role="status">
			{{ loadingLabel }}
		</p>
		<p v-else-if="members.length === 0" class="cn-team-workload__state-line">
			{{ emptyLabel }}
		</p>
		<ul v-else class="cn-team-workload__list">
			<li
				v-for="member in members"
				:key="member.id"
				class="cn-team-workload__member"
				data-testid="cn-team-workload-member">
				<component
					:is="content.rowRoute ? 'button' : 'div'"
					:type="content.rowRoute ? 'button' : null"
					class="cn-team-workload__row"
					:class="{ 'cn-team-workload__row--link': content.rowRoute }"
					data-testid="cn-team-workload-row"
					@click="content.rowRoute ? openMember(member.id) : null">
					<span class="cn-team-workload__avatar" aria-hidden="true">{{ member.initials }}</span>
					<span class="cn-team-workload__who">
						<strong class="cn-team-workload__name">{{ member.name }}</strong>
						<span
							class="cn-team-workload__state"
							:class="{ 'cn-team-workload__state--away': !member.available }">{{ member.line }}</span>
					</span>
					<span class="cn-team-workload__count">{{ member.countText }}</span>
				</component>
				<span class="cn-team-workload__bar" aria-hidden="true">
					<span
						class="cn-team-workload__bar-fill"
						:class="{ 'cn-team-workload__bar-fill--hot': member.hot }"
						:style="{ width: member.percent + '%' }" />
				</span>
			</li>
		</ul>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { fetchStatuses } from '../../utils/nextcloudDirectory.js'
import { readPath } from '../../utils/readPath.js'
import { userLocale } from '../../utils/userLocale.js'

/** The share of the capacity from which a load bar reads as full. */
const HOT_PERCENT = 90

/**
 * CnTeamWorkloadWidget: the `team-workload` widget ("Team vandaag" on board
 * DqTeamwachtrij). Each person of the team with their initials, name, an
 * availability line, their open count and a load bar; the card's header
 * note says how many are present ("4 of 5 present").
 *
 * The counts come from the app (`content.source`, an endpoint that answers a
 * row per person). The availability comes from Nextcloud's user status, read
 * on the client through the OCS user status API: the person's own message
 * with the time it ends ("In a meeting until 14:00"), else Available, Away or
 * Busy, and Absent today without a status. Present means any status but
 * offline.
 *
 * `content`:
 * - `source`: `{ url, responsePath?, userField?, nameField?, countField? }`;
 *   the url goes through `generateUrl`, the rows are read at `responsePath`
 *   (else the body), each with the user id at `userField` (default
 *   `userId`), the name at `nameField` (default `displayName`) and the count
 *   at `countField` (default `count`).
 * - `capacity`: the count at a full bar; without it the highest count is.
 * - `countLabel`: `{ one, other }` with `{count}`, through the app's
 *   translate; without it the count reads "{count} open".
 * - `emptyText`: shown without anyone to list.
 */
export default {
	name: 'CnTeamWorkloadWidget',

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The widget's content: `source`, `capacity`, `countLabel`, `emptyText`. */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['header'],

	data() {
		return {
			/** The rows the source answered. */
			rows: [],
			/** The user statuses by user id. */
			statuses: {},
			/** Whether the source is being read. */
			loading: false,
		}
	},

	computed: {
		/** @return {string} The signed-in user's id. */
		viewerId() {
			return String(getCurrentUser()?.uid || '')
		},

		/**
		 * The people to list, the viewer first and the rest by name, each with
		 * the line, count and bar to draw.
		 *
		 * @return {Array<object>} The members.
		 */
		members() {
			const source = this.content?.source || {}
			const userField = source.userField || 'userId'
			const nameField = source.nameField || 'displayName'
			const countField = source.countField || 'count'
			const people = this.rows
				.filter((row) => row && typeof row === 'object' && readPath(row, userField))
				.map((row) => {
					const id = String(readPath(row, userField))
					const name = String(readPath(row, nameField) || id)
					return { id, name, count: Number(readPath(row, countField)) || 0 }
				})
			const capacity = Number(this.content?.capacity) > 0
				? Number(this.content.capacity)
				: Math.max(1, ...people.map((p) => p.count))
			return people
				.sort((a, b) => (Number(b.id === this.viewerId) - Number(a.id === this.viewerId)) || a.name.localeCompare(b.name))
				.map((person) => {
					const status = this.statuses[person.id] || null
					const percent = Math.min(100, Math.round((person.count / capacity) * 100))
					return {
						...person,
						name: person.id === this.viewerId ? t('nextcloud-vue', '{name} (you)', { name: person.name }) : person.name,
						initials: initialsOf(person.name),
						line: this.lineOf(status),
						available: !!status && status.status === 'online',
						present: isPresent(status),
						countText: this.countText(person.count),
						percent,
						hot: percent >= HOT_PERCENT,
					}
				})
		},

		/** @return {string} The header note: how many of the team are present. */
		headerNote() {
			const total = this.members.length
			if (total === 0) {
				return ''
			}
			const present = this.members.filter((member) => member.present).length
			return t('nextcloud-vue', '{present} of {total} present', { present, total })
		},

		/** @return {string} What the card says while it reads. */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading…')
		},

		/** @return {string} What the card says without anyone to list. */
		emptyLabel() {
			return this.content?.emptyText ? this.cnTranslate(this.content.emptyText) : t('nextcloud-vue', 'No one in the team')
		},
	},

	watch: {
		headerNote: {
			immediate: true,
			handler(note) {
				/**
				 * @event header The card header's parts: `{ link, note, action, pill }`, the note being how many are present.
				 */
				this.$emit('header', { link: null, note, action: null, pill: null })
			},
		},

		'content.source': {
			deep: true,
			handler() {
				this.load()
			},
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		/**
		 * Read the counts and the user statuses. A failed read leaves the card
		 * empty; a failed status read leaves everyone without a status.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			const source = this.content?.source
			if (!source || typeof source.url !== 'string' || source.url === '') {
				this.rows = []
				return
			}
			this.loading = true
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const [answer, statuses] = await Promise.all([
					axios.get(generateUrl(source.url)),
					fetchStatuses(axios),
				])
				const body = answer && answer.data
				const rows = source.responsePath ? readPath(body, source.responsePath) : body
				this.rows = Array.isArray(rows) ? rows : []
				this.statuses = statuses || {}
			} catch {
				this.rows = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * The availability line of a user status.
		 *
		 * @param {object|null} status The user status, or null without one.
		 * @return {string} The line.
		 */
		lineOf(status) {
			if (!status) {
				return t('nextcloud-vue', 'Absent today')
			}
			const message = typeof status.message === 'string' ? status.message.trim() : ''
			if (message !== '') {
				const clearAt = Number(status.clearAt)
				if (!Number.isFinite(clearAt) || clearAt <= 0) {
					return message
				}
				const time = new Date(clearAt * 1000).toLocaleTimeString(userLocale() || undefined, { hour: '2-digit', minute: '2-digit' })
				return t('nextcloud-vue', '{message} until {time}', { message, time })
			}
			switch (status.status) {
				case 'online':
					return t('nextcloud-vue', 'Available')
				case 'away':
					return t('nextcloud-vue', 'Away')
				case 'dnd':
				case 'busy':
					return t('nextcloud-vue', 'Busy')
				default:
					return t('nextcloud-vue', 'Absent today')
			}
		},

		/**
		 * The count as words: the content's `countLabel`, else "{count} open".
		 *
		 * @param {number} count The open count.
		 * @return {string} The text.
		 */
		/**
		 * Open the route `content.rowRoute` names for one person. A string is a
		 * route name, given the person as `query[rowRouteParam]` (default
		 * `assignee`); an object is a route location whose `params` and
		 * `query` values may hold `{user}`.
		 *
		 * @param {string} userId The person's user id.
		 * @return {void}
		 */
		openMember(userId) {
			const location = routeForMember(this.content?.rowRoute, this.content?.rowRouteParam, userId)
			if (location && this.$router) {
				this.$router.push(location)
			}
		},

		countText(count) {
			const label = this.content?.countLabel
			if (label && typeof label === 'object' && typeof label.one === 'string' && typeof label.other === 'string') {
				return this.cnTranslate(count === 1 ? label.one : label.other).replace('{count}', String(count))
			}
			return n('nextcloud-vue', '{count} open', '{count} open', count, { count })
		},
	},
}

/**
 * Up to two initials of a name.
 *
 * @param {string} name The name.
 * @return {string} The initials, upper case.
 */
/**
 * The route location a person's row opens.
 *
 * @param {string|object} rowRoute A route name, or a location with `{user}` in its params or query.
 * @param {string} [param] The query key a route name receives the user id under.
 * @param {string} userId The person's user id.
 * @return {object|null} The location, or null without a usable route.
 */
export function routeForMember(rowRoute, param, userId) {
	if (typeof rowRoute === 'string' && rowRoute !== '') {
		return { name: rowRoute, query: { [param || 'assignee']: userId } }
	}
	if (!rowRoute || typeof rowRoute !== 'object' || !rowRoute.name) {
		return null
	}
	const fill = (values) => Object.fromEntries(Object.entries(values || {}).map(([key, value]) => [key, typeof value === 'string' ? value.replace('{user}', userId) : value]))
	return { ...rowRoute, params: fill(rowRoute.params), query: fill(rowRoute.query) }
}

function initialsOf(name) {
	const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
	if (parts.length === 0) {
		return ''
	}
	const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
	return (parts[0].charAt(0) + last).toUpperCase()
}

/**
 * Whether a person is at work today: any status but offline or invisible.
 *
 * @param {object|null} status The user status.
 * @return {boolean} True when present.
 */
function isPresent(status) {
	return !!status && status.status !== 'offline' && status.status !== 'invisible'
}
</script>

<style scoped>
.cn-team-workload__list {
	display: flex;
	flex-direction: column;
	gap: 14px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-team-workload__member {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-team-workload__row {
	display: flex;
	align-items: center;
	gap: 10px;
}

.cn-team-workload__row--link {
	width: 100%;
	margin: 0;
	padding: 2px 4px;
	border: none;
	border-radius: var(--border-radius-element, 8px);
	background: none;
	color: inherit;
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.cn-team-workload__row--link:hover {
	background: var(--color-background-hover);
}

.cn-team-workload__row--link:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-team-workload__avatar {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 12px;
	font-weight: 700;
}

.cn-team-workload__who {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.cn-team-workload__name {
	font-size: 14px;
}

.cn-team-workload__state {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-team-workload__state--away {
	color: var(--color-warning-text, var(--color-text-maxcontrast));
}

.cn-team-workload__count {
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
}

.cn-team-workload__bar {
	display: block;
	height: 6px;
	overflow: hidden;
	border-radius: 3px;
	background: var(--color-border);
}

.cn-team-workload__bar-fill {
	display: block;
	height: 100%;
	background: var(--color-primary-element);
}

.cn-team-workload__bar-fill--hot {
	background: var(--color-error);
}

.cn-team-workload__state-line {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>

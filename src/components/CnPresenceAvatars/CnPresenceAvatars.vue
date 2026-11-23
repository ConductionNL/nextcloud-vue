<!--
  SPDX-License-Identifier: EUPL-1.2
  Copyright (C) 2026 Conduction B.V.

  CnPresenceAvatars — who else has this record open.

  🔴 IT SHOWS NOTHING WHEN NOBODY IS THERE, which is almost always. A row of
  empty space above every detail page, on every record, to report a state most
  readers meet twice a week, is a row of the page spent on nothing. Silence is
  the correct rendering of "you are alone here".

  🔑 IT SAYS "SOMEBODY IS HERE", NOT "SOMEBODY IS TYPING". Presence is a
  heartbeat from an open page: it cannot tell reading from editing, and a label
  that implied it could would be read as a lock and trusted like one. The lock
  is `CnLockedBanner`, which sits beside this and means something else. This is
  the nudge that makes two people talk before the lock has to refuse anybody.

  🔑 THE OVERFLOW IS A COUNT, NOT A SCROLL. Eight avatars on a case is a case
  in a meeting, and the useful fact then is "eight people", not eight faces.
-->
<template>
	<div
		v-if="shown.length > 0"
		class="cn-presence"
		:aria-label="label"
		role="status"
		data-testid="cn-presence-avatars">
		<NcAvatar
			v-for="entry in shown"
			:key="entry.user"
			class="cn-presence__avatar"
			:user="entry.user"
			:size="size"
			:hideStatus="true"
			:tooltipMessage="tooltipFor(entry)"
			data-testid="cn-presence-avatar" />
		<span
			v-if="overflow > 0"
			class="cn-presence__overflow"
			data-testid="cn-presence-overflow">
			+{{ overflow }}
		</span>
		<span class="cn-presence__label">{{ label }}</span>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcAvatar } from '@nextcloud/vue'

export default {
	name: 'CnPresenceAvatars',

	components: { NcAvatar },

	props: {
		/**
		 * The other readers, as the presence endpoint answers them:
		 * `{ user, arrivedAt }`. The viewer is already left out.
		 */
		present: {
			type: Array,
			default: () => [],
		},

		/** How many faces before the rest become a count. */
		max: {
			type: Number,
			default: 5,
		},

		/** Avatar size in pixels. */
		size: {
			type: Number,
			default: 24,
		},
	},

	computed: {
		/**
		 * The readers who get a face.
		 *
		 * @return {Array<object>} The avatars to draw.
		 */
		shown() {
			return this.present.slice(0, this.max)
		},

		/**
		 * How many readers are behind the count.
		 *
		 * @return {number} The overflow.
		 */
		overflow() {
			return Math.max(0, this.present.length - this.max)
		},

		/**
		 * What this row says, in one sentence.
		 *
		 * Named rather than counted when there are few enough to name: "Bram is
		 * also here" is something a reader acts on, and "1 other person is
		 * here" is something they have to go and find out about.
		 *
		 * @return {string} The sentence.
		 */
		label() {
			if (this.present.length === 0) {
				return ''
			}

			if (this.present.length === 1) {
				return t('nextcloud-vue', '{user} also has this open', {
					user: this.present[0]?.user ?? '',
				})
			}

			return t('nextcloud-vue', '{count} others also have this open', {
				count: this.present.length,
			})
		},
	},

	methods: {
		t,

		/**
		 * Who this is, and since when.
		 *
		 * The arrival time matters: somebody who opened the record an hour ago
		 * has probably left the tab open, and somebody who opened it ten
		 * seconds ago is working on it right now.
		 *
		 * @param {object} entry The presence row.
		 * @return {string} The tooltip.
		 */
		tooltipFor(entry) {
			const user = entry?.user ?? ''
			if (!entry?.arrivedAt) {
				return user
			}

			const since = new Date(entry.arrivedAt)
			if (Number.isNaN(since.getTime())) {
				return user
			}

			return t('nextcloud-vue', '{user}, since {time}', {
				user,
				time: since.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			})
		},
	},
}
</script>

<style scoped>
.cn-presence {
	display: flex;
	align-items: center;
	gap: 4px;
}

.cn-presence__avatar + .cn-presence__avatar {
	margin-inline-start: -8px;
}

.cn-presence__overflow,
.cn-presence__label {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-presence__label {
	margin-inline-start: 4px;
}
</style>

<!--
  CnLockIndicator — the padlock that says a record in a list is locked.

  🔴 THIS EXISTS BECAUSE A LOCK WAS INVISIBLE UNTIL YOU OPENED THE RECORD.
  `CnLockedBanner` has told people about a lock on the DETAIL page for as long
  as locks have existed, but nothing said so in a card grid, a table or a list —
  so the way you learned a record was locked was to open it, start editing, and
  be refused. In a queue of forty cases that is forty clicks to find out which
  three you cannot touch.

  One component for all three surfaces on purpose. The rule it encodes — an
  expired lock is not a lock, and your own lock is not somebody else's — is
  exactly the kind of thing that gets re-implemented slightly differently per
  surface until the padlock stops meaning anything.

  Non-blocking by design: the row still opens. Whether an edit is allowed is the
  detail page's answer to give, with its reasons; a list that refuses the click
  can only say no.
-->
<template>
	<span
		v-if="state.locked"
		class="cn-lock-indicator"
		:class="toneClass"
		:title="label"
		:aria-label="label"
		role="img"
		data-testid="cn-lock-indicator">
		<component :is="iconComponent" :size="size" />
		<span v-if="showLabel" class="cn-lock-indicator__text">{{ shortLabel }}</span>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import LockAlertOutline from 'vue-material-design-icons/LockAlertOutline.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import { resolveObjectLock } from '../../utils/objectLock.js'

/**
 * CnLockIndicator — Padlock badge for a locked record in a list.
 *
 * Renders nothing at all when the record is not locked, so it is safe to place
 * unconditionally in a row template. A lock held by someone else reads in the
 * warning colour and names the holder; a lock the viewer holds themselves reads
 * neutral, because it is not an obstacle to them.
 *
 * ```vue
 * <CnLockIndicator :object="row" />
 * ```
 */
export default {
	name: 'CnLockIndicator',

	components: {
		LockAlertOutline,
		LockOutline,
	},

	props: {
		/**
		 * The record to inspect. Read directly — no store, no request — so a
		 * grid of many rows costs nothing per row. Accepts both the `@self`
		 * envelope and a flattened record.
		 *
		 * @type {object|null}
		 */
		object: {
			type: Object,
			default: null,
		},

		/**
		 * Icon size in pixels.
		 *
		 * @type {number}
		 */
		size: {
			type: Number,
			default: 16,
		},

		/**
		 * Whether to print a short word beside the padlock. Off by default: in
		 * a dense table the icon plus its tooltip carries the meaning, and a
		 * repeated word costs a column's worth of width.
		 *
		 * @type {boolean}
		 */
		showLabel: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/** The resolved lock state, computed once per render. */
		state() {
			return resolveObjectLock(this.object)
		},

		/** Tone modifier: somebody else's lock warns, your own does not. */
		toneClass() {
			if (this.state.byMe) {
				return 'cn-lock-indicator--mine'
			}

			return 'cn-lock-indicator--other'
		},

		/** A plain padlock for your own lock, an alerting one for somebody else's. */
		iconComponent() {
			if (this.state.byMe) {
				return 'LockOutline'
			}

			return 'LockAlertOutline'
		},

		/**
		 * The tooltip and accessible name — the full sentence, because a bare
		 * padlock in a list does not say who is holding it, and "who" is the
		 * only thing that tells you whether to go and ask them.
		 */
		label() {
			if (this.state.byMe) {
				return t('nextcloud-vue', 'Locked by you')
			}

			if (this.state.holder) {
				return t('nextcloud-vue', 'Locked by {user}', { user: this.state.holder })
			}

			return t('nextcloud-vue', 'Locked by another user')
		},

		/** The optional inline word, kept short enough for a table cell. */
		shortLabel() {
			if (this.state.byMe) {
				return t('nextcloud-vue', 'Yours')
			}

			return t('nextcloud-vue', 'Locked')
		},
	},
}
</script>

<style scoped>
.cn-lock-indicator {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	vertical-align: middle;
	flex-shrink: 0;
}

.cn-lock-indicator--other {
	color: var(--color-warning-text, var(--color-warning, #e9a300));
}

.cn-lock-indicator--mine {
	color: var(--color-text-maxcontrast, #767676);
}

.cn-lock-indicator__text {
	font-size: 0.85em;
	white-space: nowrap;
}
</style>

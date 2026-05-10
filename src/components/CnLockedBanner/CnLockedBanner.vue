<!--
  CnLockedBanner — Inline notice that the current object is locked.

  Mounted by CnDetailPage / CnObjectSidebar when `locked && !lockedByMe`
  to inform the user that another session holds the pessimistic lock,
  and to suppress the Edit toggle until the lock is released.

  Presentation-only; lock state is managed by `useObjectLock`. Pass
  `lockedBy` and (optionally) `expiresAt` from the composable's refs.
-->
<template>
	<div
		class="cn-locked-banner"
		role="status"
		aria-live="polite">
		<LockOutline :size="20" class="cn-locked-banner__icon" />
		<div class="cn-locked-banner__body">
			<p class="cn-locked-banner__message">
				{{ message }}
			</p>
			<p
				v-if="expiresLabel"
				class="cn-locked-banner__sub">
				{{ expiresLabel }}
			</p>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'

/**
 * CnLockedBanner — Object-locked notice strip.
 *
 * Renders a one-line notice with the locking user's display name
 * and the lock expiry. Used by CnDetailPage and CnObjectSidebar to
 * surface the result of a `useObjectLock`-detected remote lock.
 */
export default {
	name: 'CnLockedBanner',

	components: { LockOutline },

	props: {
		/**
		 * Display name (or username) of the user holding the lock.
		 * Comes from `useObjectLock().lockedBy`.
		 *
		 * @type {string}
		 */
		lockedBy: {
			type: String,
			default: '',
		},

		/**
		 * Lock expiration as a Date instance. Comes from
		 * `useObjectLock().expiresAt`. When omitted, the
		 * "expires in N min" sub-line is suppressed.
		 *
		 * @type {Date|null}
		 */
		expiresAt: {
			type: Date,
			default: null,
		},

		/**
		 * Override the rendered message. Useful for custom
		 * branding / tone. The default is
		 * `t('nextcloud-vue', 'Locked by {user}')`.
		 *
		 * @type {string}
		 */
		message: {
			type: String,
			default() {
				return t('nextcloud-vue', 'Locked by {user}', { user: this.lockedBy || '?' })
			},
		},
	},

	computed: {
		/**
		 * Sub-line: "expires in N min" / "expires in less than a minute"
		 * / "lock has expired" — derived from `expiresAt`. Returns an
		 * empty string when no `expiresAt` is set.
		 */
		expiresLabel() {
			if (!this.expiresAt) return ''
			const ms = this.expiresAt.getTime() - Date.now()
			if (ms <= 0) return t('nextcloud-vue', 'Lock has expired')
			const min = Math.round(ms / 60000)
			if (min < 1) return t('nextcloud-vue', 'Expires in less than a minute')
			return t('nextcloud-vue', 'Expires in {min} min', { min })
		},
	},
}
</script>

<style scoped>
.cn-locked-banner {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 12px 16px;
	border-radius: var(--border-radius-large, 8px);
	background-color: var(--color-warning-hover, rgba(233, 163, 0, 0.15));
	border: 1px solid var(--color-warning, #e9a300);
	margin-bottom: 16px;
}

.cn-locked-banner__icon {
	color: var(--color-warning, #e9a300);
	flex-shrink: 0;
	margin-top: 2px;
}

.cn-locked-banner__body {
	flex: 1;
	min-width: 0;
}

.cn-locked-banner__message {
	margin: 0;
	font-weight: 600;
	color: var(--color-main-text, #222);
}

.cn-locked-banner__sub {
	margin: 4px 0 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast, #767676);
}
</style>

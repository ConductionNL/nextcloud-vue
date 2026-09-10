<!--
  CnLockedBanner — the card that says this object is locked, and by whom.

  Mounted by CnDetailPage / CnObjectSidebar directly under the page title, so
  the first thing a reader learns about a locked record is that it is locked —
  rather than finding out when a save is refused.

  Two tones, because the two situations are not the same problem:

    - locked by SOMEONE ELSE — an error card. You cannot edit this now, and
      nothing you do on this page will change that. Names the holder and when
      the lock lapses.
    - locked by YOU — a neutral card carrying an Unlock button. Nothing is
      wrong; you are simply holding a lock you may not remember taking, and
      the card is the only place in the UI that lets you hand it back.

  Presentation-only for the state itself; lock state is managed by
  `useObjectLock`. Pass `lockedBy`, `lockedByMe` and (optionally) `expiresAt`
  from the composable's refs, and wire `@unlock` to its `release()`.
-->
<template>
	<div
		class="cn-locked-banner"
		:class="toneClass"
		:role="lockedByMe ? 'status' : 'alert'"
		aria-live="polite"
		data-testid="cn-locked-banner">
		<component
			:is="iconComponent"
			:size="20"
			class="cn-locked-banner__icon" />
		<div class="cn-locked-banner__body">
			<p class="cn-locked-banner__message">
				{{ displayMessage }}
			</p>
			<p
				v-if="subLine"
				class="cn-locked-banner__sub">
				{{ subLine }}
			</p>
		</div>
		<!-- Only ever offered for a lock the current user holds. A lock held by
		     someone else is theirs to release; a Release button here would
		     either fail at the server or, worse, succeed and take the record out
		     from under whoever is editing it. -->
		<NcButton
			v-if="lockedByMe && showUnlock"
			class="cn-locked-banner__action"
			variant="secondary"
			:disabled="unlocking"
			data-testid="cn-locked-banner-unlock"
			@click="onUnlock">
			<template #icon>
				<NcLoadingIcon v-if="unlocking" :size="20" />
				<LockOpenVariantOutline v-else :size="20" />
			</template>
			{{ unlockLabel }}
		</NcButton>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import LockAlertOutline from 'vue-material-design-icons/LockAlertOutline.vue'
import LockOpenVariantOutline from 'vue-material-design-icons/LockOpenVariantOutline.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'

/**
 * CnLockedBanner — Object-locked card.
 *
 * Renders who holds the lock and when it lapses, in an error tone for a
 * remote lock and a neutral one for the viewer's own, where it also offers
 * to release it.
 *
 * ```vue
 * <CnLockedBanner
 *   v-if="lock.locked.value"
 *   :locked-by="lock.lockedBy.value"
 *   :locked-by-me="lock.lockedByMe.value"
 *   :expires-at="lock.expiresAt.value"
 *   @unlock="lock.release()" />
 * ```
 */
export default {
	name: 'CnLockedBanner',

	components: {
		LockAlertOutline,
		LockOpenVariantOutline,
		LockOutline,
		NcButton,
		NcLoadingIcon,
	},

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
		 * Whether the lock is held by the current user. Comes from
		 * `useObjectLock().lockedByMe`.
		 *
		 * Defaults to false, which is the safe reading: a host that does not
		 * pass it gets the error tone and no Unlock button, rather than
		 * offering to release a lock that belongs to someone else.
		 *
		 * @type {boolean}
		 */
		lockedByMe: {
			type: Boolean,
			default: false,
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
		 * Whether to offer the Unlock button on the viewer's own lock. Off
		 * switches it back to a plain notice — for a surface with no writer,
		 * such as a read-only preview.
		 *
		 * @type {boolean}
		 */
		showUnlock: {
			type: Boolean,
			default: true,
		},

		/**
		 * Whether a release is in flight. Bound by the host so the button can
		 * disable itself and spin while `release()` is awaited.
		 *
		 * @type {boolean}
		 */
		unlocking: {
			type: Boolean,
			default: false,
		},

		/**
		 * Override the rendered message. Useful for custom
		 * branding / tone. Left empty, the banner renders the default line
		 * for whichever of the two situations applies — see the
		 * `displayMessage` computed.
		 *
		 * @type {string}
		 */
		message: {
			type: String,
			default: '',
		},
	},

	emits: ['unlock'],

	computed: {
		/**
		 * Tone modifier. The error tone is the default because the default
		 * `lockedByMe` is false, and a lock whose holder the host did not
		 * report should read as somebody else's.
		 */
		toneClass() {
			if (this.lockedByMe) {
				return 'cn-locked-banner--mine'
			}

			return 'cn-locked-banner--other'
		},

		/**
		 * The icon for the tone: an alert lock for somebody else's lock, a
		 * plain one for the viewer's own.
		 */
		iconComponent() {
			if (this.lockedByMe) {
				return 'LockOutline'
			}

			return 'LockAlertOutline'
		},

		/**
		 * The message actually rendered: the `message` override when the
		 * consumer supplied one, otherwise the default line for this tone.
		 *
		 * This deliberately is NOT a prop `default()` factory. Vue 3 calls
		 * those with `this === null`, so `this.lockedBy` threw a TypeError
		 * and took the whole page down with it — and even setting that
		 * aside, prop defaults are resolved once and cached per instance,
		 * so a `lockedBy` that arrives asynchronously (it comes off a
		 * `useObjectLock()` ref) would never reach the text. A computed is
		 * both crash-free and reactive.
		 */
		displayMessage() {
			if (this.message) {
				return this.message
			}

			if (this.lockedByMe) {
				return t('nextcloud-vue', 'You are editing this. Others cannot change it until you unlock it.')
			}

			return t('nextcloud-vue', 'Locked by {user}. You cannot edit this until the lock is released.', {
				user: this.lockedBy || t('nextcloud-vue', 'another user'),
			})
		},

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

		/**
		 * The sub-line, kept as its own computed so the expiry wording stays
		 * in one place while the two tones can add to it later without the
		 * template growing a branch.
		 */
		subLine() {
			return this.expiresLabel
		},

		/** Label on the release button. */
		unlockLabel() {
			return t('nextcloud-vue', 'Unlock')
		},
	},

	methods: {
		/**
		 * Ask the host to release the lock.
		 *
		 * The component does not call `release()` itself: it holds no
		 * reference to the composable, and a component that released a lock
		 * on its own would do so without the host being able to refetch or
		 * re-enable its editors afterwards.
		 *
		 * @return {void}
		 */
		onUnlock() {
			/**
			 * @event unlock The viewer asked to release their own lock.
			 */
			this.$emit('unlock')
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
	margin-bottom: 16px;
}

.cn-locked-banner__icon {
	flex-shrink: 0;
	margin-top: 2px;
}

/*
 * Somebody else's lock. Error tone, not warning: for the viewer this is not a
 * caution about something that might go wrong, it is a refusal that already
 * applies — the record cannot be edited from this page at all.
 */
.cn-locked-banner--other {
	background-color: var(--color-error-hover, rgba(219, 80, 80, 0.15));
	border: 1px solid var(--color-error, #db5050);
}

.cn-locked-banner--other .cn-locked-banner__icon {
	color: var(--color-error, #db5050);
}

/*
 * The viewer's own lock. Nothing is wrong, so nothing shouts: a bordered
 * neutral card that carries the Unlock button.
 */
.cn-locked-banner--mine {
	background-color: var(--color-background-hover, #f5f5f5);
	border: 1px solid var(--color-border, #ededed);
}

.cn-locked-banner--mine .cn-locked-banner__icon {
	color: var(--color-text-maxcontrast, #767676);
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

.cn-locked-banner__action {
	flex-shrink: 0;
	align-self: center;
}
</style>

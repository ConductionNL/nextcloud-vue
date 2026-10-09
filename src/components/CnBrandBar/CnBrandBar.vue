<!--
  CnBrandBar — the brand block in Nextcloud's own header (screens-brand-block-top-bar).

  Draws the 237px brand block (emblem, organisation, app name, and a 1px
  divider at its end) at the START of `#header`, before the app menu, under the
  board look. CnAppRoot mounts it when a brand is declared and `#header` exists.

  `#header` is Nextcloud's and offers no extension point for apps, so this is
  the one place the library reaches into it, and it does so defensively:
    - it adds ONE node of its own (a host element) as the first child of the
      header, and teleports the block into it; it never moves, edits or removes
      a node Nextcloud drew;
    - it re-inserts its own host when Nextcloud re-renders the header (a
      MutationObserver on the header and its parent), never a second one;
    - with no `#header` it renders nothing and emits `unavailable`, so
      CnAppRoot lets the navigation draw the block instead.

  Sizes come from the board: `dossiq/DqKop`.
-->
<template>
	<Teleport v-if="host" :to="host">
		<div class="cn-brand-bar" data-testid="cn-brand-bar">
			<div class="cn-brand-bar__brand" data-testid="cn-brand-bar-brand">
				<!-- Decorative beside a name: the name already says whose app this is. -->
				<img
					v-if="typeof brand.emblem === 'string' && brand.emblem !== ''"
					class="cn-brand-bar__emblem"
					data-testid="cn-brand-bar-emblem"
					:src="brand.emblem"
					:alt="brand.name ? '' : brand.alt">
				<span
					v-else-if="brand.emblem === true"
					class="cn-brand-bar__emblem cn-brand-bar__emblem--theme"
					data-testid="cn-brand-bar-emblem"
					aria-hidden="true" />
				<img
					v-else-if="brand.logo"
					class="cn-brand-bar__emblem"
					:src="brand.logo"
					:alt="brand.name ? '' : brand.alt">
				<span v-if="brand.name || brand.caption" class="cn-brand-bar__text">
					<span v-if="brand.caption" class="cn-brand-bar__caption">{{ brand.caption }}</span>
					<strong v-if="brand.name" class="cn-brand-bar__name">{{ brand.name }}</strong>
				</span>
			</div>
			<span class="cn-brand-bar__divider" aria-hidden="true" />
		</div>
	</Teleport>
</template>

<script>
import { markRaw } from 'vue'

const HOST_CLASS = 'cn-brand-bar-host'

/**
 * The brand block in Nextcloud's header.
 *
 * @event unavailable Emitted when there is no `#header` to put the block in (or it disappears), so the host lets the navigation draw it.
 *
 * @spec openspec/changes/screens-brand-block-top-bar/specs/layout-components/spec.md#requirement-the-board-look-draws-the-brand-block-in-the-nextcloud-header
 */
export default {
	name: 'CnBrandBar',

	props: {
		/**
		 * The resolved brand: `{ logo, emblem, name, caption, alt }`. `emblem`
		 * is a URL, or `true` for the theme's `--nldesign-emblem-url`.
		 *
		 * @type {{logo?: string, emblem?: (string|boolean), name?: string, caption?: string, alt?: string}}
		 */
		brand: {
			type: Object,
			required: true,
		},
	},

	emits: ['unavailable'],

	data() {
		return { host: null, observer: null }
	},

	mounted() {
		this.attach()
	},

	beforeUnmount() {
		this.detach()
	},

	methods: {
		/**
		 * Insert the host as the first child of `#header` and watch the header.
		 * Emits `unavailable` when there is no header.
		 *
		 * @return {void}
		 */
		attach() {
			const header = document.getElementById('header')
			if (!header) {
				/**
				 * @event unavailable Emitted when there is no `#header` to put the block in.
				 */
				this.$emit('unavailable')
				return
			}
			this.host = markRaw(document.createElement('div'))
			this.host.className = HOST_CLASS
			header.insertBefore(this.host, header.firstChild)
			if (typeof MutationObserver === 'function') {
				this.observer = new MutationObserver(() => this.reattach())
				this.observer.observe(header, { childList: true })
				if (header.parentNode) {
					this.observer.observe(header.parentNode, { childList: true })
				}
			}
		},

		/**
		 * Put the same host back when Nextcloud re-rendered the header and took
		 * it out. Never creates a second host; when the header is gone for good
		 * it hands the block back to the navigation.
		 *
		 * @return {void}
		 */
		reattach() {
			if (!this.host) {
				return
			}
			const header = document.getElementById('header')
			if (!header) {
				this.$emit('unavailable')
				return
			}
			if (this.host.parentNode !== header) {
				header.insertBefore(this.host, header.firstChild)
				this.observer?.observe(header, { childList: true })
			}
		},

		/**
		 * Stop watching and remove only the host this component added.
		 *
		 * @return {void}
		 */
		detach() {
			this.observer?.disconnect()
			this.observer = null
			this.host?.remove()
			this.host = null
		},
	},
}
</script>

<style>
/* The host is one flex item at the start of Nextcloud's header. */
.cn-brand-bar-host {
	flex: none;
	display: flex;
	align-items: center;
	height: 100%;
	margin-inline-end: 12px;
}

.cn-brand-bar {
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: 12px;
	width: var(--cn-board-brand-width, 237px);
}

.cn-brand-bar__brand {
	flex: 1 1 0;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
	min-height: 48px;
	max-height: 100%;
	padding: 0 6px;
	border-radius: 8px;
	color: var(--color-background-plain-text, var(--color-main-text));
}

.cn-brand-bar__emblem {
	flex: none;
	height: var(--cn-nav-emblem-size, 34px);
	width: auto;
	object-fit: contain;
}

.cn-brand-bar__emblem--theme {
	display: inline-block;
	width: var(--cn-nav-emblem-size, 34px);
	background: var(--nldesign-emblem-url) center / contain no-repeat;
}

.cn-brand-bar__text {
	display: flex;
	flex-direction: column;
	line-height: 1.15;
	min-width: 0;
}

.cn-brand-bar__caption {
	font-size: 13px;
	white-space: nowrap;
	opacity: 0.8;
}

.cn-brand-bar__name {
	font-size: 18px;
	font-weight: 700;
	white-space: nowrap;
}

.cn-brand-bar__divider {
	flex: none;
	width: 1px;
	height: 28px;
	background: currentColor;
	opacity: 0.25;
	color: var(--color-background-plain-text, var(--color-main-text));
}
</style>

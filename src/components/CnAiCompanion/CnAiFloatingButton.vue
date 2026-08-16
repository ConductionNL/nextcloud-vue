<!--
  CnAiFloatingButton — Conduction-Cobalt hex FAB for the AI Chat Companion.

  Shape: pointy-top point-up hexagon (Conduction brand rule — never rotated, never flat-top).
  Background: solid Conduction Cobalt (#21468B); hover (#1a3670). No gradients (brand rule).
  NB: #4376FC is the DEPRECATED "Legacy" brand blue, not Cobalt — it reads as
  cloud/SaaS and fails AA for body text, which is exactly why Cobalt replaced it
  (identity.conduction.nl/colors). Do not reintroduce it here.
  Icon: Material Design "Creation" (the two-stars AI sparkles), rendered in white.
  Default position: bottom-right (right: 24px; bottom: 24px). Overridable via prop.
  Keyboard accessible (Tab + Enter/Space). Respects prefers-reduced-motion.
-->
<template>
	<!--
	  Use v-if (not v-show) because .cn-ai-floating-button sets
	  `display: flex !important` to override Nextcloud's default button
	  styles. v-show would set inline `style="display:none"` (without
	  !important), which !important defeats — leaving the FAB visible
	  on top of the chat panel and intercepting clicks on the Send
	  button. v-if removes the element from the DOM, so no overlap.
	-->
	<button
		v-if="visible"
		:class="[
			'cn-ai-floating-button',
			`cn-ai-floating-button--${position}`,
		]"
		:aria-label="cnTranslate('Open AI chat')"
		type="button"
		data-testid="cn-ai-fab"
		@click="$emit('click')">
		<span class="cn-ai-floating-button__hex">
			<!-- 40px inside a 72x84 hex — the glyph scales with the badge. The
			     hexagon's usable inner width at mid-height is ~62px, so 40px sits
			     clear of the clip-path on every side. -->
			<Creation :size="40" class="cn-ai-floating-button__icon" />
		</span>
	</button>
</template>

<script>
import Creation from 'vue-material-design-icons/Creation.vue'

export default {
	name: 'CnAiFloatingButton',

	components: {
		Creation,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Viewport corner at which to anchor the button.
		 * @type {'bottom-right'|'bottom-left'|'top-right'|'top-left'}
		 */
		position: {
			type: String,
			default: 'bottom-right',
			validator: (v) => ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(v),
		},
		/**
		 * Controls button visibility. Set to false when the chat panel is open
		 * so the FAB does not visually compete.
		 */
		visible: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['click'],
}
</script>

<style>
/* ⚠️ THE SELECTOR IS DOUBLED ON PURPOSE — `.x.x` is not a typo.
 *
 * `!important` is not enough here, and this was measured. Every app that bundles
 * this library also ships its CSS entry, which contains its own
 * `.cn-ai-floating-button { … !important }` block. On a Nextcloud page the
 * companion shares the DOM with those apps: on the Euro-Office editor the page
 * carried stylesheets injected by decidesk, openconnector, openregister and
 * spreed as well as hermiq. Between two rules of EQUAL specificity that are both
 * `!important`, the LAST one injected wins — and load order across four
 * independent apps is not something this component can control.
 *
 * Measured symptom: the hex rendered 52x60 (the old size) with the new 26x30
 * rule present and losing, because another app's copy of the library CSS was
 * injected later.
 *
 * Doubling the class raises specificity (0,2,0 vs 0,1,0) so this rule wins on
 * merit rather than on ordering, whichever app's stylesheet lands last. */
.cn-ai-floating-button.cn-ai-floating-button {
	/* !important blocks defeat NC's default button styles + the older
	   bundled CSS rule that webpack ships alongside this one. */
	position: fixed !important;
	z-index: 9000 !important;
	display: flex !important;
	align-items: center !important;
	justify-content: center !important;
	/* 72:84 ≈ √3:2 — the exact ratio that makes every side of the pointy-top
	   hexagon polygon below equal length. The RATIO is the part that must not
	   drift: change both numbers together or the hexagon stops being
	   equilateral while still rendering, which is the failure nobody notices.

	   ⚠️ THE SIZE IS LOAD-BEARING FOR THE WINDOW'S POINTER. CnAiChatPanel aims
	   its triangle at this hex by arithmetic (see the inset block below and
	   `--cn-ai-pointer-offset` there). Resize here without redoing that and the
	   arrow points at empty space. */
	width: 72px !important;
	height: 84px !important;
	/* ⚠️ min-height/min-width MUST be cleared, or `height` is a suggestion.
	   Nextcloud's own button styling sets `min-height: 34px`, which silently
	   won against an explicit `height` — measured: the hex rendered 26x34, the
	   right width and the wrong height, which is exactly the shape that breaks
	   the √3:2 hexagon while looking almost correct. */
	min-width: 0 !important;
	min-height: 0 !important;
	padding: 0 !important;
	margin: 0 !important;
	border: none !important;
	border-radius: 0 !important;
	background: transparent !important;
	box-shadow: none !important;
	color: #ffffff;
	cursor: pointer;
	transition: transform 0.15s ease, filter 0.15s ease;
}

/* The hex shape itself — equilateral pointy-top per Conduction brand rules.
   All six sides equal length only when the parent's width:height is √3:2 (set above).
   Doubled selector for the same reason as the block above: another consumer's
   copy of this library's CSS is `!important` too, and may be injected later. */
.cn-ai-floating-button__hex.cn-ai-floating-button__hex {
	display: flex !important;
	align-items: center !important;
	justify-content: center !important;
	width: 100% !important;
	height: 100% !important;
	background: #21468B !important; /* Conduction Cobalt — identity.conduction.nl/colors */
	clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%) !important;
	border-radius: 0 !important;
	filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25));
	transition: background 0.15s ease;
}

.cn-ai-floating-button__icon {
	color: #ffffff;
	line-height: 1;
}

.cn-ai-floating-button:hover .cn-ai-floating-button__hex,
.cn-ai-floating-button:focus-visible .cn-ai-floating-button__hex {
	background: #1a3670; /* Conduction Cobalt, darkened for hover */
}

.cn-ai-floating-button:hover,
.cn-ai-floating-button:focus-visible {
	transform: scale(1.08);
}

.cn-ai-floating-button:focus-visible {
	outline: none;
}

.cn-ai-floating-button:focus-visible .cn-ai-floating-button__hex {
	filter:
		drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25))
		drop-shadow(0 0 0 3px rgba(67, 118, 252, 0.5));
}

/* Position variants — the insets are DERIVED, not chosen.
 *
 * The hex's point must touch the tip of the window's pointer, so the two are
 * solved together:
 *
 *   vertical   window sits 108px up; its triangle hangs 12px below it, so the
 *              tip is at 108 - 12 = 96px. The hex is 84px tall, so its bottom
 *              must be at 96 - 84 = 12px for its point to meet that tip.
 *   horizontal the triangle's centre is 74px in (window inset 44 + pointer
 *              offset 19 + half of its 22px width). The hex is 72px wide, so its
 *              inset must be 74 - 36 = 38px for the two centres to line up.
 *
 * ⚠️ Change the hex size, the window inset, or `--cn-ai-pointer-offset` in
 * CnAiChatPanel, and all of these numbers move together. They are one geometry
 * expressed in two files.
 *
 * Selectors doubled for the same reason as the base rule above — a consumer's
 * bundled copy of this library's CSS carries the old 24px insets and may be
 * injected later. Measured: the hex sat at 24px with these rules present and
 * losing. */
.cn-ai-floating-button--bottom-right.cn-ai-floating-button--bottom-right {
	right: 38px !important;
	bottom: 12px !important;
}

.cn-ai-floating-button--bottom-left.cn-ai-floating-button--bottom-left {
	bottom: 12px !important;
	left: 38px !important;
}

.cn-ai-floating-button--top-right.cn-ai-floating-button--top-right {
	top: 12px !important;
	right: 38px !important;
}

.cn-ai-floating-button--top-left.cn-ai-floating-button--top-left {
	top: 12px !important;
	left: 38px !important;
}

/* Respect reduced-motion preference */
@media (prefers-reduced-motion: reduce) {
	.cn-ai-floating-button,
	.cn-ai-floating-button__hex {
		transition: none;
	}

	.cn-ai-floating-button:hover,
	.cn-ai-floating-button:focus-visible {
		transform: none;
	}
}
</style>

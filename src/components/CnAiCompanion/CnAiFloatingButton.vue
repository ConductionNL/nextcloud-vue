<!--
  CnAiFloatingButton — Conduction-Cobalt hex FAB for the AI Chat Companion.

  Shape: pointy-top point-up hexagon (Conduction brand rule — never rotated, never flat-top).
  Background: solid Conduction Cobalt (#4376fc); hover (#2e5ed9). No gradients (brand rule).
  Icon: Material Design "Creation" (the two-stars AI sparkles), rendered in white.
  Default position: bottom-right (right: 24px; bottom: 24px). Overridable via prop.
  Keyboard accessible (Tab + Enter/Space). Respects prefers-reduced-motion.
-->
<template>
	<button
		v-show="visible"
		class="cn-ai-floating-button"
		:class="[
			`cn-ai-floating-button--${position}`,
		]"
		:aria-label="cnTranslate('Open AI chat')"
		type="button"
		data-testid="cn-ai-fab"
		@click="$emit('click')">
		<span class="cn-ai-floating-button__hex">
			<Creation :size="26" class="cn-ai-floating-button__icon" />
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
		 *
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
.cn-ai-floating-button {
	/* !important blocks defeat NC's default button styles + the older
	   bundled CSS rule that webpack ships alongside this one. */
	position: fixed !important;
	z-index: 9000 !important;
	display: flex !important;
	align-items: center !important;
	justify-content: center !important;
	/* 52:60 ≈ √3:2 — the exact ratio that makes every side of the
	   pointy-top hexagon polygon below equal length. */
	width: 52px !important;
	height: 60px !important;
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
   All six sides equal length only when the parent's width:height is √3:2 (set above). */
.cn-ai-floating-button__hex {
	display: flex !important;
	align-items: center !important;
	justify-content: center !important;
	width: 100% !important;
	height: 100% !important;
	background: #4376fc !important; /* Conduction Cobalt — conduction.color.primary */
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
	background: #2e5ed9; /* Conduction Cobalt hover — conduction.color.primary-hover */
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

/* Position variants */
.cn-ai-floating-button--bottom-right {
	right: 24px;
	bottom: 24px;
}

.cn-ai-floating-button--bottom-left {
	bottom: 24px;
	left: 24px;
}

.cn-ai-floating-button--top-right {
	top: 24px;
	right: 24px;
}

.cn-ai-floating-button--top-left {
	top: 24px;
	left: 24px;
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

<!--
  CnBrandBar — the app's top bar under the board look (screens-brand-block-top-bar).

  Draws the 237px brand block at the start of the bar (emblem, organisation
  name, app name), a 1px divider, and a slot for the app's own bar content.
  CnAppRoot mounts it above the navigation and the content when the board look
  is on and a brand is declared; it is Nextcloud's `#header` that stays
  Nextcloud's, this bar is the app's own, inside NcContent.

  Sizes come from the board: `dossiq/DqKop`.
-->
<template>
	<div class="cn-brand-bar" data-testid="cn-brand-bar" role="presentation">
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
		<div class="cn-brand-bar__content">
			<!-- @slot default The app's own bar content after the divider (search, notifications, user menu). -->
			<slot />
		</div>
	</div>
</template>

<script>
/**
 * The brand bar.
 *
 * @spec openspec/changes/screens-brand-block-top-bar/specs/layout-components/spec.md#requirement-the-board-look-draws-the-brand-block-in-an-app-top-bar
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
}
</script>

<style>
.cn-brand-bar {
	position: absolute;
	inset: 0 0 auto 0;
	z-index: 1;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: var(--cn-board-topbar-height, 68px);
	padding: 0 20px 0 14px;
	background: var(--color-main-background);
	border-bottom: 1px solid var(--color-border);
}

.cn-brand-bar__brand {
	flex: none;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: 10px;
	width: var(--cn-board-brand-width, 237px);
	min-height: 48px;
	padding: 0 6px;
	border-radius: 8px;
	min-width: 0;
	color: var(--color-main-text);
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
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	white-space: nowrap;
}

.cn-brand-bar__name {
	color: var(--color-main-text);
	font-size: 18px;
	font-weight: 700;
	white-space: nowrap;
}

.cn-brand-bar__divider {
	flex: none;
	width: 1px;
	height: 28px;
	background: var(--color-border);
}

.cn-brand-bar__content {
	flex: 1 1 0;
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

/* The shell makes room for the bar: the navigation and the content start below it. */
.cn-app-root--brand-bar {
	position: relative;
	box-sizing: border-box;
	padding-top: var(--cn-board-topbar-height, 68px);
}
</style>

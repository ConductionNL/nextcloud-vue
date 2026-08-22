<template>
	<div
		:class="['cn-page-header', { 'cn-page-header--visually-hidden': visuallyHidden }]"
		data-testid="cn-page-header"
		:data-visually-hidden="visuallyHidden ? 'true' : null">
		<div v-if="!visuallyHidden && (icon || $slots.icon)" class="cn-page-header__icon">
			<slot name="icon">
				<CnIcon :name="icon" :size="iconSize" />
			</slot>
		</div>
		<div class="cn-page-header__text">
			<h1 class="cn-page-header__title" data-testid="cn-page-title">
				{{ resolvedTitle }}
			</h1>
			<p v-if="description && !visuallyHidden" class="cn-page-header__description" data-testid="cn-page-description">
				{{ resolvedDescription }}
			</p>
		</div>
		<slot v-if="!visuallyHidden" name="extra" />
	</div>
</template>

<script>
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnPageHeader — Reusable page header with optional icon, title, and description.
 *
 * ```vue
 * <CnPageHeader title="Clients" description="Manage your clients" icon="AccountGroup" />
 * ```
 *
 * ## `visuallyHidden` — the accessible-heading mode
 *
 * Several page primitives (CnIndexPage, CnSettingsPage, CnChatPage,
 * CnFilesPage, CnLogsPage) hide their inline header by default because the
 * design surfaces the page title in the app sidebar/navigation instead. That
 * sidebar heading lives OUTSIDE the `<main>` landmark, so suppressing the
 * header entirely left the main content region with no heading at all: a
 * screen-reader user gets no announcement of which list they are on, and a
 * "skip to main content" jump lands on an unlabelled region (WCAG 2.4.6
 * Headings and Labels, 1.3.1 Info and Relationships).
 *
 * `visuallyHidden` resolves that without a visual change: the `<h1>` stays in
 * the DOM and in the accessibility tree, clipped to a 1px box that is removed
 * from layout flow. The decorative icon, the description and the `extra` slot
 * are NOT rendered in this mode — the icon is decorative, and the `extra` slot
 * may contain focusable controls, which must never be clipped-but-tabbable.
 *
 * ```vue
 * <CnPageHeader :title="title" :visually-hidden="!showTitle" />
 * ```
 *
 * ## Translation
 *
 * `title` and `description` are manifest-authored English source strings. They
 * are rendered through the host translate function — the `translate` prop when
 * given, else the `cnTranslate` provided by CnAppRoot — so a page heading
 * follows the user's language. With no translator (or a catalogue that lacks
 * the key) the source string renders unchanged.
 */
export default {
	name: 'CnPageHeader',

	components: {
		CnIcon,
	},

	inject: {
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id).
		 * Defaults to an identity function so the component stays usable
		 * standalone and an untranslated key renders as itself.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Page title text */
		title: {
			type: String,
			required: true,
		},
		/** Optional description shown below the title */
		description: {
			type: String,
			default: '',
		},
		/** Optional MDI icon name (rendered via CnIcon) */
		icon: {
			type: String,
			default: '',
		},
		/** Icon size in pixels */
		iconSize: {
			type: Number,
			default: 28,
		},
		/**
		 * Render the `<h1>` for assistive technology only — clipped to a 1px
		 * box and removed from layout flow, so the page looks exactly as it
		 * does with no header at all while the main landmark still carries a
		 * heading. See the component docblock for the full rationale.
		 */
		visuallyHidden: {
			type: Boolean,
			default: false,
		},
		/**
		 * Translate function. Falls back to the injected `cnTranslate`,
		 * which itself defaults to an identity function.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	computed: {
		/**
		 * Effective translate function: the explicit `translate` prop when
		 * given, else the injected `cnTranslate` (identity by default).
		 *
		 * @return {(key: string) => string}
		 */
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},

		/**
		 * The page title run through the host translate function.
		 *
		 * @return {string}
		 */
		resolvedTitle() {
			return this.title ? this.effectiveTranslate(this.title) : this.title
		},

		/**
		 * The page description run through the host translate function.
		 *
		 * @return {string}
		 */
		resolvedDescription() {
			return this.description ? this.effectiveTranslate(this.description) : this.description
		},
	},
}
</script>

<!-- Styles in css/page-header.css -->

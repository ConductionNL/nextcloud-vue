<!--
  CnFeaturesAndRoadmapPage — Manifest-driven Features & Roadmap surface.

  v2 manifest page primitive for `type: "roadmap"`. Wraps
  `CnFeaturesAndRoadmapView` so consuming apps can declare
  `{ id: "FeaturesRoadmap", route: "/features-roadmap", type: "roadmap" }`
  in their manifest without writing a per-app wrapper that just
  unpacks initialState into the view's three props.

  Resolution order for each of the three values:

    1. Explicit `pages[].config.<key>` from the manifest.
    2. `loadState(appId, 'features_roadmap_<key>', <fallback>)`.
    3. Hardcoded fallback (only `repo` has one: `ConductionNL/<appId>`).

  `appId` comes from the `cnAiContext` inject that CnAppRoot already
  provides; consumers can override it explicitly via the prop for tests.

  Spec: ConductionNL/nextcloud-vue#264.
-->
<template>
	<CnFeaturesAndRoadmapView
		:repo="resolvedRepo"
		:features="resolvedFeatures"
		:disabled="resolvedDisabled" />
</template>

<script>
import CnFeaturesAndRoadmapView from '../CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'

/**
 * Read a key from `@nextcloud/initial-state`. `@nextcloud/initial-state`
 * is an optional peer (mirrors resolveManifestSentinels.js); the host
 * page may not provision the slot at all. Returns the default when the
 * package is not installed or the slot is missing.
 *
 * @param {string} appId Nextcloud app ID.
 * @param {string} key Initial-state key (full key, not prefixed).
 * @param {*} fallback Default value when no provisioned slot exists.
 * @return {*} Provisioned value or the fallback.
 */
function readInitialState(appId, key, fallback) {
	try {
		// eslint-disable-next-line global-require, import/no-unresolved, n/no-extraneous-require
		const mod = require('@nextcloud/initial-state')
		if (typeof mod.loadState === 'function') {
			return mod.loadState(appId, key, fallback)
		}
	} catch (e) {
		// Package not installed or no slot provisioned — fall through.
	}
	return fallback
}

export default {
	name: 'CnFeaturesAndRoadmapPage',

	components: {
		CnFeaturesAndRoadmapView,
	},

	inject: {
		cnAiContext: {
			default: () => ({ appId: 'unknown' }),
		},
	},

	props: {
		/**
		 * `<owner>/<repo>` of the app's GitHub repository. When
		 * omitted, falls back to the loadState value, then to
		 * `ConductionNL/<appId>`.
		 */
		repo: {
			type: String,
			default: '',
		},
		/**
		 * Build-time feature manifest. When omitted, falls back to
		 * the loadState value, then to an empty array.
		 *
		 * @type {Array<{slug: string, title: string, summary: string, docsUrl: string}>}
		 */
		features: {
			type: Array,
			default: null,
		},
		/**
		 * Admin opt-out flag. When omitted, falls back to the
		 * loadState value, then to false.
		 *
		 * @type {boolean|null}
		 */
		disabled: {
			type: Boolean,
			default: null,
		},
		/**
		 * Override for the appId used to namespace loadState lookups.
		 * Tests pass an explicit value; production reads it from the
		 * `cnAiContext` inject populated by CnAppRoot.
		 */
		appId: {
			type: String,
			default: '',
		},
	},

	computed: {
		/**
		 * Effective app id used to namespace `loadState` calls.
		 * Prop takes precedence over the cnAiContext inject so that
		 * unit tests can pass a known id without mocking the inject.
		 *
		 * @return {string}
		 */
		effectiveAppId() {
			return this.appId || this.cnAiContext?.appId || 'unknown'
		},

		/**
		 * Effective repo. Manifest config > initialState > fallback.
		 *
		 * @return {string}
		 */
		resolvedRepo() {
			if (this.repo) {
				return this.repo
			}
			return readInitialState(
				this.effectiveAppId,
				'features_roadmap_repo',
				`ConductionNL/${this.effectiveAppId}`,
			)
		},

		/**
		 * Effective features list. Manifest config > initialState > [].
		 *
		 * @return {Array}
		 */
		resolvedFeatures() {
			if (this.features !== null) {
				return this.features
			}
			return readInitialState(this.effectiveAppId, 'features_roadmap_features', [])
		},

		/**
		 * Effective disabled flag. Manifest config > initialState > false.
		 *
		 * @return {boolean}
		 */
		resolvedDisabled() {
			if (this.disabled !== null) {
				return this.disabled
			}
			return readInitialState(this.effectiveAppId, 'features_roadmap_disabled', false)
		},
	},
}
</script>

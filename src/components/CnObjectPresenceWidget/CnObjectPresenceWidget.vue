<!--
  SPDX-License-Identifier: EUPL-1.2
  Copyright (C) 2026 Conduction B.V.

  CnObjectPresenceWidget — who else has this record open, placeable from a manifest.

  🔴 THIS EXISTS SO A CONSUMING APP NEEDS NO CODE AT ALL. `useObjectPresence`
  and `CnPresenceAvatars` are both exported, and an app could wire them into its
  own widget in twenty lines — and then every app in the fleet would have its
  own twenty lines, each slightly different, each needing a release of the app
  to fix a bug in the library. Registered as the widget type `presence`, a
  manifest places it with one declaration and the app ships no component.

  🔑 IT TAKES ITS ADDRESS FROM THE SURFACE, NOT FROM CONFIG.
  `CnDetailWidgetHost` already binds `register`, `schema` and `objectId` to
  every detail widget, which is the record the page is showing. A widget that
  asked for them in its own config would let a manifest point presence at a
  DIFFERENT record from the one on screen, and the avatars would be true and
  about somebody else's page.

  🔴 IT RENDERS NOTHING WHEN NOBODY IS THERE, which is almost always.
  `CnPresenceAvatars` is silent on an empty list, and this adds no wrapper of
  its own, so a placement costs no vertical space until it has something to say.
-->
<template>
	<CnPresenceAvatars
		:present="others"
		:max="max"
		:size="size" />
</template>

<script>
import CnPresenceAvatars from '../CnPresenceAvatars/CnPresenceAvatars.vue'
import { useObjectPresence } from '../../composables/useObjectPresence.js'

export default {
	name: 'CnObjectPresenceWidget',

	components: { CnPresenceAvatars },

	props: {
		/** The register the shown record lives in. Bound by the surface. */
		register: {
			type: String,
			default: '',
		},

		/** The schema the shown record lives in. Bound by the surface. */
		schema: {
			type: String,
			default: '',
		},

		/** The record on screen. Bound by the surface. */
		objectId: {
			type: String,
			default: '',
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

	setup(props) {
		// 🔑 GETTERS, NOT VALUES. The detail page reuses one widget host across
		// a route change, so `objectId` changes under a mounted widget. Passing
		// the value would leave this beating on the record the reader left,
		// which is the shape that puts a stranger's avatar on your page.
		const { others, count, active } = useObjectPresence(
			() => props.register,
			() => props.schema,
			() => props.objectId,
			{ enabled: Boolean(props.objectId) },
		)

		return { others, count, active }
	},
}
</script>

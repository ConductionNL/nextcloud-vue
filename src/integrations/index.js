export {
	integrations,
	createIntegrationRegistry,
	installIntegrationRegistry,
	VALID_SURFACES,
} from './registry.js'

export {
	builtinIntegrations,
	registerBuiltinIntegrations,
	filesIntegration,
	notesIntegration,
	tagsIntegration,
	tasksIntegration,
	auditTrailIntegration,
	talkIntegration,
} from './builtin/index.js'

// Leaves: 18 NC-native + external integrations whose PHP providers
// live in `openregister/lib/Service/Integration/Providers/`. Generic
// CnIntegrationTab + CnIntegrationCard drive every leaf until any
// individual one needs a bespoke component, at which point the
// registration's `tab` / `widget` is repointed without touching
// consumers. Register the whole set via `registerLeafIntegrations()`.
export { leafIntegrations, registerLeafIntegrations } from './builtin/leaves.js'

// Integration icon set — registers every descriptor's MDI glyph with
// CnIcon so the tabbed widget renders per-app icons (not the generic
// fallback) regardless of the host app's registerIcons() call.
export { registerIntegrationIcons, INTEGRATION_ICON_COMPONENTS } from './icons.js'

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
} from './builtin/index.js'

// Leaves: 18 NC-native + external integrations whose PHP providers
// live in `openregister/lib/Service/Integration/Providers/`. Generic
// CnIntegrationTab + CnIntegrationCard drive every leaf until any
// individual one needs a bespoke component, at which point the
// registration's `tab` / `widget` is repointed without touching
// consumers. Register the whole set via `registerLeafIntegrations()`.
export { leafIntegrations, registerLeafIntegrations } from './builtin/leaves.js'

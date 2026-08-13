/**
 * Write the current page kind + register/schema slugs into the reactive
 * cnAiContext holder so the AI Chat Companion knows what the user is looking
 * at. No-op when the holder isn't injected.
 *
 * @param {object|null} holder The cnAiContext inject value.
 * @param {string} pageKind e.g. 'index' or 'custom'.
 * @param {{ register: any, schema: any, effectiveSchema: object|null }} [ctx] The
 *   page's current data binding, used only when `pageKind === 'index'`. `schema`
 *   may be a slug string or a schema object; `effectiveSchema` is the resolved
 *   schema and supplies the fallback `id`/`slug`.
 * @return {void}
 */
export function applyAiContext(holder, pageKind, ctx = {}) {
	if (!holder) return
	holder.pageKind = pageKind
	if (pageKind === 'index') {
		holder.registerSlug = ctx.register || undefined
		holder.schemaSlug = (typeof ctx.schema === 'string' && ctx.schema)
			|| ctx.effectiveSchema?.id || ctx.effectiveSchema?.slug
			|| (ctx.schema && (ctx.schema.id || ctx.schema.slug)) || undefined
	} else {
		holder.registerSlug = undefined
		holder.schemaSlug = undefined
	}
	holder.objectUuid = undefined
}

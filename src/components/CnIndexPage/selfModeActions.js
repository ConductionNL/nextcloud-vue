import { useObjectCopy } from '../../composables/useObjectCopy.js'
import { dispatchObjectCreated } from '../../utils/walkthroughSignals.js'
import {
	cloneObjectForCopy,
	runSelfExportRequest,
	runSelfImportRequest,
} from './selfModeIO.js'

function resolveNameField(ctx) {
	return ctx.effectiveSchema()?.configuration?.objectNameField
		|| ctx.massActionNameField()
}

function findSource(ctx, id) {
	return ctx.effectiveObjects().find((o) => o.id === id || o['@self']?.id === id)
}

/**
 * The register/schema of a row that belongs to another pair than the page's,
 * in a list fetched from a `collectionUrl`. Registers a store type for that
 * pair on first use. Returns null for rows of the page's own pair, and always
 * without a `collectionUrl`.
 *
 * @param {object} opts Page context.
 * @param {string} opts.collectionUrl The page's collection endpoint, or ''.
 * @param {string} opts.register The page's register.
 * @param {string} opts.schema The page's schema.
 * @param {object|null} opts.primarySchema The page's resolved schema.
 * @param {object|null} opts.store The object store.
 * @param {object} row The row.
 * @return {{register: string, schema: string, type: string}|null} The row's own pair.
 */
export function resolveRowTarget({ collectionUrl, register, schema, primarySchema, store }, row) {
	if (!collectionUrl || !row || !store) {
		return null
	}
	const self = row['@self'] || {}
	const reg = self.register !== undefined && self.register !== null ? String(self.register) : ''
	const sch = self.schema !== undefined && self.schema !== null ? String(self.schema) : ''
	if (!reg || !sch) {
		return null
	}
	const schemaIds = [schema, primarySchema && primarySchema.id, primarySchema && primarySchema.slug]
		.filter((v) => v !== undefined && v !== null && v !== '')
		.map(String)
	if (schemaIds.includes(sch) && String(register) === reg) {
		return null
	}
	const type = `${reg}-${sch}`
	if (!store.objectTypeRegistry?.[type]) {
		store.registerObjectType(type, sch, reg, { registerSlug: reg, schemaSlug: sch })
	}
	return { register: reg, schema: sch, type }
}

/**
 * The store type a row is written through: its own pair's, or the page's.
 *
 * @param {object} ctx Accessor closures.
 * @param {object} [row] The row.
 * @return {string} The type slug.
 */
function typeFor(ctx, row) {
	const target = row && typeof ctx.rowTarget === 'function' ? ctx.rowTarget(row) : null
	return target ? target.type : ctx.selfObjectType()
}

/**
 * The source's address for the copy endpoint, or null when the register or
 * schema is not known as a slug.
 *
 * @param {object} ctx Accessor closures.
 * @param {object} source The object being copied.
 * @return {{register: string, schema: string, id: string}|null} The address.
 */
function copyAddress(ctx, source) {
	const self = source['@self'] || {}
	const target = typeof ctx.rowTarget === 'function' ? ctx.rowTarget(source) : null
	if (target) {
		return { register: target.register, schema: target.schema, id: String(source.id || self.id) }
	}
	const reg = ctx.register()
	const sch = ctx.schema()
	const register = (typeof reg === 'string' && reg) || self.register
	const schema = (typeof sch === 'string' && sch) || (sch && (sch.slug || sch.id)) || self.schema || ctx.effectiveSchema()?.slug
	return register && schema ? { register: String(register), schema: String(schema), id: String(source.id || self.id) } : null
}

/**
 * Whether an error says the server has no copy endpoint (404 or 405).
 *
 * @param {unknown} error The error.
 * @return {boolean} True when the endpoint is missing.
 */
function copyEndpointMissing(error) {
	const status = error && error.response && error.response.status
	return status === 404 || status === 405
}

function selfModeReady(ctx) {
	return ctx.isSelfFetchMode() && !!ctx.selfObjectStore() && !!ctx.selfObjectType()
}

function refreshList(ctx) {
	const list = ctx.list()
	if (list && typeof list.refresh === 'function') {
		list.refresh()
	}
}

function storeError(ctx, type = ctx.selfObjectType()) {
	return ctx.selfObjectStore()?.getError?.(type)
}

function storeErrorMessage(ctx, fallback, type) {
	const err = storeError(ctx, type)
	return (err && err.message) || fallback
}

/**
 * Self-mode action handlers for CnIndexPage. Each `handle*` returns `true`
 * when self-mode handled it (caller should NOT emit), `false` otherwise.
 *
 * @param {object} ctx Accessor closures + emit/setResults forwarders.
 * @return {object}
 */
export function createSelfModeActions(ctx) {
	async function handleSingleDelete(id) {
		if (!selfModeReady(ctx)) {
			return false
		}
		try {
			const type = typeFor(ctx, findSource(ctx, id))
			const ok = await ctx.selfObjectStore().deleteObject(type, id)
			if (ok) {
				ctx.setResults.singleDelete({ success: true })
				ctx.emit('delete', id)
				refreshList(ctx)
			} else {
				ctx.setResults.singleDelete({ error: storeErrorMessage(ctx, 'Delete failed', type) })
			}
		} catch (err) {
			ctx.setResults.singleDelete({ error: (err && err.message) || 'Delete failed' })
		}
		return true
	}

	async function handleMassDelete(ids) {
		if (!selfModeReady(ctx)) {
			return false
		}
		try {
			// One request per pair: a mixed list holds rows of several types.
			const idsByType = new Map()
			for (const id of ids) {
				const type = typeFor(ctx, findSource(ctx, id))
				idsByType.set(type, [...(idsByType.get(type) || []), id])
			}
			const successfulIds = []
			const failedIds = []
			let failedType = null
			for (const [type, typeIds] of idsByType) {
				const outcome = await ctx.selfObjectStore().deleteObjects(type, typeIds)
				successfulIds.push(...outcome.successfulIds)
				failedIds.push(...outcome.failedIds)
				if (outcome.failedIds.length > 0 && failedType === null) {
					failedType = type
				}
			}
			if (failedIds.length === 0) {
				ctx.setResults.massDelete({ success: true, successfulIds })
			} else {
				ctx.setResults.massDelete({
					error: storeErrorMessage(ctx, `Failed to delete ${failedIds.length} item(s)`, failedType),
					successfulIds,
					failedIds,
				})
			}
			refreshList(ctx)
		} catch (err) {
			ctx.setResults.massDelete({ error: (err && err.message) || 'Delete failed' })
		}
		return true
	}

	async function handleSingleCopy(payload) {
		if (!selfModeReady(ctx)) {
			return false
		}
		const { id, newName } = payload || {}
		const source = findSource(ctx, id)
		if (!source) {
			ctx.setResults.singleCopy({ error: 'Source object not found in current view' })
			return true
		}
		try {
			// Links the person left ticked: one request to the server's copy endpoint.
			// A server without it (404 or 405) falls through to the fields-only copy below.
			const include = Array.isArray(payload && payload.include) ? payload.include : []
			const address = include.length > 0 ? copyAddress(ctx, source) : null
			if (address) {
				try {
					const copied = await useObjectCopy().copy(address, newName, include, { [resolveNameField(ctx)]: newName })
					ctx.setResults.singleCopy({ success: true, object: copied.object, links: copied.links })
					ctx.emit('copy', payload)
					refreshList(ctx)
					return true
				} catch (copyError) {
					if (!copyEndpointMissing(copyError)) {
						ctx.setResults.singleCopy({ error: (copyError && copyError.message) || 'Copy failed' })
						return true
					}
				}
			}
			const clone = cloneObjectForCopy(source, newName, resolveNameField(ctx))
			const type = typeFor(ctx, source)
			const saved = await ctx.selfObjectStore().saveObject(type, clone)
			if (saved) {
				ctx.setResults.singleCopy({ success: true })
				ctx.emit('copy', payload)
				refreshList(ctx)
			} else {
				ctx.setResults.singleCopy({ error: storeErrorMessage(ctx, 'Copy failed', type) })
			}
		} catch (err) {
			ctx.setResults.singleCopy({ error: (err && err.message) || 'Copy failed' })
		}
		return true
	}

	async function handleMassCopy(payload) {
		if (!selfModeReady(ctx)) {
			return false
		}
		const ids = (payload && payload.ids) || []
		const nameField = resolveNameField(ctx)
		const getName = (payload && payload.getName) || ((item) => item[ctx.massActionNameField()])
		const successfulIds = []
		const failedIds = []
		const links = []
		let serverCopy = Array.isArray(payload && payload.include) && payload.include.length > 0
		for (const id of ids) {
			const source = findSource(ctx, id)
			if (!source) {
				failedIds.push(id)
				continue
			}
			// One copy request per row with the ticked kinds; a server without the endpoint falls back to fields only.
			const address = serverCopy ? copyAddress(ctx, source) : null
			if (address) {
				try {
					const copied = await useObjectCopy().copy(address, getName(source), payload.include, { [nameField]: getName(source) })
					links.push(...copied.links.map((l) => ({ ...l, source: id })))
					successfulIds.push(id)
					continue
				} catch (copyError) {
					if (!copyEndpointMissing(copyError)) {
						failedIds.push(id)
						continue
					}
					serverCopy = false
				}
			}
			const clone = cloneObjectForCopy(source, getName(source), nameField)
			try {
				const saved = await ctx.selfObjectStore().saveObject(typeFor(ctx, source), clone)
				if (saved) {
					successfulIds.push(id)
				} else {
					failedIds.push(id)
				}
			} catch {
				failedIds.push(id)
			}
		}
		if (failedIds.length === 0) {
			ctx.setResults.massCopy({ success: true, successfulIds, ...(links.length > 0 ? { links } : {}) })
		} else {
			ctx.setResults.massCopy({
				error: storeErrorMessage(ctx, `Failed to copy ${failedIds.length} item(s)`),
				successfulIds,
				failedIds,
				...(links.length > 0 ? { links } : {}),
			})
		}
		refreshList(ctx)
		return true
	}

	async function handleMassExport(payload) {
		if (!ctx.isSelfFetchMode() || !ctx.register() || !ctx.schema()) {
			return false
		}
		try {
			// The selected rows when there are any, else the rows the list
			// matches: never the whole schema by surprise.
			const ids = typeof ctx.selectedIds === 'function' ? ctx.selectedIds() : []
			const list = ctx.list()
			await runSelfExportRequest({
				register: ctx.register(),
				schema: ctx.schema(),
				format: payload && payload.format,
				ids: ids.length > 0 ? ids : undefined,
				query: list && typeof list.buildParams === 'function' ? list.buildParams(1) : undefined,
			})
			ctx.setResults.massExport({ success: true })
		} catch (err) {
			ctx.setResults.massExport({ error: (err && err.message) || 'Export failed' })
		}
		return true
	}

	async function handleMassImport(payload) {
		if (!ctx.isSelfFetchMode() || !ctx.register()) {
			return false
		}
		try {
			await runSelfImportRequest({
				register: ctx.register(),
				schema: ctx.schema(),
				file: payload && payload.file,
			})
			ctx.setResults.massImport({ success: true })
			refreshList(ctx)
		} catch (err) {
			ctx.setResults.massImport({ error: (err && err.message) || 'Import failed' })
		}
		return true
	}

	async function handleFormSave(formData) {
		if (!selfModeReady(ctx)) {
			return false
		}
		try {
			const item = ctx.editItem()
			const type = item ? typeFor(ctx, item) : ctx.selfObjectType()
			const saved = await ctx.selfObjectStore().saveObject(type, formData)
			if (saved) {
				ctx.setResults.form({ success: true })
				const isCreate = !ctx.editItem()
				ctx.emit(isCreate ? 'create' : 'edit', saved)
				// @self.register/@self.schema are numeric DB ids, not slugs, so
				// override with this page's own slug props (self-fetch mode
				// guarantees ctx.schema() is already a string).
				if (isCreate) {
					dispatchObjectCreated({ register: ctx.register(), schema: ctx.schema(), object: saved })
				}
				refreshList(ctx)
				if (isCreate && typeof ctx.afterCreateSuccess === 'function') {
					ctx.afterCreateSuccess(saved)
				}
			} else {
				const err = storeError(ctx, type)
				if (err && err.isValidation) {
					// Keep the form visible so the user can fix the invalid data.
					ctx.setResults.formValidation(err.fields, err.message || 'Validation failed')
				} else {
					ctx.setResults.form({ error: (err && err.message) || 'Save failed' })
				}
			}
		} catch (err) {
			ctx.setResults.form({ error: (err && err.message) || 'Save failed' })
		}
		return true
	}

	return {
		handleSingleDelete,
		handleMassDelete,
		handleSingleCopy,
		handleMassCopy,
		handleMassExport,
		handleMassImport,
		handleFormSave,
	}
}

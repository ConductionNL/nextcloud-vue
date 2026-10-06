/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * fieldsFromSchema reads the schema keys the form needs for its pickers:
 * x-allow-create, x-fill-from, x-label-field, x-help, x-default, and the
 * group, language and time zone formats.
 *
 * Before this change `x-allow-create` and `x-fill-from` were documented on
 * CnFormDialog but never read here, so the select-or-create branch could
 * never render from a schema (pipelinq D1/D7).
 */
import { fieldsFromSchema } from '../../src/utils/schema.js'

const field = (props, key) => fieldsFromSchema({ properties: props }).find((f) => f.key === key)

describe('fieldsFromSchema: picker keys', () => {
	it('maps x-allow-create, x-fill-from and x-label-field on a single reference', () => {
		const f = field({
			client: {
				type: 'string',
				format: 'uuid',
				$ref: 'client',
				'x-allow-create': true,
				'x-label-field': 'displayName',
				'x-fill-from': { currency: 'defaultCurrency' },
			},
		}, 'client')
		expect(f.widget).toBe('select')
		expect(f.allowCreate).toBe(true)
		expect(f.fillFrom).toEqual({ currency: 'defaultCurrency' })
		expect(f.reference).toEqual({ schema: 'client', multiple: false, labelField: 'displayName' })
	})

	it('maps x-allow-create declared on the items of an array reference', () => {
		const f = field({
			contacts: { type: 'array', items: { $ref: 'contact', 'x-allow-create': true } },
		}, 'contacts')
		expect(f.widget).toBe('multiselect')
		expect(f.allowCreate).toBe(true)
		expect(f.reference.multiple).toBe(true)
	})

	it('leaves allowCreate false and fillFrom null when the schema says nothing', () => {
		const f = field({ client: { type: 'string', $ref: 'client' } }, 'client')
		expect(f.allowCreate).toBe(false)
		expect(f.fillFrom).toBeNull()
		expect(f.reference).toEqual({ schema: 'client', multiple: false })
	})

	it('accepts format nc-user next to user and username', () => {
		expect(field({ owner: { type: 'string', format: 'nc-user' } }, 'owner').widget).toBe('user')
		expect(field({ owner: { type: 'string', format: 'nc-user' } }, 'owner').userPicker).toEqual({ multiple: false })
	})

	it('renders a group for format nc-group and referenceType nextcloud-group', () => {
		const a = field({ team: { type: 'string', format: 'nc-group' } }, 'team')
		const b = field({ team: { type: 'string', referenceType: 'nextcloud-group' } }, 'team')
		expect(a.widget).toBe('group')
		expect(b.widget).toBe('group')
		expect(a.groupPicker).toEqual({ multiple: false })
	})

	it('renders an array of groups as a group multiselect', () => {
		const f = field({ teams: { type: 'array', items: { type: 'string', format: 'nc-group' } } }, 'teams')
		expect(f.widget).toBe('group-multiselect')
		expect(f.groupPicker).toEqual({ multiple: true })
	})

	it('renders language and timezone formats as their pickers', () => {
		expect(field({ lang: { type: 'string', format: 'language' } }, 'lang').widget).toBe('language')
		expect(field({ tz: { type: 'string', format: 'timezone' } }, 'tz').widget).toBe('timezone')
	})

	it('records an x-default token without resolving it', () => {
		const f = field({ lang: { type: 'string', format: 'language', 'x-default': 'current-language' } }, 'lang')
		expect(f.defaultToken).toBe('current-language')
		expect(f.default).toBeNull()
	})

	it('puts x-help behind the info popover even when the description is short', () => {
		const f = field({
			isMaster: { type: 'boolean', description: 'Master record', 'x-help': 'The master record wins when two records describe the same client.' },
		}, 'isMaster')
		expect(f.description).toBe('Master record')
		expect(f.descriptionLong).toBe('The master record wins when two records describe the same client.')
	})

	it('translates x-help through the translate option', () => {
		const f = fieldsFromSchema(
			{ properties: { a: { type: 'string', 'x-help': 'Long help' } } },
			{ translate: (s) => `nl:${s}` },
		)[0]
		expect(f.descriptionLong).toBe('nl:Long help')
	})
})

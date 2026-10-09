/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-3
 */
import { extractMentionedGroupIds, extractMentionedIds, insertMentionToken, parseMentions, serializeMentionToken } from '../../src/utils/mentions.js'

describe('group mentions', () => {
	it('a group is stored as @"group/<gid>" and round-trips through parse and serialise', () => {
		const token = serializeMentionToken('planning', 'group')
		expect(token).toBe('@"group/planning"')
		const [segment] = parseMentions(token)
		expect(segment).toMatchObject({ type: 'mention', kind: 'group', groupId: 'planning', raw: token })
		expect(serializeMentionToken(segment.groupId, 'group')).toBe(token)
	})

	it('a group with spaces keeps them', () => {
		const [segment] = parseMentions('@"group/Team A"')
		expect(segment.groupId).toBe('Team A')
	})

	it('extractMentionedIds is the users, extractMentionedGroupIds the groups', () => {
		const text = 'ping @jan and @"group/planning" and @piet, again @"group/planning" and @"group/ops"'
		expect(extractMentionedIds(text)).toEqual(['jan', 'piet'])
		expect(extractMentionedGroupIds(text)).toEqual(['planning', 'ops'])
	})

	it('a user mention has no kind, and a plain quoted user is not a group', () => {
		expect(parseMentions('@jan')[0].kind).toBeUndefined()
		const [quoted] = parseMentions('@"Jan Jansen"')
		expect(quoted.kind).toBeUndefined()
		expect(extractMentionedIds('@"Jan Jansen"')).toEqual(['Jan Jansen'])
	})

	it('an email address and an escaped @ are still not mentions', () => {
		expect(parseMentions('mail jan@example.com')).toHaveLength(1)
		expect(extractMentionedGroupIds('jan@"group/x" \\@"group/y"')).toEqual([])
	})

	it('"group/" alone is not a group', () => {
		expect(extractMentionedGroupIds('@"group/"')).toEqual([])
	})

	it('inserting a group replaces the in-progress @query', () => {
		const out = insertMentionToken('hello @Pla', 10, 'planning', 'group')
		expect(out.text).toBe('hello @"group/planning" ')
	})
})

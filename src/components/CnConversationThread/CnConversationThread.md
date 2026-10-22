A thread with a reply box:

```vue
<CnConversationThread
  title="Contact with the resident"
  reply-label="Answer to the resident"
  :messages="[
    { id: 1, author: 'Sanne de Vries', time: '2026-10-04T10:52:00', side: 'them',
      text: 'Thank you. I would like to see all documents about the lighting.' },
    { id: 2, time: '2026-10-04T10:24:00', side: 'us',
      text: 'Construction starts in March. There will be lighting along the whole cycle path.' },
  ]" />
```

Read-only, for a closed record:

```vue
<CnConversationThread
  title="Contact"
  :allow-reply="false"
  :messages="[
    { id: 1, author: 'Sanne de Vries', time: '4 Oct, 10:52', side: 'them', text: 'Thank you.' },
  ]" />
```

Channel chips and a header action. `channel-filter` draws All plus a chip per channel with its count, `channels` lists labels that always get a chip, and the `header-actions` slot puts buttons beside the title:

```vue
<CnConversationThread
  title="Contact"
  channel-filter
  :channels="['E-mail', 'Letter']"
  :messages="[
    { id: 1, author: 'Sanne de Vries', side: 'them', channel: 'E-mail', text: 'Could I see the documents?' },
    { id: 2, side: 'us', channel: 'E-mail', text: 'They are on their way.' },
  ]">
  <template #header-actions>
    <NcButton>Log contact</NcButton>
  </template>
</CnConversationThread>
```

No messages yet:

```vue
<CnConversationThread title="Contact" :messages="[]" />
```

Posting to an endpoint. The reply goes out as `{ message, ...payload }`. `title-tag`, `placeholder`, `send-label`, `us-label` and `empty-text` adjust the wording, and the `reply-actions` slot adds buttons before Send:

```vue
<CnConversationThread
  title="Contact"
  title-tag="h2"
  placeholder="Write your answer"
  send-label="Send to resident"
  us-label="Municipality"
  empty-text="Nobody has written yet."
  endpoint="/apps/example/api/cases/42/messages"
  :payload="{ channel: 'portal' }"
  :messages="[
    { id: 1, time: '2026-10-04T11:00:00', side: 'us', text: 'We received your request.' },
  ]">
  <template #reply-actions="{ draft }">
    <NcButton :disabled="!draft">Save draft</NcButton>
  </template>
</CnConversationThread>
```

While the messages load, `loading` makes the thread say so (in a status region) instead of showing the empty text. A
message's `channel` is shown after its author:

```vue
<CnConversationThread
  title="Contact"
  :loading="false"
  :messages="[
    { id: 1, author: 'Sanne de Vries', time: '2026-10-04T10:52:00', side: 'them', channel: 'Message box', text: 'Thank you.' },
  ]" />
```

The `reply-tools` slot puts tools above the reply box; its `setDraft(text)` fills the box. A message's `status` shows
after its channel, and its `actions` are buttons that emit `message-action`:

```vue
<CnConversationThread
  title="Messages"
  :messages="[
    { id: 'm-2', time: '2026-10-04T10:52:00', side: 'us', status: 'Failed', text: 'Are you there?',
      actions: [{ id: 'resend', label: 'Send again' }] },
  ]"
  @message-action="({ action, message }) => resend(message)">
  <template #reply-tools="{ setDraft }">
    <NcButton @click="setDraft('Thank you for your message.')">Use the thank-you text</NcButton>
  </template>
</CnConversationThread>
```

As a board card: `subtitle` puts a line under the title, `show-direction` says "Incoming" or "Outgoing" before the time,
and a message's `note` is a muted line under its text:

```vue
<CnConversationThread
  title="Contact"
  subtitle="Oldest first, with the channel of each message"
  show-direction
  :messages="[
    { id: 1, author: 'Sanne de Vries', time: '2026-10-03T14:10:00', side: 'them', channel: 'Phone', text: 'How do I ask for the documents?', note: 'Summarised by Pieter Jansen' },
  ]" />
```

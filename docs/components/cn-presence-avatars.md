---
sidebar_position: 55
---

import GeneratedRef from './_generated/CnPresenceAvatars.md'

# CnPresenceAvatars

Who else has this record open, as a row of faces.

Hand it the list from [`useObjectPresence`](../utilities/composables/use-object-presence.md) and it draws the rest. It fetches nothing and beats nothing of its own, so it renders the same in a test as it does on a page.

## Usage

```vue
<CnPresenceAvatars :present="others" :max="5" :size="24" />
```

```js
setup() {
  const { others } = useObjectPresence('dossiq', 'zaak', props.objectId)
  return { others }
}
```

To place it from a manifest instead, and write no component at all, use [`CnObjectPresenceWidget`](./cn-object-presence-widget.md).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `present` | `Array` | `[]` | The other readers, as the presence endpoint answers them: `{ user, arrivedAt }`. The viewer is already left out. |
| `max` | `Number` | `5` | How many faces before the rest become a count. |
| `size` | `Number` | `24` | Avatar size in pixels. |

It emits nothing and takes no slots. It is a readout, not a control.

## Nothing is the right rendering of nobody

An empty list renders no element at all, not an empty row. Most records have one reader most of the time, and a strip of blank space above every detail page to report that state would be a row of the page spent on nothing.

## It says somebody is here, not somebody is typing

Presence is a heartbeat from an open page. It cannot tell reading from editing, and a label that implied it could would be read as a lock and trusted like one.

The lock is `CnLockedBanner`, it sits beside this, and it means something else. This is the nudge that gets two people talking before the lock has to refuse anybody.

## What a reader can tell from it

The tooltip carries the arrival time, because that is the part that changes what you do. Somebody who opened the record an hour ago has probably left the tab open. Somebody who opened it ten seconds ago is working on it right now.

Past `max` the rest become a count rather than a scroll. Eight avatars on a case means the case is in a meeting, and the useful fact then is "eight people", not eight faces.

The row carries `role="status"` and a sentence naming the person when there is one of them: "Bram also has this open" is something a reader acts on, where "1 other person is here" is something they have to go and find out about.

<GeneratedRef />

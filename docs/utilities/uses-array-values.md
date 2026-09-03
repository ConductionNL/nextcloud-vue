# usesArrayValues

Tells you whether a dynamic-property declaration stores its answers as an array
on the parent object, rather than as one child record per answer.

## Signature

```js
usesArrayValues(config) // => boolean
```

`config` is one `x-openregister-extends-form` declaration.

## When it is true

Both `values.mode === 'array'` **and** `values.arrayKey` must be set. Requiring
both is deliberate: a declaration that asks for array mode without naming the
property it writes to has nowhere to put the answers, and silently writing
nothing is the worse failure.

```js
usesArrayValues({ values: { mode: 'array', arrayKey: 'properties' } }) // true
usesArrayValues({ values: { mode: 'array' } })                        // false
usesArrayValues({ values: { schema: 'caseProperty' } })               // false
usesArrayValues(null)                                                 // false
```

## Why callers need it

The two storage shapes save at different moments. Array-mode answers are folded
into the parent's own payload, so the whole record saves in one write.
Child-record answers cannot do that, because the rows need the parent's id, so
they are written afterwards and can be left behind if that second write fails.

A caller uses this to pick the right path, and to make sure only one of them
runs, since both running would store the answers twice.

See also [`valueArrayFor`](value-array-for.md).

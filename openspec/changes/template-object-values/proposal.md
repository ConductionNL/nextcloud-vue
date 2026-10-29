# A template can write the values of a map

## Why

PqProduct draws a "Kenmerken" column in the variants table: "Huishouden · grijze en blauwe containers". A variant keeps those as an `attributes` map whose keys differ per variant, and a template token wrote nothing for a map.

## What changes

- `{path|values}` writes the text and number values of a map or list at `path`, in their order, joined by " · ". Empty values and nested maps are left out; nothing left empties the template, as any empty token does.

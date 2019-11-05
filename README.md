# Leaflet polyline segment edit

An extension to [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw) to allow editing large polylines one chunk at the time.

Browsers usually can't handle editing large polylines with Leaflet.Draw. Each vertex creates new elements that must be managed and added the DOM: that leads the browser to freeze with too many points. This extension splits the polyline being edited in many segments that can be edited independently.

*Important: this is not a standalone plugin, it requires Leaflet.draw to work.*

Tested on [Leaflet](https://github.com/Leaflet/Leaflet/releases) 1.0.0+ branch.

Inspired by [https://github.com/openplacedatabase/gmaps-large-polygons](https://github.com/openplacedatabase/gmaps-large-polygons).

## Demos

The plugins works with both L.Polygons (multi or simple, with or without holes) and L.Polylines.

Coming soon...

## Installing

Coming soon...

## Usage
Coming soon...
```js
var options = {
    segmentSize: 250,
    style: {
        default: {
            weight: 3,
            color: 'tomato'
        },
        hover: {
            weight: 6,
            color: 'orange'
        },
        editing: {
            weight: 2,
            color: 'gray'
        }
    }
};

var editor = new L.Edit.PolySegmentEditing(map, poly, options);

// The segments won't show until the handler is enabled
editor.enable();

// After all the work is done
editor.disable();
```

## Options

segmentSize [integer] - The size of each segment. Defaults to `100`.

style.default [object] - The default style for the line segments.

style.hover [object] - Style to display when hovered. Useful for showing which part of the geometry is going to be edited.

style.editing [object] - The style of the segment while being edited.


All the styles default to Leaflet.Draw's default style.

Check [Leaflet's API](https://leafletjs.com/reference-1.5.0.html#path-option) for examples.


## Events

The event `L.Draw.Event.LINESEGMENTEDIT` is fired after a vertex is edited.

You can also listen to `L.Draw.Event.EDITVERTEX`.

## Caveats

This plugin allows polygons with holes to be edited. However, it doesn't enforce the geometry integrity (overlapping holes, holes outside the shell, crossing segments, etc.).

## Thanks

A big thank you to [Leaflet](https://github.com/Leaflet/Leaflet) and [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw) for being so cool and useful.

Thanks to [gmaps-large-polygons](https://github.com/openplacedatabase/gmaps-large-polygons) for the inspiration.

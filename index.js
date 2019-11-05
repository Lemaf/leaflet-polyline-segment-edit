(function() {

    L.Draw.Event.LINESEGMENTEDIT = 'draw:linesegment:editstart';

    /*
        A handler for enabling/disabling segment editing.
        It holds a list of editable line segments, ensuring that only one is edited at the time.
        This handler is also responsible for updating the polyline's latlngs each time a segment is edited.
    */
    L.Edit.PolySegmentEditing = L.Handler.extend({
        initialize: function (map, polyline, options) {

            this._map = map;
            this._polyline = polyline;

            options = L.setOptions(this, options);
            
            this._setDefaultStyles();

            this.segmentSize = options.segmentSize ? options.segmentSize : 100;
            this.segmentSize = Math.max(this.segmentSize, 2);

            this._segments = [];
            this.segmentBeingEdited = null;

            this.layerGroup = L.layerGroup();

            this._initLineSegments();
        },

        addHooks: function() {
            this._addSegmentsToMap();
        },

        removeHooks: function() {
            if (this.segmentBeingEdited) {
                this.segmentBeingEdited.stopEditing();
            }
            this._removeSegmentsFromMap();
        },

        _setDefaultStyles: function() {
            if (!this.options.style) {
                this.options.style = {};
            }
            var defaultStyle = L.Draw.Polyline.prototype.options.shapeOptions;
            this.options.style.hover = this.options.style.hover || defaultStyle;
            this.options.style.default = this.options.style.default || defaultStyle;
            this.options.style.editing = this.options.style.editing || defaultStyle;
        },

        /*
            Creates L.Edit.LineSegments of size = this.segmentSize for each outer and inner rings.
        */
        _initLineSegments: function() {
            // Extracted from Leaflet
            /* TODO: Salvar esses valores no 'this' */
            var isFlat = L.LineUtil.isFlat(this._polyline._latlngs),
                hasRings = !isFlat,
                isMulti = hasRings && !L.LineUtil.isFlat(this._polyline._latlngs[0]);

            var latlngs = isMulti ? this._polyline._latlngs : [ this._polyline._latlngs ];

            /* Each ring of each polyline is split into segments of size this.segmentSize */
            for (var polyIdx = 0; polyIdx < latlngs.length; polyIdx++) {

                var rings = !isFlat ? latlngs[polyIdx] : [latlngs[polyIdx]];

                /* The segments area created whithin the rings, i.e, a segment can't start on a
                    ring and end on some other. */
                for (var ringIdx = 0; ringIdx < rings.length; ringIdx++) {

                    var ring = rings[ringIdx],
                        startIndex = 0,
                        endIndex = 0,
                        previousSegment = null;

                    while (endIndex < ring.length) {

                        endIndex = Math.min(startIndex + this.segmentSize, ring.length);
                        var segmentCoords = ring.slice(startIndex, endIndex);

                        /* Repeating the ring's first coordinate on the end of the last segment. Aesthetics. */
                        if (endIndex === ring.length) {
                            segmentCoords.push(ring[0]);
                        }

                        var segment = new L.Edit.LineSegment([segmentCoords],
                            {
                                startIndexOnRing: startIndex,  // The starting index of the LineSegment on the current ring.
                                endIndexOnRing: endIndex,      // The ending index of the LineSegment on the current ring.
                                previous: previousSegment,     // A reference to the previous segment. Makes it easier to travel through the ring segments.
                                next: null,                    // A reference to the next segment. It'll be updated on the next iteration.
                                polylineIndex: polyIdx,         // The index of the polyline to which the ring belongs, to allow multipolylines to be edited.
                                ringIndex: ringIdx,            // the index of the ring to which the segment belongs, to allow polyline with holes to be edited.
                                style: this.options.style      // A reference to the style options.
                            });

                        segment.setStyle(this.options.style.default);

                        this._segments.push(segment);

                        startIndex = endIndex - 1;

                        /* Updating the previous segment's 'next' property with the current segment */
                        if (previousSegment) {
                            previousSegment.options.next = segment;
                        }
                        previousSegment = segment;
                    }
                }
            }
        },

        /* Register events for each line segment and add them to the map */
        _addSegmentsToMap: function() {
            for (var i = 0; i < this._segments.length; i++) {
                this._segments[i].on('edit', this._onSegmentEdit, this);
                this._segments[i].on('start', this._onEditingStart, this);
                this.layerGroup.addLayer(this._segments[i]);
            }
            this._map.addLayer(this.layerGroup);
        },

        /* Unregister events for each line segment and remove them from the map */
        _removeSegmentsFromMap: function() {
            this.layerGroup.clearLayers();
            for (var i = 0; i < this._segments.length; i++) {
                this._segments[i].off('edit', this._onSegmentEdit, this);
                this._segments[i].off('start', this._onEditingStart, this);
            }
            this._map.removeLayer(this.layerGroup);
        },

        /* Updates which segment is being edited making sure only one is edited at the time */
        _onEditingStart: function(event) {
            if (this.segmentBeingEdited) {
                this.segmentBeingEdited.stopEditing();
            }
            this.segmentBeingEdited = event.target;
        },

        /*
            Method for updating the original geometry's coordinates each time a segment is edited.
            It finds the ring to which the segment belong, creates a new array with the updated coordinates
            and calls setLatLngs() with the new values. The indices of the segments on the ring are then updated.
        */
        _onSegmentEdit: function(event) {
            var segment = event.target,
                options = segment.options;

            var isFlat = L.LineUtil.isFlat(this._polyline._latlngs),
                hasRings = !isFlat,
                isMulti = hasRings && !L.LineUtil.isFlat(this._polyline._latlngs[0]);

            var polyLatlngs = this._polyline._latlngs;

            /* Necessary to support polygons, polygons with holes and linestrings */
            var ringLatlngs = isMulti ? polyLatlngs[options.polylineIndex][options.ringIndex] :
                !isFlat ? polyLatlngs[options.polylineIndex] : polyLatlngs;

            /* Creating the new coordinates array by inserting the  */
            var start = ringLatlngs.slice(0, options.startIndexOnRing),
                end = ringLatlngs.slice(options.endIndexOnRing),
                newLatLngs = start.concat(segment._latlngs[0], end);

            if (isMulti)
                polyLatlngs[options.polylineIndex][options.ringIndex] = newLatLngs;
            else
                polyLatlngs = newLatLngs;

            /* Updating the coordinates */
            this._polyline.setLatLngs(polyLatlngs);

            this._redrawNeighbours(segment);

            this._updateRingIndices(segment);

            this._map.fire(L.Draw.Event.LINESEGMENTEDIT, {layer: this._polyline});
        },

        /* If the first or last coordinates of the segment is edited, the neighbour segments must be updated
           so that their first/last coordinates match the edited coordinates. */
        _redrawNeighbours: function(segment) {
            if (segment.options.previous) {
                segment.options.previous.redraw();
            }

            if (segment.options.next) {
                segment.options.next.redraw();
            }
        },

        /* Editing a segment may add or remove coordinates from the geometry. If that happens, the startIndex and
           endIndex of the segments on that ring must be updated. */
        _updateRingIndices: function(current) {
            /* Rewinding to the first segment of the ring to which the edited segment belongs */
            var currentSegment = current;
            while (currentSegment.options.previous) {
                currentSegment = currentSegment.options.previous;
            }

            var startIndex = 0;
            var endIndex = 0;
            /* Reset the indices of the segments on the ring */
            while (currentSegment) {
                endIndex = startIndex + currentSegment._latlngs[0].length;

                currentSegment.options.startIndexOnRing = startIndex;
                currentSegment.options.endIndexOnRing = endIndex;

                startIndex = endIndex - 1;

                currentSegment = currentSegment.options.next;
            }
        }
    });

    /* This L.Polyline extension sets styles on hover, blur and editing start. */
    L.Edit.LineSegment = L.Polyline.extend({
        initialize: function(latlngs, options) {
            options = Object.assign(options, {original: {}, editing: {}});
            L.Polyline.prototype.initialize.call(this, latlngs, options);
            this.currentStyle = this.options.style.default;
        },

        onAdd: function (map) {
            L.Path.prototype.onAdd.call(this, map);
            this.on('mouseover', this._onHover);
            this.on('mouseout', this._onBlur);
            this.on('click', this._onClick);
        },

        onRemove: function (map) {
            L.Path.prototype.onRemove.call(this, map);
            this.off('mouseover', this._onHover);
            this.off('mouseout', this._onBlur);
            this.off('click', this._onClick);
        },

        stopEditing: function() {
            if (this.editing.enabled()) {
                this.editing.disable();
                this._setCurrentStyle(this.options.style.default);
            }
        },

        _onHover: function() {
            this.setStyle(this.options.style.hover);

            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                this.bringToFront();
            }
        },

        _onBlur: function() {
            this.setStyle(this.currentStyle);
        },

        _onClick: function() {
            this.fire('start');
            this.editing.enable();
            this._setCurrentStyle(this.options.style.editing);
        },

        _setCurrentStyle: function(style) {
            this.currentStyle = style;
            this.setStyle(style);
        }
    });
    
})();

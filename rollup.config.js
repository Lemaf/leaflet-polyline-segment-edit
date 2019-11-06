import {terser} from 'rollup-plugin-terser';
import resolve from 'rollup-plugin-node-resolve';
import buble from 'rollup-plugin-buble';
import copy from 'rollup-plugin-copy'

/* Extracted from mourner's rbush module */
const output = (file, plugins) => ({
    input: 'index.js',
    output: {
        name: 'L.SegmentEdit',
        format: 'umd',
        indent: false,
        file
    },
    plugins
});

const copyConfig = {
    targets: [
        {src: 'leaflet.segmentedit.min.js', dest: 'docs'}
    ]
};

export default [
    output('leaflet.segmentedit.js', [resolve(), buble()]),
    output('leaflet.segmentedit.min.js', [resolve(), buble(), terser(), copy(copyConfig)])
];
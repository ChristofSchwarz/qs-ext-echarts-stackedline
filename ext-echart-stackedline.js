define(["qlik",
    "jquery",
    "./props",
    "./paint",
    "./resize"
    // echarts.min.js from https://www.cdnpkg.com/echarts/file/echarts.min.js/?id=32956
], function (qlik, $, props, paintFunc, resizeFunc) {

    'use strict';

    // var qext;
    // var context = {
    //     echart: null,
    //     echart2: null
    // };
    var globalSettings = { qext: null };

    $.ajax({
        url: '../extensions/ext-echart-stackedline/ext-echart-stackedline.qext',
        dataType: 'json',
        async: false,  // wait for this call to finish.
        success: function (data) { globalSettings.qext = data; }
    });

    return {
        initialProperties: {
            showTitles: false,
            disableNavMenu: false,
            qHyperCubeDef: {
                qInitialDataFetch: [{
                    qWidth: 4,
                    qHeight: Math.floor(10000 / 4) // divide 10000 by qWidth
                }],
                // qMeasures: JSON.parse(initialProps).qHyperCubeDef.qMeasures
            }
        },

        definition: {
            type: "items",
            component: "accordion",
            items: {
                dimensions: {
                    uses: "dimensions",
                    min: 2,
                    max: 2
                },
                measures: {
                    uses: "measures",
                    min: 1,
                    max: 2
                },
                sorting: {
                    uses: "sorting"
                },
                addons: {
                    uses: "addons",
                    items: {
                        dataHandling: {
                            uses: "dataHandling",
                            items: {
                                calcCond: { uses: "calcCond" }
                            }
                        }
                    }
                },
                settings: {
                    uses: "settings"
                },
                section1: props.section1('Extension settings', globalSettings),
                about: props.about('About this extension', globalSettings)
            }
        },
        support: {
            snapshot: true,
            export: true,
            exportData: true
        },

        paint: async function ($element, layout) {
            return paintFunc($element, layout, globalSettings);
        },

        resize: async function ($element, layout) {
            return resizeFunc($element, layout, globalSettings);
        }
    };
});
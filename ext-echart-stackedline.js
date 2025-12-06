define(["qlik",
    "jquery",
    "./props",
    "./cdnjs/echarts.min",
    "./paint",
    "./resize"
    // echarts.min.js from https://www.cdnpkg.com/echarts/file/echarts.min.js/?id=32956
], function (qlik, $, props, echarts, paintFunc, resizeFunc) {

    'use strict';

    var qext;
    var context = {
        echart: null,
        echart2: null
    };

    $.ajax({
        url: '../extensions/ext-echart-stackedline/ext-echart-stackedline.qext',
        dataType: 'json',
        async: false,  // wait for this call to finish.
        success: function (data) { qext = data; }
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
                section1: props.section1('Extension settings'),
                about: props.about('About this extension', qext)
            }
        },
        support: {
            snapshot: true,
            export: true,
            exportData: true
        },

        paint: async function ($element, layout) {
            context.self = this;
            context.ownId = this.options.id;
            context.echarts = echarts;
            return paintFunc($element, layout, context);
        },

        resize: async function ($element, layout) {
            context.ownId = this.options.id;
            return resizeFunc($element, layout, context);
        }
    };
});
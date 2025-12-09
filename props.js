define(["jquery"], function ($) {

    function subSection(labelText, itemsArray, argKey, argVal) {
        var ret = {
            component: 'expandable-items',
            items: {}
        };
        var hash = 0;
        for (var j = 0; j < labelText.length; j++) {
            hash = ((hash << 5) - hash) + labelText.charCodeAt(j)
            hash |= 0;
        }
        ret.items[hash] = {
            label: labelText,
            type: 'items',
            show: function (arg) { return (argKey && argVal) ? (arg[argKey] == argVal) : true },
            items: itemsArray
        };
        return ret;
    }

    return {

        section1: function (title) {
            return {
                label: title,
                type: 'items',
                items: [
                    {
                        label: "This extension requires 2 dimensions and "
                            + "1 measures to be rendered. See how to use for more.",
                        component: "text",

                    },
                    {
                        label: "Chart Renderer",
                        type: "string",
                        component: "buttongroup",
                        ref: "pEchartRenderer",
                        options: [
                            { value: "canvas", label: "Canvas", tooltip: "Better performance for large datasets" },
                            { value: "svg", label: "SVG", tooltip: "Better quality for print and zoom" }
                        ],
                        defaultValue: "canvas"
                    },
                    subSection('How to use', [
                        {
                            label: "Add 2 dimensions:",
                            component: "text"
                        }, {
                            label: "1) X-Axis values (typically a time dimension)",
                            component: "text"
                        }, {
                            label: "2) Stack dimension (e.g. a country)",
                            component: "text"
                        }, {
                            label: "Add 1 or 2 measures:",
                            component: "text"
                        }, {
                            label: "1) the main value to be plotted",
                            component: "text"
                        }, {
                            label: "2) an optional CSS color for that stack dimension",
                            component: "text"
                        }, {
                            label: "More Documentation",
                            component: "button",
                            action: function (arg) {
                                window.open('https://github.com/ChristofSchwarz/qs-ext-echarts-stackedline/blob/main/README.md', '_blank');
                            }
                        },
                    ]),
                    subSection('Axis and Legend', [
                        {
                            label: "X-Axis spaces at start/end",
                            type: "boolean",
                            defaultValue: false,
                            ref: "pBoundaryGap"
                        },
                        {
                            label: "X-Axis Label Rotation",
                            type: "string",
                            component: "dropdown",
                            ref: "pXAxisRotation",
                            options: [
                                { value: "0", label: "Horizontal (0°)" },
                                { value: "45", label: "Diagonal (45°)" },
                                { value: "90", label: "Vertical (90°)" }
                            ],
                            defaultValue: "0"
                        },
                        {
                            label: "Show Label for X Axis",
                            type: "boolean",
                            expression: 'optional',
                            ref: 'pXAxisLabel',
                            defaultValue: true
                        },
                        {
                            label: "Show Label for Y Axis",
                            type: "boolean",
                            expression: 'optional',
                            ref: 'pYAxisLabel',
                            defaultValue: true
                        },
                        {
                            label: "Show Legend",
                            type: "string",
                            component: "dropdown",
                            ref: "pShowLegend",
                            options: [
                                { value: "right", label: "Right" },
                                { value: "off", label: "Off" }
                            ],
                            defaultValue: "right"
                        }
                    ]),
                    subSection('Line Settings', [
                        {
                            label: "Line Width",
                            type: 'number',
                            // component: 'slider',
                            ref: 'pLineWidth',
                            // min: 0,
                            // max: 4,
                            // step: 0.5,
                            defaultValue: 0.5
                        },
                        {
                            label: "Smoothen Lines",
                            type: "boolean",
                            ref: "pSmoothLine",
                            defaultValue: false
                        }
                    ]),
                    subSection('Color Settings', [
                        {
                            label: "Stack Opacity",
                            type: 'number',
                            component: 'slider',
                            ref: 'pStackOpacity',
                            min: 0,
                            max: 1,
                            step: 0.1,
                            defaultValue: 0.7
                        },
                        {
                            label: "Positive Start Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pPosStartColor',
                            defaultValue: '#BD3933'
                        },
                        {
                            label: "Positive End Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pPosEndColor',
                            defaultValue: '#F4C2D7'
                        },
                        {
                            label: "Negative Start Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pNegStartColor',
                            defaultValue: '#102173'
                        },
                        {
                            label: "Negative End Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pNegEndColor',
                            defaultValue: '#7EC8E3'
                        }, 
                        {
                            label: "Preview Colors",
                            component: "button",
                            action: function (arg) {
                                const posStart = arg.pPosStartColor;
                                const posEnd = arg.pPosEndColor;
                                const negStart = arg.pNegStartColor;
                                const negEnd = arg.pNegEndColor;
                                
                                const modal = $('<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10000;min-width:300px;">' +
                                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">' +
                                    '<h3 style="margin:0;">Color Preview</h3>' +
                                    '<span style="cursor:pointer;font-size:20px;font-weight:bold;color:#999;">&times;</span>' +
                                    '</div>' +
                                    '<div style="margin-bottom:15px;">' +
                                    '<div style="font-weight:bold;margin-bottom:5px;">Positive Colors:</div>' +
                                    '<div style="display:flex;align-items:center;gap:10px;">' +
                                    '<div style="width:50px;height:30px;background:' + posStart + ';border:1px solid #ccc;"></div>' +
                                    '<span>→</span>' +
                                    '<div style="width:50px;height:30px;background:' + posEnd + ';border:1px solid #ccc;"></div>' +
                                    '<div style="flex:1;height:30px;background:linear-gradient(to right, ' + posStart + ', ' + posEnd + ');border:1px solid #ccc;"></div>' +
                                    '</div>' +
                                    '</div>' +
                                    '<div>' +
                                    '<div style="font-weight:bold;margin-bottom:5px;">Negative Colors:</div>' +
                                    '<div style="display:flex;align-items:center;gap:10px;">' +
                                    '<div style="width:50px;height:30px;background:' + negStart + ';border:1px solid #ccc;"></div>' +
                                    '<span>→</span>' +
                                    '<div style="width:50px;height:30px;background:' + negEnd + ';border:1px solid #ccc;"></div>' +
                                    '<div style="flex:1;height:30px;background:linear-gradient(to right, ' + negStart + ', ' + negEnd + ');border:1px solid #ccc;"></div>' +
                                    '</div>' +
                                    '</div>' +
                                    '</div>');
                                
                                const overlay = $('<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;"></div>');
                                
                                $('body').append(overlay).append(modal);
                                
                                modal.find('span').on('click', function() {
                                    modal.remove();
                                    overlay.remove();
                                });
                                
                                overlay.on('click', function() {
                                    modal.remove();
                                    overlay.remove();
                                });
                            }
                        }]
                    ),
                    subSection('Grid Spacing', [
                        {
                            label: "Left",
                            type: 'number',
                            ref: 'pGridLeft',
                            defaultValue: 5
                        },
                        {
                            label: "Right",
                            type: 'number',
                            ref: 'pGridRight',
                            defaultValue: 120
                        },
                        {
                            label: "Top",
                            type: 'number',
                            ref: 'pGridTop',
                            defaultValue: 10
                        },
                        {
                            label: "Bottom",
                            type: 'number',
                            ref: 'pGridBottom',
                            defaultValue: 0
                        }]
                    ),
                    subSection('Number Formatting', [
                        {
                            label: "Decimals",
                            type: 'number',
                            ref: 'pFmtDecimals',
                            defaultValue: 2,
                            expression: 'optional'
                        },
                        {
                            label: "Thousand Separator",
                            type: 'string',
                            ref: 'pFmtThousandSep',
                            defaultValue: "'",
                            expression: 'optional'
                        },
                        {
                            label: "Decimal Separator",
                            type: 'string',
                            ref: 'pFmtDecimalSep',
                            defaultValue: '.',
                            expression: 'optional'
                        },
                        {
                            label: "Number Prefix",
                            type: 'string',
                            ref: 'pNumberPrefix',
                            defaultValue: '',
                            expression: 'optional'
                        },
                        {
                            label: "Number Suffix",
                            type: 'string',
                            ref: 'pNumberSuffix',
                            defaultValue: '',
                            expression: 'optional'
                        }]
                    ),
                    subSection('Toggle/Save As Image Icon', [
                        {
                            label: "Save As Image Icon",
                            type: 'string',
                            component: 'dropdown',
                            ref: 'pSaveAsImage',
                            options: [
                                { value: 'off', label: 'Off' },
                                { value: 'on', label: 'On' }
                            ],
                            defaultValue: 'on'
                        },
                        {
                            label: "Toggle Icon Position",
                            type: 'string',
                            component: 'dropdown',
                            ref: 'pIconPosition',
                            options: [
                                { value: 'off', label: 'Off' },
                                { value: 'top-left', label: '↖ Top Left' },
                                { value: 'top-right', label: '↗ Top Right' },
                                { value: 'bottom-right', label: '↘ Bottom Right' },
                                { value: 'bottom-left', label: '↙ Bottom Left' }
                            ],
                            defaultValue: 'top-right'
                        },
                        {
                            label: "Offset Top",
                            type: 'number',
                            ref: 'pIconOffsetTop',
                            defaultValue: 0,
                            show: function (arg) {
                                return arg.pIconPosition !== 'off' && arg.pIconPosition.indexOf('top') !== -1;
                            }
                        },
                        {
                            label: "Offset Left",
                            type: 'number',
                            ref: 'pIconOffsetLeft',
                            defaultValue: 5,
                            show: function (arg) {
                                return arg.pIconPosition !== 'off' && arg.pIconPosition.indexOf('left') !== -1;
                            }
                        },
                        {
                            label: "Offset Right",
                            type: 'number',
                            ref: 'pIconOffsetRight',
                            defaultValue: 40,
                            show: function (arg) {
                                return arg.pIconPosition !== 'off' && arg.pIconPosition.indexOf('right') !== -1;
                            }
                        },
                        {
                            label: "Offset Bottom",
                            type: 'number',
                            ref: 'pIconOffsetBottom',
                            defaultValue: 5,
                            show: function (arg) {
                                return arg.pIconPosition !== 'off' && arg.pIconPosition.indexOf('bottom') !== -1;
                            }
                        },
                        {
                            label: "Background Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pIconBgColor',
                            defaultValue: '#f0f0f0'
                        },
                        {
                            label: "Font Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pIconFontColor',
                            defaultValue: '#444444'
                        }]
                    )
                ]
            }
        },

        about: function (title, qext) {
            return {
                label: title,
                type: 'items',
                items: [
                    {
                        label: function (arg) { return 'Installed extension version ' + qext.version },
                        component: "link",
                        url: '../extensions/ext-echart-stackedline/ext-echart-stackedline.qext'
                    },
                    {
                        label: "This extension is free of charge by data/\\bridge, Qlik OEM partner and specialist for Mashup integrations.",
                        component: "text"
                    },
                    {
                        label: "Use as is. No support without a maintenance subscription.",
                        component: "text"
                    },
                    {
                        label: "",
                        component: "text"
                    },
                    {
                        label: "About Us",
                        component: "link",
                        url: 'https://www.databridge.ch'
                    },
                    {
                        type: "boolean",
                        defaultValue: false,
                        ref: "pConsoleLog",
                        label: "console.log debugging info"
                    }
                ]
            }
        }
    }
});
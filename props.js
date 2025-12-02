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
                            + "1 measures to be rendered. The dimensions are 1) X-Axis values and 2) Stack dimension",
                        component: "text",

                    },
                    {
                        label: "X-Axis spaces at start/end",
                        type: "boolean",
                        defaultValue: false,
                        ref: "pBoundaryGap"
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
                    },
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
                        label: "Line Width",
                        type: 'number',
                        component: 'slider',
                        ref: 'pLineWidth',
                        min: 0,
                        max: 4,
                        step: 0.5,
                        defaultValue: 2
                    },
                    {
                        label: "Smoothen Lines",
                        type: "boolean",
                        ref: "pSmoothLine",
                        defaultValue: false
                    },
                    subSection('Color Ranges', [
                        {
                            label: "Positive Start Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pPosStartColor',
                            defaultValue: '#102173'
                        },
                        {
                            label: "Positive End Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pPosEndColor',
                            defaultValue: '#7EC8E3'
                        },
                        {
                            label: "Negative Start Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pNegStartColor',
                            defaultValue: '#BD3933'
                        },
                        {
                            label: "Negative End Color",
                            type: 'string',
                            expression: 'optional',
                            ref: 'pNegEndColor',
                            defaultValue: '#F4C2D7'
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
                    // {
                    //     label: "Open Documentation",
                    //     component: "button",
                    //     action: function (arg) {
                    //         window.open('https://github.com/ChristofSchwarz/qs-ext-echart-stackedline/blob/main/README.md', '_blank');
                    //     }
                    // },
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
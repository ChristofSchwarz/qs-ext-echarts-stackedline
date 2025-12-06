define(["qlik",
    "jquery",
    "./props",
    "./cdnjs/echarts.min",
    "./moreFunctions"
    // echarts.min.js from https://www.cdnpkg.com/echarts/file/echarts.min.js/?id=32956
], function (qlik, $, props, echarts, moreFunctions) {

    'use strict';

    // var vsettings = {};
    var qext;
    var echart;

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

            var self = this;
            const ownId = this.options.id;
            const mode = qlik.navigation.getMode();
            if (layout.pConsoleLog) console.log(ownId, 'event=paint', 'mode=' + mode, 'layout', layout);
            const app = qlik.currApp(this);
            const thisSheetId = qlik.navigation.getCurrentSheetId().sheetId;
            const enigma = app.model.enigmaModel;
            const props = await app.getObjectProperties(ownId);
            if (layout.pConsoleLog) console.log(ownId, 'properties', props.properties);

            if (props.properties.qHyperCubeDef.qSuppressZero) {
                $element.html('<div style="padding:10px;color:#900;">The option "Include Zero Values" is disabled. Please enable it to render the chart.</div>');
                return qlik.Promise.resolve();
            };
            
            // Build toggle button style based on position settings
            let toggleBtnStyle = 'position:absolute;cursor:pointer;background:' + layout.pIconBgColor + ';color:' + layout.pIconFontColor + ';border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;z-index:1000;';
            
            if (layout.pIconPosition === 'off') {
                toggleBtnStyle += 'display:none;';
            } else if (layout.pIconPosition === 'top-left') {
                toggleBtnStyle += 'top:' + layout.pIconOffsetTop + 'px;left:' + layout.pIconOffsetLeft + 'px;';
            } else if (layout.pIconPosition === 'top-right') {
                toggleBtnStyle += 'top:' + layout.pIconOffsetTop + 'px;right:' + layout.pIconOffsetRight + 'px;';
            } else if (layout.pIconPosition === 'bottom-right') {
                toggleBtnStyle += 'bottom:' + layout.pIconOffsetBottom + 'px;right:' + layout.pIconOffsetRight + 'px;';
            } else if (layout.pIconPosition === 'bottom-left') {
                toggleBtnStyle += 'bottom:' + layout.pIconOffsetBottom + 'px;left:' + layout.pIconOffsetLeft + 'px;';
            }
            
            $element.html(
                '<div id="parent_' + ownId + '" style="height:100%;width:100%;position:relative;">'
                + '<span id="toggleBtn_' + ownId + '" style="' + toggleBtnStyle + '" title="Toggle view">i</span>'
                + '<div id="chart_' + ownId + '" style="height:100%;width:100%;"></div>'
                + '<div id="chart2_' + ownId + '" style="height:100%;width:100%;display:none;"></div>'
                + '<div id="table_' + ownId + '" style="height:100%;width:100%;overflow:auto;display:none;"></div>'
                + '</div>');

            const dim2 = //props.properties?.qHyperCubeDef.qDimensions[1]?.qDef.qFieldDefs[0] ||
                layout.qHyperCube.qDimensionInfo[1].qEffectiveDimensionName;
            const measureFormula = props.properties?.qHyperCubeDef.qMeasures[0]?.qDef.qDef;
            // const numFormat = props.properties?.qHyperCubeDef.qMeasures[0]?.qDef.qNumFormat;
            // if (layout.pConsoleLog) console.log('numFormat',numFormat);

            // build engine expression to get total values per stack dimension
            const totalValsDef = `Aggr('"' & [${dim2}] & '":' & Num(${measureFormula},'','.',' '), [${dim2}])`;
            if (layout.pConsoleLog) console.log('Engine to calculate totalValsDef', totalValsDef);
            var totalVals = await enigma.evaluate(`=Concat(${totalValsDef}, ',')`);

            var colors = {};
            try {
                totalVals = JSON.parse('{' + totalVals + '}');
            }
            catch (e) {
                console.error('Error parsing totalVals', e, totalVals);
                $element.html('<div style="padding:10px;color:#900;">No total data available to display the chart.</div>');
                return qlik.Promise.resolve();
            }
            // Sort totalVals by values (descending)
            totalVals = Object.fromEntries(
                Object.entries(totalVals).sort((a, b) => b[1] - a[1])
            );
            if (layout.pConsoleLog) console.log('totalVals ', totalVals);

            // Count positives and negatives
            const positives = [];
            const negatives = [];
            Object.entries(totalVals).forEach(([key, value]) => {
                if (value >= 0) {
                    positives.push(key);
                } else {
                    negatives.unshift(key);
                }
            });
            const positivesPlus = positives.map(item => item + '+');
            const positivesMinus = positives.map(item => item + '-');
            const negativesPlus = negatives.map(item => item + '+');
            const negativesMinus = negatives.map(item => item + '-');
            // console.log('positives', positivesPlus);
            // console.log('negatives', negativesMinus);

            const legendSortOrder = [...positives].reverse().concat(negatives);
            if (layout.pConsoleLog) console.log('legendSortOrder', legendSortOrder);
            const stacksSortOrder = positivesPlus.concat(negativesPlus).concat(negativesMinus).concat(positivesMinus);
            if (layout.pConsoleLog) console.log('stacksSortOrder', stacksSortOrder);

            // Assign colors for positives
            positives.forEach((key, index) => {
                const factor = positives.length > 1 ? index / (positives.length - 1) : 0;
                colors[key] = moreFunctions.interpolateColor(layout.pPosStartColor, layout.pPosEndColor, factor);
            });

            // Assign colors for negatives
            negatives.forEach((key, index) => {
                const factor = negatives.length > 1 ? index / (negatives.length - 1) : 0;
                colors[key] = moreFunctions.interpolateColor(layout.pNegStartColor, layout.pNegEndColor, factor);
            });


            if (layout.pConsoleLog) console.log('colors ', colors);

            var chartDom = document.getElementById('chart_' + ownId);
            echart = echarts.init(chartDom, null, { renderer: layout.pEchartRenderer || 'canvas' });

            var ecOpt = {
                animation: false,
                xAxis: [{
                    type: 'category',
                    name: layout.pXAxisLabel ? layout.qHyperCube.qDimensionInfo[0].qFallbackTitle : '',
                    nameLocation: 'middle',
                    nameGap: 30,
                    nameTextStyle: { fontSize: 14 },
                    axisLabel: {
                        rotate: parseInt(layout.pXAxisRotation)
                    },
                    data: [],
                    boundaryGap: layout.pBoundaryGap
                }],
                yAxis: [{
                    type: 'value',
                    name: layout.pYAxisLabel ? layout.qHyperCube.qMeasureInfo[0].qFallbackTitle : '',
                    nameLocation: 'middle',
                    nameGap: 40,
                    nameTextStyle: { fontSize: 14 },
                    axisLabel: {
                        formatter: function (value) {
                            return moreFunctions.formatNumber(value, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix);
                        }
                    }
                }],
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: '#333',
                    borderColor: '#333',
                    textStyle: {
                        color: '#fff',
                        fontSize: 11
                    },
                    formatter: function (params) {
                        // params contains info about the data point
                        // You can return any HTML string here
                        // console.log(params);
                        var vals = {};
                        var colors = {};

                        params.forEach(param => {
                            colors[param.seriesName] = param.color;
                            vals[param.seriesName] = vals[param.seriesName] ? (vals[param.seriesName] + param.data) : param.data;
                        })
                        var ttip = ''
                        legendSortOrder.forEach(key => {
                            if (vals[key] !== undefined) {
                                const formattedValue = moreFunctions.formatNumber(vals[key], layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix);
                                // ttip += `<span style='color:${colors[key]};'>\u25CF</span>${key} : ${formattedValue}<br>`;
                                ttip += ` <div style="display:flex; justify-content:space-between; margin:2px 0;">
                                    <span style="text-align:left;"><span style='color:${colors[key]};'>\u25A0</span> ${key}&nbsp</span>
                                    <span style="text-align:right;">&nbsp;${formattedValue}</span>
                                </div>`;
                            }
                        });
                        return `<div>
                        <strong>${params[0].axisValueLabel}</strong><br>
                        ${ttip}
                        </div>`;
                    }
                },
                legend: {
                    show: layout.pShowLegend != 'off',
                    data: [], //legendSortOrder,
                    //formatter: (d) => d.replace('Upper', 'Range'),
                    icon: 'square',
                    orient: 'vertical',
                    right: 10,
                    top: 'center'
                },
                grid: {
                    left: layout.pGridLeft,
                    right: layout.pGridRight,
                    top: layout.pGridTop,
                    bottom: layout.pGridBottom,
                    containLabel: false
                },
                series: [],
                toolbox: {
                    feature: layout.pSaveAsImage === 'on' ? { saveAsImage: {} } : {}
                }
            };

            var ecOpt2 = {
                title: {
                    text: 'Total Values by ' + layout.qHyperCube.qDimensionInfo[1].qFallbackTitle
                },
                xAxis: {
                    type: 'category',
                    data: legendSortOrder
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: function (value) {
                            return moreFunctions.formatNumber(value, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix);
                        }
                    }
                },
                series: [
                    {
                        data: [],
                        type: 'bar',
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function (params) {
                                return moreFunctions.formatNumber(params.value, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix);
                            }
                        }
                    }
                ]
            };


            // Build data structure for table view
            var tableData = {};
            var xAxisLabels = [];
            var yAxisLabels = [];

            // parsing the hypercube data into echart options
            var found = 0;

            for (const row of layout.qHyperCube.qDataPages[0].qMatrix) {
                // console.log('row', row);
                const xAxisLabel = row[0].qText;
                const yAxisLabel = row[1].qText;
                const value = row[2].qNum;
                
                // Check for optional 4th element (color code)
                if (row[3] && row[3].qText && row[3].qText.length > 1) {
                    colors[yAxisLabel] = row[3].qText;
                }

                // Build table data structure
                if (!tableData[yAxisLabel]) {
                    tableData[yAxisLabel] = {};
                    yAxisLabels.push(yAxisLabel);
                }
                tableData[yAxisLabel][xAxisLabel] = value;
                if (!xAxisLabels.includes(xAxisLabel)) {
                    xAxisLabels.push(xAxisLabel);
                }

                // console.log(xAxisLabel, yAxisLabel, value);

                if (!ecOpt.xAxis[0].data.includes(xAxisLabel)) {
                    ecOpt.xAxis[0].data.push(xAxisLabel);
                }

                if (!ecOpt.legend.data?.includes(yAxisLabel)) {
                    ecOpt.legend.data?.push(yAxisLabel);
                    const newSeries = JSON.stringify({
                        name: yAxisLabel,
                        type: 'line',
                        stack: 'Total',
                        smooth: layout.pSmoothLine,
                        showSymbol: false,
                        itemStyle: { color: colors[yAxisLabel] },
                        lineStyle: { width: layout.pLineWidth },
                        areaStyle: { opacity: layout.pStackOpacity },
                        emphasis: { focus: 'series' },
                        data: []
                    });
                    ecOpt.series.push({
                        ...JSON.parse(newSeries),
                        ...{ _nameForSorting: yAxisLabel + '+' }
                    });
                    // we add it twice.
                    ecOpt.series.push({
                        ...JSON.parse(newSeries),
                        ...{ _nameForSorting: yAxisLabel + '-' }
                    });

                }
                // Find all matching series indices
                found = 0;
                ecOpt.series.forEach((s, i) => {
                    if (s.name === yAxisLabel) {
                        found++;

                        if (found == 1) { // add the postive value or 0 to the first series
                            ecOpt.series[i].data.push(Math.max(value, 1e-6));
                        }
                        if (found == 2) { // add the negative value or -1e-6 to the second series
                            ecOpt.series[i].data.push(Math.min(value, -1e-6));
                        }
                    }
                });
            }

            // Sort legend.data and series based on position in totalVals

            const totalValsKeys = Object.keys(totalVals);

            ecOpt.legend.data?.sort((a, b) => {
                const posA = legendSortOrder.indexOf(a);
                const posB = legendSortOrder.indexOf(b);
                return (posA === -1 ? Infinity : posA) - (posB === -1 ? Infinity : posB);
            });

            ecOpt.series.sort((a, b) => {
                const posA = stacksSortOrder.indexOf(a._nameForSorting);
                const posB = stacksSortOrder.indexOf(b._nameForSorting);
                return (posA === -1 ? Infinity : posA) - (posB === -1 ? Infinity : posB);
            });


            if (layout.pConsoleLog) console.log('ecOpt', ecOpt);
            echart.setOption(ecOpt);

            // Initialize second chart
            var chart2Dom = document.getElementById('chart2_' + ownId);
            var echart2 = echarts.init(chart2Dom, null, { renderer: layout.pEchartRenderer || 'canvas' });
            
            // Populate ecOpt2 data in legendSortOrder sequence
            legendSortOrder.forEach(key => {
                if (totalVals[key] !== undefined) {
                    ecOpt2.series[0].data.push({
                        value: totalVals[key],
                        itemStyle: { color: colors[key] },
                        // label: { show: true }
                    });
                }
            });

            echart2.setOption(ecOpt2);

            // Build HTML table
            let tableHtml = '<table style="border-collapse:collapse;width:100%;font-size:12px;">';
            tableHtml += '<thead><tr><th style="border:1px solid #ccc;padding:5px;background:#f0f0f0;position:sticky;top:0;"></th>';
            xAxisLabels.forEach(xLabel => {
                tableHtml += '<th style="border:1px solid #ccc;padding:5px;background:#f0f0f0;position:sticky;top:0;">' + xLabel + '</th>';
            });
            tableHtml += '</tr></thead><tbody>';

            legendSortOrder.forEach(yLabel => {
                if (tableData[yLabel]) {
                    const bgColor = colors[yLabel] || '#f0f0f0';
                    const textColor = moreFunctions.getContrastColor(bgColor);
                    tableHtml += '<tr><td style="border:1px solid #ccc;padding:5px;background:' + bgColor + ';font-weight:bold;color:' + textColor + ';">' + yLabel + '</td>';
                    xAxisLabels.forEach(xLabel => {
                        const val = tableData[yLabel][xLabel];
                        const cellValue = val !== undefined ? moreFunctions.formatNumber(val, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix) : '';
                        tableHtml += '<td style="border:1px solid #ccc;padding:5px;text-align:right;">' + cellValue + '</td>';
                    });
                    tableHtml += '</tr>';
                }
            });
            tableHtml += '</tbody></table>';

            $('#table_' + ownId).html(tableHtml);

            // Add 3-way toggle functionality
            $('#toggleBtn_' + ownId).off('click').on('click', function () {
                const chartDiv = $('#chart_' + ownId);
                const chart2Div = $('#chart2_' + ownId);
                const tableDiv = $('#table_' + ownId);

                if (chartDiv.is(':visible')) {
                    // Switch from chart to chart2
                    chartDiv.hide();
                    chart2Div.show();
                    tableDiv.hide();
                    if (echart2) echart2.resize();
                } else if (chart2Div.is(':visible')) {
                    // Switch from chart2 to table
                    chartDiv.hide();
                    chart2Div.hide();
                    tableDiv.show();
                } else {
                    // Switch from table back to chart
                    chartDiv.show();
                    chart2Div.hide();
                    tableDiv.hide();
                    if (echart) echart.resize();
                }
            });

            return qlik.Promise.resolve();
        },

        resize: async function ($element, layout) {
            var self = this;
            const ownId = this.options.id;
            const mode = qlik.navigation.getMode();
            if (layout.pConsoleLog) console.log(ownId, 'event=resize', 'mode=' + mode, 'layout', layout);
            if (echart) {
                echart.resize();
            }
        }
    };
});
define(["qlik", "jquery", "./moreFunctions"], function (qlik, $, moreFunctions) {
    'use strict';

    var echart;
    var echart2;

    return async function ($element, layout, context) {
        var self = context.self;
        const ownId = context.ownId;
        const echarts = context.echarts;

        const mode = qlik.navigation.getMode();
        if (layout.pConsoleLog) console.log(ownId, 'event=paint', 'mode=' + mode, 'layout', layout);
        const app = qlik.currApp(self);
        if (layout.pConsoleLog) console.log(ownId, 'app', app);

        const thisSheetId = qlik.navigation.getCurrentSheetId().sheetId;
        const enigma = app.model.enigmaModel;
        const props = await app.getObjectProperties(ownId);
        if (layout.pConsoleLog) console.log(ownId, 'props.properties', props.properties);

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

        const dim2 = layout.qHyperCube.qDimensionInfo[1].qEffectiveDimensionName;
        const measureFormula = props.properties?.qHyperCubeDef.qMeasures[0]?.qDef.qDef;

        var totalVals = {};
        var inCohort = {};

        // Create a copy of qInterColumnSortOrder, skipping 1 and decrementing values > 1 by 1
        let origSortOrder = props.properties.qHyperCubeDef.qInterColumnSortOrder || [];
        let sortOrderCopy = origSortOrder.reduce((arr, val) => {
            if (val === 1) return arr;
            arr.push(val > 1 ? val - 1 : val);
            return arr;
        }, []);
        // Example: [0,2,1,3] -> [0,1,2]
        console.log('Original Sort Order:', origSortOrder, 'Adjusted Sort Order for totalsObj:', sortOrderCopy);
        
        // creating an ad-hoc session object to get total values per stack dimension
        try {
            const totalsObj = await app.createGenericObject({
                qInfo: { qType: "table" },
                qHyperCubeDef: {
                    qDimensions: [props.properties?.qHyperCubeDef.qDimensions[1]],
                    qMeasures: [
                        props.properties.qHyperCubeDef.qMeasures[0], // main kpi measure
                        props.properties.qHyperCubeDef.qMeasures[1] || { qDef: { qDef: '=Null()' } }  // optional cohort measure
                    ],
                    qInitialDataFetch: [{ qWidth: 3, qHeight: 3333 }],
                    qInterColumnSortOrder: sortOrderCopy
                }
            });
            
            if (layout.pConsoleLog) console.log('Session Object Created for Testing:', totalsObj);
            
            totalsObj.layout.qHyperCube?.qDataPages[0].qMatrix.forEach(row => {
                const dim = row[0].qText;
                const val = row[1].qNum == 'NaN' ? null : row[1].qNum;
                const cohort = row[2].qNum == 'NaN' ? null : row[2].qNum;
                totalVals[dim] = val;
                inCohort[dim] = cohort || 0;
            })

        } catch (error) {
            console.error('Error creating session totalsObj for testing:', error);
        }
        var colors = {};
        
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

        const legendSortOrder = [...positives].reverse().concat(negatives);
        if (layout.pConsoleLog) console.log('legendSortOrder', legendSortOrder);
        const stacksSortOrder = positivesPlus.concat(negativesPlus).concat(negativesMinus).concat(positivesMinus);
        if (layout.pConsoleLog) console.log('stacksSortOrder', stacksSortOrder);

        // Here follow the coloring rules, we have 4 color gradients: positives, negatives, alt1, alt2

        // Create colorsPositives and colorsNegatives: subset of positives where inCohort[key] == 0
        const colorsPositives = positives.filter(key => inCohort[key] == 0);
        const colorsNegatives = negatives.filter(key => inCohort[key] == 0);
        const colorsAlt1 = Object.keys(inCohort).filter(key => inCohort[key] == 1);
        const colorsAlt2 = Object.keys(inCohort).filter(key => inCohort[key] == 2);
        // console.log('color subsets', {colorsPositives, colorsNegatives, colorsAlt1, colorsAlt2});

        // Assign colors for positives
        colorsPositives.forEach((key, index) => {
            const factor = colorsPositives.length > 1 ? index / (colorsPositives.length - 1) : 0;
            colors[key] = moreFunctions.interpolateColor(layout.pPosStartColor, layout.pPosEndColor, factor);
        });

        // Assign colors for negatives
        colorsNegatives.forEach((key, index) => {
            const factor = colorsNegatives.length > 1 ? index / (colorsNegatives.length - 1) : 0;
            colors[key] = moreFunctions.interpolateColor(layout.pNegStartColor, layout.pNegEndColor, factor);
        });

        // Assign colors for alt1
        colorsAlt1.forEach((key, index) => {
            const factor = colorsAlt1.length > 1 ? index / (colorsAlt1.length - 1) : 0;
            colors[key] = moreFunctions.interpolateColor(layout.pAlt1StartColor, layout.pAlt1EndColor, factor);
        });


        // Assign colors for alt2
        colorsAlt2.forEach((key, index) => {
            const factor = colorsAlt2.length > 1 ? index / (colorsAlt2.length - 1) : 0;
            colors[key] = moreFunctions.interpolateColor(layout.pAlt2StartColor, layout.pAlt2EndColor, factor);
        });

        if (layout.pConsoleLog) console.log('colors ', colors);

        var chartDom = document.getElementById('chart_' + ownId);
        context.echart = echarts.init(chartDom, null, { renderer: layout.pEchartRenderer || 'canvas' });
        echart = context.echart;

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
                data: [],
                icon: 'square',
                orient: 'vertical',
                right: 10,
                top: 'center',
                type: 'scroll'
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
            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    return params.name + ': ' + moreFunctions.formatNumber(params.value, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix);
                }
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
                        show: false
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
                ecOpt.series.push({
                    ...JSON.parse(newSeries),
                    ...{ _nameForSorting: yAxisLabel + '-' }
                });
            }

            // found = 0;
            // ecOpt.series.forEach((s, i) => {
            //     if (s.name === yAxisLabel) {
            //         found++;
            //         if (found == 1) {
            //             ecOpt.series[i].data.push(!isNaN(value) ? Math.max(value, 1e-6): null);
            //         }
            //         if (found == 2) {
            //             ecOpt.series[i].data.push(!isNaN(value) ? Math.min(value, -1e-6): null);
            //         }
            //     }
            // });
        }

        // Sort legend and series
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

        // Fill missing xLabel values with null in tableData
        Object.keys(tableData).forEach(yLabel => {
            xAxisLabels.forEach(xLabel => {
                if (tableData[yLabel][xLabel] === undefined) {
                    tableData[yLabel][xLabel] = null;
                }
            });
        });

        // Populate ecOpt series data from tableData
        Object.keys(tableData).forEach(yAxisLabel => {
            xAxisLabels.forEach(xAxisLabel => {
                // console.log('Filling data for series', yAxisLabel, xAxisLabel);
                const value = tableData[yAxisLabel][xAxisLabel];

                // Find the series with '+' suffix
                const seriesPlus = ecOpt.series.find(s => s._nameForSorting === yAxisLabel + '+');
                if (seriesPlus) {
                    seriesPlus.data.push(!isNaN(value) && value !== null ? Math.max(value, 1e-6) : null);
                }

                // Find the series with '-' suffix
                const seriesMinus = ecOpt.series.find(s => s._nameForSorting === yAxisLabel + '-');
                if (seriesMinus) {
                    seriesMinus.data.push(!isNaN(value) && value !== null ? Math.min(value, -1e-6) : null);
                }
            });
        });

        if (layout.pConsoleLog) console.log('ecOpt', ecOpt);
        echart.setOption(ecOpt);

        // Initialize second chart
        var chart2Dom = document.getElementById('chart2_' + ownId);
        context.echart2 = echarts.init(chart2Dom, null, { renderer: layout.pEchartRenderer || 'canvas' });
        echart2 = context.echart2;

        // Populate ecOpt2 data
        legendSortOrder.forEach(key => {
            if (totalVals[key] !== undefined) {
                ecOpt2.series[0].data.push({
                    value: totalVals[key],
                    itemStyle: { color: colors[key] }
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
                chartDiv.hide();
                chart2Div.show();
                tableDiv.hide();
                if (echart2) echart2.resize();
            } else if (chart2Div.is(':visible')) {
                chartDiv.hide();
                chart2Div.hide();
                tableDiv.show();
            } else {
                chartDiv.show();
                chart2Div.hide();
                tableDiv.hide();
                if (echart) echart.resize();
            }
        });

        // Store chart instances for resize
        context.echart = echart;
        context.echart2 = echart2;

        if (layout.pConsoleLog) console.log('tableData', tableData);

        return qlik.Promise.resolve();
    };
});

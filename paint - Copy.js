define([
    "qlik",
    "jquery",
    "./moreFunctions",
    "./cdnjs/echarts.min"
], function (qlik, $, moreFunctions, echarts) {
    'use strict';

    // Calculates the sum per 2nd-dimension (stack) using only the last `lastEntries`
    // distinct 1st-dimension (x-axis) values found in the hypercube matrix.
    // Pass the full length of xAxisLabels as lastEntries to reproduce the session object totals.
    function calcSumLastEntries(matrix, lastEntries) {
        // Collect unique x-axis labels in their appearance order
        const xLabelsOrdered = [];
        matrix.forEach(row => {
            const xLabel = row[0].qText;
            if (!xLabelsOrdered.includes(xLabel)) xLabelsOrdered.push(xLabel);
        });

        // Keep only the trailing slice
        const lastXSet = new Set(xLabelsOrdered.slice(-lastEntries));

        // Sum measure per dim2 for rows whose dim1 falls in lastXSet
        const sums = {};
        matrix.forEach(row => {
            const xLabel = row[0].qText;
            if (!lastXSet.has(xLabel)) return;
            const dim2Label = row[1].qText;
            const value = row[2].qNum;
            if (isNaN(value) || value === null) return;
            sums[dim2Label] = (sums[dim2Label] || 0) + value;
        });

        return sums;
    }

    return async function ($element, layout, globalSettings) {
        // var self = context.self;
        const ownId = layout.qInfo.qId;
        // const echarts = context.echarts;

        // Ensure globalSettings[ownId] exists
        if (!globalSettings.hasOwnProperty(ownId)) {
            globalSettings[ownId] = {
                toggleView: layout.pDefaultToggle || 0, // 0: chart1, 1: chart2, 2: table
                echart1: null,
                echart2: null
            };
        }
        // var echart1 = globalSettings[ownId].echart1;
        // var echart2 = globalSettings[ownId].echart2;

        // const mode = qlik.navigation.getMode();
        if (layout.pConsoleLog) console.log(ownId, 'event=paint', 'layout', layout, 'globalSettings', globalSettings);
        if (layout.pConsoleLog) console.log(ownId, 'Auto-scale settings:', {
            pAutoScaleAxis: layout.pAutoScaleAxis,
            pNumberSuffixK: layout.pNumberSuffixK,
            pNumberSuffixM: layout.pNumberSuffixM
        });
        //const app = qlik.currApp(self);
        const app = qlik.currApp();

        // if (layout.pConsoleLog) console.log(ownId, 'app', app);

        // const thisSheetId = qlik.navigation.getCurrentSheetId().sheetId;
        const enigma = app.model.enigmaModel;
        const props = await app.getObjectProperties(ownId);
        if (layout.pConsoleLog) console.log(ownId, 'props.properties', props.properties);

        try {
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
                + '<div id="chart_' + ownId + '" style="height:100%;width:100%;display:none;"></div>'
                + '<div id="chart2_' + ownId + '" style="height:100%;width:100%;display:none;"></div>'
                + '<div id="table_' + ownId + '" style="height:100%;width:100%;overflow:auto;display:none;"></div>'
                + '</div>');

            // Show the correct view based on toggleView
            const chartDiv = $('#chart_' + ownId);
            const chart2Div = $('#chart2_' + ownId);
            const tableDiv = $('#table_' + ownId);
            if (globalSettings[ownId].toggleView === 0) {
                chartDiv.show();
                chart2Div.hide();
                tableDiv.hide();
            } else if (globalSettings[ownId].toggleView === 1) {
                chartDiv.hide();
                chart2Div.show();
                tableDiv.hide();
            } else {
                chartDiv.hide();
                chart2Div.hide();
                tableDiv.show();
            }

            const dim2 = layout.qHyperCube.qDimensionInfo[1].qEffectiveDimensionName;
            const measureFormula = props.properties?.qHyperCubeDef.qMeasures[0]?.qDef.qDef;

            // First pass: collect ordered x-axis labels and cohort assignments directly from the hypercube
            const xAxisLabels = [];
            const inCohort = {};
            layout.qHyperCube.qDataPages[0].qMatrix.forEach(row => {
                const xLabel = row[0].qText;
                const dim2Label = row[1].qText;
                const cohortNum = row[3] ? (row[3].qNum == 'NaN' ? null : row[3].qNum) : null;
                if (!xAxisLabels.includes(xLabel)) xAxisLabels.push(xLabel);
                if (inCohort[dim2Label] === undefined) inCohort[dim2Label] = cohortNum || 0;
            });

            // Calculate totalVals: sum per dim2 over last n or all x-axis entries
            const lastEntries = layout.pColorMode === 'last' ? (layout.pLastNEntries || 4) : xAxisLabels.length;
            const totalVals = calcSumLastEntries(layout.qHyperCube.qDataPages[0].qMatrix, lastEntries);
            if (layout.pConsoleLog) console.log(ownId, 'pColorMode=' + layout.pColorMode + ', lastEntries=' + lastEntries, 'totalVals:', totalVals);


            var colors = {};

            if (layout.pConsoleLog) console.log('totalVals ', totalVals);

            // Count positives and negatives
            const positives = [];
            const positivesCohort0or1 = [];
            const positivesCohort2 = [];
            const negatives = [];
            const negativesCohort0or1 = [];
            const negativesCohort2 = [];

            Object.entries(totalVals).sort((a, b) => b[1] - a[1]).forEach(([key, value]) => {
                if (value >= 0) {
                    positives.push(key); // append key to positives
                    if (inCohort[key] == 2) {
                        positivesCohort2.push(key);
                    } else {
                        positivesCohort0or1.push(key);
                    }
                } else {
                    negatives.unshift(key); // prepend key to negatives for reverse order
                    if (inCohort[key] == 2) {
                        negativesCohort2.unshift(key);
                    } else {
                        negativesCohort0or1.unshift(key);
                    }
                }
            });
            // make copies of positives and negatives with +/- suffixes
            const positivesCohort0or1Plus = positivesCohort0or1.map(item => item + '+');
            const positivesCohort2Plus = positivesCohort2.map(item => item + '+');
            const positivesCohort0or1Minus = positivesCohort0or1.map(item => item + '-');
            const positivesCohort2Minus = positivesCohort2.map(item => item + '-');
            const negativesCohort0or1Plus = negativesCohort0or1.map(item => item + '+');
            const negativesCohort2Plus = negativesCohort2.map(item => item + '+');
            const negativesCohort0or1Minus = negativesCohort0or1.map(item => item + '-');
            const negativesCohort2Minus = negativesCohort2.map(item => item + '-');

            // --------------------------------
            // Sorting of legend and stacks
            // --------------------------------

            var legendSortOrder = [...positivesCohort2].reverse()
                .concat([...positivesCohort0or1].reverse())
                .concat(negativesCohort0or1)
                .concat(negativesCohort2);

            if (layout.pConsoleLog) console.log('legendSortOrder', legendSortOrder);

            //var stacksSortOrder = positivesPlus.concat(negativesPlus).concat(negativesMinus).concat(positivesMinus);
            var stacksSortOrder = positivesCohort0or1Plus
                .concat(positivesCohort2Plus)
                .concat(negativesCohort0or1Plus)
                .concat(negativesCohort2Plus)
                .concat(negativesCohort0or1Minus)
                .concat(negativesCohort2Minus)
                .concat(positivesCohort0or1Minus)
                .concat(positivesCohort2Minus);

            if (layout.pConsoleLog) console.log('stacksSortOrder', stacksSortOrder);

            // --------------------------------
            // Here follow the coloring rules, we have 4 color gradients: positives, negatives, alt1, alt2
            // --------------------------------

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
            globalSettings[ownId].echart1 = echarts.init(chartDom, null, { renderer: layout.pEchartRenderer || 'canvas' });

            var ecOpt1 = {
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
                            return moreFunctions.formatNumber(value, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix, layout.pAutoScaleAxis, layout.pNumberSuffixK, layout.pNumberSuffixM);
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
                                const formattedValue = moreFunctions.formatNumber(vals[key], layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix, layout.pAutoScaleAxis, layout.pNumberSuffixK, layout.pNumberSuffixM);
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
                // title: {
                // text: 'Total Values by ' + layout.qHyperCube.qDimensionInfo[1].qFallbackTitle
                // },
                animation: false,
                tooltip: {
                    trigger: 'item',
                    formatter: function (params) {
                        return params.name + ': ' + moreFunctions.formatNumber(params.value, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix, layout.pAutoScaleAxis, layout.pNumberSuffixK, layout.pNumberSuffixM);
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
                            return moreFunctions.formatNumber(value, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix, layout.pAutoScaleAxis, layout.pNumberSuffixK, layout.pNumberSuffixM);
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
                ],
                grid: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    containLabel: false
                }
            };

            // Build data structure for table view
            var tableData = {};
            var yAxisLabels = [];

            // parsing the hypercube data into echart options
            var found = 0;

            for (const row of layout.qHyperCube.qDataPages[0].qMatrix) {
                const xAxisLabel = row[0].qText;
                const yAxisLabel = row[1].qText;
                const value = row[2].qNum;

                // Check for optional 4th element (color code)
                // if (row[3] && row[3].qText && row[3].qText.length > 1) {
                //     colors[yAxisLabel] = row[3].qText;
                // }

                // Build table data structure
                if (!tableData[yAxisLabel]) {
                    tableData[yAxisLabel] = {};
                    yAxisLabels.push(yAxisLabel);
                }
                tableData[yAxisLabel][xAxisLabel] = value;
                if (!xAxisLabels.includes(xAxisLabel)) {
                    xAxisLabels.push(xAxisLabel);
                }

                if (!ecOpt1.xAxis[0].data.includes(xAxisLabel)) {
                    ecOpt1.xAxis[0].data.push(xAxisLabel);
                }

                if (!ecOpt1.legend.data?.includes(yAxisLabel)) {
                    ecOpt1.legend.data?.push(yAxisLabel);
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
                    ecOpt1.series.push({
                        ...JSON.parse(newSeries),
                        ...{ _nameForSorting: yAxisLabel + '+' }
                    });
                    ecOpt1.series.push({
                        ...JSON.parse(newSeries),
                        ...{ _nameForSorting: yAxisLabel + '-' }
                    });
                }

            }

            // Sort legend and series
            ecOpt1.legend.data?.sort((a, b) => {
                const posA = legendSortOrder.indexOf(a);
                const posB = legendSortOrder.indexOf(b);
                return (posA === -1 ? Infinity : posA) - (posB === -1 ? Infinity : posB);
            });

            ecOpt1.series.sort((a, b) => {
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

            // Populate ecOpt1 series data from tableData
            Object.keys(tableData).forEach(yAxisLabel => {
                xAxisLabels.forEach(xAxisLabel => {
                    // console.log('Filling data for series', yAxisLabel, xAxisLabel);
                    const value = tableData[yAxisLabel][xAxisLabel];

                    // Find the series with '+' suffix
                    const seriesPlus = ecOpt1.series.find(s => s._nameForSorting === yAxisLabel + '+');
                    if (seriesPlus) {
                        seriesPlus.data.push(!isNaN(value) && value !== null ? Math.max(value, 1e-6) : null);
                    }

                    // Find the series with '-' suffix
                    const seriesMinus = ecOpt1.series.find(s => s._nameForSorting === yAxisLabel + '-');
                    if (seriesMinus) {
                        seriesMinus.data.push(!isNaN(value) && value !== null ? Math.min(value, -1e-6) : null);
                    }
                });
            });

            // Add a vertical dotted marker at the start of the color/sort range when in "last" mode
            if (layout.pColorMode === 'last' && lastEntries < xAxisLabels.length && ecOpt1.series.length > 0) {
                const rangeStartLabel = xAxisLabels[xAxisLabels.length - lastEntries];
                ecOpt1.series[0].markLine = {
                    silent: true,
                    symbol: 'none',
                    lineStyle: { type: 'dashed', color: '#888', width: 1 },
                    label: {
                        show: true,
                        formatter: 'range for colors and sorting',
                        position: 'insideStartTop',
                        fontSize: 10,
                        color: '#888'
                    },
                    data: [{ xAxis: rangeStartLabel }]
                };
            }

            if (layout.pConsoleLog) console.log('ecOpt1', ecOpt1);
            globalSettings[ownId].echart1.setOption(ecOpt1);

            // Calculate actual stacked min/max by summing values at each x-axis point
            let stackedMax = -Infinity;
            let stackedMin = Infinity;
            
            xAxisLabels.forEach((xLabel, xIndex) => {
                let positiveSum = 0;
                let negativeSum = 0;
                
                // Sum all series values at this x-axis point
                Object.keys(tableData).forEach(yLabel => {
                    const value = tableData[yLabel][xLabel];
                    if (value !== null && value !== undefined && !isNaN(value)) {
                        if (value > 0) {
                            positiveSum += value;
                        } else if (value < 0) {
                            negativeSum += value;
                        }
                    }
                });
                
                stackedMax = Math.max(stackedMax, positiveSum);
                stackedMin = Math.min(stackedMin, negativeSum);
            });
            
            const actualMax = Math.max(Math.abs(stackedMax), Math.abs(stackedMin));
            if (layout.pConsoleLog) console.log('Stacked chart actual max:', actualMax, 'stackedMax:', stackedMax, 'stackedMin:', stackedMin);
            
            // Note: Scaling is now handled by formatNumber function based on pAutoScaleAxis setting
            // No manual data scaling is performed here

            // Initialize second chart
            var chart2Dom = document.getElementById('chart2_' + ownId);
            globalSettings[ownId].echart2 = echarts.init(chart2Dom, null, { renderer: layout.pEchartRenderer || 'canvas' });
            //echart2 = context.echart2;

            // Populate ecOpt2 data
            legendSortOrder.forEach(key => {
                if (totalVals[key] !== undefined) {
                    ecOpt2.series[0].data.push({
                        value: totalVals[key],
                        itemStyle: { color: colors[key] }
                    });
                }
            });

            if (layout.pColorMode === 'last' && lastEntries < xAxisLabels.length) {
                const dim1Label = layout.qHyperCube.qDimensionInfo[0].qFallbackTitle;
                const dim2Label = layout.qHyperCube.qDimensionInfo[1].qFallbackTitle;
                ecOpt2.title = {
                    text: '',
                    subtext: 'total per ' + dim2Label + ' is calculated based on the last ' + lastEntries + ' ' + dim1Label,
                    subtextStyle: { fontSize: 10, color: '#888' },
                    top: 0,
                    left: 'center'
                };
                ecOpt2.grid.top = 30;
            }

            globalSettings[ownId].echart2.setOption(ecOpt2);



            // Build HTML table
            const outOfRangeXLabels = new Set(xAxisLabels.slice(0, xAxisLabels.length - lastEntries));
            let tableHtml = '<table style="border-collapse:collapse;width:100%;font-size:12px;">';
            tableHtml += '<thead><tr><th style="border:1px solid #ccc;padding:5px;background:#f0f0f0;position:sticky;top:0;left:0;z-index:2;"></th>';
            xAxisLabels.forEach(xLabel => {
                const dimColor = outOfRangeXLabels.has(xLabel) ? 'color:#bbb;' : '';
                tableHtml += '<th style="border:1px solid #ccc;padding:5px;background:#f0f0f0;position:sticky;top:0;' + dimColor + '">' + xLabel + '</th>';
            });
            tableHtml += '</tr></thead><tbody>';

            legendSortOrder.forEach(yLabel => {
                if (tableData[yLabel]) {
                    const bgColor = colors[yLabel] || '#f0f0f0';
                    const textColor = moreFunctions.getContrastColor(bgColor);
                    tableHtml += '<tr><td style="border:1px solid #ccc;padding:5px;background:' + bgColor + ';font-weight:bold;color:' + textColor + ';position:sticky;left:0;z-index:1;">' + yLabel + '</td>';
                    xAxisLabels.forEach(xLabel => {
                        const val = tableData[yLabel][xLabel];
                        const cellValue = val !== undefined ? moreFunctions.formatNumber(val, layout.pFmtDecimals, layout.pFmtThousandSep, layout.pFmtDecimalSep, layout.pNumberPrefix, layout.pNumberSuffix, layout.pAutoScaleAxis, layout.pNumberSuffixK, layout.pNumberSuffixM) : '';
                        const cellStyle = outOfRangeXLabels.has(xLabel) ? 'border:1px solid #ccc;padding:5px;text-align:right;color:#bbb;' : 'border:1px solid #ccc;padding:5px;text-align:right;';
                        tableHtml += '<td style="' + cellStyle + '">' + cellValue + '</td>';
                    });
                    tableHtml += '</tr>';
                }
            });
            tableHtml += '</tbody></table>';

            $('#table_' + ownId).html(tableHtml);

            // Add 3-way toggle functionality
            $('#toggleBtn_' + ownId).off('click').on('click', function () {
                // Increment toggleView and wrap to 0 if >2
                globalSettings[ownId].toggleView = (globalSettings[ownId].toggleView + 1) > 2 ? 0 : globalSettings[ownId].toggleView + 1;
                // Show/hide views based on toggleView
                if (globalSettings[ownId].toggleView === 0) {
                    chartDiv.show();
                    chart2Div.hide();
                    tableDiv.hide();
                    if (globalSettings[ownId].echart1) globalSettings[ownId].echart1.resize();
                } else if (globalSettings[ownId].toggleView === 1) {
                    chartDiv.hide();
                    chart2Div.show();
                    tableDiv.hide();
                    if (globalSettings[ownId].echart2) globalSettings[ownId].echart2.resize();
                } else {
                    chartDiv.hide();
                    chart2Div.hide();
                    tableDiv.show();
                }
            });

            // // Store chart instances for resize
            // context.echart = echart;
            // context.echart2 = echart2;

            if (layout.pConsoleLog) console.log('tableData', tableData);
        } catch (error) {
            console.error('Error in paint function:', error);
        }
        return qlik.Promise.resolve();
    };
});

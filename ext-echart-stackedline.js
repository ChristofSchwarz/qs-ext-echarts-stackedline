define(["qlik", 
    "jquery", 
    "./props", 
    "./cdnjs/echarts.min"
    // echarts.min.js from https://www.cdnpkg.com/echarts/file/echarts.min.js/?id=32956
], function (qlik, $, props, echarts) {

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
                    qWidth: 3,
                    qHeight: Math.floor(10000 / 3) // divide 10000 by qWidt
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
                    max: 1
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

            $element.html(
                '<div id="parent_' + ownId + '" style="height:100%;width:100%;position:relative;">'
                + '<span id="toggleBtn_' + ownId + '" style="position:absolute;top:-8px;right:40px;cursor:pointer;background:#f0f0f0;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;z-index:1000;" title="Toggle view">i</span>'
                + '<div id="chart_' + ownId + '" style="height:100%;width:100%;"></div>'
                + '<div id="table_' + ownId + '" style="height:100%;width:100%;overflow:auto;display:none;"></div>'
                + '</div>');

            const dim2 = props.properties?.qHyperCubeDef.qDimensions[1]?.qDef.qFieldDefs[0];
            const measureFormula = props.properties?.qHyperCubeDef.qMeasures[0]?.qDef.qDef;
            const totalValsDef = `Aggr('"' & [${dim2}] & '":' & Num(${measureFormula},'','.',' '), [${dim2}])`;
            if (layout.pConsoleLog) console.log('totalValsDef', totalValsDef);
            var totalVals = await enigma.evaluate(`=Concat(${totalValsDef}, ',')`);

            var colors = {};
            if (totalVals) {
                totalVals = JSON.parse('{' + totalVals + '}');
                // Sort totalVals by values (descending)
                totalVals = Object.fromEntries(
                    Object.entries(totalVals).sort((a, b) => b[1] - a[1])
                );

                // Count positives and negatives
                const positives = [];
                const negatives = [];
                Object.entries(totalVals).forEach(([key, value]) => {
                    if (value >= 0) {
                        positives.push(key);
                    } else {
                        negatives.push(key);
                    }
                });

                // Helper function to interpolate between two colors
                function interpolateColor(color1, color2, factor) {
                    const c1 = parseInt(color1.slice(1), 16);
                    const c2 = parseInt(color2.slice(1), 16);

                    const r1 = (c1 >> 16) & 0xff;
                    const g1 = (c1 >> 8) & 0xff;
                    const b1 = c1 & 0xff;

                    const r2 = (c2 >> 16) & 0xff;
                    const g2 = (c2 >> 8) & 0xff;
                    const b2 = c2 & 0xff;

                    const r = Math.round(r1 + factor * (r2 - r1));
                    const g = Math.round(g1 + factor * (g2 - g1));
                    const b = Math.round(b1 + factor * (b2 - b1));

                    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                }

                // Assign colors for positives
                positives.forEach((key, index) => {
                    const factor = positives.length > 1 ? index / (positives.length - 1) : 0;
                    colors[key] = interpolateColor(layout.pPosStartColor, layout.pPosEndColor, factor);
                });

                // Assign colors for negatives
                negatives.forEach((key, index) => {
                    const factor = negatives.length > 1 ? index / (negatives.length - 1) : 0;
                    colors[key] = interpolateColor(layout.pNegStartColor, layout.pNegEndColor, factor);
                });

                if (layout.pConsoleLog) console.log('totalVals ', totalVals);
                if (layout.pConsoleLog) console.log('colors ', colors);

                var chartDom = document.getElementById('chart_' + ownId);
                echart = echarts.init(chartDom);

                var ecOpt = {
                    animation: false,
                    xAxis: [{
                        type: 'category',
                        name: layout.pXAxisLabel ? layout.qHyperCube.qDimensionInfo[0].qFallbackTitle : '',
                        nameLocation: 'middle',
                        nameGap: 30,
                        nameTextStyle: { fontSize: 14 },
                        data: [],
                        boundaryGap: layout.pBoundaryGap
                    }],
                    yAxis: [{
                        type: 'value',
                        name: layout.pYAxisLabel ? layout.qHyperCube.qMeasureInfo[0].qFallbackTitle : '',
                        nameLocation: 'middle',
                        nameGap: 40,
                        nameTextStyle: { fontSize: 14 }
                    }],
                    tooltip: {
                        trigger: 'axis', // or 'axis'
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
                            for (const [key, value] of Object.entries(vals)) {
                                ttip += `<span style='color:${colors[key]};'>\u25CF</span>${key} : ${Math.round(value * 100) / 100}<br>`;
                            }
                            return `<div>
                        <strong>${params[0].axisValueLabel}</strong><br>
                        ${ttip}
                        </div>`;
                        }
                    },
                    legend: {
                        show: layout.pShowLegend != 'off',
                        data: [],
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
                        feature: {
                            saveAsImage: {}
                        }
                    }
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
                        ecOpt.series.push(JSON.parse(newSeries));
                        ecOpt.series.push(JSON.parse(newSeries)); // we add it twice.
                    }
                    // Find all matching series indices
                    found = 0;
                    ecOpt.series.forEach((s, i) => {
                        if (s.name === yAxisLabel) {
                            found++;
                            if (found == 1) { // add the postive value or 0 to the first series
                                ecOpt.series[i].data.push(Math.max(value, 1e-7));
                            }
                            if (found == 2) { // add the negative value or -1e-7 to the second series
                                ecOpt.series[i].data.push(Math.min(value, -1e-7));
                            }
                        }
                    });
                }

                // Sort legend.data and series based on position in totalVals
                if (totalVals) {
                    const totalValsKeys = Object.keys(totalVals);

                    ecOpt.legend.data?.sort((a, b) => {
                        const posA = totalValsKeys.indexOf(a);
                        const posB = totalValsKeys.indexOf(b);
                        return (posA === -1 ? Infinity : posA) - (posB === -1 ? Infinity : posB);
                    });

                    ecOpt.series.sort((a, b) => {
                        const posA = totalValsKeys.indexOf(a.name);
                        const posB = totalValsKeys.indexOf(b.name);
                        return (posA === -1 ? Infinity : posA) - (posB === -1 ? Infinity : posB);
                    });
                }

                if (layout.pConsoleLog) console.log('ecOpt', ecOpt);
                echart.setOption(ecOpt);
                
                // Build HTML table
                let tableHtml = '<table style="border-collapse:collapse;width:100%;font-size:12px;">';
                tableHtml += '<thead><tr><th style="border:1px solid #ccc;padding:5px;background:#f0f0f0;position:sticky;top:0;"></th>';
                xAxisLabels.forEach(xLabel => {
                    tableHtml += '<th style="border:1px solid #ccc;padding:5px;background:#f0f0f0;position:sticky;top:0;">' + xLabel + '</th>';
                });
                tableHtml += '</tr></thead><tbody>';
                
                yAxisLabels.forEach(yLabel => {
                    tableHtml += '<tr><td style="border:1px solid #ccc;padding:5px;background:#f0f0f0;font-weight:bold;">' + yLabel + '</td>';
                    xAxisLabels.forEach(xLabel => {
                        const val = tableData[yLabel][xLabel];
                        const cellValue = val !== undefined ? val.toFixed(2) : '';
                        tableHtml += '<td style="border:1px solid #ccc;padding:5px;text-align:right;">' + cellValue + '</td>';
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</tbody></table>';
                
                $('#table_' + ownId).html(tableHtml);
                
                // Add toggle functionality
                $('#toggleBtn_' + ownId).off('click').on('click', function() {
                    const chartDiv = $('#chart_' + ownId);
                    const tableDiv = $('#table_' + ownId);
                    
                    if (chartDiv.is(':visible')) {
                        chartDiv.hide();
                        tableDiv.show();
                    } else {
                        tableDiv.hide();
                        chartDiv.show();
                        if (echart) echart.resize();
                    }
                });
            }
            else {
                $element.html('<div style="padding:10px;color:#900;">No data available to display the chart.</div>');
            }
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
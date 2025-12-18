define(["qlik"], function (qlik) {
    'use strict';

    return async function ($element, layout, globalSettings) {

        const ownId = layout.qInfo.qId;
        // const mode = qlik.navigation.getMode();
        if (layout.pConsoleLog) console.log(ownId, 'event=resize', 'layout', layout, 'globalSettings', globalSettings);
        try {
            globalSettings[ownId].echart1.resize();
        }
        catch { }
        try {
            globalSettings[ownId].echart2.resize();
        }
        catch { }
    };
});

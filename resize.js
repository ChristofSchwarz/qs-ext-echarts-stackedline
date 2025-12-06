define([], function () {
    'use strict';

    return async function ($element, layout, context) {
        const ownId = context.ownId;
        const mode = qlik.navigation.getMode();
        if (layout.pConsoleLog) console.log(ownId, 'event=resize', 'mode=' + mode, 'layout', layout);
        if (context.echart) {
            context.echart.resize();
        }
        if (context.echart2) {
            context.echart2.resize();
        }
    };
});

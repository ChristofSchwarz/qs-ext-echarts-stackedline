define([], function () {
    'use strict';

    return {
        // Helper function to interpolate between two colors
        interpolateColor: function (color1, color2, factor) {
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
        , formatNumber: function (num, decimals, thousandSep, decimalSep, prefix, suffix) {
            // usage:
            // formatNumber(1234567.89, 0, ' ', ',', '', '') --> "1 234 568"
            // formatNumber(1234567.89, 1, '.', ',', '', '') --> "1.234.567,9"
            // formatNumber(1234567.89, 2, "'", ".", '$', '') --> "$1'234'567.89"
            // formatNumber(1234567.89, 2, "'", ".", '', '%') --> "1'234'567.89%"
            const fixed = num.toFixed(decimals);
            const parts = fixed.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
            return (prefix || '') + parts.join(decimalSep) + (suffix || '');
        }
        , getContrastColor: function (hexColor) {
            // Convert hex to RGB
            const hex = hexColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Calculate relative luminance
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            
            // Return black for light backgrounds, white for dark backgrounds
            return luminance > 0.5 ? '#000' : '#fff';
        }
    };
});

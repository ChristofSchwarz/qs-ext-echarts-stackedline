# Apache echarts implementation for Qlik Sense

This extension creates a chart like this with a

- target-value (which is also the 'continuous' x-axis)
- a (measured) value
- a lower and upper limit, which will be shown as a confidence-area
- a trend line

If the measured value is outside of lower and upper limit it is painted in a separate color.

![image](https://user-images.githubusercontent.com/15999058/197381480-8bbe14db-3858-46cf-8eef-9518f3c03406.png)

All labels and colors can be defined in the extension.

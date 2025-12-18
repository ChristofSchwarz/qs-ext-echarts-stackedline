# Apache echarts implementation for Qlik Sense

This extension creates a stacked line chart like this from two dimensions and a measure
 - Dim 1) The x-axis dimension (typically a time dimension like months)
 - Dim 2) The y-axis dimension: the data series by which the lines will be stacked e.g. countries
 - Measure 1) The value 
 - Optional Measure 2) a color cohort

All labels and colors can be defined in the extension.

Use a 2nd measure and think of it in the dimensionality of the stack-dimension (that is the 2nd dimension, e.g. countries): it should 
return 1 for "orange" cohort and 2 for "grey" cohort and 0 or Null() for default.

 - The default cohort receives blue and red colors (positives and negatives are colored separately). This is also the case when the 2nd measure is not used.  
 - cohort 1 receives orange colors and it does not affect the sorting sequence. The orange color tones will be on positive and negative numbers.
 - cohort 2 receives grey colors and also it will affect the sorting sequence: this cohort will show on the very top or very bottom of the stacked area chart.

Example:
<img width="1232" height="775" alt="Screenshot" src="https://github.com/user-attachments/assets/1bb526ff-a1cd-4e11-af74-a5f9393cafd8" />



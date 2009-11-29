// This file was automatically generated from caleftar.soy.
// Please don't edit this file by hand.

goog.provide('pleft.caleftar.tpl');

goog.require('soy');
goog.require('soy.StringBuilder');


pleft.caleftar.tpl.widget = function(opt_data, opt_sb) {
  var output = opt_sb || new soy.StringBuilder();
  output.append('<div class="dp-selected-container"><div class="dp-selected-header">Proposed dates:</div><div class="dp-selected-times"></div></div><div class="dp-week-days"></div><div class="dp-container"><div class="dp-label"><a class="dp-choose .dp-up" style="visibility: hidden">▲</a><span class="dp-month-label"></span><a class="dp-choose .dp-down">▼</a></div><div class="dp-days"></div></div>');
  if (!opt_sb) return output.toString();
};

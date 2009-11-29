/*
 * Effects used by Pleft.
 * Copyright 2009 Sander Dijkhuis <sander@pleft.com>.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *   
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Idea: Use CSS animations in WebKit:
//       http://ejohn.org/blog/css-animations-and-javascript/

goog.provide('pleft.fx.Margin');

goog.require('goog.fx.dom.PredefinedEffect');

pleft.fx.Margin = function(element, start, end, time, opt_acc) {
  if (start.length != 2 || end.length != 2) {
    throw Error('Start and end points must be 2D');
  }
  goog.fx.dom.PredefinedEffect.apply(this, arguments);
};
goog.inherits(pleft.fx.Margin, goog.fx.dom.PredefinedEffect);

pleft.fx.Margin.prototype.updateStyle = function() {
  this.element.style.marginLeft = Math.round(this.coords[0]) + 'px';
  this.element.style.marginTop = Math.round(this.coords[1]) + 'px';
};

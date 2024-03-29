/*
 * Caleftar: multiple date/time entry.
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

// Ideas:
// - Use -webkit-transition for animations when available. This might make it
//   work well on the iPhone too. (Requires re-implementing some goog.fx.)
// - Use Closure Templates to simplify code.

goog.provide('pleft.caleftar.Caleftar');

goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.fx.easing');
goog.require('goog.ui.CustomButton');
goog.require('soy');
goog.require('pleft.caleftar.tpl');
goog.require('pleft.fx.Margin');
goog.require('pleft.ui.TimeEntry');

pleft.caleftar.Caleftar = function() {
  // For ease of programming, we sometimes accept 2009/12 as a month, which is
  // interpreted as 2010/0 (January 2010). In cases where we do not allow for
  // this, we call values normalized.

  // Note that Monday is 0 here (Sunday is 0 in Date()).
  this.Months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                 'Oct', 'Nov', 'Dec'];
  this.Days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // this.months[year][month] is a <div> containing day boxes.
  this.months = {};
  
  // The added times (seconds since 1970-01-01 0:00 UTC).
  this.times = [];
  
  // The currently shown day pop-up.
  this.popUp = null;
  
  // The currently shown year and month. These get updated by Datepicker.show().
  this.year = this.month = -1;
  
  // The most recent year and month that are added to this.months.
  this.lastYear = this.lastMonth = -1;
  
  // Automatically fill in the last used time.
  this.lastTime = new Date(0, 0, 1, 12);
};

pleft.caleftar.Caleftar.prototype.getDatesString = function() {
  var s = '';

  for (var i = 0; i < this.times.length; i++) {
    var time = new Date(this.times[i]);
    var month = time.getMonth() + 1;
    if (month < 10) {
      month = '0' + month;
    }
    var day = time.getDate();
    if (day < 10) {
      day = '0' + day;
    }
    var hours = time.getHours();
    if (hours < 10) {
      hours = '0' + hours;
    }
    var minutes = time.getMinutes();
    if (minutes < 10) {
      minutes = '0' + minutes;
    }
    s += time.getFullYear() + '-' + month + '-' + day + 'T' + hours
         + ':' + minutes + ':' + '00\n';
  }

  return s.slice(0, -1);
};

pleft.caleftar.Caleftar.prototype.create = function(el) {
  this.el = el;

  goog.dom.classes.add(el, 'dp-picker');

  soy.renderElement(el, pleft.caleftar.tpl.widget);

  this.selected = goog.dom.$$('div', 'dp-selected-times', el)[0];

  // Add Mon/Tue/Wed/etc.
  var weekDays = goog.dom.$$('div', 'dp-week-days', el)[0];
  for (var i = 0; i < this.Days.length; i++)
    weekDays.appendChild(goog.dom.createDom('span', null, this.Days[i]));

  // Month selector.
  this.up = goog.dom.$$('a', 'dp-choose', el)[0];
  goog.events.listen(this.up, goog.events.EventType.CLICK, function() {
    this.show(this.year, this.month - 1);
  }, false, this);

  var down = goog.dom.$$('a', 'dp-choose', el)[1];
  goog.events.listen(down, goog.events.EventType.CLICK, function() {
    this.show(this.year, this.month + 1);
  }, false, this);
  
  // Month name.
  this.monthLabel = goog.dom.$$('span', 'dp-month-label', el)[0];

  // Contain the day boxes.
  this.days = goog.dom.$$('div', 'dp-days', el)[0];

  // We initially show the month containing today. It might be better to let
  // the API user specify an initial day, in case older dates should be shown.
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth();

  // Add the last few days of the previous month.
  this.addPreviousMonth(year, month);
  
  // Is the month added next even or odd? (Used for the background color.)
  this.even = true;
  
  // Show (and add) the current month.
  this.show(year, month);
  
  this.updateSelected();
};

// Makes sure that a certain month is available for showing. Assumes that the
// arguments are normalized.
pleft.caleftar.Caleftar.prototype.makeAvailable = function(year, month) {
  // Add months until the specified month is added.
  while (this.lastYear < year
         || (this.lastYear == year && this.lastMonth <= month))
    this.addMonth(this.lastYear, this.lastMonth + 1);
};

// Shows a certain month. Makes it available if needed.
pleft.caleftar.Caleftar.prototype.show = function(year, month) {
  // Normalize the arguments.
  var normal = new Date(year, month);
  year = normal.getFullYear();
  month = normal.getMonth();
  
  // Close any pop-up.
  if (this.popUp)
    this.popUp.close();

  this.makeAvailable(year, month);

  var monthElt = goog.dom.$$('div', 'dp-day',
                             this.months[normal.getFullYear()]
                                        [normal.getMonth()])[0];
  var calElt = goog.dom.getAncestorByTagNameAndClass(this.days, 'DIV',
                                                     'dp-picker');
  var orig = parseInt(this.days.style.marginTop.replace('px', ''));
  if (!orig)
    orig = 0;

  function findTop(obj) {
    var cur = 0;
    if (obj.offsetParent) {
      do {
        cur += obj.offsetTop;
      } while (obj = obj.offsetParent);
    }
    return cur;
  }
  var pos = findTop(monthElt) - findTop(this.days);

  var anim = new pleft.fx.Margin(this.days,
                                 [0, orig], [0, -pos],
                                 300, goog.fx.easing.inAndOut);
  anim.play();

  this.monthLabel.innerHTML = this.Months[normal.getMonth()]
                              + ' ' + normal.getFullYear();

  goog.dom.classes.add(this.months[year][month], 'dp-selected');
  if (this.year != -1)
    goog.dom.classes.remove(this.months[this.year][this.month], 'dp-selected');

  this.year = year;
  this.month = month;
  
  // Hide the 'up' button iff today is shown.
  if (year == new Date().getFullYear() && month == new Date().getMonth())
    this.up.style.visibility = 'hidden';
  else
    this.up.style.visibility = 'visible';
};

// Add the specified month.
pleft.caleftar.Caleftar.prototype.addMonth = function(year, month) {
  // Normalize the arguments.
  var normal = new Date(year, month);
  year = normal.getFullYear();
  month = normal.getMonth();

  var nDays = new Date(year, month + 1, 0).getDate();

  // First week day.
  var first = (new Date(year, month, 1).getDay() + 6) % 7;

  // Contains the day boxes.
  var div = goog.dom.createDom('div', 'dp-month');
  this.days.appendChild(div);
  div.appendChild(goog.dom.createDom('span', 'dp-which-year', year + ''));
  div.appendChild(goog.dom.createDom('span', 'dp-which-month', month + ''));
  for (var i = 0; i < nDays; i++) {
    var day = this.addDay(year, month, i + 1);
    goog.dom.classes.add(day, this.even ? 'dp-even' : 'dp-odd');
    div.appendChild(day);
  }
  
  // Add to this.months if needed.
  if (!this.months[year])
    this.months[year] = {};
  this.months[year][month] = div;
  
  this.lastYear = year;
  this.lastMonth = month;
  
  this.even = !this.even;
};

// Adds those days of the last month that appear in the first week of the
// current month.
pleft.caleftar.Caleftar.prototype.addPreviousMonth = function(year, month) {
  var previous = new Date(year, month, 0);

  // First weekday of the current month.
  var firstCurrent = (new Date(year, month, 1).getDay() + 6) % 7;
  
  // Last day of the previous month.
  var lastPrevious = previous.getDate();

  var div = goog.dom.createDom('div', 'dp-month');
  this.days.appendChild(div);
  for (var i = firstCurrent - 1; i >= 0; i--) {
    var day = this.addDay(previous.getFullYear(), previous.getMonth(),
                          lastPrevious - i);
    goog.dom.classes.add(day, 'dp-odd');
    div.appendChild(day);
  }
  
  this.lastYear = previous.getFullYear();
  this.lastMonth = previous.getMonth();
};

// Opens the popup for a day given by element. Closes other popups if needed.
pleft.caleftar.Caleftar.prototype.openDay = function(element) {
  if (this.popUp)
    this.popUp.close();
  this.popUp = new pleft.caleftar.DayPopUp(this, element);
};

pleft.caleftar.Caleftar.prototype.addDay = function(year, month, day) {
  var elt = goog.dom.createDom('div', 'dp-day');
  
  function onDayClick() {
    this.openDay(elt);
  }

  var past = false;

  var box = goog.dom.createDom('div', 'dp-box');
  elt.appendChild(box);

  var content = goog.dom.createDom('div', 'dp-c');
  box.appendChild(content);
   
  var today = new Date();
  if (today.getFullYear() == year
      && today.getMonth() == month
      && today.getDate() == day) {
    goog.dom.classes.add(elt, 'dp-today');
    content.appendChild(goog.dom.createDom('div', 'dp-today-indicator',
                                           'today'));
  } else if (today.getTime() > new Date(year, month, day).getTime())
    past = true;
 

  var dayElt = goog.dom.createDom('div', 'dp-day-label', day + '');
  content.appendChild(dayElt);
  
  var times = goog.dom.createDom('div', 'dp-times');
  content.appendChild(times);

  if (past)
    goog.dom.classes.add(elt, 'dp-past');
  else
    goog.events.listen(box, goog.events.EventType.CLICK, onDayClick,
                       false, this);
  
  return elt;
};

pleft.caleftar.Caleftar.prototype.deleteTime = function(time) {
  for (var i = 0; i < this.times.length; i++) {
    if (this.times[i] == time) {
      this.times.splice(i, 1);
      break;
    }
  }
  this.updateSelected();
};

pleft.caleftar.Caleftar.prototype.updateDay = function(year, month, day) {
  var elt = goog.dom.$$('div', 'dp-times', this.months[year][month].childNodes
                                           .item(day + 1))[0];
  elt.innerHTML = '';

  var begin = new Date(year, month, day).getTime();
  var end = new Date(year, month, day + 1).getTime();
  var n = 0;
  for (var i = 0; i < this.times.length; i++) {
    if (this.times[i] < begin || this.times[i] > end)
      continue;
    
    n++;
    if (n > 2)
      break;
    
    elt.innerHTML += this.formatTime(new Date(this.times[i])) + '<br>';
  }
  if (n > 2)
    elt.innerHTML += '…';
};

pleft.caleftar.Caleftar.prototype.updateSelected = function() {
  this.selected.innerHTML = '';

  if (this.times.length == 0) {
    this.selected.innerHTML = 'No times are selected yet.';
  }

  for (var i = 0; i < this.times.length; i++) {
    var elt = goog.dom.createDom('div', 'dp-date');
    this.selected.appendChild(elt);
    elt.appendChild(goog.dom.createDom('span', 'dp-which-time',
                                       this.times[i] + ''));

    var span = goog.dom.createDom('span', null,
                                  this.formatDate(this.times[i]));
    elt.appendChild(span);
    goog.events.listen(span, goog.events.EventType.CLICK, function(event) {
      var time = goog.dom.$$('span', 'dp-which-time',
                             event.target.parentNode)[0].innerHTML;
      var date = new Date(parseInt(time));
      
      var timeout = 0;
      
      if (!(this.year == date.getFullYear()
            && this.month == date.getMonth())) {
        timeout = 300;
        this.show(date.getFullYear(), date.getMonth());
      }

      window.setTimeout((function(dp, date) {
        return function() {
          var box = goog.dom.$$('div', 'dp-box',
                                dp.months[date.getFullYear()][date.getMonth()])
                    [date.getDate() - 1];
          dp.openDay(box.parentNode);
        };
      })(this, date), timeout);
    }, false, this);
    
    var button = goog.dom.createDom('a', 'dp-date-delete', '×');
    elt.appendChild(button);
    goog.events.listen(button, goog.events.EventType.CLICK,
        function(event) {
      var time = goog.dom.$$('span', 'dp-which-time', event.target.parentNode)
                 [0].innerHTML;
      this.deleteTime(time);
      var date = new Date(parseInt(time));
      this.updateDay(date.getFullYear(), date.getMonth(), date.getDate());
      if (this.popUp)
        this.popUp.updateTimes();
    }, false, this);
  }
};

pleft.caleftar.DayPopUp = function(dp, elt) {
  this.dp = dp;

  function findTop(obj) {
    var cur = 0;
    if (obj.offsetParent) {
      do {
        cur += obj.offsetTop;
      } while (obj = obj.offsetParent);
    }
    return cur;
  }

  var pos = { left: elt.offsetLeft,
              top: findTop(elt) + elt.clientHeight };
 
  // Find the date.
  var monthElt = elt.parentNode;
  this.day = parseInt(goog.dom.$$('div', 'dp-day-label', elt)[0].innerHTML);
  this.month = parseInt(goog.dom.$$('span', 'dp-which-month', monthElt)
                        [0].innerHTML);
  this.year = parseInt(goog.dom.$$('span', 'dp-which-year', monthElt)
                       [0].innerHTML);
  
  this.popUp = goog.dom.createDom('div', 'dp-popup');
  this.popUp.style.position = 'absolute';
  this.popUp.style.top = pos.top + 'px';
  this.popUp.style.overflow = 'hidden';
  elt.appendChild(this.popUp);

  this.popUp.style.width = this.popUp.style.height = '128px';
  this.popUp.style.overflow = 'visible';
  this.popUp.style.marginLeft = '-32px';
  this.popUp.style.marginTop = '-96px';

  // TODO: make the transition smoother before re-applying it.
  if (false) {
  var anim = new goog.fx.dom.Resize(this.popUp,
                                    [64, 64], [128, 128],
                                    200, goog.fx.easing.easeOut);
  // TODO: make the close button appear more nicely.
  goog.events.listen(anim, goog.fx.Animation.EventType.END, function() {
    this.popUp.style.overflow = 'visible';
  }, false, this);
  anim.play();

  anim = new pleft.fx.Margin(this.popUp, [0, -64], [-32, -96],
                             200, goog.fx.easing.easeOut);
  anim.play();
  }

  var content = goog.dom.createDom('div', 'dp-content');
  this.popUp.appendChild(content);

  var title = goog.dom.createDom('div', 'dp-title');
  title.innerHTML = '<b>' + this.day + '</b> ' + this.dp.Months[this.month];
  content.appendChild(title);
  
  this.times = goog.dom.createDom('div', 'dp-popup-times');
  content.appendChild(this.times);
  
  content.appendChild(goog.dom.createDom('div', 'dp-entry-label',
                                         'Add a time:'));
  
  var entryDiv = goog.dom.createDom('div', 'dp-entry');
  content.appendChild(entryDiv);
 
  var settings = {
    defaultTime: this.dp.lastTime,
    show24Hours: true 
  };
  this.timeEntry = new pleft.ui.TimeEntry(settings);
  this.timeEntry.create(entryDiv);

  this.entry = entryDiv.getElementsByTagName('input').item(0);
  this.entry.focus();

  goog.events.listen(this.entry, goog.events.EventType.KEYDOWN,
                     function(event) {
    if (event.keyCode == 13) { // Enter
      this.add();
    } else if (event.keyCode == 27) { // Escape
      this.close();
    }
  }, false, this);

  var button = goog.dom.createDom('a', 'dp-enter');
  content.appendChild(button);
  goog.events.listen(button, goog.events.EventType.CLICK, function(event) {
    event.preventDefault();
    this.add();
    return false;
  }, false, this);
 
  var close = goog.dom.createDom('span', 'dp-close');
  this.popUp.appendChild(close);
  goog.events.listen(close, goog.events.EventType.CLICK, function() {
    this.close();
  }, false, this);

  this.updateTimes();
};

pleft.caleftar.Caleftar.prototype.formatDate = function(time) {
  var date = new Date(time);

  var s = this.Days[(date.getDay() + 6) % 7] + ' ' + date.getDate() + ' '
         + this.Months[date.getMonth()];
  if (date.getFullYear() > new Date().getFullYear()) {
    s += ' ' + date.getFullYear();
  }
  s += ', ' + this.formatTime(date);

  return s;
};

pleft.caleftar.Caleftar.prototype.formatTime = function(time) {
  return time.getHours() + ':' + ((time.getMinutes() < 10) ? '0' : '')
         + time.getMinutes();
};

pleft.caleftar.DayPopUp.prototype.add = function() {
  this.entry.focus();
  this.dp.days.parentNode.scrollTop = 0;

  var time = this.timeEntry.getTime();
  
  if (!time)
    return

  var full = new Date(this.year, this.month, this.day,
                      time.getHours(), time.getMinutes()).getTime();
  for (var i = 0; i < this.dp.times.length; i++)
    if (this.dp.times[i] == full)
      return;

  this.dp.times.push(full);
  this.dp.times.sort();
  
  this.updateTimes();
  
  this.dp.updateDay(this.year, this.month, this.day);
  this.dp.updateSelected();
};

pleft.caleftar.DayPopUp.prototype.updateTimes = function() {
  this.times.innerHTML = '';
  
  var begin = new Date(this.year, this.month, this.day).getTime();
  var end = new Date(this.year, this.month, this.day + 1).getTime();
  for (var i = 0; i < this.dp.times.length; i++) {
    if (this.dp.times[i] < begin || this.dp.times[i] > end)
      continue;

    var timeBox = goog.dom.createDom('span', 'dp-time-box',
                                     this.dp.formatTime(new Date(
                                         this.dp.times[i])));
    this.times.appendChild(timeBox);
    timeBox.appendChild(goog.dom.createDom('span', 'dp-which-time',
                                           new Date(this.dp.times[i]).getTime()
                                           + ''));

    var deleteButton = goog.dom.createDom('a', 'dp-time-delete', '×');
    timeBox.appendChild(deleteButton);
    goog.events.listen(deleteButton, goog.events.EventType.CLICK, function() {
      this.dp.deleteTime(goog.dom.$$('span', 'dp-which-time',
                                     deleteButton.parentNode)[0].innerHTML);
      this.updateTimes();
      this.dp.updateDay(this.year, this.month, this.day);

      return;
    }, false, this);
  }
};

pleft.caleftar.DayPopUp.prototype.close = function() {
  goog.dom.removeNode(this.popUp);
  this.dp.popUp = null;
  this.dp.lastTime = this.timeEntry.getTime();
};

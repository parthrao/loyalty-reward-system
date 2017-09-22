module.exports.compareFullDates = function(date1, date2) {
  if(date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate())
    return true;

  return false;
}

module.exports.isTodayLessThanEndDate = function(today, end_date) {
  if(today.getFullYear() < end_date.getFullYear()) {
    return true;
  }
  else if(today.getFullYear() == end_date.getFullYear() && today.getMonth() < end_date.getMonth()) {
    return true;
  }
  else if(today.getFullYear() == end_date.getFullYear() && today.getMonth() == end_date.getMonth() && today.getDate() <= end_date.getDate()) {
    return true
  }
  else {
    return false;
  }

}

module.exports.getPastDate = function(days) {
  var newDate = new Date();
  newDate.setDate(newDate.getDate() - days);
  console.log('newDate ==', newDate);
  return newDate;
}

module.exports.getFirstDayOfWeek = function() {
  var firstDayOfWeek = new Date();
  firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
  console.log('firstDayOfWeek ==', firstDayOfWeek);
  return firstDayOfWeek;
}

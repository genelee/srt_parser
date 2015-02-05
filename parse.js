var fs = require('fs');
var Transform = require('stream').Transform;

function rawToJson(rawData, callback) {
  var i = 0 // global line counter
  
  var subtitles = [];
  rawData.map(function(rawSub){
    i = 0;
    var subLines = rawSub.split('\r\n');
    
    // process time
    if (subLines[1]) {
      var chars = subLines[1].split("");
      var from = {
        'hours' : chars.slice(0,2).join(''),
        'minutes' : chars.slice(3,5).join(''),
        'seconds' : chars.slice(6,8).join(''),
        'millis' : chars.slice(9,12).join('')
      }
      var to = {
        'hours' : chars.slice(17,19).join(''),
        'minutes' : chars.slice(20,22).join(''),
        'seconds' : chars.slice(23,25).join(''),
        'millis' : chars.slice(26,29).join('')
      }
    }
    
    var json = {
      'id' : subLines[0],
      'time' : {
        'from' : from,
        'to' : to
      },
      'sub1' : subLines[2]
    }
    // check for subs with 2 lines
    if (subLines.length == 4) {
      json.sub2 = subLines[3];
    }
    
    subtitles.push(json);
    if (subtitles.length == (rawData.length - 1)) {
      callback(subtitles);
    }
    i++;
  });
}

var parseToJson = function(file, callback){
  fs.readFile(file, 'utf8', function(err, data) {
    var raw_subtitles = String(data).split("\r\n\r\n");
    rawToJson(raw_subtitles, function(json){
      callback(json);
    });
  });
}

var writeJsonToPath = function(json, path, callback){
  mapToStringData(json, function(data){
    fs.writeFile(path, data, function(err) {
      if (err) throw err;
      else callback();
    })
  });
}

function mapToStringData(json, callback){
  var subtitles = json;
  var all_sub_str = "";
  //prep json
  for (var i in subtitles) {
    var subtitle = subtitles[i];
    getSubtitleStringData(subtitle, function(sub_str){
      all_sub_str += sub_str + '\n\n';
      if (i == (subtitles.length - 1)) {
        callback(all_sub_str);
      } else {
        i++;
      }
    });
  }
}

function getSubtitleStringData(subtitle, callback){
  var from = subtitle.time.from;
  var to = subtitle.time.to;
  
  var sub_str = subtitle.id + '\n';
  sub_str += from.hours + ":" + from.minutes + ":" + from.seconds + "," + from.millis
  + " --> " + to.hours + ":" + to.minutes + ":" + to.seconds + "," + to.millis + "\n";
  sub_str += subtitle.sub1 + (subtitle.sub2 ? '\n' + subtitle.sub2 : "");
  callback(sub_str);
}

function transformTime(json, transform, callback) {
  for (var i in json) {
    var subtitle = json[i];
    var from = subtitle.time.from;
    var to = subtitle.time.to;
    console.log('old from : ' + JSON.stringify(from));
    fromMillis = convertToMillis(from.hours, from.minutes, from.seconds, from.millis);
    toMillis = convertToMillis(to.hours, to.minutes, to.seconds, to.millis);
    
    fromMillis += (transform * 1000);
    toMillis += (transform * 1000);
    // weird speed monkey patch?
    fromMillis = (fromMillis * 1.0024)
    toMillis += (toMillis * 1.0024)
    
    convertToTime(fromMillis, function(hours, minutes, seconds, millis) {
      //console.log(hours + minutes + seconds + millis);
      from.hours = hours;
      from.minutes = minutes;
      from.seconds = seconds;
      from.millis = millis;
    });
    
    console.log('new from : ' + JSON.stringify(from));
    
    convertToTime(toMillis, function(hours, minutes, seconds, millis) {
      //console.log(hours + minutes + seconds + millis);
      to.hours = hours;
      to.minutes = minutes;
      to.seconds = seconds;
      to.millis = millis;
    });
    if (i == (json.length - 1)) {
      callback(json);
    }
  }
  
  function convertToMillis(hours, minutes, seconds, millis){
    var total_millis = (1000 * 60 * 60 * parseInt(hours))
      + (1000 * 60 * parseInt(minutes))
      + (1000 * parseInt(seconds))
      + parseInt(millis); 
    return total_millis
  }
  
  function convertToTime(duration, callback) {
    var millis = parseInt((duration%1000))
      , seconds = parseInt((duration/1000)%60)
      , minutes = parseInt((duration/(1000*60))%60)
      , hours = parseInt((duration/(1000*60*60))%24);
      
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    millis = (millis < 100 && millis >= 10) ? "0" + millis : millis;
    millis = (millis < 10) ? "00" + millis : millis;
    millis = (millis === 0) ? "000" : millis;
    if (millis.length === 0) {
      console.log('less than 3 digits');
    }
    
    callback(hours, minutes, seconds, millis);
  }
  
}

parseToJson('./subtitles.srt', function(json) {
  // transform time
  transformTime(json, 37.5, function(transformed_json){
    writeJsonToPath(transformed_json, './edited-subtitles.srt', function(){
      console.log('done');
    });
  });
});


// Some programs like `head` send an error on stdout
// when they don't want any more data
process.stdout.on('error', process.exit);
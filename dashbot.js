/*
dashbot.js
==========

Because the last thing you need during the competition is a heartless automaton
breathing down your neck...

Installation:
-------------

* brew install node
* brew install npm
* npm install postgres
* npm install irc

Run it with ``node dashbot.js``.
*/
var author = 'Daniel Lindsley';
var version = [0, 9, 1];
var license = 'BSD';

var irc = require('irc');
var postgres = require('postgres');
var sys = require('sys');

var mainchannel = '#djangodash';
var dbname = 'djangodash';

// We want objects, not arrays.
var conn = postgres.createConnection("host='' dbname="+dbname);
conn.mapTupleItems = true;

var start_date = new Date(2010, 7, 14, 0, 0, 0);
var end_date = new Date(2010, 7, 15, 23, 59, 59);
var ann_time;
var last_dance = new Date();

var client = new irc.Client('irc.freenode.net', 'DjangoDashBot', {
    channels: [mainchannel],
    realName: "Django Dash Bot",
});


function watch_for_commits() {
  // sys.log("Checking for new commits...");
  var now = new Date();
  var query = "SELECT m.commit_username, t.name, c.message, c.revision \
  FROM contest_commit AS c, teams_team AS t, teams_teammember AS m \
  WHERE c.user_id = m.id \
  AND c.team_id = t.id \
  AND current_timestamp - c.created < interval '1 minute' \
  ORDER BY c.created;";
  
  conn.query(query, function(err, results) {
    if(err) {
      sys.log(""+err+"");
      return;
    }
    
    if(results.length > 0) {
      sys.log("Found new commits: "+sys.inspect(results));
      
      for(var commit_offset in results) {
        var commit = results[commit_offset];
        var response = "COMMIT - "+commit['commit_username']+" ("+commit['name']+") commited "+commit['revision']+' - "'+commit['message']+'".';
        sys.log(response);
        try {
          client.say(mainchannel, response);
        }
        catch(err) {
          sys.log("Oops (watch_for_commits).");
        }
      }
    }
  });
  
  setTimeout(watch_for_commits, 1000*60);
}

// Start the commit watching bits.
watch_for_commits();


function announce_time_left() {
  var now = new Date();
  var microseconds_left = end_date - now;
  
  if(microseconds_left <= 0) {
    clearTimeout(ann_time);
    return;
  }
  
  if(start_date - now > 0) {
    return;
  } 
  
  if(now.getMinutes() == 0 && now.getSeconds() < 1) {
    try {
      client.say(mainchannel, time_left());
    }
    catch(err) {
      sys.log("Oops (announce_time_left).");
    }
    clearTimeout(ann_time);
    ann_time = setTimeout(announce_time_left, 1000*60);
  }
  else {
    ann_time = setTimeout(announce_time_left, 500);
  }
}

// Start the announce time bits.
announce_time_left();

function random_choice(choices) {
  return choices[Math.floor(Math.random()*choices.length)];
}

function time_left() {
  var now = new Date();
  var microseconds_left = end_date - now;
  
  if(microseconds_left <= 0) {
    return "It's OVER!";
  }
  
  var options = [
    [1000*60*60*24, "days left"],
    [1000*60*60, "hours left"],
    [1000*60, "seconds left"],
  ]
  var choice = options[Math.floor(Math.random()*options.length)];
  var converted = (microseconds_left / choice[0]).toFixed(2);
  return "Only "+converted+" "+choice[1]+"!";
}

function dance() {
  var now = new Date();
  
  if(now - last_dance > 1000*60*1) {
    last_dance = now;
    return [
      'O/-<',
      'O|-<',
      'O\-<',
      'O>-<',
    ];
  }
  else {
    return [];
  }
}

function direct_mention(from, to, message) {
  var cleaned_message = message.replace("DjangoDashBot: ", "").replace("DjangoDashBot:", "").replace("DjangoDashBot, ", "").replace("DjangoDashBot,", "").replace("DjangoDashBot", "").toLowerCase();
  var random_greetings = [
    "Yo.",
    "What's up?",
    "You rang?",
    "You're talking to a bot, silly!",
    "Where's the @djangopony when I need her?",
    "Sorry, no comprende.",
  ];
  
  if(cleaned_message == 'help') {
    var response = ""+from+": Your options are - timeleft, dance, botsnack, help.";
    client.say(to, response);
  }
  else if(cleaned_message == 'timeleft') {
    var response = ""+from+": "+time_left();
    client.say(to, response);
  }
  else if(cleaned_message == "dance") {
    var moves = dance();
    for(var move in moves) {
      client.say(to, moves[move]);
    }
  }
  else if(cleaned_message == "botsnack") {
    var response = ""+from+": That was delicious! You're my hero.";
    client.say(to, response);
  }
  else {
    var response = ""+from+": "+random_choice(random_greetings);
    client.say(to, response);
  }
}

function indirect_mention(from, to, message) {
  client.say(to, "I'm the DjangoDashBot, bitches!");
}

client.addListener('message', function(from, to, message) {
  sys.log("From: "+from+" - To: "+to+" - Message: "+message);
  
  if(message.indexOf('DjangoDashBot') != -1) {
    // Make sure it doesn't respond to itself.
    if(from == 'DjangoDashBot') {
      return;
    }
    
    sys.log(""+from+" said my name! I'm totally talking back...");
    
    if(message.indexOf('DjangoDashBot') == 0) {
      direct_mention(from, to, message);
    }
    else {
      indirect_mention(from, to, message);
    }
  }
})

client.addListener('pm', function(from, message) {
  client.say(from, "Sorry, I don't do well with private conversations.");
  sys.log(""+from+" tried talking with me privately: "+message);
})

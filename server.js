

// +++ attribution for translate API
// https://developers.google.com/translate/v2/attribution

try { require('newrelic'); } catch(e) { }

// heroku assigns port randomly, when running locally, port==5000
var port = process.env.PORT || 5000;

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var less = require("less-middleware");
var request = require("request");
var _ = require("underscore");
_.str = require("underscore.string");
var _mysql = require("mysql");

var Translate = require('./lib/translate.js')
var translate = new Translate();

var config = {};

try {
	config = require('./config/config.js');
} catch (e) {
	// config file not available; try heroku config vars
	config = {
		google_api_key: process.env.google_api_key
	};
}

if (!config.google_api_key) {
	console.log(" -> Google API key not defined!");
	process.exit(1);
}
if (!config.mysql) {
	console.log(" -> MySQL credentials not defined!");
	process.exit(1);
}

translate.setGoogleApiKey(config.google_api_key);

mysql = null;

function connect_mysql()
{
	mysql = _mysql.createConnection(config.mysql);

	mysql.connect(function(err) {
		if (err) {
			console.log('Could not connect to MySQL database!');
			return;
		}

		console.log('Connected to MySQL database as ' + mysql.threadId);
	});

	mysql.on('error', function(err) {
		if (err.code == 'PROTOCOL_CONNECTION_LOST') {
			console.log('- mysql lost connection, reconecting...');

			connect_mysql();
		}
		else {
			console.log('- unknown mysql error: ');
			console.log(err);
		}
	});

}

connect_mysql();


var users = [];
var stats = {
	connected_clients: 0,
	time_start: Date.now()
};


// set up URL for css files (to be compiled from less on the fly)
app.use(less(__dirname + '/less', {
	dest: __dirname + '/public',
	preprocess: {
		path: function(pathname, req) {
			return pathname.replace('/css/', '/');
		}
	}
	// ,debug: true,
}));
app.use(express.static(__dirname + '/public'));

// URL Routes
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/index.html');
});

app.get('/js/worldchat.js', function(req, res) {
	res.sendfile(__dirname + "/public/js/worldchat.js");
});

app.get('/css/bootstrap-cerulean.min.css', function(req, res) {
	res.sendfile(__dirname + "/public/css/bootstrap-cerulean.min.css");
});

http.listen(port, function() {
	console.log(' >> Listening on port ' + port);
});



io.on('connect', function (socket) {

	// CONNECT
	var user = {id: socket.id};
	users.push(user);

	displayUsers();
	socket.emit("users", {users: getUsers()});

	stats.connected_clients++;

	// DISCONNECT
	socket.on('disconnect', function() {
		stats.connected_clients--;

		// broadcast user left
		// chatroom.userLeft()
		var user = removeUser(socket.id);
		if (user.name) {
			socket.broadcast.emit('left', {
				id: user.id,
				name: user.name,
				lang: user.lang ? user.lang : null
			});
		}

	});

	// UPDATE USER DATA
	socket.on('update', function(data) {
		
		var user = updateUser(socket.id, data);
		displayUsers();

		//
		// user joins the chat 
		//
		if (data.joined) {
			// broadcast user joined
			// chatroom.userJoined()
			io.emit('joined', {
				id: user.id,
				name: user.name,
				lang: user.lang ? user.lang : null
			});

			// join the room for their specific language
			socket.join(user.lang);
		}

	});

	// MESSAGE
	socket.on('msg', function(message) {

		var from_user = loadUserById(socket.id);
		var debug = "> " + from_user.name + ": " + message + " (" + from_user.lang + ")";
		var languages = getActiveLanguages();

		// no translation when from_lang == target_lang
		socket.broadcast.to(from_user.lang).emit('msg', {
			translated: message,
			from_user: from_user.name,
			lang_from: from_user.lang,
			lang_to: from_user.lang
		});
		

		// translate for every other active language
		_.each( _.without(languages, from_user.lang) , function(target_lang) {

			translate.translate({
				text: message,
				source: from_user.lang,
				target: target_lang
			}, function(translation, error) {

				if (error) {
					console.log("TranslationError: " + error);
				}
				else
				{
					// debug
					var this_debug = debug + ' -> ' + translation + " (" + target_lang + ")";
					console.log(this_debug);

					// send data
					// chatroom.sendMessage()
					io.to(target_lang).emit('msg', {
						original: message,
						translated: translation,
						lang_from: from_user.lang,
						lang_to: target_lang,
						from_user: from_user.name
					});
				}
				
			});

		});

	});

});

function getActiveLanguages()
{
	return _.uniq(_.compact(_.pluck(users, "lang")));
}

function getUsers()
{
	var userlist = [];

	_.each(users, function(user, i) {
		if (user.name) {
			userlist.push({
				name: users[i].name,
				lang: users[i].lang,
				id: users[i].id
			});
		}
	});
	
	return userlist;
}

function removeUser(user_id)
{
	for (var i=users.length-1; i >= 0; i--) {
		var user = users[i];

		if (user.id === user_id) {
			users.splice(i, 1);
			return user;
		}
	}
}

function updateUser(user_id, data)
{
	for (var i=0; i<users.length; i++) {
		if (users[i].id === user_id) {
			if (data.name) {
				users[i].name = data.name;
			}
			if (data.lang) {
				users[i].lang = data.lang;
			}
			return users[i];
		}
	}
}

function loadUserById(user_id) {
	return _.findWhere(users, {id: user_id});
}

function displayUsers()
{
	console.log("Current user list:");
	_.each(users, function(user, i) {
		var debug = user.id;
		
		if (user.lang) {
			debug += " | " + user.lang;
		}
		if (user.name) {
			debug += " | " + user.name;
		}
		
		console.log(" - " + debug);
	});
}
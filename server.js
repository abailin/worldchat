

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

var config = {};

try {
	config = require('./config/config.js');
} catch (e) {
	// config file not available; try heroku config vars
	config = {
		google_api_key: process.env.google_api_key
	};
}

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
		var user = removeUser(socket.id);
		if (user.name) {
			socket.broadcast.emit('left', {
				name: user.name,
				lang: user.lang ? user.lang : null
			});
		}

	});

	// UPDATE USER DATA
	socket.on('update', function(data) {
		
		var user = updateUser(socket.id, data);
		displayUsers();

		if (data.joined) {
			// broadcast user joined
			io.emit('joined', {
				name: user.name,
				lang: user.lang ? user.lang : null
			});
		}

	});

	// MESSAGE
	socket.on('msg', function(message) {

		var user = loadUserById(socket.id);

		var debug = "> " + user.name + ": " + message + " (" + user.lang + ")";
		

		// list languages
		// var url = "https://www.googleapis.com/language/translate/v2/languages?key=" + config.google_api_key;

		// translate this message
		var url = "https://www.googleapis.com/language/translate/v2?key=" + config.google_api_key + "&q=" + message + "&source=en&target=fr";

		request(url, function(error, response, body) {
			if (!error && response.statusCode == 200) {

				var translation = JSON.parse(body);
				var translated = translation.data.translations[0].translatedText;

				debug += ' -> ' + translated + " (fr)";
				console.log(debug);

				socket.broadcast.emit('msg', {
					original: message,
					translated: translated,
					lang_from: "en",
					lang_to: "fr",
					from_user: user.name
				});
			}
			else {
				var error_json = JSON.parse(body);
				console.log("Error: ", error_json);
			}
		});
	});

});



function getUsers()
{
	var userlist = [];

	_.each(users, function(user, i) {
		if (user.name) {
			userlist.push({
				name: users[i].name,
				lang: users[i].lang
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
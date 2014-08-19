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

// "npm install request" did not install request to package.json ----
// +++ might need to add request@2.40.0
// or do "npm install request --save"

var config = {};

try {
	config = require('./config/config.js');
} catch (e) {
	// config file not available; try heroku config vars
	config = {
		google_api_key: process.env.google_api_key
	};
}

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


io.on('connection', function (socket) {
	socket.emit('msg', { message: 'Welcome.' });

	stats.connected_clients++;

	socket.on('disconnect', function() {
		stats.connected_clients--;
	});

	socket.on('lang', function(lang) {
		console.log("language set as " + lang);
	});

	socket.on('msg', function(message) {
		console.log('"' + message + '"');

		// list languages
		// var url = "https://www.googleapis.com/language/translate/v2/languages?key=" + config.google_api_key;

		var url = "https://www.googleapis.com/language/translate/v2?key=" + config.google_api_key + "&q=" + message + "&source=en&target=fr";

		request(url, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log(body);
			}
			else {
				var message = JSON.parse(body);
				console.log("Error: ", message);
			}
		});
	});

});

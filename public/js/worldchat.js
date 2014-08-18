var App = {

	socket: null,
	config: {},
	stats: {},
	selectors: {},

	init: function() {
		this.initSocket();
		this.initUI();

	},

	initUI: function() {


		this.selectors.$intro = $(".intro");
		this.selectors.$chat_window = $(".chat-window");
		this.selectors.$input_text = $("#input-text");
		this.selectors.$btn_send_message = $("#btn-send-message");
		this.selectors.$language_select = $(".intro select");


		this.selectors.$btn_send_message.on("click", function(e) {
			e.preventDefault();
			App.sendMessage();
		});

		this.selectors.$input_text.on("keypress", function(e) {

			if (e.which == 13 && !e.shiftKey) {
				e.preventDefault();
				App.sendMessage();
			}

		});

		this.selectors.$intro.find("button").on("click", function(e) {
			App.setLanguage( App.selectors.$language_select.val() );
			App.selectors.$intro.addClass("hidden");
			App.selectors.$chat_window.removeClass("hidden");
		});
	},

	initSocket: function() {
		this.socket = io.connect();

		// when we get a "stats" update from server
		this.socket.on("stats", function(response) {

			// $(".server-connected-clients").text(response.data.cc);
			console.log("Connected clients: ", response);
						
		});
		
		// when we get a "msg" update from server (coordinates)
		this.socket.on("msg", function(data) {

			console.log('Message: "' + data.message + '"  ', data);

		});
	},

	clearInput: function() {
		App.selectors.$input_text.val("");
	},
	focusInput: function() {
		App.selectors.$input_text.focus();
	},

	setLanguage: function(lang) {
		App.socket.emit("lang", lang);
	},

	sendMessage: function() {
		var text = this.selectors.$input_text.val();
		App.clearInput();
		App.focusInput();
		console.log("Send: " + message);
		App.socket.emit('msg', message);
	}
};


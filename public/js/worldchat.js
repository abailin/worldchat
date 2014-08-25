var App = {

	socket: null,
	config: {},
	stats: {},
	selectors: {},
	User: {},

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
		this.selectors.$input_name = $(".input-username");
		this.selectors.$messages = $(".messages");
		this.selectors.$btn_chat_now = $(".btn-chat-now");

		// click "send message"
		this.selectors.$btn_send_message.on("click", function(e) {
			e.preventDefault();
			App.sendMessage();
		});

		// [enter] in message window
		this.selectors.$input_text.on("keypress", function(e) {

			if (e.which == 13 && !e.shiftKey) {
				e.preventDefault();
				App.sendMessage();
			}

		});

		// [enter] in username field
		this.selectors.$input_name.on("keypress", function(e) {
			
			if (e.which == 13 && !e.shiftKey) {

				App.sendUpdate( {
					lang: App.selectors.$language_select.val(),
					name: App.selectors.$input_name.val(),
					joined: 1
				} );

				App.selectors.$intro.addClass("hidden");
				App.selectors.$chat_window.removeClass("hidden");
				App.User.name = App.selectors.$input_name.val();
				App.User.lang = App.selectors.$language_select.val();
			}
			
		});

		// click "chat now"
		this.selectors.$btn_chat_now.on("click", function(e) {
			App.sendUpdate( {
				lang: App.selectors.$language_select.val(),
				name: App.selectors.$input_name.val(),
				joined: 1
			} );

			App.selectors.$intro.addClass("hidden");
			App.selectors.$chat_window.removeClass("hidden");
			App.User.name = App.selectors.$input_name.val();
			App.User.lang = App.selectors.$language_select.val();
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

			App.addMessageToConversation({
				from_user: data.from_user,
				message: data.translated,
				original: data.original,
				lang_from: data.lang_from,
				lang_to: data.lang_to
			});

		});

		this.socket.on("joined", function(user) {
			console.log("JOINED", user);
			App.displayUserJoined(user);
		});

		this.socket.on("left", function(user) {
			console.log("LEFT", user);
			App.displayUserLeft(user);
		});

		this.socket.on("users", function(data) {
			console.log("USERS", data);
		});
	},

	clearInput: function() {
		App.selectors.$input_text.val("");
	},
	focusInput: function() {
		App.selectors.$input_text.focus();
	},
	scrollMessagesToBottom: function() {
		App.selectors.$messages.scrollTop( App.selectors.$messages[0].scrollHeight );
	},

	sendUpdate: function(data) {
		App.socket.emit("update", data);
	},

	addMessageToConversation: function(data) {

		var tmpl = $("#tmpl-message-line").html();

		App.selectors.$messages.append(_.template(tmpl, {o: data}));
		this.scrollMessagesToBottom();
	},

	sendMessage: function() {
		var text = this.selectors.$input_text.val();
		App.clearInput();
		App.focusInput();

		App.socket.emit('msg', text);
		App.addMessageToConversation({
			message: text,
			from_user: App.User.name,
			lang_from: App.User.lang
		});
	},

	displayUserJoined: function(user) {
		var tmpl = $("#tmpl-message-user-joined").html();
		App.selectors.$messages.append(_.template(tmpl, {o: user}));
		this.scrollMessagesToBottom();
	},

	displayUserLeft: function(user) {
		var tmpl = $("#tmpl-message-user-left").html();
		App.selectors.$messages.append(_.template(tmpl, {o: user}));
		this.scrollMessagesToBottom();
	}
};


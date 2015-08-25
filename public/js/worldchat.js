var App = {

	socket: null,
	config: {},
	stats: {},
	selectors: {},
	User: {},

	init: function() {
		this.initSocket();
		this.initUI();

		this.Userlist = new models.UserList();
		this.UserlistView = new views.UserList({
			collection: this.Userlist
		});

		this.UserlistView.render();
	},

	initUI: function() {

		this.selectors.$intro = $(".intro");
		this.selectors.$chat_window = $(".chat-window");
		this.selectors.$wrapper_main = $(".wrapper-main");
		this.selectors.$input_text = $("#input-text");
		this.selectors.$btn_send_message = $("#btn-send-message");
		this.selectors.$language_select = $(".intro select");
		this.selectors.$input_name = $(".input-username");
		this.selectors.$messages = $(".messages");
		this.selectors.$message_container = $(".message-container");
		this.selectors.$btn_start = $(".btn-start");


		// focus name
		$(".form-group-name input").focus();

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
				App.sendJoinedPacket(App.selectors.$input_name.val(), App.selectors.$language_select.val());
				App.showChatroom();
			}
		});

		// click "chat now"
		this.selectors.$btn_start.on("click", function(e) {
			App.sendJoinedPacket(App.selectors.$input_name.val(), App.selectors.$language_select.val());
			App.UI.showChatroom();
		});

	},

	sendJoinedPacket: function(name, language) {

		App.User.name = name;
		App.User.lang = language;

		App.sendUpdate( {
			lang: language,
			name: name,
			joined: 1
		} );
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
			
			var u = new models.User({name: user.name, lang: user.lang, id: user.id});
			App.Userlist.add(u);
		});

		this.socket.on("left", function(user) {
			console.log("LEFT", user);
			App.displayUserLeft(user);
			App.Userlist.remove(App.Userlist.get(user.id));
		});

		this.socket.on("users", function(data) {
			console.log("USERS", data);
			if (data.users.length) {
				_.each(data.users, function(user) {
					var u = new models.User({name: user.name, lang: user.lang, id: user.id});
					App.Userlist.add(u);
				});
			}
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

App.UI = {
	showChatroom: function() {
		$(".chatroom-container").show();
		$(".heading-small").show();
		$(".heading-main").hide();

	}
};
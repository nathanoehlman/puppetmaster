var EventEmitter = require('eventemitter2').EventEmitter2;

function Peer(id, dc) {
	this.id = id;
	this.dc = dc;
	this.events = new EventEmitter();

	var peer = this;
	dc.onmessage = function(message) {
		var data = JSON.parse(message.data);
		peer.events.emit('message', message, peer);

		if (data.action) {
			peer.events.emit(data.action, data, peer, message);
		}
	}

	dc.onclose = function() {
		peer.events.emit('close');
	}

	console.log(dc);
}

Peer.prototype.json = function(obj) {
	this.dc.send(JSON.stringify(obj));
}

module.exports = Peer;
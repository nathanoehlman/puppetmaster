var quickconnect = require('rtc-quickconnect');
var crel = require('crel');
var qsa = require('fdom/qsa');
var tweak = require('fdom/classtweak');
var reRoomName = /^\/room\/(.*?)\/?$/;
var room = location.pathname.replace(reRoomName, '$1').replace('/', '');

var querystring = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=');
        if (p.length != 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));

// local & remote video areas
var local = qsa('.local')[0];
var remotes = qsa('.remote');

// get the message list DOM element
var messages = qsa('#messageList')[0];
var chat = qsa('#commandInput')[0];

// data channel & peers
var channel;
var peerMedia = {};

// use google's ice servers
var iceServers = [
  { url: 'stun:stun.l.google.com:19302' }
  // { url: 'turn:192.158.29.39:3478?transport=udp',
  //   credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
  //  username: '28224511:1379330808'
  // },
  // { url: 'turn:192.158.29.39:3478?transport=tcp',
  //   credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
  //   username: '28224511:1379330808'
  // }
];

// capture local media
var localMedia = media({
  constraints: captureConfig('camera min:1280x720').toConstraints()
});

// render a remote video
function renderRemote(id, stream) {
  var activeStreams;

  // create the peer videos list
  peerMedia[id] = peerMedia[id] || [];

  activeStreams = Object.keys(peerMedia).filter(function(id) {
    return peerMedia[id];
  }).length;

  console.log('current active stream count = ' + activeStreams);
  peerMedia[id] = peerMedia[id].concat(media(stream).render(remotes[activeStreams % 2]));
}

function removeRemote(id) {
  var elements = peerMedia[id] || [];

  // remove old streams
  console.log('peer ' + id + ' left, removing ' + elements.length + ' elements');
  elements.forEach(function(el) {
    el.parentNode.removeChild(el);
  });
  peerMedia[id] = undefined;
}

function appendChat(message, chatType) {
  if (messages) {
    messages.appendChild(crel('li', { class: chatType }, message));  
  }
  
}

// render our local media to the target element
localMedia.render(local);

// once the local media is captured broadcast the media
localMedia.once('capture', function(stream) {

  var storage = window.localStorage;
  var chatterId = querystring['chatterid'] || storage.getItem('chatterid');

  function promptChatterId() {
    var id = prompt('Please provide added chat identifier');
    if (!id) return promptChatterId();
    storage.setItem('chatterid', id);
    return id;
  }

  if (!chatterId) chatterId = promptChatterId();
    
  // handle the connection stuff
  var qc = quickconnect(location.href.split('?')[0] + '../../', {
    // debug: true,    
    room: room,
    iceServers: iceServers,
    disableHeartbeat: true
  })
  .addStream(stream)
  .createDataChannel('chat')
  .on('stream:added', renderRemote)
  .on('stream:removed', removeRemote)
  .on('channel:opened:chat', function(id, dc) {
    // qsa('.chat').forEach(tweak('+open'));
    dc.onmessage = function(evt) {
      appendChat(evt.data);
    };

    // save the channel reference
    channel = dc;
    console.log('dc open for peer: ' + id);
  });

  qsa('.chat').forEach(tweak('+open'));
  appendChat('Joining ' + room + ' as ' + chatterId, 'system-chat');
  var informant = edgar(qc, { server: 'http://edgar-listener.elasticbeanstalk.com' });
  // var informant = edgar(qc, { server: 'http://localhost:6320' });
  // Add compression with { compress: true }
  qc.profile({ tags: ['edgar-chat', 'rtcio-demo-quickconnect'], name: chatterId });
});

// handle chat messages being added
if (chat) {
  chat.addEventListener('keydown', function(evt) {
    if (evt.keyCode === 13) {
      appendChat(chat.value, 'local-chat');
      chat.select();
      if (channel) {
        channel.send(chat.value);
      }
    }
  });
}

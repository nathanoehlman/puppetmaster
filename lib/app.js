var uuid = require('uuid');
var qs = require('qs');
var quickconnect = require('rtc-quickconnect');
var mesh = require('rtc-mesh');
var crel = require('crel');
var qsa = require('fdom/qsa');
var tweak = require('fdom/classtweak');
var Peer = require('./peer');
var params = qs.parse(location.href.substring(location.href.indexOf('?') + 1)) || {};

if (!params.network) {
  params.network = prompt('Enter network id');
}
if (!params.alias) {
  params.alias = prompt('Enter peer alias');
}

// handle the connection stuff
var qc = quickconnect('https://rtc.io/switchboard', {
  room: params.network,
  iceServers: [ { url: 'stun:stun.l.google.com:19302' } ],
  disableHeartbeat: true
});


var peers = {};

function getInstruction() {
  var instruction = prompt('Supply URL');
  if (instruction) {
    return { action: 'url', url: instruction };
  }  
  return null;
}

function handlePeer() {
  var el = this;
  var id = el.getAttribute('data-peer');

  var instruction = getInstruction();
  if (instruction) {
    var peer = peers[id];
    peer.json(instruction);
  }
}

function broadcast() {
  var el = this;

  var instruction = getInstruction();
  if (instruction) {
    for (var id in peers) {
      var peer = peers[id];
      peer.json(instruction);
    }
    setUrl(instruction.url, true);
  }  
}

function refresh() {
  var keys = Object.keys(peers);
  var menu = document.getElementById('open-button');
  menu.innerHTML = keys.length + ' peers';

  var list = qsa('#peerList')[0];
  for (var i = 0; i < keys.length; i++) {
    var peer = peers[keys[i]];
    var existing = qsa('#' + peer.id)[0]
    if (existing) continue;
    var element = crel('a', { href: '#', class: 'peer-link', 'data-peer': peer.id, id: peer.id }, peer.alias);  
    element.addEventListener('click', handlePeer);
    list.appendChild(element);
  }
}

function setUrl(url, trusted) {
  console.log('Switching to URL %s', url);
  if (params.block && !trusted) return;
  var element = qsa('#browser')[0];
  element.src = url;
}

// var control = mesh(qc, { channelName: 'control' });
qc.createDataChannel('operation')
.on('channel:opened:operation', function(id, dc) {

  console.log('channel opened to ' + id);
  var peer = new Peer(id, dc);

  peer.events.on('connect', function(data, peer, message) {
    console.log('Peer connected %s', peer.id);
    peer.alias = data.alias;
    peers[peer.id] = peer;
    refresh();
  });

  peer.events.on('close', function() {
    console.log('Peer disconnected %s', peer.id);
    console.log(arguments);
    delete peers[peer.id];
    var existing = qsa('#' + peer.id)[0];
    if (existing) existing.remove();
    refresh();
  });

  peer.events.on('url', function(data) {
    setUrl(data.url);
  });

  peer.json({ action: 'connect', id: id, alias: params.alias });

  qsa('#broadcast')[0].addEventListener('click', broadcast);
});
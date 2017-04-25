// To do:
// - Fade out and disable a player without money
// - Make this a full game? (socket.io + old monopoly simulation) 

'use strict'

var KEY_ESC = 27;
var KEY_ENTER = 13;

var currentId = 0;
var payToAmount = null;
var performer = null;
var players = [];

// Utility
function isNumber(i) { return typeof i === 'number'; }
function nextId() { return currentId++; }
function inRange(n, a, b) { return (n >= a && n <= b); }

function enablePersonButtons(con) {
	$('.player').each(function(i) {
		$(this).find('.target-btn').html( ($(this).attr('id') == performer && con) ? 'Cancel' : 'Me' );
		$(this).find('.target-btn').attr('disabled', !con);
	});
}

// Player class
function Player(name, account, id) {
	this.name = name || 'John';
	this.account = account || 15000;
	this.id = id || nextId();
}
// Get button functionality
function getAmount(player, am) {
	am = parseInt(am, 10);
	if(isNumber(am) && !isNaN(am))
		player.account += am;
	update();
};
// Pay button functionality
function payAmount(player, am) {
	am = parseInt(am, 10);
	if(isNumber(am) && !isNaN(am))
		player.account -= am;
	update();
};
// Set new action target
function payTarget(bel) {
	var id = bel.parentElement.parentElement.id;
	if(isNumber(payToAmount) && !isNaN(payToAmount)) {
		players[performer].account -= payToAmount;
		players[id].account += payToAmount;
	}
	enablePersonButtons(false);
	update();
}
// Save players to local storage
function savePlayers() {
	localStorage.setItem('players', JSON.stringify(players));
}
// Load players from local storage
function loadPlayers() {
	// Clear old players
	players = [];
	$('.players').html('');
	currentId = 0;

	var newPlayers = JSON.parse(localStorage.getItem('players'));
	// Add new players
	for(var i in newPlayers) {
		addPlayer(newPlayers[i].name, newPlayers[i].account, newPlayers[i].id);
	}

	enablePersonButtons(false);
}
// Add player to manager
function addPlayer(name, account, id) {
	//
	// Recreate players to add prototypes
	var p = new Player(name, account, id);
	if(p.id >= currentId)
		currentId = p.id + 1;

	$('<div class="player" id="'+p.id+'">\
			<button class="btn-close">×</button>\
			<div class="name">'+p.name+'</div>\
			<div class="account">$'+p.account+'</div>\
			<div class="btn-group">\
				<button class="btn-get">Get</button>\
				<button class="btn-pay">Pay</button>\
				<button class="btn-pay-to">Pay To</button>\
				<button class="target-btn" onclick="payTarget(this)">Me</button>\
			</div>\
			<input type="text"</input>\
		</div>').appendTo('.players');
	// return;
	if(players.indexOf(p) < 0)
		players[p.id] = p;
	else
		console.log('Player already exists');
}

function update() {
	var payToAmount = null;
	var performer = null;
	$('.player').each(function() {
		var id = $(this).attr('id');
		if(players[id] !== undefined) {	
			$(this).find('.account').html('$'+players[id].account);
			$(this).find('input').val('');
		}
	});
	savePlayers();
}

function add() {
	var input = $('#add-form input');
	var name = escape(input.val());
	if(name.length > 0){
		addPlayer(name);
		showWindow(false);
		enablePersonButtons(false);
	}
	update();
}

function showWindow(id, parent){
	// Hide all windows
	$('#add-form').hide();
	$('#user-sure').hide();
	// Show selected window or hide overlay
	if(id){
		$(id).show();
		$('.overlay').fadeIn(100);
	} else {
		$('.overlay').fadeOut(100);
	}
	// Clear input
	$('#add-form input').val('');
}

function main() {
	// Get button
	$(document).on('click', '.btn-get', function(){
		// Parent container
		var pe = $(this).parent().parent();
		getAmount(players[pe.attr('id')], pe.find('input').val());
		enablePersonButtons(false);
	});
	// Pay button
	$(document).on('click', '.btn-pay', function(){
		// Parent container
		var pe = $(this).parent().parent();
		payAmount(players[pe.attr('id')], pe.find('input').val());
	});
	// Pay to button
	$(document).on('click', '.btn-pay-to', function(){
		// Parent container
		var pe = $(this).parent().parent();
		performer = pe.attr('id');
		payToAmount = parseInt(pe.find('input').val(), 10);;
		enablePersonButtons(true);
	});

	// Player add button shows overlay menu
	$('.btn-overlay').click(function(){ 
		showWindow('#add-form');
		$('#add-form input').focus();
	});
	// Submit button adds player with name from inout
	$('#add-form button').click(add);
	// If user click outside of form window, hide overlay
	$('.overlay').click(function(e){
		if(e.target.className === 'overlay'){
			showWindow(false);
		}
	});
	// No button
	$('.btn-no').click(function(){
		showWindow(false);
	});
	// Remove player button
	$(document).on('click', '.player .btn-close', function(){
		var parent = $(this).parent();
		var id = parent.attr('id');
		// Confirmation window
		showWindow('#user-sure', parent);
		$('.btn-yes').click(function() {
			parent.remove();
			players.splice(id, 1);
			showWindow(false);
			update();
		});
	});
	// Keypresses
	$(document).keypress(function(e){
		// Enter/return submits
		if(e.keyCode === KEY_ENTER && $('#add-form input').val().length) {
			add();
		}
		// Esc hides overlay
		if(e.keyCode === KEY_ESC) {
			showWindow(false);
		}
	});

	// Disable all me buttons
	enablePersonButtons(false);
	// Hide all overlay windows
	showWindow(false);

	// Load players from local storage
	loadPlayers();
}

$(document).ready(main);
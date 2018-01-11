// TODO:
// - Make this a full game? (sockets + old monopoly simulation) 

'use strict'

// Utility
function randomString(len) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  for(let i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Get element from player id
function elFromId(id) {
  return $('[data-id="' + id + '"]');
}

function issueLink() {
  return '<a href="https://github.com/sorebit/monomanager/issues">Report this issue</a>';
}

// Globals because it's just a tool 
let players = {};
let history = [];
let historyIndex = -1;

// Add player to manager
function addPlayer(name, id, money, prevId) {
  let p;
  if(name && id && typeof(money) === 'number') {
    p = { 
      id: id,
      name: name,
      money: money
    }
  } else if(!id) {  
    p = {
      id: randomString(8),
      name: name || issueLink(),
      money: 15000
    };
  } else {
    p = players[id];
  }

  // Compose html element for player
  const nameEl = $('<p class="player-name">').text(p.name);

  const el = $('<div class="player" data-id="' + p.id + '"></div>');
  el.append('<button type="button" class="close" data-toggle="modal" data-target="#modal-remove-player"><span aria-hidden="true">&times;</span></button>');
  el.append(nameEl);

  el.append($('<p class="player-money">').text('$' + p.money));
  el.append($('<div class="form-group">').append('<input class="form-control">'));

  const btnGroup = $('<div class="btn-group btn-group-justified" role="group">');
  btnGroup.append($('<div class="btn-group" role="group">').append($('<button class="btn btn-default btn-get">').text('Get')));
  btnGroup.append($('<div class="btn-group" role="group">').append($('<button class="btn btn-default btn-pay">').text('Pay')));
  btnGroup.append($('<div class="btn-group" role="group">').append($('<button class="btn btn-default btn-to">').text('Pay to')));
  btnGroup.append($('<div class="btn-group" role="group">').append($('<button class="btn btn-default btn-me" disabled="disabled">').text('Me')));

  el.append(btnGroup);

  // Add to player list
  players[p.id] = p;

  if(prevId) {
    // Add it after a specific player
    el.insertAfter(elFromId(prevId));
  } else if(prevId === '') {
    // Prepend it as the first player
    $('.players').prepend(el);
  } else {
    // Append normally
    $('.players').append(el);
  }

  update();
  return p.id;
}

function removePlayer(id) {
  if(!players[id]) {
    spawnError('Player you want to remove does not exist.');
    return;
  }

  const el = elFromId(id);
  
  delete players[id];
  el.fadeOut(function() {
    el.remove();
  });
}

function update() {
  // Update view
  for(let id in players) {
    if(players[id].money <= 0) {
      players[id].money = 0;
      disable(id);
    }
    elFromId(id).find('.player-money').text('$' + players[id].money);
  }

  // Fix history buttons
  if(historyIndex === -1)
    $('.btn-undo').attr('disabled', true);

  // Update storage
  delete localStorage['players'];
  localStorage['players'] = JSON.stringify(players);
}

function load() {
  if(!localStorage['players']) {
    localStorage['players'] = JSON.stringify({});
  }
  players = JSON.parse(localStorage['players']);
  for(let id in players) {
    addPlayer(null, id);
  }
  update();
}

function processAction(ev) {
  // I'm not sure if that's a good way of getting player element
  const el = $(ev.target).parent().parent().parent();
  const id = el.data('id');
  let input = parseInt(elFromId(id).find('input').val(), 10);
  if(isNaN(input)) {
    input = false;
  }

  return {
    el: el,
    id: id,
    input: input
  };
}

// Disbale player
function disable(id) {
  players[id].disabled = true;
  const el = elFromId(id);
  disableEl(el, el.find('input'), el.find('.btn'), el.find('p'));
}

// Enable player
function enable(id) {
  players[id].disabled = false;
  const el = elFromId(id);
  enableEl(el, el.find('input'), el.find('.btn'), el.find('p'));
}

// Disable element(s)
function disableEl() {
  for(let i in arguments) {
    if(typeof arguments[i] === 'Object') {
      arguments[i].attr('disabled', 'disabled');
    } else {
      $(arguments[i]).attr('disabled', 'disabled');
    }
  }
}

// Enable element(s)
function enableEl() {
  for(let i in arguments) {
    if(typeof arguments[i] === 'Object') {
      arguments[i].removeAttr('disabled');
    } else {
      $(arguments[i]).removeAttr('disabled');
    }
  }
}

// This is called before handling pay-to action
function prepareTo(senderId) {
  disableEl($('.player').find('.btn'));
  for(var id in players) {
    const el = elFromId(id);
    if(!players[id].disabled) {
      el.find('.btn-me').removeAttr('disabled');
      disableEl(el.find('input'));
    }
    if(id !== senderId) {
      el.find('input').val('');
    }
  }
  elFromId(senderId).find('.btn-me').text('Cancel');
  disableEl('#btn-remove', '#btn-add');
}

// This is called after handling pay-to action
function afterTo() {
  for(var i in players) {
    if(!players[i].disabled) {
      const el = elFromId(players[i].id);
      enableEl(el.find('.btn'), el.find('input'));
    }
  }
  $('.btn-me').text('Me');
  disableEl('.btn-me');
  enableEl('#btn-remove', '#btn-add');
  $('input').val('');
}

function spawnError(text) {
  const el = $('<div class="alert alert-danger alert-dismissable fade in" role="alert">');
  el.append('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>');
  el.append('<strong>An error occured!</strong> ' + text);
  $('.errors').append(el);
}

function saveAction(type, act) {
  // Construct action object
  let action = {};
  if(!act.input && type !== 'addPlayer' && type !== 'removePlayer') return;
  if(type === 'addPlayer' || type === 'removePlayer') {
    action = {type: type, id: act.id, name: act.name, money: act.money}
    if(type === 'removePlayer') {
      action.prevId = act.prevId || '';
    }
  } else {
    action = {type: type, id: act.id, input: act.input};
    if(type == 'payTo') {
        action.targetId = act.targetId;
    }
  }

  // Rebuild stack
  if(historyIndex != history.length - 1) {
    while(historyIndex != history.length - 1)
      history.pop();
    historyIndex = history.length - 1;
  }

  // Generate history view text
  let name = players[action.id].name;
  action.text = 'Player (<strong>' + name + '</strong>) ';
  if(action.type === 'get') {
    name = players[action.id].name;
    action.text += '<strong>gets</strong> $' + action.input;
  } else if(action.type === 'pay') {
    name = players[action.id].name;
    action.text += '<strong>pays</strong> $' + action.input;
  } else if(action.type === 'payTo') {
    name = players[action.id].name;
    action.text += '<strong>pays</strong> $' + action.input;
    action.text += ' to player (<strong>' +  players[action.targetId].name + '</strong>)';
  } else if(action.type === 'addPlayer') {
    action.text += '<strong>enters</strong> the game';
  } else if(action.type === 'removePlayer') {
    action.text += '<strong>leaves</strong> the game';
  }

  // Save action
  history.push(action);
  historyIndex++;
  // Update history buttons
  $('.btn-undo').attr('disabled', false);
  $('.btn-redo').attr('disabled', true);

  updateHistoryView();
}

function undoAction() {
  // Handle action
  const act = history[historyIndex];
  if(act.type === 'get') {
    players[act.id].money -= act.input;
  } else if(act.type === 'pay') {
    players[act.id].money += act.input;
  } else if(act.type === 'payTo') {
    players[act.id].money += act.input;
    players[act.targetId].money -= act.input;
  } else if(act.type === 'addPlayer') {
    removePlayer(act.id);
  } else if(act.type === 'removePlayer') {
    addPlayer(act.name, act.id, act.money, act.prevId);
  }

  historyIndex--;
  // Update buttons
  if(historyIndex < 0) {
    // Nothing more to undo
    $('.btn-undo').attr('disabled', true);
  }
  $('.btn-redo').attr('disabled', false);
}

function redoAction() {
  // Handle action
  historyIndex++;
  const act = history[historyIndex];
  if(act.type === 'get') {
    players[act.id].money += act.input;
  } else if(act.type === 'pay') {
    players[act.id].money -= act.input;
  } else if(act.type === 'payTo') {
    players[act.id].money -= act.input;
    players[act.targetId].money += act.input;
  } else if(act.type === 'addPlayer') {
    addPlayer(act.name, act.id, act.money);
  } else if(act.type === 'removePlayer') {
    removePlayer(act.id);
  }

  // Update buttons
  if(historyIndex === history.length - 1) {
    // Nothing more to redo
    $('.btn-redo').attr('disabled', true);
  }
  $('.btn-undo').attr('disabled', false);
}

function updateHistoryView() {
  let shown = 0;
  $('.history').html('<h4>History <small>(5 latest entries)</small></h4>');
  for(let i = Math.min(historyIndex, history.length - 1); i >= 0 && shown < 5; i--) {
    let e = $('<div class="alert alert-info history-element">');
    e.append($('<p>').html(history[i].text));
    $('.history').append(e);
    shown++;
  }
}

$(document).ready(function() {
  // Setup remove modal
  $('#modal-remove-player').on('show.bs.modal', function(ev) {
    const button = $(ev.relatedTarget); // Button that triggered the modal
    const id = button.parent().data('id');
    const modal = $(this);

    if(!players[id]) {
      console.error('Player does not exist.');
    }

    let name = issueLink();
    if(players[id]) {
      name = escapeHtml(players[id].name);
    }

    modal.find('.modal-title').text('Remove player');
    modal.find('.modal-body').html('Are you sure you want to remove player <strong>' + name + '</strong>?');

    modal.find('#btn-remove').off('click').on('click', function(ev) {
      modal.modal('hide');
      // If user want to undo removal, we need to know id of player before 'this'
      const prevId = elFromId(id).prev().data('id');
      saveAction('removePlayer', {id: id, prevId: prevId, name: players[id].name, money: players[id].money});
      removePlayer(id);
      update();
    });
  });

  // Setup add player modal
  $('#modal-add-player').on('show.bs.modal', function(ev) {
    const modal = $(this);
    const form = modal.find('.form-group');
    const input = modal.find('input');

    // Reset modal
    form.removeClass('has-error');
    input.val('');

    modal.find('#btn-add').off('click').on('click', function(ev) {
      const name = input.val();
      
      if(!name) {
        form.addClass('has-error');
        return;
      }

      form.removeClass('has-error');
      const id = addPlayer(name);
      saveAction('addPlayer', {id: id, name: players[id].name, money: players[id].money});
      modal.modal('hide');
    });
  });

  // After the modal appears, focus the input
  $('#modal-add-player').on('shown.bs.modal', function(ev) {
    $(this).find('input').focus();
  });

  // ACTION HANDLERS
  // Get action
  $(document).on('click', '.btn-get', function(ev) {
    let act = processAction(ev);    
    players[act.id].money += act.input;
    elFromId(act.id).find('input').val('');
    update();
    saveAction('get', act);
  }); 

  // Pay action
  $(document).on('click', '.btn-pay', function(ev) {
    let act = processAction(ev);
    if(act.input > players[act.id].money) {
      spawnError('Insufficient funds to complete the transaction.');
      return;      
    }
    players[act.id].money -= act.input;
    elFromId(act.id).find('input').val('');
    update();
    saveAction('pay', act);
  }); 

  // Send-to action
  $(document).on('click', '.btn-to', function(ev) {
    let act = processAction(ev);
    // Do not process empty actions
    if(act.input === false) {
      elFromId(act.id).find('input').val('');
      return;
    }
    if(act.input > players[act.id].money) {
      spawnError('Insufficient funds to complete the transaction.');
      return;
    }

    prepareTo(act.id);
    $('.btn-me').off('click').on('click', function(ev) {
      let trg = processAction(ev, true);
      players[act.id].money -= act.input;
      players[trg.id].money += act.input;
      afterTo();
      if(act.id !== trg.id) {
        act.targetId = trg.id;
        saveAction('payTo', act);
      }
      update();
    });
  });

  $(document).on('click', '.btn-undo', function(ev) {
    undoAction();
    update();
    updateHistoryView();
  });

  $(document).on('click', '.btn-redo', function(ev) {
    redoAction();
    update();
    updateHistoryView();
  });

  // Load players from storage
  load();
});

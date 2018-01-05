// To do:
// - Make this a full game? (sockets + old monopoly simulation) 

'use strict'

// Utility
function randomString(len) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

function elFromId(id) {
  return $('[data-id="' + id + '"]');
}

function issueLink() {
  return '<a href="https://github.com/sorebit/monomanager/issues">Report this issue</a>';
}

let players = {};
let history = [];
let historyIndex = -1;

// Add player to manager
function addPlayer(name, id) {
  let p;
  if(!id) {  
    p = {
      id: randomString(8),
      name: name || issueLink(),
      money: 15000
    };
  } else {
    p = players[id];
  }

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

  players[p.id] = p;
  $('.players').append(el);

  update();
  saveAction('addPlayer', {id: p.id});
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
  saveAction('removePlayer', {id: id});
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

function disable(id) {
  players[id].disabled = true;
  const el = elFromId(id);
  disableEl(el, el.find('input'), el.find('.btn'), el.find('p'));
}

function enable(id) {
  players[id].disabled = false;
  const el = elFromId(id);
  enableEl(el, el.find('input'), el.find('.btn'), el.find('p'));
}

function disableEl() {
  for(let i in arguments) {
    if(typeof arguments[i] === 'Object') {
      arguments[i].attr('disabled', 'disabled');
    } else {
      $(arguments[i]).attr('disabled', 'disabled');
    }
  }
}

function enableEl() {
  for(let i in arguments) {
    if(typeof arguments[i] === 'Object') {
      arguments[i].removeAttr('disabled');
    } else {
      $(arguments[i]).removeAttr('disabled');
    }
  }
}

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
  let action = {};
  if(!act.input && type !== 'addPlayer' && type !== 'removePlayer') return;
  if(type === 'addPlayer' || type === 'removePlayer') {
    action = {type: type, id: act.id};
  }
  else {
    action = {type: type, id: act.id, input: act.input};
    if(type == 'payTo') {
        action.targetId = act.targetId;
    }
  }

  console.log('Saving action', action);
  if(historyIndex != history.length - 1) {
    console.log('Rebuild stack');
    while(historyIndex != history.length - 1)
      history.pop();
    historyIndex = history.length - 1;
  }
  history.push(action);
  historyIndex++;
  // Update history buttons
  $('.btn-undo').attr('disabled', false);
  $('.btn-redo').attr('disabled', true);
}

function undoAction() {
  // console.log('Undoing', history[historyIndex]);
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
    console.log('UNDO addPlayer', act.id);
  } else if(act.type === 'removePlayer') {
    console.log('UNDO removePlayer', act.id);
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
  historyIndex++;
  // console.log('Redoing', history[historyIndex]);
  // Handle action
  const act = history[historyIndex];
  if(act.type === 'get') {
    players[act.id].money += act.input;
  } else if(act.type === 'pay') {
    players[act.id].money -= act.input;
  } else if(act.type === 'payTo') {
    players[act.id].money -= act.input;
    players[act.targetId].money += act.input;
  } else if(act.type === 'addPlayer') {
    console.log('REDO addPlayer', act.id);
  } else if(act.type === 'removePlayer') {
    console.log('REDO removePlayer', act.id);
  }

  // Update buttons
  if(historyIndex === history.length - 1) {
    // Nothing more to redo
    $('.btn-redo').attr('disabled', true);
  }
  $('.btn-undo').attr('disabled', false);
}

$(document).ready(function() {
  // Setup remove modal
  $('#modal-remove-player').on('show.bs.modal', function(ev) {
    const button = $(ev.relatedTarget); // Button that triggered the modal
    const id = button.parent().data('id'); // Extract info from data-* attributes
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
      removePlayer(id);
      update();
    });
  });

  // Setup add modal
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
      addPlayer(name);
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

  // Send to action
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
  });

  $(document).on('click', '.btn-redo', function(ev) {
    redoAction();
    update();
  });

  // Load players from storage
  load();
});

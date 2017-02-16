(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'
var keys = []
exports.debug = false

var keyCodes = {
  SPACE_BAR: 32,

  LEFT_ARROW: 37,
  UP_ARROW: 38,
  RIGHT_ARROW: 39,
  DOWN_ARROW: 40
}
for (var keyName in keyCodes) {
  exports[keyName] = keyCodes[keyName]
}

exports.isKeyDown = function (keyCode) {
  if (typeof keyCode === 'number') return Boolean(keys[keyCode])
  if (typeof keyCode === 'string' && keyCode.length === 1) {
    var letter = keyCode.toUpperCase()
    return Boolean(keys[letter.charCodeAt(0)])
  }
  throw new TypeError(
    '`isKeyDown` expected keyCode (`number`) or character. Got ' + keyCode + '.'
  )
}

document.addEventListener('keydown', function (e) {
  keys[e.keyCode] = true
  if (exports.debug) {
    var letter = String.fromCharCode(e.keyCode)
    console.log('-- keyIsDown ASCII(' + e.keyCode + ') CHAR(' + letter + ')')
  }
})

document.addEventListener('keyup', function (e) {
  keys[e.keyCode] = false
  if (exports.debug) {
    var letter = String.fromCharCode(e.keyCode)
    console.log('-- keyIsUp ASCII(' + e.keyCode + ') CHAR(' + letter + ')')
  }
})

},{}],2:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = require('./lib/keys.js');
var isArguments = require('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return typeof a === typeof b;
}

},{"./lib/is_arguments.js":3,"./lib/keys.js":4}],3:[function(require,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],4:[function(require,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],5:[function(require,module,exports){
/* globals requestAnimationFrame, io */
const kbd = require('@dasilvacontin/keyboard')
const deepEqual = require('deep-equal')

const socket = io()

var dead = 0;

let myPlayerId = null
const myInputs = {
  LEFT_ARROW: false,
  RIGHT_ARROW: false,
  UP_ARROW: false,
  DOWN_ARROW: false
}

const ACCEL = 1 / 500

class GameClient {
  constructor () {
    this.players = {}
    this.pills = {}
    this.rocks = {}
  }

  onWorldInit (serverPlayers, serverpills, serverrocks) {
    this.players = serverPlayers
    this.pills = serverpills
    this.rocks = serverrocks
  }

  onpillRespawn (pill) {
    this.pills[pill.id] = pill
  }

  onrockRespawn (rock) {
    this.rocks[rock.id] = rock
  }

  onPlayerMoved (player) {

    this.players[player.id] = player

    const delta = (lastLogic + clockDiff) - player.timestamp

        // increment position due to current velocity
        // and update our velocity accordingly

    let bordex = (player.x + player.vx*delta)
    let bordey = (player.y + player.vy * delta)
    if ((bordex > 0) && (bordex < 1850))player.x += player.vx * delta
    else {
      player.vx = 0
      player.x += player.vx * delta
    }
    if ((bordey > 0) && (bordey < 900))player.y += player.vy * delta
    else {
      player.vy = 0
      player.y += player.vy * delta
    }

    const { inputs } = player

    let ax = 0
    let ay = 0

    if ((inputs.LEFT_ARROW) && (!inputs.RIGHT_ARROW) && (player.vx > -0.3)) {
      player.x -= ACCEL * Math.pow(delta, 2) / 2
      player.vx -= ACCEL * delta
    } else if ((ax === 0) && (!inputs.LEFT_ARROW) && (!inputs.RIGHT_ARROW) && (player.vx < 0)) {
      player.x += ACCEL * Math.pow(delta, 2) / 2
      player.vx +=ACCEL * delta * 0.5
      if(player.vx > 0) player.vx = 0
    }

    if ((inputs.RIGHT_ARROW) && (!inputs.LEFT_ARROW) && (player.vx < 0.3)) {
      player.x += ACCEL * Math.pow(delta, 2) / 2
      player.vx += ACCEL * delta
      ax = 1
    } else if ((ax === 0) && (!inputs.LEFT_ARROW) && (!inputs.RIGHT_ARROW) && (player.vx > 0)) {
      player.x -= ACCEL * Math.pow(delta, 2) / 2
      player.vx -= ACCEL * delta * 0.5
      if(player.vx < 0) player.vx = 0
    }

    if ((inputs.UP_ARROW) && (!inputs.DOWN_ARROW) && (player.vy > -0.3)) {
      player.y -= ACCEL * Math.pow(delta, 2) / 2
      player.vy -= ACCEL * delta
      ay = 1
    } else if ((ay === 0) && (!inputs.DOWN_ARROW) && (!inputs.UP_ARROW) && (player.vy < 0)) {
      player.y += ACCEL * Math.pow(delta, 2) / 2
      player.vy += ACCEL * delta * 0.5
      if(player.vy > 0) player.vy = 0
    }

    if ((inputs.DOWN_ARROW) && (!inputs.UP_ARROW) && (player.vy < 0.3)) {
      player.y += ACCEL * Math.pow(delta, 2) / 2
      player.vy += ACCEL * delta
      ay = 1
    } else if ((ay === 0) && (!inputs.DOWN_ARROW) && (!inputs.UP_ARROW) && (player.vy > 0)) {
      player.y -= ACCEL * Math.pow(delta, 2) / 2
      player.vy -= ACCEL * delta * 0.5
      if(player.vy < 0) player.vy = 0
    }
  }

  onpillPicked (pillId, playerId) {
    this.players[playerId].power += this.pills[pillId].value
    delete this.pills[pillId]
  }

  onrockPull (rock) {
    this.rocks[rock.id] = rock

    const delta = (lastLogic + clockDiff) - rock.timestamp

    let bordex = (rock.x + rock.vx*delta)
    let bordey = (rock.y + rock.vy * delta)
    if ((bordex > 0) && (bordex < 1850)) {
      rock.x += rock.vx * delta
    }
    else {
      delete this.rocks[rock.id]
    }
    if ((bordey > 0) && (bordey < 900)) {
      rock.y += rock.vy * delta
    }
    else {
      delete this.rocks[rock.id]
    }

  }

  onrockNotPull (rockId, playerId) {
    this.players[playerId].vx = 0
    this.players[playerId].vy = 0
  }

  onPlayerDisconnected (playerId) {
    delete this.players[playerId]
  }

  onPlayerHit (playerId, rockId) {
    this.players[playerId].power -= 1
    this.rocks[rockId].hit = 1
  }

  onPlayerDead (playerId, rockId) {
    if (playerId === myPlayerId) dead = 1;
    this.rocks[rockId].hit = 1
    delete this.players[playerId]
  }

  logic (delta) {

    const vInc = ACCEL * delta
    const vDec = vInc * 0.5
    
    for (let playerId in this.players) {
      const player = this.players[playerId]
      const { inputs } = player

      let ax = 0
      let ay = 0

      if ((inputs.LEFT_ARROW) && (!inputs.RIGHT_ARROW) && (player.vx > -0.3)) {
        player.vx -= vInc
        ax = 1
      } else if ((ax === 0) && (!inputs.LEFT_ARROW) && (!inputs.RIGHT_ARROW) && (player.vx < 0)) {
        player.vx +=vDec
        if(player.vx > 0) player.vx = 0
      }

      if ((inputs.RIGHT_ARROW) && (!inputs.LEFT_ARROW) && (player.vx < 0.3)) {
        player.vx += vInc
        ax = 1
      } else if ((ax === 0) && (!inputs.LEFT_ARROW) && (!inputs.RIGHT_ARROW) && (player.vx > 0)) {
        player.vx -= vDec
        if(player.vx < 0) player.vx = 0
      }

      if ((inputs.UP_ARROW) && (!inputs.DOWN_ARROW) && (player.vy > -0.3)) {
        player.vy -= vInc
        ay = 1
      } else if ((ay === 0) && (!inputs.DOWN_ARROW) && (!inputs.UP_ARROW) && (player.vy < 0)) {
        player.vy += vDec
        if(player.vy > 0) player.vy = 0
      }

      if ((inputs.DOWN_ARROW) && (!inputs.UP_ARROW) && (player.vy < 0.3)) {
        player.vy += vInc
        ay = 1
      } else if ((ay === 0) && (!inputs.DOWN_ARROW) && (!inputs.UP_ARROW) && (player.vy > 0)) {
        player.vy -= vDec
        if(player.vy < 0) player.vy = 0
      }

      let bordex = (player.x + player.vx*delta)
      let bordey = (player.y + player.vy * delta)
      if ((bordex > 0) && (bordex < 1850))player.x += player.vx * delta
      else {
        player.vx = 0
        player.x += player.vx * delta
      }
      if ((bordey > 0) && (bordey < 900))player.y += player.vy * delta
      else {
        player.vy = 0
        player.y += player.vy * delta
      }
    }
    for (let rockId in this.rocks) {

      const rock = this.rocks[rockId]
      let bordex = (rock.x + rock.vx*delta)
      let bordey = (rock.y + rock.vy * delta)
      if ((bordex > 0) && (bordex < 1850))rock.x += rock.vx * delta
      else {
        delete this.rocks[rockId]
      }
      if ((bordey > 0) && (bordey < 900))rock.y += rock.vy * delta
      else {
        delete this.rocks[rockId]
      }

    }
  }
}
const game = new GameClient()

function updateInputs () {
  if (game.players[myPlayerId] != null && dead === 0) {
    const oldInputs = Object.assign({}, myInputs)

    for (let key in myInputs) {
      myInputs[key] = kbd.isKeyDown(kbd[key])
    }

    if (!deepEqual(myInputs, oldInputs)) {
      socket.emit('move', myInputs)

      // update our local player' inputs so that we see instant change
      // (inputs get taken into account in logic simulation)
      const frozenInputs = Object.assign({}, myInputs)
      setTimeout(function () {
        const myPlayer = game.players[myPlayerId]
        myPlayer.inputs = frozenInputs
      }, ping)
    }
  }
}

const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

const ctx = canvas.getContext('2d')

var spaceImage = new Image()
spaceImage.src = 'images/space.png'

var pillImage = new Image()
pillImage.src = 'images/pill.png'

var rockImage = new Image()
rockImage.src = 'images/rock.png'

var impacto1 = new Image()
impacto1.src = 'images/impactoAmarillo.png'
var impacto3 = new Image()
impacto3.src = 'images/impactoAzul.png'

var naveImage1 = new Image()
naveImage1.src = 'images/naveAzul.png'
var naveImage3 = new Image()
naveImage3.src = 'images/naveAmarilla.png'

/*var hit = new Howl({src: ['sound/golpe.wav']})*/
var heal = new Howl({src: ['sound/prueba.mp3']})

function gameRenderer (game) {

  ctx.drawImage (spaceImage, 0, 0, window.innerWidth, window.innerHeight)

  for (let playerId in game.players) {
    const { color, x, y, power } = game.players[playerId]


    if (playerId === myPlayerId) {
      ctx.drawImage(naveImage3, x, y, 50, 50);
    }
    else ctx.drawImage(naveImage1, x, y, 50, 50);

    
    ctx.fillStyle = 'black'
    ctx.font = "bold 15px Arial"
    ctx.textAlign = 'center'
    ctx.fillText(power, x+25, y+25)
  }
  
  for (let pillId in game.pills) {
    if (game.pills[pillId] != null) {

      ctx.drawImage(pillImage, game.pills[pillId].x, game.pills[pillId].y, 40, 40);
      if (playerId === myPlayerId) heal.play()
    }
  }

  for (let rockId in game.rocks) {
    const rock = game.rocks[rockId]
    if (rock != null) {
      if (rock.hit > 0) {
        if (rock.player === myPlayerId) {
          ctx.drawImage(impacto1, rock.x, rock.y, 70, 70);
          hit.sound()
        }
        else ctx.drawImage(impacto3, rock.x, rock.y, 70, 70);
        ++rock.hit
        if (rock.hit === 10) {
          delete game.rocks[rockId]
        }
      } else {
        ctx.drawImage(rockImage, rock.x, rock.y, 70, 70);
      }
    }
  }

  if (dead === 1) {
    ctx.fillStyle = 'white'
    ctx.fillRect (100, 100, 500, 250)

    ctx.fillStyle = 'red'
    ctx.font = "30px Arial"
    ctx.textAlign = 'center'
    ctx.fillText("You are dead!", 350, 225)
  }

}

let lastLogic = Date.now()
function gameloop () {
  requestAnimationFrame(gameloop)


  const now = Date.now()
  const delta = now - lastLogic
  lastLogic = now

  updateInputs()
  game.logic(delta)
  gameRenderer(game)
}

let lastPingTimestamp
let clockDiff = 0 // how many ms the server is ahead from us
let ping = Infinity

function startPingHandshake () {
  lastPingTimestamp = Date.now()
  socket.emit('game:ping')
}
setInterval(startPingHandshake, 250)

socket.on('connect', function () {
  socket.on('world:init', function (serverPlayers, myId, serverpills, serverrocks) {
    game.onWorldInit(serverPlayers, serverpills, serverrocks)
    myPlayerId = myId
  })
  socket.on('playerMoved', game.onPlayerMoved.bind(game))
  socket.on('pillPicked', function (pillId, playerId) {
    game.onpillPicked(pillId, playerId)
  })
  socket.on('rockNotPull', function (rockId, playerId) {
    game.onrockNotPull(rockId, playerId)
  })
  socket.on('rockPull', function (rock) {
    game.onrockPull(rock)
  })
  socket.on('pill respawn', function (pill) {
    game.onpillRespawn(pill)
  })

  socket.on('rock respawn', function (rock) {
    game.onrockRespawn(rock)
  })

  socket.on('playerDisconnected', game.onPlayerDisconnected.bind(game))

  socket.on('playerHit', function (playerId, rockId) {
    game.onPlayerHit (playerId, rockId)
  })

  socket.on('playerDead', function (playerId, rockId) {
    console.log("PLAYERDEAD!!!!!!")
    game.onPlayerDead (playerId, rockId)
  })

  socket.on('game:pong', (serverNow) => {
    ping = (Date.now() - lastPingTimestamp) / 2
    clockDiff = (serverNow + ping) - Date.now()
    //console.log({ ping, clockDiff })
  })
})

requestAnimationFrame(gameloop);
},{"@dasilvacontin/keyboard":1,"deep-equal":2}]},{},[5]);

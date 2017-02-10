/* globals requestAnimationFrame, io */
const kbd = require('@dasilvacontin/keyboard')
const deepEqual = require('deep-equal')

const socket = io()

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
    //console.log(player)
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
    if (inputs.LEFT_ARROW && !inputs.RIGHT_ARROW && player.vx > -0.25) {
      player.x -= ACCEL * Math.pow(delta, 2) / 2
      player.vx -= ACCEL * delta
    } else if (!inputs.LEFT_ARROW && inputs.RIGHT_ARROW && player.vx < 0.25) {
      player.x += ACCEL * Math.pow(delta, 2) / 2
      player.vx += ACCEL * delta
    }
    if (inputs.UP_ARROW && !inputs.DOWN_ARROW && player.vy > -0.25) {
      player.y -= ACCEL * Math.pow(delta, 2) / 2
      player.vy -= ACCEL * delta
    } else if (!inputs.UP_ARROW && inputs.DOWN_ARROW && player.vx < 0.25) {
      player.y += ACCEL * Math.pow(delta, 2) / 2
      player.vy += ACCEL * delta
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
    if ((bordex > 0) && (bordex < 1850))rock.x += rock.vx * delta
    else {
      delete this.rocks[rockId]
    }
    if ((bordey > 0) && (bordey < 900))rock.y += rock.vy * delta
    else {
      delete this.rocks[rockId]
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
    this.players[playerId].power -= this.rocks[rockId].dmg
    delete this.rocks[rockId]
  }

  onPlayerDead (playerId, rockId) {
    this.players[playerId].power -= this.rocks[rockId].dmg
    delete this.rocks[rockId]
    delete this.players[playerId]
  }

  logic (delta) {
    const vInc = ACCEL * delta
    for (let playerId in this.players) {
      const player = this.players[playerId]
      const { inputs } = player
      if ((inputs.LEFT_ARROW) && (player.vx > -0.25)) player.vx -= vInc
      if ((inputs.RIGHT_ARROW) && (player.vx < 0.25)) player.vx += vInc
      if ((inputs.UP_ARROW) && (player.vy > -0.25)) player.vy -= vInc
      if ((inputs.DOWN_ARROW) && (player.vy < 0.25)) player.vy += vInc

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
  if (game.players[myPlayerId] != null) {
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

function gameRenderer (game) {

  ctx.drawImage (spaceImage, 0, 0, window.innerWidth, window.innerHeight)

  for (let playerId in game.players) {
    const { color, x, y, power } = game.players[playerId]
    /*var naveImage = new Image()
    naveImage.src = 'images/nave.png'

    ctx.drawImage(naveImage, x, y, 50, 50);*/
    ctx.fillStyle = color
    ctx.fillRect(x, y, 50, 50)
    if (playerId === myPlayerId) {
      ctx.strokeRect(x, y, 50, 50)
    }
    ctx.fillStyle = 'black'
    ctx.font = "15px Arial"
    ctx.textAlign = 'center'
    ctx.fillText(power, x+25, y+25)
  }
  
  for (let pillId in game.pills) {
    if (game.pills[pillId] != null) {

      ctx.drawImage(pillImage, game.pills[pillId].x, game.pills[pillId].y, 40, 40);
    }
  }

  for (let rockId in game.rocks) {
    if (game.rocks[rockId] != null) {

      ctx.drawImage(rockImage, game.rocks[rockId].x, game.rocks[rockId].y, 70, 70);
    }
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
    game.onPlayerDead (playerId, rockId)
  })

  socket.on('game:pong', (serverNow) => {
    ping = (Date.now() - lastPingTimestamp) / 2
    clockDiff = (serverNow + ping) - Date.now()
    //console.log({ ping, clockDiff })
  })
})

requestAnimationFrame(gameloop);
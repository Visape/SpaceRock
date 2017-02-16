/* globals requestAnimationFrame, io */
const kbd = require('@dasilvacontin/keyboard')
const deepEqual = require('deep-equal')
const howler = require('howler')

const socket = io()

var dead = 0;

let myPlayerId = null
let myUserName = ""
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
    myUserName = prompt("Indica tu nombre de usuario: ")
    socket.emit('username', myUserName, myPlayerId)
  }

  onPlayerNamed(name, playerId) {
    this.players[playerId].name = name
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
    if (playerId === myPlayerId) heal.play()
    if (this.players[playerId].power < 5) this.players[playerId].power += this.pills[pillId].value
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
    if (playerId === myPlayerId) hit.play()
    this.players[playerId].power -= 1
    this.rocks[rockId].hit = 1
  }

  onPlayerDead (playerId, rockId) {
    ++this.players[this.rocks[rockId].player].score
    if (playerId === myPlayerId) {
      explosion.play()
      dead = 1;
    }
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
canvas.width = 1950
canvas.height = 1000

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

var heal = new howler.Howl({src: ['sound/vida.wav']})
var hit = new howler.Howl({src: ['sound/golpe.wav']})
var explosion = new howler.Howl({src: ['sound/explosion.mp3']})


function gameRenderer (game) {

  let numplayers = 0

  ctx.drawImage (spaceImage, 0, 0, window.innerWidth, window.innerHeight)

  ctx.fillStyle = 'white'
  ctx.font = "bold 14px Arial"
  ctx.textAlign = 'left'
  ctx.fillText("Kills: ", 25, 15 + 20)

  for (let playerId in game.players) {
    ++numplayers
    const { color, x, y, power } = game.players[playerId]


    if (playerId === myPlayerId) {
      ctx.drawImage(naveImage3, x, y, 50, 50);
    }
    else ctx.drawImage(naveImage1, x, y, 50, 50);

    //pintar vida de cada player
    ctx.fillStyle = 'black'
    ctx.font = "bold 15px Arial"
    ctx.textAlign = 'center'
    ctx.fillText(power, x+25, y+25)

    //pintar player en la clasificacion
    ctx.fillStyle = 'white'
    ctx.font = "12px Arial"
    ctx.textAlign = 'left'
    if (playerId === myPlayerId) {
      ctx.fillStyle = 'yellow'
      ctx.font = "bold 12px Arial"
    }
    ctx.fillText(game.players[playerId].name + " - " + game.players[playerId].score , 25, 18 + (numplayers+1)*20)
  }
  //pintar quadro de clasificacion
  ctx.fillStyle = 'white'
  ctx.globalAlpha = 0.2
  ctx.fillRect (10, 10, 175, 25 + (numplayers+1)*20)
  ctx.globalAlpha = 1.0
  

  for (let pillId in game.pills) {
    if (game.pills[pillId] != null) {

      ctx.drawImage(pillImage, game.pills[pillId].x, game.pills[pillId].y, 40, 40);
    }
  }

  for (let rockId in game.rocks) {
    const rock = game.rocks[rockId]
    if (rock != null) {
      if (rock.hit > 0) {
        if (rock.player === myPlayerId) ctx.drawImage(impacto1, rock.x, rock.y, 70, 70);
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
    myPlayerId = myId
    game.onWorldInit(serverPlayers, serverpills, serverrocks)
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

  socket.on('user named', function (name, playerId) {
    game.onPlayerNamed (name, playerId)
  })

  socket.on('game:pong', (serverNow) => {
    ping = (Date.now() - lastPingTimestamp) / 2
    clockDiff = (serverNow + ping) - Date.now()
    //console.log({ ping, clockDiff })
  })
})

requestAnimationFrame(gameloop);
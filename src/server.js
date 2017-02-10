// http://socket.io/get-started/chat/
const express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
const randomColor = require('randomcolor')

/*
// middleware
app.use(function (req, res, next) {
    console.log(arguments)
    next()
})
*/

app.use(express.static('public'))

const ACCEL = 1 / 500

class GameServer {
  constructor () {
    this.players = {}
    this.pills = {}
    this.rocks = {}
    this.lastpill = 0
    this.pillCount = 0
    this.lastrock = 0
    this.rockCount = 0

    for (let i = 0; i < 20; ++i) {
      const pill = {
        id: this.lastpill,
        x: Math.random() * 1850,
        y: Math.random() * 900,
        value: 1
      }
      this.pills[this.lastpill] = pill
      ++this.lastpill
      ++this.pillCount
    }

    for (let i = 0; i < 30; ++i ) {
      const rock = {
        id: this.lastrock,
        x: Math.random() * 1850,
        y: Math.random() * 900,
        vx: 0,
        vy: 0,
        dmg: Math.floor(Math.random() * 3) + 1,
        player: null
      }
      this.rocks[this.lastrock] = rock
      ++this.lastrock
      ++this.rockCount
    }
  }

  onpillSpawn () {
    if (this.pillCount < 20) {
      const pill = {
        id: this.lastpill,
        x: Math.random() * 1850,
        y: Math.random() * 900,
        value: 1
      }
      this.pills[this.lastpill] = pill
      ++this.lastpill
      ++this.pillCount

      io.sockets.emit('pill respawn', pill)
    }
  }

  onrockSpawn () {
    if (this.rockCount < 30) {
      const rock = {
        id: this.lastrock,
        x: Math.random() * 1850,
        y: Math.random() * 900,
        vx: 0,
        vy: 0,
        dmg: Math.floor(Math.random() * 3) + 1,
        player: null
      }
      this.rocks[this.lastrock] = rock
      ++this.lastrock
      ++this.rockCount

      io.sockets.emit('rock respawn', rock)
    }
  }

  onPlayerConnected (socket) {
    console.log(`${socket.id} connected`)
    const inputs = {
      LEFT_ARROW: false,
      RIGHT_ARROW: false,
      UP_ARROW: false,
      DOWN_ARROW: false
    }

    const player = {
      x: Math.random() * 1850,
      y: Math.random() * 900,
      vx: 0,
      vy: 0,
      color: randomColor(),
      id: socket.id,
      power: 0,
      inputs
    }
    this.players[socket.id] = player

    socket.emit('world:init', this.players, socket.id, this.pills, this.rocks)

    // so that the new players appears on other people's screen
    this.onPlayerMoved(socket, inputs)
  }

  onPlayerMoved (socket, inputs) {
    console.log(inputs)
    console.log(`${new Date()}: ${socket.id} moved`)
    const player = this.players[socket.id]
    player.timestamp = Date.now()
    player.inputs = inputs
    io.sockets.emit('playerMoved', player)
  }

  onpillPicked (pillId, playerId) {
    this.players[playerId].power += this.pills[pillId].value
    --this.pillCount
    delete this.pills[pillId]
    io.sockets.emit('pillPicked', pillId, playerId)
  }

  onrockPull (rockId, playerId) {
    const rock = this.rocks[rockId]

    if (rock.player === null) {

      let p = this.players[playerId].power*0.1

      if (p > 0) {

        console.log("VX: " +this.players[playerId].vx)
        console.log("VY: " +this.players[playerId].vy)

        let velx = this.players[playerId].vx
        let vely = this.players[playerId].vy
   
        if (velx > 0) rock.vx = p
        else if(velx < 0) rock.vx = -p
        else rock.vx = 0

        if (vely > 0) rock.vy = p
        else if(vely < 0) rock.vy = -p
        else rock.vy = 0
        
        velx = Math.abs(velx)
        vely = Math.abs(vely)

        rock.vx *= (velx/(velx+vely))
        rock.vy *= (vely/(velx+vely))

        rock.timestamp = Date.now()
        rock.player = playerId

        io.sockets.emit('rockPull', rock)
      } else {
        this.players[playerId].vx = 0
        this.players[playerId].vy = 0
        io.sockets.emit('rockNotPull', rockId, playerId)
      }
    } else {
      if (rock.player !== playerId) {
        this.players[playerId].power -= rock.dmg
        if (this.players[playerId].power >= 0) {
          io.sockets.emit('playerHit', playerId, rockId)
        } else {
          delete this.players[playerId]
          io.sockets.emit('playerDead', playerId, rockId)
        }
        console.log(this.rockCount)
        --this.rockCount
        console.log(this.rockCount + "!")
        delete this.rocks[rockId]
      }
    }
  }

  onPlayerDisconnected (socket) {
    console.log(`${socket.id} disconnected`)
    delete this.players[socket.id]
    socket.broadcast.emit('playerDisconnected', socket.id)
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

      for (let pillId in this.pills) {
        let deltax = (this.players[playerId].x-this.pills[pillId].x)
        let deltay = (this.players[playerId].y-this.pills[pillId].y)
        if ((-50 <= deltax) && (deltax <= 40) && (-50 <= deltay) && (deltay <= 40)) {
          this.onpillPicked(pillId, playerId)
        }
      }

      for (let rockId in this.rocks) {
        if (this.players[playerId] != null) {
          let deltax = (this.players[playerId].x-this.rocks[rockId].x)
          let deltay = (this.players[playerId].y-this.rocks[rockId].y)
          if ((-50 <= deltax) && (deltax <= 70) && (-50 <= deltay) && (deltay <= 70)) {
            this.onrockPull(rockId, playerId)
          }
        }
      }
    }
    for (let rockId in this.rocks) {
      
      const rock = this.rocks[rockId]
      let bordex = (rock.x + rock.vx*delta)
      let bordey = (rock.y + rock.vy * delta)
      if ((bordex > 0) && (bordex < 1850))rock.x += rock.vx * delta
      else {
        console.log(this.rockCount)
        --this.rockCount
        console.log(this.rockCount + "!!")
        delete this.rocks[rockId]
      }
      if ((bordey > 0) && (bordey < 900))rock.y += rock.vy * delta
      else {
        console.log(this.rockCount)
        --this.rockCount
        console.log(this.rockCount + "!!!")
        delete this.rocks[rockId]
      }

    }
  }
}

io.on('connection', function (socket) {

  game.onPlayerConnected(socket)

  // let lastPongTimestamp
  // let ping = 50
  socket.on('game:ping', () => {
    // lastPongTimestamp = Date.now()
    socket.emit('game:pong', Date.now())
  })
  socket.on('game:pung', () => {
    // ping = (Date.now() - lastPongTimestamp) / 2
  })

  socket.on('move', (inputs) => {
    game.onPlayerMoved(socket, inputs)
  })

  socket.on('disconnect', () => {
    game.onPlayerDisconnected(socket)
  })
})

setInterval(function () {
    game.onpillSpawn()
  }, 1500)

setInterval(function () {
    game.onrockSpawn()
  }, 1500)

const game = new GameServer()
let past = Date.now()
setInterval(function () {
  const now = Date.now()
  const delta = now - past
  past = now
  game.logic(delta)
}, 20)


http.listen(process.env.PORT || 3000, function () {
  console.log('listening on *:3000')
})
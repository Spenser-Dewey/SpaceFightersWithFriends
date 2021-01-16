const { Asteroid, Ship, Bullet, Powerup, createRandomAsteroid } = require('./GameComponents');
const Constants = require('./Constants');
const { Vector2D, overlap, stringifyData, stringifyShip, stringifyBullet } = require('./Utils');

const GameState = {
  frameTimer: 0,
  currentID: 1,
  asteroids: [],
  ships: [],
  bullets: [],
  events: [],
  deadShips: [],
  powerups: [],

  start() {
    this.addAsteroids();
    this.events = { asteroids: [], bullets: [], collisions: [], ships: [], deaths: [], frameTimer: 0 };

    this.interval = setInterval(() => this.update(), 20);
  },

  update() {
    this.frameTimer++;
    this.events = { asteroids: [], bullets: [], powerups: [], collisions: [], deaths: [], frameTimer: this.frameTimer };

    this.updateElement(this.asteroids);
    this.updateElement(this.bullets);
    this.updateElement(this.ships);

    this.addAsteroids();
    this.addPowerup();

    checkCollisions();

    this.events.ships = this.ships;
    sendEvents();
  },

  updateElement(eleArr) {
    for (let i = eleArr.length - 1; i > -1; i--) {
      if (eleArr[i].live) {
        eleArr[i].update();
      } else {
        this.events.deaths.push(eleArr[i].id);
        if (eleArr[i] instanceof Ship) {
          this.deadShips.push(eleArr[i]);
        }
        eleArr.splice(i, 1);
      }
    }
  },
  addObject(newObj) {
    if (newObj instanceof Asteroid) {
      this.asteroids.push(newObj);
      this.events.asteroids.push(newObj);
    } else if (newObj instanceof Ship) {
      this.ships.push(newObj); //Ships always put into events
    } else if (newObj instanceof Bullet) {
      this.bullets.push(newObj);
      this.events.bullets.push(newObj);
    } else if (newObj instanceof Powerup) {
      this.powerups.push(newObj);
      this.events.powerups.push(newObj);
    }
  },
  addAsteroids() {
    for (var i = this.asteroids.length; i < Constants.minAsteroids; i++) {
      let newAsteroid = createRandomAsteroid(this);
      if (!GameState.ships.find(playerShip => playerShip.pos.manDistanceTo(newAsteroid) < 200)) {
        this.asteroids.push(newAsteroid);
      }
    }
  },
  addPowerup() {
    if (this.powerups.length < Constants.maxPowerups) {
      if (Math.random() < Constants.powerupProbability) {
        this.addObject(new Powerup(Vector2D.createRandom(0, Constants.width, 0, Constants.height),
          Constants.powerups[Math.floor(Constants.powerups.length * Math.random())], this));
      }
    }
  },
  getNextID() {
    return this.currentID++;
  }
}

function checkCollisions() {
  for (let i = GameState.ships.length - 1; i > -1; i--) {
    if (aster = GameState.asteroids.find(asteroid => overlap(asteroid, GameState.ships[i]))) {
      GameState.ships[i].destroy();
      aster.destroy();
      GameState.events.collisions.push({ asteroid: aster, ship: GameState.ships[i] });
    }
    else if (bullet = GameState.bullets.find(bullet => overlap(bullet, GameState.ships[i]))) {
      bullet.destroy();
      if (GameState.ships[i].powerups["reflection"]) {
        GameState.addObject(new Bullet(bullet.pos, bullet.velocity.constMult(-1), bullet.angle, bullet.parentShip, bullet.gameInstance));
      } else {
        GameState.ships[i].destroy();
        GameState.events.collisions.push({ bullet: bullet, ship: GameState.ships[i] });
        if (!GameState.ships[i].live) {
          bullet.parentShip.score++;
        }
      }
    } else if (powerup = GameState.powerups.find(powerup => overlap(powerup, GameState.ships[i]))) {

    }
  }
  for (let i = GameState.bullets.length - 1; i > -1; i--) {
    if (aster = GameState.asteroids.find(asteroid => overlap(asteroid, GameState.bullets[i]))) {
      GameState.bullets[i].destroy();
      aster.destroy();
      GameState.events.collisions.push({ asteroid: aster, bullet: GameState.bullets[i] });
    }
  }
}

exports.GameState = GameState;

GameState.start();

const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: 6036
});

let sockets = [];

server.on('connection', function (socket) {
  sockets.push(socket);

  socket.on('message', function (msg) {
    readMessage(JSON.parse(msg), socket);
  });

  // When a socket closes, or disconnects, remove it from the array.
  socket.on('close', function () {
    sockets = sockets.filter(s => s !== socket);
  });
});

function sendEvents() {
  GameState.events.type = "update";
  sockets.forEach(socket => socket.send(JSON.stringify(GameState.events, stringifyData)));
}

function readMessage(data, socket) {
  if (data.type == "join") {
    const gameData = {};
    const newShip = new Ship(Vector2D.createRandom(0, Constants.clientWidth, 0, Constants.clientHeight),
      Vector2D.create(0, 0), 60, 60, 0, data.bulletColor, data.wingColor, data.bodyColor, data.username, GameState);
    gameData.asteroids = GameState.asteroids;
    gameData.bullets = GameState.bullets;
    gameData.frameTimer = GameState.frameTimer + 1;
    gameData.type = "join";
    gameData.clientWidth = Constants.clientWidth;
    gameData.clientHeight = Constants.clientHeight;
    gameData.width = Constants.width;
    gameData.height = Constants.height;
    gameData.id = newShip.id;
    GameState.addObject(newShip);
    gameData.ships = GameState.ships;
    console.log("New ship element " + newShip.id + " at (" + newShip.pos.x + ", " + newShip.pos.y + ") piloted by " + newShip.username);
    socket.send(JSON.stringify(gameData, stringifyData));

  } else if (!data.type || data.type == "update") {
    let playerShip = GameState.ships.find(ship => ship.id == data.id);
    if (playerShip && data.keys) {
      playerShip.setKeys(data.keys);
    }
    if (!playerShip) {
      for (let i = data.keys.length - 1; i > -1; i--) {
        if (data.keys[i] == "r") {
          let deadShip = GameState.deadShips.find(ship => ship.id == data.id);
          if (deadShip) {
            deadShip.live = true;
            GameState.ships.push(deadShip);
          }
          return;
        }
      }
    }
  }
}
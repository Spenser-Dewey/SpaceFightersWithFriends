const { Asteroid, Ship, Bullet, createRandomAsteroid } = require('./GameComponents');
const Constants = require('./Constants');
var http = require('http');
const { Vector2D, overlap, stringifyData, stringifyShip, stringifyBullet } = require('./Utils');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');

const GameState = {
  frameTimer: 0,
  currentID: 1,
  asteroids: [],
  ships: [],
  bullets: [],
  events: [],

  start() {
    for (var i = Constants.minAsteroids; i > 0; i--) {
      this.asteroids.push(createRandomAsteroid(this));
    }
    for (var i = Constants.savedFrames; i > -1; i--) {
      this.events[i] = { asteroids: [], bullets: [], collisions: [], ships: [], deaths: [], frameTimer: 0 };
    }

    this.interval = setInterval(() => this.update(), 33);
  },

  update() {
    this.frameTimer++;
    this.events = this.events.slice(1, Constants.savedFrames + 1);
    this.events[Constants.savedFrames] = { asteroids: [], bullets: [], collisions: [], deaths: [], frameTimer: this.frameTimer };

    this.updateElement(this.asteroids);
    this.updateElement(this.bullets);
    this.updateElement(this.ships);

    checkCollisions();

    this.events[Constants.savedFrames].ships = this.ships;
  },

  updateElement(eleArr) {
    for (let i = eleArr.length - 1; i > -1; i--) {
      if (eleArr[i].live) {
        eleArr[i].update();
      } else {
        this.events[Constants.savedFrames].deaths.push(eleArr[i].id);
        eleArr.splice(i, 1);
      }
    }
  },

  addObject(newObj) {
    if (newObj instanceof Asteroid) {
      this.asteroids.push(newObj);
      this.events[Constants.savedFrames].asteroids.push(newObj);
    } else if (newObj instanceof Ship) {
      this.ships.push(newObj); //Ships always put into events
    } else if (newObj instanceof Bullet) {
      this.bullets.push(newObj);
      this.events[Constants.savedFrames].bullets.push(newObj);
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
      GameState.events[Constants.savedFrames].collisions.push({ asteroid: aster, ship: GameState.ships[i] });
      console.log("DESTRUCTION OF SHIP " + GameState.ships[i].id + " PILOTED BY " + GameState.ships[i].username);
    }
    else if (bullet = GameState.bullets.find(bullet => overlap(bullet, GameState.ships[i]))) {
      GameState.ships[i].destroy();
      bullet.destroy();
      GameState.events[Constants.savedFrames].collisions.push({ bullet: bullet, ship: GameState.ships[i] });
      console.log("DESTRUCTION OF SHIP " + GameState.ships[i].id + " PILOTED BY " + GameState.ships[i].username);
    }
  }
  for (let i = GameState.bullets.length - 1; i > -1; i--) {
    if (aster = GameState.asteroids.find(asteroid => overlap(asteroid, GameState.bullets[i]))) {
      GameState.bullets[i].destroy();
      aster.destroy();
      GameState.events[Constants.savedFrames].collisions.push({ asteroid: aster, bullet: GameState.bullets[i] });
    }
  }
}

exports.GameState = GameState;

GameState.start();

const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: 80
});

let sockets = [];

server.on('connection', function(socket) {
  sockets.push(socket);

  // When you receive a message, send that message to every socket.
  socket.on('message', function(msg) {
    sendResponse(JSON.parse(msg), socket);
  });

  // When a socket closes, or disconnects, remove it from the array.
  socket.on('close', function() {
    sockets = sockets.filter(s => s !== socket);
  });
});

function sendResponse(data, socket) {
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

    let eventObj = { asteroids: [], bullets: [], collisions: [], deaths: [] };
    eventObj.ships = GameState.ships;
    eventObj.type = "update";
    eventObj.frameTimer = GameState.frameTimer - 1;
    if(!data.lastFrame) { data.lastFrame = 0; }

    for (let i = Math.max(Constants.savedFrames - (GameState.frameTimer - 1 - data.lastFrame), 0); i < Constants.savedFrames; i++) {
      eventObj.asteroids = eventObj.asteroids.concat(GameState.events[i].asteroids);
      eventObj.bullets = eventObj.bullets.concat(GameState.events[i].bullets);
      eventObj.collisions = eventObj.collisions.concat(GameState.events[i].collisions);
      eventObj.deaths = eventObj.deaths.concat(GameState.events[i].deaths);
    }
    socket.send(JSON.stringify(eventObj, stringifyData));
  }
}
const { Asteroid, Ship, Bullet, Powerup, createRandomAsteroid } = require('./GameComponents');
const Constants = require('./Constants');
const { Vector2D, overlap, stringifyData, } = require('./Utils');

const GameState = {
  frameTimer: 0,
  currentID: 1,
  asteroids: [],
  ships: [],
  bullets: [],
  events: [],
  deadShips: [],
  powerups: [],
  missiles: [],

  start() {
    this.events = { asteroids: [], bullets: [], collisions: [], ships: [], deaths: [], frameTimer: 0 };
    this.addAsteroids();

    this.interval = setInterval(() => this.update(), 33);
  },

  update() {
    this.frameTimer++;
    this.events = { asteroids: [], bullets: [], powerups: [], collisions: [], deaths: [], frameTimer: this.frameTimer };

    this.updateElement(this.bullets);
    this.updateElement(this.ships);
    this.updateElement(this.asteroids);
    this.updateElement(this.powerups);

    this.addAsteroids();
    this.addPowerup();

    checkCollisions();

    this.events.ships = this.ships;
    this.events.missiles = this.missiles;
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
        if(eleArr[i].target) {
          this.missiles.splice(this.missiles.indexOf(eleArr[i]), 1);
        }
        eleArr.splice(i, 1);
      }
    }
  },
  addObject(newObj) {
    let logEvent = true;
    if(newObj.target) {
      this.missiles.push(newObj);
      logEvent = false;
    }
    
    if (newObj instanceof Asteroid) {
      this.asteroids.push(newObj);
      if(logEvent) this.events.asteroids.push(newObj);
    } else if (newObj instanceof Ship) {
      this.ships.push(newObj); //Ships always put into events
    } else if (newObj instanceof Bullet) {
      this.bullets.push(newObj);
      if(logEvent) this.events.bullets.push(newObj);
    } else if (newObj instanceof Powerup) {
      this.powerups.push(newObj);
      if(logEvent) this.events.powerups.push(newObj);
    }
  },
  addAsteroids() {
    for (var i = this.asteroids.length; i < Constants.minAsteroids; i++) {
      let newAsteroid = createRandomAsteroid(this);
      if (!GameState.ships.find(playerShip => playerShip.pos.manDistanceTo(newAsteroid.pos) < 600)) {
        this.addObject(newAsteroid);
      }
    }
  },
  addPowerup() {
    const validPowers = Object.keys(Constants.powerups);
    if (this.powerups.length < Constants.maxPowerups) {
      if (Math.random() < Constants.powerupProbability) {
        this.addObject(new Powerup(Vector2D.createRandom(0, Constants.width, 0, Constants.height),
          validPowers[Math.floor(validPowers.length * Math.random())], this));
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
      if(!GameState.bullets[i].drill) {
        GameState.bullets[i].destroy();
      }
      
      if (GameState.ships[i].powerups["reflection"]) {
        let newVel = bullet.velocity.constMult(-1);
        GameState.addObject(new Bullet(Vector2D.create(bullet.pos.x + newVel.x * 2, bullet.pos.y + newVel.y * 2), newVel, bullet.angle, bullet.parentShip, bullet.gameInstance));
      } else {
        GameState.ships[i].destroy();
        if (!GameState.ships[i].live) {
          bullet.parentShip.score += Math.floor(Math.max(25, GameState.ships[i].score / 2));
          GameState.events.collisions.push({ bullet: bullet, ship: GameState.ships[i] });
        }
      }
    } else if (powerup = GameState.powerups.find(powerup => overlap(powerup, GameState.ships[i]))) {
      powerup.destroy();
      GameState.ships[i].powerups[powerup.type] = Constants.powerups[powerup.type];
      GameState.events.collisions.push({ powerup: powerup, ship: GameState.ships[i] });
    }
  }
  for (let i = GameState.bullets.length - 1; i > -1; i--) {
    if (aster = GameState.asteroids.find(asteroid => overlap(asteroid, GameState.bullets[i]))) {
      
      if(!GameState.bullets[i].drill) {
        GameState.bullets[i].destroy();
      }
      
      aster.destroy();
      GameState.events.collisions.push({ asteroid: aster, bullet: GameState.bullets[i] });
      GameState.bullets[i].parentShip.score += 1;
    }
  }
}

exports.GameState = GameState;

GameState.start();

const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: process.env.PORT || 6036
});

let sockets = [];

server.on('connection', function (socket) {
  sockets.push(socket);

  socket.on('message', function (msg) {
    readMessage(JSON.parse(msg), socket);
  });

  socket.on('close', function () {
    sockets = sockets.filter(s => s !== socket);
  });
});

function sendEvents() {
  GameState.events.type = "update";
  if (Constants.debug) {
    GameState.events.dbugShapes = GameState.powerups.map(powerup => {
      return {lines: powerup.lines, pos: powerup.pos, angle: powerup.angle};
    }).concat(
      GameState.asteroids.map((aster) => {
      return { lines: aster.lines, pos: aster.pos, angle: aster.angle };
    })).concat(
      GameState.ships.map((ship) => {
        return { lines: ship.lines, pos: ship.pos, angle: ship.angle };
    })).concat(
      GameState.bullets.map((bullet) => {
       return { lines: bullet.lines, pos: bullet.pos, angle: bullet.angle };
      }));
  }
  sockets.forEach(socket => socket.send(JSON.stringify(GameState.events, stringifyData)));
}

function readMessage(data, socket) {
  if (data.type == "join") {
    const gameData = {};
    const newShip = new Ship(Vector2D.createRandom(0, Constants.width, 0, Constants.height),
      Vector2D.create(0, 0), 60, 60, 0, data.bulletColor, data.wingColor, data.bodyColor, data.username, GameState);
    newShip.powerups.invincibility = 100
    gameData.asteroids = GameState.asteroids;
    gameData.powerups = GameState.powerups;
    gameData.missiles = GameState.missiles;
    gameData.bullets = GameState.bullets;
    gameData.frameTimer = GameState.frameTimer;
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
            deadShip.powerups = {};
            deadShip.setKeys([]);
            deadShip.hyperjump();
            deadShip.score = 0;
            deadShip.live = true;
            GameState.ships.push(deadShip);
          }
          return;
        }
      }
    }
  }
}
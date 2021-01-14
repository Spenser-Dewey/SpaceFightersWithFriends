// const Http = new XMLHttpRequest();
// const url = "http://localhost"


// EXPANSION IDEAS:
//  fix stars: S
//  mini map: J
//  powerups: S
//  powerup notification: S
//  scoring: S
//  leaderboard: S
//---------------------------------
//  sound: J
//  kill notification: J
//  update login page: J
//  respawn players smoothly: S

function map(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}


var keys_down: Set<String> = new Set();

function startWebSocket() {
    console.log("CONNECTION OPENED");

    window.ws = new WebSocket("ws://192.168.1.128");

    ws.onmessage = function (message) {
        if (window.asteroidsGame) {
            let msg = JSON.parse(message.data);
            let numNew: number = msg.frameTimer - asteroidsGame.lastFrame;

            asteroidsGame.lastFrame = msg.frameTimer;

            for (let i: number = 0; i < msg.asteroids.length; i++) {
                let asteroid = msg.asteroids[i];

                asteroidsGame.gameElements.push(new Asteroid(asteroid.id, new Vector2D(asteroid.pos.x, asteroid.pos.y), new Vector2D(asteroid.velocity.x, asteroid.velocity.y), asteroid.lines, asteroid.angle, asteroid.rotationalVelocity));
            }

            msg.ships.forEach(ship => {
                asteroidsGame.gameElements.push(new Trail(new Vector2D(ship.pos.x, ship.pos.y).add(Vector2D.fromAngle(ship.angle).mult(-ship.height / 2))));
            });

            switch (msg.type) {
                case "join":

                    asteroidsGame.playerShipID = msg.id;
                    asteroidsGame.canvas.width = msg.clientWidth;
                    asteroidsGame.canvas.height = msg.clientHeight;

                    asteroidsGame.clientWidth = msg.clientWidth;
                    asteroidsGame.clientHeight = msg.clientHeight;

                    asteroidsGame.width = msg.width;
                    asteroidsGame.height = msg.height;

                    asteroidsGame.ctx = asteroidsGame.canvas.getContext("2d");

                    asteroidsGame.ctx.fillStyle = "rgb(0, 0, 0)" as string;
                    asteroidsGame.ctx.fillRect(0, 0, asteroidsGame.canvas.width, asteroidsGame.canvas.height);

                    // msg.ships.forEach(ship => {
                    //     if (ship.id === asteroidsGame.playerShipID) {
                    //         asteroidsGame.gameElements.forEach(element => {
                    //             element.move(new Vector2D(ship.pos.x, ship.pos.y).mult(-1));
                    //         });
                    //     }
                    // });


                    for (let i: number = 0; i < (asteroidsGame.width * asteroidsGame.height) / 10000; i++) {
                        asteroidsGame.stars.push(new Star(new Vector2D(Math.random() * asteroidsGame.width, Math.random() * asteroidsGame.height), Math.random() * 5 + 1));
                    }

                    setInterval(function () {
                        asteroidsGame.sendData(JSON.stringify({
                            type: "update",
                            id: asteroidsGame.playerShipID,
                            lastFrame: asteroidsGame.lastFrame,
                            keys: Array.from(keys_down)
                        }));
                    }, 33);

                    break;
                case "update":
                    msg.deaths.forEach(death => {
                        asteroidsGame.gameElements = asteroidsGame.gameElements.filter(e => {
                            return !e.id || death !== e.id;
                        });
                        if (death == asteroidsGame.playerShipID) {
                            asteroidsGame.deathScreen = true;
                        }
                    });

                    for (let i: number = 0; i < numNew; i++) {
                        asteroidsGame.update();
                    }

                    msg.collisions.forEach(collision => {
                        if (!collision.bullet) {
                            // let asteroid:Asteroid = asteroidsGame.gameElements.find(e => e.id === collision.asteroid);
                            // let ship = msg.ships.find(e => e.id === collision.ship);
                            asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.ship.pos.x, collision.ship.pos.y), collision.ship.angle, 30, "#b06000"));
                            asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.asteroid.pos.x, collision.asteroid.pos.y), collision.ship.angle, 30, "#334243"));
                        }
                        else if (!collision.asteroid) {
                            asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.ship.pos.x, collision.ship.pos.y), collision.ship.angle, 30, "#b06000"));
                        }
                        else if (!collision.ship) {
                            asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.bullet.pos.x, collision.bullet.pos.y), collision.bullet.angle, 30, "#334243"));
                        }
                        else {
                        }
                    });

                    let ship = msg.ships.find(s => s.id === asteroidsGame.playerShipID);

                    if (ship) {
                        asteroidsGame.playerShipPos = new Vector2D(ship.pos.x, ship.pos.y);
                        asteroidsGame.playerShipScore = ship.score;
                        asteroidsGame.deathScreen = false;
                    }
                    
                    for (let i: number = 0; i < msg.powerups.length; i++) {
                        let powerup = msg.powerups[i];
                        asteroidsGame.gameElements.push(new Powerup(powerup.id, new Vector2D(powerup.pos.x, powerup.pos.y), new Vector2D(powerup.velocity.x, powerup.velocity.y), powerup.lines, powerup.width, powerup.height, powerup.type));
                    }
                    msg.bullets.forEach(bullet => {
                        asteroidsGame.gameElements.push(new Bullet(bullet.id, new Vector2D(bullet.pos.x, bullet.pos.y), bullet.velocity, bullet.angle, bullet.width, bullet.height, bullet.color))
                    });
        

                    asteroidsGame.move(new Vector2D(asteroidsGame.playerShipPos.x, asteroidsGame.playerShipPos.y).mult(-1).add(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2)));
                    if (ship && ship.velocity) {
                        asteroidsGame.stars.forEach(e => e.move(new Vector2D(-ship.velocity.x, -ship.velocity.y)));
                    }

                    asteroidsGame.gameElements.forEach(e => {
                        if (e.pos) {
                            e.pos.mod(asteroidsGame.width, asteroidsGame.height);
                        }
                        else {
                            e.modAll();
                        }
                    });

                    asteroidsGame.stars.forEach(e => {
                        e.pos.mod(asteroidsGame.width, asteroidsGame.height);
                    });


                    asteroidsGame.draw();

                    if (msg.dbugShapes) {
                        for (let i = msg.dbugShapes.length - 1; i > -1; i--) {
                            asteroidsGame.drawShape(msg.dbugShapes[i]);
                        }
                    }

                    asteroidsGame.move(new Vector2D(asteroidsGame.playerShipPos.x, asteroidsGame.playerShipPos.y).add(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2).mult(-1)));

                    msg.ships.forEach(ship => {
                        asteroidsGame.drawShip(ship);
                    });

                    asteroidsGame.ctx.fillStyle = "#222";
                    asteroidsGame.ctx.fillRect(asteroidsGame.clientWidth - 200, 0, 200, 200);
                    asteroidsGame.ctx.fillStyle = "#f00";

                    msg.ships.forEach(ship => {
                        let xPos = map(ship.pos.x, 0, asteroidsGame.width, asteroidsGame.clientWidth - 200, asteroidsGame.clientWidth);
                        let yPos = map(ship.pos.y, 0, asteroidsGame.height, 0, 200);

                        if (ship.id === asteroidsGame.playerShipID) {
                            asteroidsGame.ctx.fillStyle = "#55f";
                            asteroidsGame.ctx.fillRect(xPos, yPos, 10, 10);
                            asteroidsGame.ctx.fillStyle = "#f00";
                        }
                        else {
                            asteroidsGame.ctx.fillRect(xPos, yPos, 10, 10);
                        }
                    });

                    msg.ships.sort((a, b) => b.score - a.score);

                    asteroidsGame.ctx.fillStyle = "#FFF";
                    asteroidsGame.ctx.textBaseline = "top";
                    asteroidsGame.ctx.font = "14px Arial";

                    for (let i = 1; i <= Math.min(10, msg.ships.length); i++) {
                        asteroidsGame.ctx.fillStyle = "#FFF";
                        asteroidsGame.ctx.textAlign = "left";
                        asteroidsGame.ctx.fillText(msg.ships[i - 1].username, 0, 20 * i);
                        asteroidsGame.ctx.textAlign = "right";
                        asteroidsGame.ctx.fillText(msg.ships[i - 1].score, 200, 20 * i);
                        if (i % 2 == 0) { asteroidsGame.ctx.fillStyle = "#aaa4" } else { asteroidsGame.ctx.fillStyle = "#3334" }
                        asteroidsGame.ctx.fillRect(0, 20 * i, 200, 20);
                    }

                    break;
            }
        }
    }

    ws.onclose = function () {
        console.log("CONNECTION TERMINATED");
    }
}

class AsteroidsGame {
    public canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    public playerShipID: number;
    public lastFrame: number;
    public gameElements: any[];
    stars: Star[];
    playerShipPos: Vector2D;
    playerShipScore: number;
    width: number;
    height: number;
    clientWidth: number;
    clientHeight: number;
    deathScreen: boolean;

    constructor() {
        let joinMsg = {
            type: "join",
            username: window.username,
            wingColor: window.wingColor,
            bodyColor: window.bodyColor,
            bulletColor: window.bulletColor
        };

        this.sendData(JSON.stringify(joinMsg));

        this.canvas = window.canvas as HTMLCanvasElement;

        this.gameElements = [];
        this.stars = [];

        function logKeyData(e, isPressed) {
            if (isPressed) keys_down.add(e.key);
            else keys_down.delete(e.key);
        }

        window.addEventListener("keydown", function (e) {
            logKeyData(e, true);
        });

        window.addEventListener("keyup", function (e) {
            logKeyData(e, false);
        });

        window.addEventListener("click", function (e) {
            if (asteroidsGame.deathScreen) {
                const rect = asteroidsGame.canvas.getBoundingClientRect();
                let x = e.clientX - rect.left;
                let y = e.clientY - rect.top;
                x = map(x, 0, asteroidsGame.canvas.clientWidth, 0, asteroidsGame.width);
                y = map(y, 0, asteroidsGame.canvas.clientHeight, 0, asteroidsGame.height);
                
                if(x > asteroidsGame.width / 2 - 200 && x < asteroidsGame.width / 2 + 200) {
                    if(y > asteroidsGame.height / 4 && y < asteroidsGame.height / 2) {
                        ws.send(JSON.stringify({id: asteroidsGame.playerShipID, type: "update", keys: ["r"]}));
                    } else if(y > asteroidsGame.height / 2 + 25 && y < 3 * asteroidsGame.height / 4 + 25) {
                        location.reload();
                    }
                }
            }
        });
    }

    sendData(data: string) {
        ws.send(data);
    }

    move(d) {
        this.gameElements.forEach(e => e.move(d));
    }

    update() {
        this.gameElements.forEach(e => e.update());
    }

    draw() {
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.stars.forEach(star => star.draw(this.ctx));

        this.gameElements.filter(e => e instanceof Bullet).forEach(e => e.draw(this.ctx));
        this.gameElements.filter(e => e instanceof Asteroid).forEach(e => e.draw(this.ctx));
        this.gameElements.filter(e => e instanceof Debris).forEach(e => e.draw(this.ctx));
        this.gameElements.filter(e => e instanceof Trail).forEach(e => e.draw(this.ctx));
        this.gameElements.filter(e => e instanceof Powerup).forEach(e => e.draw(this.ctx));

        if (this.deathScreen) {
            this.drawDeathScreen();
        }
    }

    drawDeathScreen() {
        this.ctx.fillStyle = "#aaa7";
        this.ctx.fillRect(this.canvas.width / 2 - 200, this.canvas.height / 4, 400, this.canvas.height / 4);
        this.ctx.fillRect(this.canvas.width / 2 - 200, this.canvas.height / 2 + 25, 400, this.canvas.height / 4);

        this.ctx.fillStyle = "#FDD";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.font = "32px Arial";
        this.ctx.fillText("You died! Your score was " + this.playerShipScore + ".", this.canvas.width / 2, this.canvas.height / 4 - 50);
        this.ctx.font = "24px Arial";
        this.ctx.fillText("Restart with same Ship", this.canvas.width / 2, 3 * this.canvas.height / 8);
        this.ctx.fillText("Create new Ship", this.canvas.width / 2, 5 * this.canvas.height / 8 + 25);

    }

    drawShape(shape) {
        shape.pos = new Vector2D(shape.pos.x - this.playerShipPos.x + this.canvas.width / 2, shape.pos.y - this.playerShipPos.y + this.canvas.height / 2);
        shape.pos.mod(this.width, this.height);

        this.ctx.strokeStyle = "#fff";
        this.ctx.save();
        this.ctx.translate(shape.pos.x, shape.pos.y);
        this.ctx.rotate(shape.angle);
        this.ctx.beginPath();


        this.ctx.moveTo(shape.lines[0].x, shape.lines[0].y);
        for (let i: number = shape.lines.length - 1; i > -1; i--) {
            this.ctx.lineTo(shape.lines[i].x, shape.lines[i].y);
        }
        this.ctx.stroke();
        this.ctx.restore();

    }
    drawShip(ship) {
        this.ctx.save();

        if (ship.id === this.playerShipID) {
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        }
        else {
            let p = new Vector2D(ship.pos.x, ship.pos.y).add((this.playerShipPos.copy()).mult(-1));
            p.add(new Vector2D(this.canvas.width / 2, this.canvas.height / 2));
            p.mod(this.width, this.height);

            this.ctx.translate(p.x, p.y);
        }

        this.ctx.fillStyle = "#FFF";
        this.ctx.textAlign = "center";
        this.ctx.font = "20px Arial";
        this.ctx.fillText(ship.username, 0, -45);

        this.ctx.rotate(ship.angle);

        this.ctx.fillStyle = ship.bodyColor;
        this.ctx.beginPath();
        this.ctx.moveTo(-ship.width / 2, 0);
        this.ctx.bezierCurveTo(0, ship.height, -ship.width / 4, ship.height / 8, ship.width / 2, 0);
        this.ctx.bezierCurveTo(-ship.width / 4, -ship.height / 8, 0, -ship.height, -ship.width / 2, 0);
        this.ctx.fill();

        if (ship.powerups.invincibility) {
            this.ctx.strokeStyle = "#22f8";
            this.ctx.lineWidth = 10;
            this.ctx.lineJoin = "round";
            this.ctx.beginPath();
            this.ctx.moveTo(-ship.width / 2, 0);
            this.ctx.bezierCurveTo(0, ship.height, -ship.width / 4, ship.height / 8, ship.width / 2, 0);
            this.ctx.bezierCurveTo(-ship.width / 4, -ship.height / 8, 0, -ship.height, -ship.width / 2, 0);
            this.ctx.stroke();
        }

        this.ctx.lineWidth = 2.0;
        this.ctx.strokeStyle = "#2222aa88";
        this.ctx.beginPath();
        this.ctx.moveTo(-ship.width / 2, 0);
        this.ctx.lineTo(3 * ship.width / 8, 0);
        this.ctx.stroke();
        this.ctx.strokeStyle = ship.wingColor;
        this.ctx.beginPath();
        this.ctx.moveTo(-3 * ship.width / 16, 7 * ship.height / 16);
        this.ctx.quadraticCurveTo(0, 0, ship.width / 2, 0);
        this.ctx.quadraticCurveTo(0, 0, -3 * ship.width / 16, -7 * ship.height / 16);
        this.ctx.stroke();

        this.ctx.strokeStyle = "#99999988";
        this.ctx.beginPath();
        this.ctx.moveTo(-3 * ship.width / 16, -7 * ship.height / 16);
        this.ctx.lineTo(-ship.width / 3, -7 * ship.height / 16);
        this.ctx.moveTo(-ship.width / 8, -5 * ship.height / 16);
        this.ctx.lineTo(-7 * ship.width / 16, -5 * ship.height / 16);
        this.ctx.moveTo(-ship.width / 32, -3 * ship.height / 16);
        this.ctx.lineTo(-ship.width / 2, -3 * ship.height / 16);
        this.ctx.moveTo(5 * ship.width / 32, -ship.height / 16);
        this.ctx.lineTo(-ship.width / 2, -ship.height / 16);
        this.ctx.moveTo(-3 * ship.width / 16, 7 * ship.height / 16);
        this.ctx.lineTo(-ship.width / 3, 7 * ship.height / 16);
        this.ctx.moveTo(-ship.width / 8, 5 * ship.height / 16);
        this.ctx.lineTo(-7 * ship.width / 16, 5 * ship.height / 16);
        this.ctx.moveTo(-ship.width / 32, 3 * ship.height / 16);
        this.ctx.lineTo(-ship.width / 2, 3 * ship.height / 16);
        this.ctx.moveTo(5 * ship.width / 32, ship.height / 16);
        this.ctx.lineTo(-ship.width / 2, ship.height / 16);
        this.ctx.stroke();

        if (ship.powerups.reflection) {
            this.ctx.strokeStyle = "#22f8";
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, Math.sqrt((ship.width * ship.width) / 4 + (ship.height * ship.height) / 4), 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();

        // if (ship.id === this.playerShipID) {
        //     this.gameElements.forEach(element => {
        //         element.move(new Vector2D(ship.pos.x, ship.pos.y));
        //     });
        // }
    }
}

class Bullet {
    id: number;
    pos: Vector2D;
    vel: Vector2D;
    angle: number;
    width: number;
    height: number;
    color: string;

    constructor(id: number, pos: Vector2D, vel: Vector2D, angle: number, width: number, height: number, color: string) {
        this.id = id;
        this.pos = pos;
        this.vel = vel;
        this.angle = angle;
        this.width = width;
        this.height = height;
        this.color = color;
    }

    move(d: Vector2D) {
        this.pos.add(d);
    }

    update() {
        this.pos.add(this.vel);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Debris {
    public static readonly FRICTION_CONSTANT: number = 0.95;
    public static readonly DECAY_CONSTANT: number = 0.2;

    public color: string;
    private chunks: Debris.Debri[];

    constructor(pos: Vector2D, angle: number, count: number, color: string) {
        this.chunks = []
        for (let i: number = 0; i < count; i++) {
            let randMag = Math.random() * 6 + 1;
            let randAngle = Math.random() * (3 * Math.PI / 2) - 3 * Math.PI / 4 + angle;
            this.chunks.push(new Debris.Debri(new Vector2D(pos.x, pos.y), Vector2D.fromAngle(randAngle).mult(randMag), Math.random() * 8, this));
        }

        this.color = color;
    }

    modAll() {
        this.chunks.forEach(chunk => chunk.pos.mod(this.width, this.height));
    }

    move(d: Vector2D) {
        this.chunks.forEach(chunk => chunk.move(d));
    }

    update() {
        this.chunks.forEach(chunk => chunk.update());
        this.chunks = this.chunks.filter(chunk => chunk.radius > 0);

        if (!this.chunks.length) {
            asteroidsGame.gameElements.splice(asteroidsGame.gameElements.indexOf(this), 1);
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        this.chunks.forEach(chunk => chunk.draw(ctx));
    }
}

namespace Debris {
    export class Debri {
        public pos: Vector2D;
        private vel: Vector2D;
        public radius: number;
        private superThis: Debris;

        constructor(pos: Vector2D, vel: Vector2D, radius: number, superThis: Debris) {
            this.pos = pos;
            this.vel = vel;
            this.radius = radius;
            this.superThis = superThis;
        }

        move(d: Vector2D) {
            this.pos.add(d);
        }

        update() {
            this.pos.add(this.vel);
            this.vel.mult(Debris.FRICTION_CONSTANT);
            this.radius -= Debris.DECAY_CONSTANT;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.fillStyle = this.superThis.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

class Star {
    public pos: Vector2D;
    private depth: number;

    constructor(pos: Vector2D, depth: number) {
        this.pos = pos;
        this.depth = depth;
    }

    move(d: Vector2D) {
        this.pos.add(d.copy().mult(1 - (this.depth / 10)));
        // this.pos.add(d);
    }

    update() {
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "#ffffff";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
    }
}

class Trail {
    private pos: Vector2D;
    private radius: number;

    constructor(pos: Vector2D) {
        this.pos = pos;
        this.radius = 9;
    }

    move(d: Vector2D) {
        this.pos.add(d);
    }

    update() {
        this.radius *= .85;
        if (this.radius < 0.01) {
            asteroidsGame.gameElements.splice(asteroidsGame.gameElements.indexOf(this), 1);
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "#5555ff77";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

class Powerup {
    id: number;
    pos: Vector2D;
    vel: Vector2D;
    lines: Vector2D[];
    height: number;
    width: number;
    angle: number;
    angleVel: number;
    type: string;

    constructor(id: number, pos: Vector2D, vel: Vector2D, lines: Vector2D[], width: number, height: number, type: string) {
        this.id = id;
        this.pos = pos;
        this.vel = vel;
        this.lines = lines;
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.angleVel = 0.05;
        this.type = type;
    }

    move(d: Vector2D) {
        this.pos.add(d);
    }

    update() {
        this.pos.add(this.vel);
        this.angle = (this.angleVel + this.angle) % (Math.PI * 2);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "#b0b5b0";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.beginPath();

        ctx.moveTo(this.lines[0].x, this.lines[0].y);
        for (let i: number = this.lines.length - 1; i > -1; i--) {
            ctx.lineTo(this.lines[i].x, this.lines[i].y);
        }
        ctx.fill();

        switch (this.type) {
            case "invincibility":
                ctx.strokeStyle = "#22f8";
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2 - 1, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case "triple shot":
                ctx.strokeStyle = "#8f2839";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, -this.height / 5);
                ctx.lineTo(this.width / 5, -this.height / 2);
                ctx.moveTo(-this.width / 2, 0);
                ctx.lineTo(2 * this.width / 5, 0);
                ctx.moveTo(-this.width / 2, this.height / 5);
                ctx.lineTo(this.width / 5, this.height / 2);
                ctx.stroke();
                break;

            case "turbo shot":
                ctx.strokeStyle = "#6a9e6d";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, 0);
                ctx.lineTo(-3 * this.width / 10, 0);
                ctx.moveTo(-this.width / 10, 0);
                ctx.lineTo(this.width / 10, 0);
                ctx.moveTo(3 * this.width / 10, 0);
                ctx.lineTo(this.width / 2, 0);
                ctx.stroke();
                break;
            case "reflection":
                ctx.strokeStyle = "#22f8";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, 0);
                ctx.lineTo(this.width / 2, 0);
                ctx.stroke();
                ctx.strokeStyle = "#6a9e6d";
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, this.height / 2);
                ctx.lineTo(0, 0);
                ctx.lineTo(this.width / 2, this.height / 2);
                ctx.stroke();
                break;
            case "minify":
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#5b5496";
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, -this.height / 2);
                ctx.lineTo(-this.width / 20, -this.height / 20);
                ctx.moveTo(-this.width / 10, -this.height / 5);
                ctx.lineTo(-this.width / 20, -this.height / 20);
                ctx.lineTo(-this.width / 5, -this.height / 10);

                ctx.moveTo(-this.width / 2, this.height / 2);
                ctx.lineTo(-this.width / 20, this.height / 20);
                ctx.moveTo(-this.width / 10, this.height / 5);
                ctx.lineTo(-this.width / 20, this.height / 20);
                ctx.lineTo(-this.width / 5, this.height / 10);

                ctx.moveTo(this.width / 2, -this.height / 2);
                ctx.lineTo(this.width / 20, -this.height / 20);
                ctx.moveTo(this.width / 10, -this.height / 5);
                ctx.lineTo(this.width / 20, -this.height / 20);
                ctx.lineTo(this.width / 5, -this.height / 10);

                ctx.moveTo(this.width / 2, this.height / 2);
                ctx.lineTo(this.width / 20, this.height / 20);
                ctx.moveTo(this.width / 10, this.height / 5);
                ctx.lineTo(this.width / 20, this.height / 20);
                ctx.lineTo(this.width / 5, this.height / 10);

                ctx.stroke();
                break;
        }

        ctx.restore();
    }
}

class Asteroid {
    id: number;
    pos: Vector2D;
    vel: Vector2D;
    lines: Vector2D[];
    angle: number;
    angleVel: number;

    constructor(id: number, pos: Vector2D, vel: Vector2D, lines: Vector2D[], angle: number, angleVel: number) {
        this.id = id;
        this.pos = pos;
        this.vel = vel;
        this.lines = lines;
        this.angle = angle;
        this.angleVel = angleVel;
    }

    move(d: Vector2D) {
        this.pos.add(d);
    }

    update() {
        this.pos.add(this.vel);
        this.angle = (this.angleVel + this.angle) % (Math.PI * 2);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "#334243";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.beginPath();

        ctx.moveTo(this.lines[0].x, this.lines[0].y);
        for (let i: number = this.lines.length - 1; i > -1; i--) {
            ctx.lineTo(this.lines[i].x, this.lines[i].y);
        }

        ctx.fill();
        ctx.restore();
    }
}

class Vector2D {
    x: number;
    y: number;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other: Vector2D) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    mult(factor: number) {
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    static fromAngle(angle: number) {
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    }

    mod(xMax: number, yMax: number) {
        this.x = ((this.x % xMax) + xMax) % xMax;
        this.y = ((this.y % yMax) + yMax) % yMax;
        // this.x %= xMax;
        // this.y %= yMax;
        return this;
    }

    copy() {
        return new Vector2D(this.x, this.y);
    }
}
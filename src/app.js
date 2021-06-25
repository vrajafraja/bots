let secondsInGame = 0;
let blobsCreated = 0;

const UP = -1;
const DOWN = 1;
const RIGHT = 1;
const LEFT = -1;

let _spawnLimit = 5;
let _spawnTimeout = 0.1;
let _spawnRate = 1;

let viewRayLength = 200;
let viewVectorMaxAngle = 45;
let viewRayDeltaAngle = 1;

var canvas;
var context;
var rectX = 0;
var rectY = 0;
var oldTimeStamp = 0;

var maxLimit = 500;
var minSpeed = 100;
var increaseSpeed = 10;
var decreaseSpeed = maxLimit * 0.05;
var fireLimit = 2000;
var fireTimeout = 5;
var dashTimeout = 10;
var left = 0;
var up = 0;
var right = 0;
var down = 0;
var maxSteeringLimit = 4;
var steeringSpeed = 1.5;

var speed = 0;

var blobPosX = (window.innerWidth - 30) / 2;
var blobPosY = (window.innerHeight - 30) / 2;

var keyMap = {
  16: "shift",
  32: "space",
  37: "left",
  38: "up",
  39: "right",
  40: "down",
  65: "left",
  87: "up",
  68: "right",
  83: "down",
};

var state = {
  pressedKeys: {
    left: false,
    right: false,
    up: false,
    down: false,
  },
};

let fireArray = [];
let blobArray = [];
let obstacleArray = [];

var ui;
var utils;

var heatMap;
var heatMapVisits;

// Listen to the onLoad event
window.onload = init;

// Trigger init function when the page has loaded
function init() {
  canvas = document.getElementById("viewport");
  context = canvas.getContext("2d");
  canvas.width = window.innerWidth - 50;
  canvas.height = window.innerHeight - 50;
  heatMap = context.createImageData(canvas.width, canvas.height);

  initHeatMap();
  ui = new UI(context);
  utils = new Utils();

  window.requestAnimationFrame(gameLoop);

  window.addEventListener("keydown", keydown, false);
  window.addEventListener("keyup", keyup, false);

  obstacleArray.push(new Obstacle({ x: 200, y: 200 }, 100, 100));
  obstacleArray.push(new Obstacle({ x: 700, y: 700 }, 100, 100));
  obstacleArray.push(new Obstacle({ x: 700, y: 700 }, 100, 100));
  obstacleArray.push(new Obstacle({ x: 400, y: 300 }, 100, 700));
  obstacleArray.push(new Obstacle({ x: 0, y: 800 }, 900, 100));
  obstacleArray.push(new Obstacle({ x: 1000, y: 200 }, 600, 100));
  obstacleArray.push(
    new Obstacle({ x: canvas.width - 200, y: canvas.height - 200 }, 100, 100)
  );

  blobArray.push(
    new Blob({
      positionX: blobPosX + 40,
      positionY: blobPosY + 40,
      context,
      isPlayer: true,
      color: "black",
    })
  );
  blobArray.push(
    new Blob({
      positionX: blobPosX - 40,
      positionY: blobPosY + 40,
      context,
      frontVector: utils.normalizeVector({
        x: Math.random(),
        y: Math.random(),
      }),
      speed: maxLimit,
      type: "bot",
    })
  );
}

function keydown(event) {
  var key = keyMap[event.keyCode];
  state.pressedKeys[key] = true;
}
function keyup(event) {
  var key = keyMap[event.keyCode];
  state.pressedKeys[key] = false;
}

function gameLoop(timeStamp) {
  // Calculate how much time has passed
  var secondsPassed = (timeStamp - oldTimeStamp) / 1000;
  oldTimeStamp = timeStamp;

  // Update game objects
  update(secondsPassed);

  // Perform the drawing operation
  draw();
  // console.log(left);

  // The loop function has reached it's end
  // Keep requesting new frames
  window.requestAnimationFrame(gameLoop);
}

let _lastSpawn = 0;

function update(secondsPassed) {
  secondsInGame += secondsPassed;
  if (secondsInGame - _lastSpawn > _spawnTimeout) {
    _lastSpawn = secondsInGame;
    if (_spawnLimit != 0) {
      let spawned = 0;
      while (spawned < _spawnRate && blobArray.length <= _spawnLimit) {
        spawnBot();
        spawned++;
      }
    } else {
      spawnBot();
    }
  }

  blobArray.forEach((blob) => {
    blob.move();
  });

  fireArray.forEach((fire) => {
    fire.move();
  });

  blobArray = blobArray.filter((blob) => !blob.isDestroyed());
  fireArray = fireArray.filter((fire) => !fire.isDestroyed());
}

function hwb2rgb(h, w = 1, b = 1) {
  h *= 6;

  var v = 1 - b,
    n,
    f,
    i;
  if (!h) return { r: v, g: v, b: v };
  i = h | 0;
  f = h - i;
  if (i & 1) f = 1 - f;
  n = w + f * (v - w);
  v = (v * 255) | 0;
  n = (n * 255) | 0;
  w = (w * 255) | 0;

  switch (i) {
    case 6:
    case 0:
      return { r: v, g: n, b: w };
    case 1:
      return { r: n, g: v, b: w };
    case 2:
      return { r: w, g: v, b: n };
    case 3:
      return { r: w, g: n, b: v };
    case 4:
      return { r: n, g: w, b: v };
    case 5:
      return { r: v, g: w, b: n };
    default:
      return { r: v, g: w, b: n };
  }
}

function drawVisit(point) {
  let visited = ++heatMapVisits[point.x][point.y];
  let i = 4 * (point.y * canvas.width + point.x);
  let normalized = visited / (20 + Math.abs(visited));
  let hwb = hwb2rgb(normalized);
  let red = hwb.r;
  let green = hwb.g;
  let blue = hwb.b;

  heatMap.data[i] = red;
  heatMap.data[i + 1] = green;
  heatMap.data[i + 2] = blue;
  heatMap.data[i + 3] = 255;
}

function initHeatMap() {
  heatMapVisits = [...Array(canvas.width)].map((x) =>
    Array(canvas.height).fill(0)
  );
  for (let i = 0; i < heatMap.data.length; i += 4) {
    heatMap.data[i + 0] = 100;
    heatMap.data[i + 1] = 100;
    heatMap.data[i + 2] = 100;
    heatMap.data[i + 3] = 255;
  }
}

function draw() {
  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.putImageData(heatMap, 0, 0);

  fireArray.forEach((fire) => fire.draw());
  blobArray.forEach((blob) => blob.draw());
  obstacleArray.forEach((obstacle) => obstacle.draw());
  ui.drawBlobNumber();
  // ui.drawScoreBoard();
}

function spawnBot() {
  blobArray.push(
    new Blob({
      positionX: blobPosX - 500 * Math.random(),
      positionY: blobPosY + 500 * Math.random(),
      context,
      angle: Math.random() * Math.PI,
      frontVector: utils.normalizeVector({
        x: Math.random() - Math.random(),
        y: Math.random() - Math.random(),
      }),
      speed: maxLimit,
      type: "bot",
    })
  );
}

class UI {
  _context;

  constructor(context) {
    this._context = context;
  }

  normalizeValue(x) {
    const lineWidth = 200;
    return x / (maxLimit / lineWidth);
  }

  drawSpeed(speed) {
    this.drawAxesValues(70, this.normalizeValue(speed));
  }

  drawAxesValues(y, value) {
    // Create gradient
    var grd = this._context.createLinearGradient(0, 0, 200, 0);
    grd.addColorStop(0.1, "green");
    grd.addColorStop(0.8, "yellow");
    grd.addColorStop(1, "red");

    // Fill with gradient
    context.fillStyle = grd;
    context.fillRect(10, y, value, 10);
  }

  drawScoreBoard() {
    this._context.font = "30px Arial";
    let score = blobArray.sort((a, b) => {
      return Math.sign(b.getScore() - a.getScore());
    });
    score.forEach((blob, index) => {
      this._context.fillStyle = blob._color;
      this._context.fillText(
        blob._id + " : " + blob.getScore(),
        10,
        50 * (index + 1)
      );
      this._context.stroke();
    });
  }

  drawBlobNumber() {
    this._context.font = "30px Arial";
    this._context.fillText(blobArray.length, canvas.width - 100, 50);
  }
}

class Utils {
  rotateVector(vector, angle) {
    angle = angle * (Math.PI / 180);
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    return {
      x: Math.round(10000 * (vector.x * cos - vector.y * sin)) / 10000,
      y: Math.round(10000 * (vector.x * sin + vector.y * cos)) / 10000,
    };
  }

  normalizeVector(vector) {
    let normalizedVector = Object.assign({}, vector);
    let length = this.vectorLength(normalizedVector);
    normalizedVector.x /= length;
    normalizedVector.y /= length;
    return normalizedVector;
  }

  vectorLength(vectorA, vectorB = { x: 0, y: 0 }) {
    var a = vectorA.x - vectorB.x;
    var b = vectorA.y - vectorB.y;

    return Math.sqrt(a * a + b * b);
  }

  scaleVector(vector, scale) {
    return { x: vector.x * scale, y: vector.y * scale };
  }

  intersection(from1, to1, from2, to2) {
    const dX = to1.x - from1.x;
    const dY = to1.y - from1.y;

    const determinant = dX * (to2.y - from2.y) - (to2.x - from2.x) * dY;
    if (determinant === 0) return undefined; // parallel lines

    const lambda =
      ((to2.y - from2.y) * (to2.x - from1.x) +
        (from2.x - to2.x) * (to2.y - from1.y)) /
      determinant;
    const gamma =
      ((from1.y - to1.y) * (to2.x - from1.x) + dX * (to2.y - from1.y)) /
      determinant;

    // check if there is an intersection
    if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1))
      return undefined;

    return {
      x: from1.x + lambda * dX,
      y: from1.y + lambda * dY,
    };
  }
}

class Obstacle {
  _lines;
  _points;
  _width;
  _height;
  constructor(position, width, height) {
    this._lines = [];
    this._points = [];
    this._width = width;
    this._height = height;
    let topLeft = { x: position.x - width / 2, y: position.y - height / 2 };
    let topRight = { x: position.x + width / 2, y: position.y - height / 2 };
    let bottomLeft = { x: position.x - width / 2, y: position.y + height / 2 };
    let bottomRight = { x: position.x + width / 2, y: position.y + height / 2 };
    this._points.push(topLeft);
    this._points.push(topRight);
    this._points.push(bottomRight);
    this._points.push(bottomLeft);
    this._lines.push({ from: topLeft, to: topRight });
    this._lines.push({ from: topRight, to: bottomRight });
    this._lines.push({ from: bottomLeft, to: bottomRight });
    this._lines.push({ from: bottomLeft, to: topLeft });
  }

  getLines() {
    return this._lines;
  }

  draw() {
    context.strokeStyle = "black";
    context.beginPath();
    context.rect(
      this._points[0].x,
      this._points[0].y,
      this._width,
      this._height
    );
    context.stroke();
  }
}

class Blob {
  _id;
  _positionX;
  _positionY;
  _context;
  _frontVector;
  _speed;
  _angle;
  _fireTimeout;
  _dashTimeout;
  _isDestroyed;
  _type;
  _kills;
  _parentBlob;
  _viewVectors;
  _size;
  _color;

  _randomColors = [
    "gold",
    "blue",
    "green",
    "yellow",
    "brown",
    "orange",
    "pink",
    "black",
    "grey",
    "violet",
  ];

  constructor({
    positionX = 0,
    positionY = 0,
    context,
    frontVector = { x: 0, y: UP },
    speed = 0,
    angle = 0,
    isPlayer = false,
    type = "blob",
    parentBlob,
    size = 10,
    color,
  }) {
    this._id = blobsCreated++;
    this._positionX = positionX;
    this._positionY = positionY;
    this._context = context;
    this._frontVector = frontVector;
    this._speed = speed;
    this._angle = angle;
    this._fireTimeout = 0;
    this._dashTimeout = 0;
    this._isPlayer = isPlayer;
    this._isDestroyed = false;
    this._type = type;
    this._kills = 0;
    this._parentBlob = parentBlob;
    this._size = size;
    this._color = color || this._randomColors[Math.round(Math.random() * 10)];
  }

  getScore() {
    return this._kills;
  }

  isDestroyed() {
    return this._isDestroyed;
  }

  destroy() {
    if (!this._isPlayer) {
      this._isDestroyed = true;
      if (this._type != "fire") {
        // console.log(this);
      }
    }
  }

  kill() {
    this._kills--;
    if (this._kills <= 0) {
      this.destroy();
    }
  }

  getPosition() {
    return { x: Math.round(this._positionX), y: Math.round(this._positionY) };
  }

  draw() {
    context.beginPath();
    context.strokeStyle = this._color;
    context.arc(this._positionX, this._positionY, this._size, 0, 2 * Math.PI);
    if (this._type != "fire") {
      context.moveTo(this._positionX, this._positionY);
      context.lineTo(
        this._positionX + this._frontVector.x * 50,
        this._positionY + this._frontVector.y * 50
      );
    }
    context.stroke();
    if (this._type != "fire") {
      this.drawView();
      context.strokeStyle = "black";
    }
    if (this._isPlayer) {
      ui.drawSpeed(this._speed);
    }
  }

  drawView() {
    this._viewVectors.forEach(({ vector, color }) => {
      if (color) {
        context.beginPath();
        context.strokeStyle = color || this._color;
        context.moveTo(this._positionX, this._positionY);
        context.lineTo(this._positionX + vector.x, this._positionY + vector.y);
        context.stroke();
      }
    });
  }

  rotate() {
    this._frontVector = utils.rotateVector(this._frontVector, this._angle);
  }

  moveForward(speed) {
    let delta = speed || this._speed;
    this._positionX += (this._frontVector.x * delta) / 100;
    this._positionY += (this._frontVector.y * delta) / 100;
  }

  outOfBounds() {
    if (this._type == "fire") {
      if (
        this._positionX < 0 ||
        this._positionX > canvas.width ||
        this._positionY < 0 ||
        this._positionY > canvas.height
      ) {
        this.destroy();
      }
    } else {
      if (this._positionX < 0) {
        this._positionX = canvas.width;
      } else if (this._positionX > canvas.width) {
        this._positionX = 0;
      } else if (this._positionY < 0) {
        this._positionY = canvas.height;
      } else if (this._positionY > canvas.height) {
        this._positionY = 0;
      }
    }
  }

  scanInputs() {
    if (state.pressedKeys.up) {
      this._speed =
        this._speed < maxLimit ? this._speed + increaseSpeed : maxLimit;
    }

    if (state.pressedKeys.down) {
      this._speed =
        this._speed - decreaseSpeed > 0 ? this._speed - decreaseSpeed : 0;
    }

    if (!state.pressedKeys.up && !state.pressedKeys.down) {
      this._speed = this._speed > 0 ? this._speed - increaseSpeed : 0;
    }

    if (state.pressedKeys.left && !state.pressedKeys.right) {
      this._angle =
        Math.abs(this._angle + steeringSpeed) < maxSteeringLimit
          ? this._angle - steeringSpeed
          : -maxSteeringLimit;
    }
    if (state.pressedKeys.right && !state.pressedKeys.left) {
      this._angle =
        this._angle + steeringSpeed < maxSteeringLimit
          ? this._angle + steeringSpeed
          : maxSteeringLimit;
    }
    if (
      (!state.pressedKeys.right && !state.pressedKeys.left) ||
      (state.pressedKeys.right && state.pressedKeys.left)
    ) {
      if (this._angle > 0) {
        this._angle =
          this._angle - steeringSpeed > 0 ? this._angle - steeringSpeed : 0;
      } else if (this._angle < 0) {
        this._angle =
          this._angle + steeringSpeed < 0 ? this._angle + steeringSpeed : 0;
      }
    }

    if (state.pressedKeys.space) {
      if (this._fireTimeout == 0) {
        this._fireTimeout = fireTimeout;
        this.fire();
      }
    }

    if (state.pressedKeys.shift) {
      if (this._dashTimeout == 0) {
        this._dashTimeout = dashTimeout;
        this.dash();
      }
    }
  }

  dash() {
    this.moveForward(5000);
  }

  fire() {
    let positionX = this._positionX + this._frontVector.x * 50;
    let positionY = this._positionY + this._frontVector.y * 50;
    fireArray.push(
      new Blob({
        positionX,
        positionY,
        frontVector: Object.assign({}, this._frontVector),
        speed: fireLimit,
        context: this._context,
        type: "fire",
        parentBlob: this,
        color: this._color,
      })
    );
    // blobArray.push(new Blob({ positionX, positionY, frontVector: Object.assign({}, this._frontVector), speed: fireLimit, context: this._context, type: 'bot', parentBlob: this, color: this._color }));
  }

  _distance(blobA, blobB) {
    return Math.sqrt(
      Math.pow(blobB._positionX - blobA._positionX, 2) +
        Math.pow(blobB._positionY - blobA._positionY, 2)
    );
  }

  hit() {
    blobArray.forEach((blob) => {
      if (this._distance(blob, this) <= blob._size + this._size) {
        blob.kill();
        this.destroy();
        this._parentBlob._kills++;
      }
    });
  }

  randomize() {
    let rand = Math.random() * Math.random();
    let fire = rand > 0.8;
    let dash = rand > 0.1095 && rand < 0.1111;

    if (fire && this._fireTimeout == 0) {
      this._fireTimeout = fireTimeout;
      this.fire();
    }

    if (dash && this._dashTimeout == 0) {
      this._dashTimeout = dashTimeout;
      this.dash();
    }

    if (this._angle == 0) {
      this._angle += Math.sin(secondsInGame * 10) * Math.random() * Math.PI * 4;
    }
  }

  tryToAvoidObstacle() {
    let delta = 0;
    let slowDownCoeff = false;

    this._viewVectors.forEach((viewVector) => {
      delta += viewVector.length || (viewRayLength * viewVector.angle) / 2;
      //   let shouldSlow = viewVector.angle == 0;
      let shouldSlow =
        viewVector.angle == -viewRayDeltaAngle ||
        viewVector.angle == 0 ||
        viewVector.angle == viewRayDeltaAngle;
      if (shouldSlow && viewVector.length) {
        slowDownCoeff = 1 - viewVector.length / viewRayLength;
      }
    });
    let angleDelta = Math.abs(Math.sqrt(Math.log(delta)));

    if (slowDownCoeff) {
      this._speed =
        this._speed - decreaseSpeed * 2 * slowDownCoeff > minSpeed
          ? this._speed - decreaseSpeed * 2 * slowDownCoeff
          : minSpeed;
    } else {
      this._speed =
        this._speed + increaseSpeed < maxLimit
          ? this._speed + increaseSpeed
          : maxLimit;
    }

    if (Math.sign(delta) < 0) {
      this._angle =
        Math.abs(this._angle + angleDelta * steeringSpeed) < maxSteeringLimit
          ? this._angle - angleDelta * steeringSpeed
          : -maxSteeringLimit;
    } else if (Math.sign(delta) > 0) {
      this._angle =
        this._angle + angleDelta * steeringSpeed < maxSteeringLimit
          ? this._angle + angleDelta * steeringSpeed
          : maxSteeringLimit;
    } else {
      if (this._angle > 0) {
        this._angle =
          this._angle - steeringSpeed > 0 ? this._angle - steeringSpeed : 0;
      } else if (this._angle < 0) {
        this._angle =
          this._angle + steeringSpeed < 0 ? this._angle + steeringSpeed : 0;
      }
    }
  }

  view() {
    this._viewVectors = [];
    for (
      let i = -viewVectorMaxAngle;
      i <= viewVectorMaxAngle;
      i += viewRayDeltaAngle
    ) {
      this._viewVectors.push({
        angle: i,
        length: 0,
        colision: false,
        vector: utils.scaleVector(
          utils.rotateVector(this._frontVector, i),
          viewRayLength - 1 * Math.abs(i)
        ),
      });
    }

    this.avoidOutsideWalls();
    this.avoidObstacles();
  }

  avoidObstacles() {
    obstacleArray.forEach((obstacle) => {
      let lines = obstacle.getLines();
      this._viewVectors.forEach((viewVector) => {
        lines.some((line) => {
          let view = {
            x: this._positionX + viewVector.vector.x,
            y: this._positionY + viewVector.vector.y,
          };
          let intersection = utils.intersection(
            { x: this._positionX, y: this._positionY },
            view,
            line.from,
            line.to
          );
          if (intersection) {
            let length = utils.vectorLength(intersection, this.getPosition());
            viewVector.length = length;
            viewVector.color = "red";
            return true;
          }
          return false;
        });
      });
    });
  }

  avoidOutsideWalls() {
    this._viewVectors.forEach((viewVector) => {
      let view = {
        x: this._positionX + viewVector.vector.x,
        y: this._positionY + viewVector.vector.y,
      };
      let upInter = utils.intersection(
        { x: this._positionX, y: this._positionY },
        view,
        { x: 10, y: 10 },
        { x: canvas.width - 10, y: 10 }
      );
      let rightInter = utils.intersection(
        { x: this._positionX, y: this._positionY },
        view,
        { x: canvas.width, y: 0 },
        { x: canvas.width, y: canvas.height }
      );
      let downInter = utils.intersection(
        { x: this._positionX, y: this._positionY },
        view,
        { x: 0, y: canvas.height },
        { x: canvas.width, y: canvas.height }
      );
      let leftInter = utils.intersection(
        { x: this._positionX, y: this._positionY },
        view,
        { x: 0, y: 0 },
        { x: 0, y: canvas.height }
      );

      let upLength;
      let rightLength;
      let downLength;
      let leftLength;
      if (upInter) {
        upLength = utils.vectorLength(upInter, this.getPosition());
        viewVector.length = Math.min(upLength);
        viewVector.color = "red";
      } else if (rightInter) {
        rightLength = utils.vectorLength(rightInter, this.getPosition());
        viewVector.length = Math.min(rightLength);
        viewVector.color = "red";
      } else if (downInter) {
        downLength = utils.vectorLength(downInter, this.getPosition());
        viewVector.length = Math.min(downLength);
        viewVector.color = "red";
      } else if (leftInter) {
        leftLength = utils.vectorLength(leftInter, this.getPosition());
        viewVector.length = Math.min(leftLength);
        viewVector.color = "red";
      }
    });
  }

  reduceTimeouts() {
    if (this._fireTimeout > 0) {
      this._fireTimeout--;
    }
    if (this._dashTimeout > 0) {
      this._dashTimeout--;
    }
  }

  move() {
    this.view();
    if (this._type != "fire") {
      drawVisit(this.getPosition());
    }
    if (this._isPlayer) {
      this.scanInputs();
    } else if (this._type == "fire") {
      this.hit();
    } else if (this._type == "bot") {
      this.tryToAvoidObstacle();
      this.randomize();
    }
    this.reduceTimeouts();
    this.rotate();
    this.outOfBounds();
    this.moveForward();
  }
}

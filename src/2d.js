'use strict';

// 2d canvas controls
let canvas2D = document.getElementById("c2");
let ctx2D = canvas2D.getContext("2d");

const cameraUI = document.getElementById("camera-ui");
const gameUi = document.getElementById("c");
cameraUI.classList.add("hidden");
gameUi.classList.add("hidden");

// TODO: use object colors :)
const gray = "rgba(218, 215, 215, 1)";
const clawGray = "rgba(201, 191, 191, 1)";
const mouseGray = "rgba(167, 157, 157, 1)";
const white = "rgba(255, 255, 255, 1)";
const pawPink = "rgba(253, 187, 220, 1)";
const furBlack = "rgba(49, 47, 47, 1)";
const slime = "rgba(123, 250, 166, 1)"
const lighterPurple = "rgba(201, 207, 247, 1)";
const lightPurple = "rgba(179, 188, 243, 1)";
const darkPurple = "rgba(116, 109, 195, 1)";


function drawBackground() {
  // using the size of the canvas, we can figure out how many boxes to draw
  const boxSize = 25;
  // can also use ctx height too
  const numBoxesX = Math.ceil(canvas2D.width / boxSize);
  const numBoxesY = Math.ceil(canvas2D.height / boxSize);
  for (let i = 0; i < numBoxesX; i++) {
    for (let j = 0; j < numBoxesY; j++) {
      ctx2D.fillStyle = (i + j) % 2 === 0 ? white : gray;
      ctx2D.fillRect(i * boxSize, j * boxSize, boxSize, boxSize);
    }
  }
}

// because the canvas takes up the entire screen, we don't need to account for the specific canvas position
// We can just use the client coordinates! But if we did, we'd have to account for the relative position.
let mouseX;
let mouseY;
function handleMouseMove(e) {
  const rect = canvas2D.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (canvas2D.width / rect.width);
  mouseY = (e.clientY - rect.top) * (canvas2D.height / rect.height);
  let isFilling = false;
  renderedButtons.forEach(button => {
    if (ctx2D.isPointInPath(button.path, e.offsetX, e.offsetY)) {
      activeButton = button
      isFilling = true;
    }
  });

  // allows users to back out
  if (!isFilling) {
    fillNum = 0;
    activeButton = null;
  }
}

function drawComputer() {
  // draw the computer screen
  ctx2D.fillStyle = lightPurple;
  const computerHeight = canvas2D.height - 50;
  const computerWidth = canvas2D.width - 50;
  ctx2D.fillRect(25, 25, computerWidth, computerHeight);

  // draw the toolbar
  ctx2D.fillStyle = darkPurple;
  ctx2D.fillRect(25, 25, computerWidth, 50);

  // add the title! :)
  ctx2D.fillStyle = 'white';
  ctx2D.font = "20px monospace";
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";
  ctx2D.fillText("Black Cat Detective Agency", 200, 50);

  // draw x box
  ctx2D.fillStyle = lightPurple;
  ctx2D.fillRect(computerWidth - 10, 35, 30, 30);
  ctx2D.fillStyle = darkPurple;
  ctx2D.font = "20px monospace";
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";
  ctx2D.fillText("x", computerWidth + 5, 50);
}

function drawButton({ text, onClick, alignment, fontSize = 35 }) {
  // trying to set the width dynamically
  const width = (fontSize / 1.5) * text.length;
  const height = fontSize * 1.5;

  let x = (canvas2D.width - width) / 2;
  let y = (canvas2D.height - height) / 2;
  if (alignment === 'left') {
    x = 75;
    y = canvas2D.height - height - 70;
  } else if (alignment === 'right') {
    x = canvas2D.width - width - 75;
    y = canvas2D.height - height - 70;
  }

  const button = new Path2D();
  button.rect(x, y, width, height);
  ctx2D.fillStyle = darkPurple;
  ctx2D.fill(button);
  // add the text
  ctx2D.fillStyle = 'white';
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";
  ctx2D.font = `${fontSize}px monospace`;
  ctx2D.fillText(text, x + width / 2, y + height / 2);

  // add a border
  ctx2D.strokeStyle = lighterPurple;
  ctx2D.lineWidth = 5;
  ctx2D.strokeRect(x, y, width, height);

  return { path: button, x, y, width, height, onClick };
}

// https://stackoverflow.com/questions/62270509/javascript-is-it-possible-to-animate-the-fillrect-of-a-shape-in-a-canvas
function fillButton() {
  if (!activeButton) return;
  ctx2D.fillStyle = slime;
  ctx2D.fillRect(activeButton.x, activeButton.y + activeButton.height - Math.min(fillNum, activeButton.height), activeButton.width, Math.min(fillNum, activeButton.height));
  fillNum += activeButton.height * 0.01;
  if (fillNum >= activeButton.height + 25) { // some buffer to let it chill for a sec
    fillNum = 0;
    activeButton.onClick();
    activeButton = null;
    return;
  }
  // requestAnimationFrame(fillButton);
}


let fillNum = 0;
let activeButton = null;
let renderedButtons = [];

function drawStart() {
  // add the mouse!
  drawMouse();
  // add the start button
  const onClick = () => isStartingGame = true;
  renderedButtons = [drawButton({ text: 'Start', fontSize: 85, onClick })];
}

function drawSpeech(arr) {
  let textContainsPhoto = false;
  arr.forEach(({ text, photo, side }, index) => {
    const fontSize = 18;
    const photoWidth = 250;
    const photoHeight = 200;
    const photoPadding = 20;
    // trying to set the width dynamically - also account for photo
    const width = text ? (fontSize / 1.5) * text.length : photoWidth + photoPadding;
    const height = text ? fontSize * 1.5 : photoHeight + photoPadding;

    // bubble
    const x = side === 'right' ? canvas2D.width - width - 75 : 75;
    const y = 100 + (50 * index) + (textContainsPhoto ? photoHeight + photoPadding : 0);
    textContainsPhoto = textContainsPhoto || photo ? true : false; // set after applying photo
    const radii = 10;
    ctx2D.fillStyle = 'white';
    ctx2D.strokeStyle = 'white';
    ctx2D.beginPath();
    ctx2D.fillRect(x, y, width, height, radii);

    // flag
    ctx2D.fillStyle = 'white';
    if (side === 'right') {
      // right side square
      ctx2D.fillRect(x + width, y, 7, 7);
    } else {
      // left side square
      ctx2D.fillRect(x - 7, y, 7, 7);
    }

    if (text) {
      // add the text
      ctx2D.font = `${fontSize}px monospace`;
      ctx2D.fillStyle = darkPurple;
      ctx2D.fillText(text, x + width / 2, y + height / 2);
    }
    // draw the photo in the speech bubble!!
    if (photo && !dialogImgFinished) {
      cropImg(photo, photoWidth, photoHeight, x + (photoPadding / 2), y + (photoPadding / 2));
    }
  })
}

// https://stackoverflow.com/questions/26015497/how-to-resize-then-crop-an-image-with-canvas
function cropImg(img, targetWidth, targetHeight, x, y) {
  const imgAspect = img.width / img.height;
  const boxAspect = targetWidth / targetHeight;
  let startX = 0;
  let startY = 0;
  let scaledWidth = img.width;
  let scaledHeight = img.height;
  // image is too wide
  if (imgAspect > boxAspect) {
    scaledWidth = scaledHeight * boxAspect;
    startX = (img.width - scaledWidth) / 2;
  } else if (boxAspect > imgAspect) {
    // Image is too tall
    scaledHeight = scaledWidth / boxAspect;
    startY = (img.height - scaledHeight) / 2;
  }
  ctx2D.drawImage(img,
    startX, startY, // start x y
    scaledWidth, scaledHeight, // crop amount
    x, y, // dest x y
    targetWidth, targetHeight // dest width height
  );
}

const timeToAppear = 1500;
function drawScene({ time, textArr, offset, hasPicture }) {
  drawComputer();
  if (!hasPicture || dialogImgLoaded) {
    let timeElapsed = time - start;
    let currentIndex = Math.floor(timeElapsed / timeToAppear) >= textArr.length - 1 ? textArr.length - 1 : Math.floor(timeElapsed / timeToAppear) + offset;
    drawSpeech(textArr.slice(0, currentIndex + 1));
  }
}

// lol just a little reminder to myself...
// x position, y position, width, height
function drawPaw() {
  const heightOffset = 60; // a little bit higher than the center pad
  const mouseOffset = -80;
  // if swatCount is high bring out the claws >:) 
  if (swatCount >= 250) {
    // left claws
    ctx2D.fillStyle = clawGray;
    ctx2D.beginPath();
    // top center
    ctx2D.moveTo(mouseX - 45, mouseY - mouseOffset - heightOffset - 100);
    // bottom left
    ctx2D.lineTo(mouseX - 45, mouseY - mouseOffset - heightOffset - 45);
    // bottom right
    ctx2D.lineTo(mouseX - 25, mouseY - mouseOffset - heightOffset - 45);
    ctx2D.closePath();
    ctx2D.fill();

    // left claw
    ctx2D.fillStyle = clawGray;
    ctx2D.beginPath();
    // top center
    ctx2D.moveTo(mouseX - 95, mouseY - mouseOffset - heightOffset - 50);
    // bottom left
    ctx2D.lineTo(mouseX - 95, mouseY - mouseOffset - 75 / 2);
    // bottom right
    ctx2D.lineTo(mouseX - 75, mouseY - mouseOffset - 75 / 2);
    ctx2D.closePath();
    ctx2D.fill();

    // right claws
    ctx2D.fillStyle = clawGray;
    ctx2D.beginPath();
    // top center
    ctx2D.moveTo(mouseX + 45, mouseY - mouseOffset - heightOffset - 100);
    // bottom left
    ctx2D.lineTo(mouseX + 45, mouseY - mouseOffset - heightOffset - 45);
    // bottom right
    ctx2D.lineTo(mouseX + 25, mouseY - mouseOffset - heightOffset - 45);
    ctx2D.closePath();
    ctx2D.fill();

    // right claw
    ctx2D.fillStyle = clawGray;
    ctx2D.beginPath();
    // top center
    ctx2D.moveTo(mouseX + 95, mouseY - mouseOffset - heightOffset - 50);
    // bottom left
    ctx2D.lineTo(mouseX + 95, mouseY - mouseOffset - 75 / 2);
    // bottom right
    ctx2D.lineTo(mouseX + 75, mouseY - mouseOffset - 75 / 2);
    ctx2D.closePath();
    ctx2D.fill();
  }

  // this is the arm part- it starts at the bottom!
  ctx2D.fillStyle = furBlack;
  ctx2D.fillRect(mouseX - 100, mouseY - mouseOffset - heightOffset, 200, canvas2D.height - (mouseY - mouseOffset - heightOffset));

  // this is the paw (one bigger box)
  ctx2D.fillStyle = furBlack;
  ctx2D.fillRect(mouseX - 70, mouseY - mouseOffset - heightOffset - 45, 140, 100);

  // this is the center paw pad
  ctx2D.fillStyle = pawPink;
  const centerPadSize = 75;
  const centerXPos = mouseX - centerPadSize / 2;
  const centerYPos = mouseY - mouseOffset - centerPadSize / 2;
  ctx2D.fillRect(centerXPos, centerYPos - 15, centerPadSize, centerPadSize);

  // this is the rest of the paw pads
  const littlePadSize = 35;
  ctx2D.fillStyle = pawPink;
  // left middle pad
  ctx2D.fillRect(centerXPos - littlePadSize - 8, centerYPos + littlePadSize - 50, littlePadSize, littlePadSize);
  // left right pad
  ctx2D.fillRect(centerXPos + centerPadSize + 8, centerYPos + littlePadSize - 50, littlePadSize, littlePadSize);
  // top left pad
  ctx2D.fillRect(mouseX - 45, mouseY - mouseOffset - heightOffset - 35, littlePadSize, littlePadSize);
  // top right pad
  ctx2D.fillRect(mouseX + 10, mouseY - mouseOffset - heightOffset - 35, littlePadSize, littlePadSize);

}


// starting position
let mousePosition = {
  x: 100,
  y: 0,
  angle: 45,
}

let swatCount = 0;

function drawMouse() {
  let isCollidingWithMouse = false;
  // check if the paw is colliding with the mouse
  if (mouseX > mousePosition.x - 50 && mouseX < mousePosition.x + 50 &&
    mouseY > mousePosition.y - 50 && mouseY < mousePosition.y + 50) {
    isCollidingWithMouse = true;
    swatCount++;
  }

  if (isCollidingWithMouse) {
    // clamp to inside of the browser window
    mousePosition.x = mouseX > 150 && mouseX < canvas2D.width - 150 ? mouseX : mousePosition.x;
    mousePosition.y = mouseY > 150 && mouseY < canvas2D.height - 150 ? mouseY : mousePosition.y;
    // update the angle the mouse is facing
    // https://stackoverflow.com/questions/33449101/rotate-a-div-towards-the-direction-of-the-mouse-using-atan2
    mousePosition.angle = Math.atan2(mouseY - 200, mouseX - 250) * 180 / Math.PI;
  }

  // save context and apply transform
  ctx2D.save();
  // this will translate the context to where the mouse is so the following shapes are drawn in the right place
  ctx2D.translate(mousePosition.x, mousePosition.y);
  ctx2D.rotate((mousePosition.angle * Math.PI) / 180);
  ctx2D.scale(2, 2);


  // draw mouse at starting place
  // fun fact i'm using the same raindrop shape that I used in my first js13k game!! :) :) :) 
  ctx2D.fillStyle = mouseGray;
  ctx2D.beginPath();
  ctx2D.moveTo(-20, 0);
  ctx2D.lineTo(0, -40);
  ctx2D.lineTo(20, 0);
  ctx2D.arc(0, 0, 20, 50, Math.PI);
  ctx2D.closePath();
  ctx2D.fill();

  // add ears
  ctx2D.fillStyle = mouseGray;
  const size = 10;
  ctx2D.beginPath();
  ctx2D.arc(-15, -15, size, 0, Math.PI * 2);
  ctx2D.fill();

  ctx2D.beginPath();
  ctx2D.arc(15, -15, size, 0, Math.PI * 2);
  ctx2D.fill();

  // nose
  ctx2D.fillStyle = furBlack;
  ctx2D.beginPath();
  ctx2D.arc(0, -40, 2, 0, Math.PI * 2);
  ctx2D.fill();

  // tail
  ctx2D.strokeStyle = mouseGray;
  ctx2D.lineWidth = 3;
  ctx2D.beginPath();
  ctx2D.moveTo(0, 20);
  ctx2D.bezierCurveTo(
    10, 40,
    -30, 60,
    -10, 80
  );
  ctx2D.stroke();
  // reset the context transform
  ctx2D.restore();
}

// resize the canvas
function resize2D() {
  // reset dialog image state
  dialogImgFinished = false;
  window.webglUtils.resizeCanvasToDisplaySize(canvas2D, 1);
  mousePosition = {
    x: 200,
    y: canvas2D.height - 200,
    angle: 45,
  }
}

let transitionOffset = null;
let dialogTransitionOffset = null;
let isStartingGame = false;
// debug scene gamestate 
window.gameState = 4; // 0;
let reply = true;
let start = null;

function startReplyTimer(time) {
  reply = false;
  start = time;
}

function handleReplyTimer(time, textCount) {
  let seconds = textCount * timeToAppear + 1000; // 1 second buffer at the end
  if (!reply && start !== null && time - start > seconds) {
    reply = true;
    start = null;
  } else {
    renderedButtons = [];
  }
}

function renderNextScene(nextGameState) {
  return function () {
    startReplyTimer(performance.now());
    window.gameState = nextGameState;
  }
}

// https://stackoverflow.com/questions/38004917/how-to-render-a-blob-on-a-canvas-element
let dialogImg = null;
let dialogImgLoaded = false;
let dialogImgFinished = false;

function setDialogImage(blob) {
  dialogImgLoaded = false;
  dialogImg = new Image();
  dialogImg.onload = function () {
    dialogImgLoaded = true;
  };
  dialogImg.src = URL.createObjectURL(blob);
}

let arr1 = [{ text: 'Hello, is this the Black Cat Detective agency?' }, { text: 'I need help urgently!' }];
let arr2 = [{ text: 'lakjldkfjaaaaaaaaakjdjks', side: 'right' }, { text: 'thank you for confirming that i am talking to a cat!' }, { text: "i need you to do something for me" }];
let arr3 = [{ text: 'i need you to find my missing person', side: 'right' }, { text: 'can you do that for me?', side: 'left' }];


function renderNextMission() {
  return function () {
    // start transition from 2d to 3d
    canvas2D.classList.remove('show');
    transitionOffset = 0;
    isStartingGame = true;


    // set up the next scene by resetting 3d properties
    window.gameState = 4;
    missionIndex++;
    missionText.textContent = missions[missionIndex].text;
    zoomAmount = 0;
    badDog = null;
    otherDogs = null;
    timeSceneStarted = performance.now() / 1000;
  }
}

function render(time) {
  ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);
  drawBackground();

  if (isStartingGame) {
    transitionOffset += 40;
    if (transitionOffset > canvas2D.width) {
      canvas2D.classList.add("hide");
      setTimeout(() => {
        canvas2D.classList.remove("hide");
        renderedButtons = [];
        isStartingGame = false;
        transitionOffset = 0;
        window.gameState = 1;
        startReplyTimer(time);
      }, 500);
    }
  }

  // gamestate 4 is the transition state to 3d
  if (window.gameState === 4) {
    transitionOffset += 40;
    if (transitionOffset > canvas2D.width) {
      canvas2D.classList.add("hide");
      setTimeout(() => {
        canvas2D.classList.add("hidden");
      }, 500);
      
      setTimeout(() => {
        gameUi.classList.remove('hide');
        gameUi.classList.remove('hidden');
        gameUi.classList.add('show');
        document.getElementById('instructions').classList.add('show');
        document.getElementById('instructions').classList.remove('hidden');
      }, 500);
    }
  }

  // dialog state!
  if (window.gameState === 5) { // >= 5
    // hide the 3d canvas
    document.getElementById('camera-ui').classList.add('hidden');
    document.getElementById('album').classList.add('hidden');
    document.getElementById('instructions').classList.add('hidden');
    canvas.classList.add('hidden');
  
    // show the 2d
    canvas2D.classList.remove('hidden');
    canvas2D.classList.add('show');
    setTimeout(() => {
      canvas2D.classList.remove('hide');
    }, 100);

    if (dialogTransitionOffset === null) {
      dialogTransitionOffset = canvas2D.width;
      startReplyTimer(time);
    }
    dialogTransitionOffset -= 40;
    if (dialogTransitionOffset > 0) {
      ctx2D.save();
      ctx2D.translate(dialogTransitionOffset, 0);
      drawScene({ textArr: [] });
      ctx2D.restore();
    } else {
      handleReplyTimer(time, 3);

      // nextMissionDialog
      let missionComplete1Arr = [{ photo: dialogImg, side: 'right' }, { text: photoDialog, side: 'left' }, { text: 'now I need you to catch another dog!', side: 'left' }];
      drawScene({ time, textArr: missionComplete1Arr, offset: 0, hasPicture: true });
      dialogTransitionOffset = 0;
      if (reply) {
        renderedButtons = [
          drawButton({ text: 'ok???????????????????', fontSize: 35, onClick: renderNextMission(), alignment: 'right' })
        ];
      }
    }
  } else {
    dialogTransitionOffset = null;
  }

  // start
  if (window.gameState === 0) {
    if (transitionOffset === null) {
      transitionOffset = 0;
    }
    if (transitionOffset > 0) {
      ctx2D.save();
      ctx2D.translate(transitionOffset, 0);
      drawStart();
      ctx2D.restore();
    } else {
      drawStart();
    }
  } else if (window.gameState === 1) {
    handleReplyTimer(time, arr1.length);
    drawScene({
      time,
      textArr: arr1,
      offset: 0
    });
    if (reply) {
      renderedButtons = [
        drawButton({ text: 'yeah it\'s me', fontSize: 35, onClick: renderNextScene(2), alignment: 'left' }),
        drawButton({ text: 'who\'s asking?', fontSize: 35, onClick: renderNextScene(2), alignment: 'right' })
      ];
    }
  } else if (window.gameState === 2) {
    handleReplyTimer(time, arr2.length);
    drawScene({
      time,
      textArr: [...arr1, ...arr2],
      offset: arr1.length - 1,
    });
    if (reply) {
      renderedButtons = [
        drawButton({ text: 'i don\'t work for free', fontSize: 35, onClick: renderNextScene(3), alignment: 'left' }),
        drawButton({ text: 'hissssssssss', fontSize: 35, onClick: renderNextScene(3), alignment: 'right' })
      ];
    }
  } else if (window.gameState === 3 || window.gameState === 4) {
    handleReplyTimer(time, arr3.length);
    ctx2D.save();
    ctx2D.translate(transitionOffset, 0);
    drawScene({
      time,
      textArr: [...arr1, ...arr2, ...arr3],
      offset: arr1.length + arr2.length - 1,
    });
    if (reply) {
      renderedButtons = [
        drawButton({ text: 'i need you to find my missing person', fontSize: 35, onClick: renderNextScene(4), alignment: 'left' }),
        drawButton({ text: 'can you do that for me?', fontSize: 35, onClick: renderNextScene(4), alignment: 'right' })
      ];
    }
    ctx2D.restore();
  }

  fillButton();
  drawPaw();

  request = requestAnimationFrame(render);
}

addEventListener('mousemove', handleMouseMove);
addEventListener('resize', resize2D);

resize2D();
let request = requestAnimationFrame(render);

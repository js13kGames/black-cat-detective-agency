'use strict';

// add styles!!!
document.head.appendChild(document.createElement('style')).textContent = `canvas,#c,#c2{width:100vw;height:100vh;position:absolute}#c{display:block}#c2{background:repeating-linear-gradient(19deg,#fff 0 25px,#dad7d7 25px 50px);background-size:50px 50px;animation:checker-scroll 2s linear infinite}@keyframes checker-scroll{0%{background-position:0 0}100%{background-position:50px 0}}html,body{margin:0;height:100%;font-family:'Courier New',monospace}ul{padding-inline-start:15px}#instructions,#text-messages{position:absolute;padding:10px;z-index:10;height:90vh}#instructions{top:10px;left:10px}#text-messages{top:10px;right:10px}.screenshot{width:285px;object-fit:cover;margin:5px;border:2px solid #fff}.hide{opacity:0;transition:opacity .5s ease}.hidden{display:none!important}#camera-ui{position:absolute;left:0;top:0;width:100vw;height:100vh;box-sizing:border-box;background:rgb(0 0 0/.25);pointer-events:none}#camera-border-small{position:absolute;left:50%;top:50%;width:300px;height:300px;transform:translate(-50%,-50%);background:linear-gradient(to right,#fff 4px,transparent 4px) 0 0,linear-gradient(to right,#fff 4px,transparent 4px) 0 100%,linear-gradient(to left,#fff 4px,transparent 4px) 100% 0,linear-gradient(to left,#fff 4px,transparent 4px) 100% 100%,linear-gradient(to bottom,#fff 4px,transparent 4px) 0 0,linear-gradient(to bottom,#fff 4px,transparent 4px) 100% 0,linear-gradient(to top,#fff 4px,transparent 4px) 0 100%,linear-gradient(to top,#fff 4px,transparent 4px) 100% 100%;background-repeat:no-repeat;background-size:20px 20px}#camera-border-large{position:absolute;left:0;top:0;width:calc(100vw - 100px);height:calc(100vh - 100px);margin:50px;background:linear-gradient(to right,#fff 4px,transparent 4px) 0 0,linear-gradient(to right,#fff 4px,transparent 4px) 0 100%,linear-gradient(to left,#fff 4px,transparent 4px) 100% 0,linear-gradient(to left,#fff 4px,transparent 4px) 100% 100%,linear-gradient(to bottom,#fff 4px,transparent 4px) 0 0,linear-gradient(to bottom,#fff 4px,transparent 4px) 100% 0,linear-gradient(to top,#fff 4px,transparent 4px) 0 100%,linear-gradient(to top,#fff 4px,transparent 4px) 100% 100%;background-repeat:no-repeat;background-size:75px 75px}#plus{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:100px;color:#fff}.text{color:#746dc3;width:300px;background:rgb(255 255 255/.95);padding:10px;margin-bottom:10px;font-size:22px}.left-text,.right-text{position:relative;width:300px}.left-text::before,.right-text::before{content:"";position:absolute;top:0;width:10px;height:10px;background:#fff}.left-text::before{left:-9px}.right-text::before{right:-10px}.instruction-block{padding:10px;margin-bottom:10px;font-size:22px;max-width:300px;background-color:#cfd5fd;color:#746dc3;border:5px solid rgb(201 207 247)}.instruction-title{background:#746dc3;color:#fff;padding:5px;font-weight:700;margin:-10px -10px 10px -10px}`;

// 2d canvas controls
cameraUI.classList.add("hidden");
gameUI.classList.add("hidden");

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
  ctx2D.fillStyle = convertColorToRgba(colors.lightPurple);
  const computerHeight = canvas2D.height - 50;
  const computerWidth = canvas2D.width - 50;
  ctx2D.fillRect(25, 25, computerWidth, computerHeight);

  // draw the toolbar
  ctx2D.fillStyle = convertColorToRgba(colors.darkPurple);
  ctx2D.fillRect(25, 25, computerWidth, 50);

  // add the title! :)
  ctx2D.fillStyle = 'white';
  ctx2D.font = "20px monospace";
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";
  ctx2D.fillText("Black Cat Detective Agency", 200, 50);

  // draw x box
  ctx2D.fillStyle = convertColorToRgba(colors.lightPurple);
  ctx2D.fillRect(computerWidth - 10, 35, 30, 30);
  ctx2D.fillStyle = convertColorToRgba(colors.darkPurple);
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
  ctx2D.fillStyle = convertColorToRgba(colors.darkPurple);
  ctx2D.fill(button);
  // add the text
  ctx2D.fillStyle = 'white';
  ctx2D.textAlign = "center";
  ctx2D.textBaseline = "middle";
  ctx2D.font = `${fontSize}px monospace`;
  ctx2D.fillText(text, x + width / 2, y + height / 2);

  // add a border
  ctx2D.strokeStyle = "rgba(201, 207, 247, 1)";
  ctx2D.lineWidth = 5;
  ctx2D.strokeRect(x, y, width, height);

  return { path: button, x, y, width, height, onClick };
}

// https://stackoverflow.com/questions/62270509/javascript-is-it-possible-to-animate-the-fillrect-of-a-shape-in-a-canvas
function fillButton() {
  if (!activeButton) return;
  ctx2D.fillStyle = convertColorToRgba(colors.buttonSlime);
  ctx2D.fillRect(activeButton.x, activeButton.y + activeButton.height - Math.min(fillNum, activeButton.height), activeButton.width, Math.min(fillNum, activeButton.height));
  fillNum += activeButton.height * 0.01;
  if (fillNum >= activeButton.height + 25) { // some buffer to let it chill for a sec
    fillNum = 0;
    activeButton.onClick();
    activeButton = null;
    // button fill sound
    zzfx(...[,,537,.02,.02,.22,1,1.59,-6.98,4.97]);
    return;
  }
}


let fillNum = 0;
let activeButton = null;
let renderedButtons = [];

function drawStart() {
  // add the mouse!
  drawMouse();
  // add the start button
  const onClick = () => isStartingGame = true;
  setButtons([{ text: 'Start', fontSize: 85, onClick }]);
};

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
      ctx2D.fillStyle = convertColorToRgba(colors.darkPurple, 0.8);
      ctx2D.fillText(text, x + width / 2, y + height / 2);
    }
    // draw the photo in the speech bubble!!
    if (photo && !dialogImgFinished) {
      cropAndDrawImg(photo, photoWidth, photoHeight, x + (photoPadding / 2), y + (photoPadding / 2));
    }
  })
}

// https://stackoverflow.com/questions/26015497/how-to-resize-then-crop-an-image-with-canvas
function cropAndDrawImg(img, targetWidth, targetHeight, x, y, hasBorder) {
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
  if (hasBorder) {
    ctx2D.strokeStyle = 'white';
    ctx2D.lineWidth = 5;
    ctx2D.strokeRect(x, y, targetWidth, targetHeight);
  }
}

const timeToAppear = 1500;
let indexDrawn = 0;
function drawScene({ time, textArr, offset, hasPicture }) {
  drawComputer();
  if (!hasPicture || dialogImgLoaded) {
    let timeElapsed = time - start;
    let currentIndex = Math.floor(timeElapsed / timeToAppear) >= textArr.length - 1 ? textArr.length - 1 : Math.floor(timeElapsed / timeToAppear) + offset;
    if (indexDrawn === currentIndex) {
      zzfx(...[1.6,,178,,.15,.16,1,4.6,,,,,,,,,,.63,,.14]); // text sound
      indexDrawn = currentIndex + 1;
    };
    drawSpeech(textArr.slice(0, currentIndex + 1));
  }
}

let albumIndex = 0;
function drawAlbum() {
  // Draw current blob
  const entry = allBlobs[albumIndex];
  if (!albumImgLoaded) {
    setAlbumImage(entry.blob);
  } else {
    // add the picture with a frame
    const computerPaddingX = 50;
    const computerPaddingY = 80;
    const computerWidth = canvas2D.width - computerPaddingX * 2;
    const computerHeight = canvas2D.height - computerPaddingY * 2;
    const targetWidth = computerWidth - computerPaddingX;
    const targetHeight = computerHeight - computerPaddingY;
    const x = computerPaddingX + (computerWidth - targetWidth) / 2;
    // - 50 for the menu bar
    const y = computerPaddingY + (computerHeight - targetHeight - 50) / 2;
    cropAndDrawImg(albumImg, targetWidth, targetHeight, x, y, true);
  }

  // draw description a bit lower on the computer screen
  ctx2D.font = `22px monospace`;
  ctx2D.textAlign = 'center';
  ctx2D.textBaseline = 'bottom';
  const textX = canvas2D.width / 2;
  const textY = canvas2D.height - 90;
  ctx2D.fillStyle = 'white';
  ctx2D.fillText(entry.description, textX, textY);
  // disclaimer
  ctx2D.font = 'italic 12px monospace';
  const dTextX = canvas2D.width / 2;
  const dTextY = canvas2D.height - 70;
  ctx2D.fillStyle = 'white';
  ctx2D.fillText("(use arrow keys to navigate)", dTextX, dTextY);
}

// Album navigation
addEventListener('keydown', e => {
  if (!gameOver) return; // only allow navigation in album mode
  albumImgLoaded = false; // reset image loaded state
  if (e.key === 'ArrowRight') {
    albumIndex = (albumIndex + 1) % allBlobs.length;
    drawAlbum();
  } else if (e.key === 'ArrowLeft') {
    albumIndex = (albumIndex - 1 + allBlobs.length) % allBlobs.length;
    drawAlbum();
  }
});


function drawGameOver() {
  drawComputer();
  drawAlbum();
}

// lol just a little reminder to myself...
// x position, y position, width, height
function drawPaw() {
  const heightOffset = 60; // a little bit higher than the center pad
  const mouseOffset = -80;
  // if swatCount is high bring out the claws >:) 
  if (swatCount >= 250) {
    // left claws
    ctx2D.fillStyle = convertColorToRgba(colors.clawGray);
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
    ctx2D.fillStyle = convertColorToRgba(colors.clawGray);
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
    ctx2D.fillStyle = convertColorToRgba(colors.clawGray);
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
    ctx2D.fillStyle = convertColorToRgba(colors.clawGray);
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
  ctx2D.fillStyle = convertColorToRgba(colors.furBlack);
  ctx2D.fillRect(mouseX - 100, mouseY - mouseOffset - heightOffset, 200, canvas2D.height - (mouseY - mouseOffset - heightOffset));

  // this is the paw (one bigger box)
  ctx2D.fillStyle = convertColorToRgba(colors.furBlack);
  ctx2D.fillRect(mouseX - 70, mouseY - mouseOffset - heightOffset - 45, 140, 100);

  // this is the center paw pad
  ctx2D.fillStyle = convertColorToRgba(colors.pawPink);
  const centerPadSize = 75;
  const centerXPos = mouseX - centerPadSize / 2;
  const centerYPos = mouseY - mouseOffset - centerPadSize / 2;
  ctx2D.fillRect(centerXPos, centerYPos - 15, centerPadSize, centerPadSize);

  // this is the rest of the paw pads
  const littlePadSize = 35;
  ctx2D.fillStyle = convertColorToRgba(colors.pawPink);
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
    zzfx(...[,.2,1e3,.02,,.01,2,,18,,475,.01,.01]) // mouse
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
  ctx2D.fillStyle = convertColorToRgba(colors.mouseGray);
  ctx2D.beginPath();
  ctx2D.moveTo(-20, 0);
  ctx2D.lineTo(0, -40);
  ctx2D.lineTo(20, 0);
  ctx2D.arc(0, 0, 20, 50, Math.PI);
  ctx2D.closePath();
  ctx2D.fill();

  // add ears
  ctx2D.fillStyle = convertColorToRgba(colors.mouseGray);
  const size = 10;
  ctx2D.beginPath();
  ctx2D.arc(-15, -15, size, 0, Math.PI * 2);
  ctx2D.fill();

  ctx2D.beginPath();
  ctx2D.arc(15, -15, size, 0, Math.PI * 2);
  ctx2D.fill();

  // nose
  ctx2D.fillStyle = convertColorToRgba(colors.furBlack);
  ctx2D.beginPath();
  ctx2D.arc(0, -40, 2, 0, Math.PI * 2);
  ctx2D.fill();

  // tail
  ctx2D.strokeStyle = convertColorToRgba(colors.mouseGray);
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
  webglUtils.resizeCanvasToDisplaySize(canvas2D);
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
let gameState = 0;
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
    gameState = nextGameState;
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
    URL.revokeObjectURL(dialogImg.src); // free memory
  };
  dialogImg.src = URL.createObjectURL(blob);
}

let albumImg = null;
let albumImgLoaded = false;
let albumImgFinished = false;

function setAlbumImage(blob) {
  albumImgLoaded = false;
  albumImg = new Image();
  albumImg.onload = function () {
    albumImgLoaded = true;
  };
  albumImg.src = URL.createObjectURL(blob);
}

let arr1 = [{ text: 'Is this the Black Cat Detective agency?' }, { text: 'I need help catching some unruly dogs in the act!' }];
let arr2 = [{ text: 'ttghjikpp[[[[[ll;;;;;;;;;;,nb', side: 'right' }, { text: 'thank you for confirming that i am talking to a cat.' }, { text: "are you up to the task?" }];
let arr3 = [{ text: 'ffffff vbbnmm,,,,', side: 'right' }, { text: 'I\ll take that as a yes.', side: 'left' }];


let gameOver = false;
function renderNextMission() {
  return function () {
    if (missionIndex + 1 === missions.length) {
      // end of game
      gameOver = true;
      renderedButtons = [];
      return;
    }

    transitionOffset = 0;
    isStartingGame = true;
    
    missionIndex++;

    // set up the next scene by resetting 3d properties
    gameState = 4;
    missionText.textContent = missions[missionIndex].text;
    zoomAmount = 0;
    badDog = null;
    otherDogs = null;
    timeSceneStarted = performance.now() / 1000;
  }
}

function safariFix() {
  const isSafari = /^((?!chrome|android|crios|fxios|edgios|edg|firefox|opera|opr|samsung|brave).)*safari/i.test(navigator.userAgent);
  if (!isSafari) return;
  canvas2D.style.visibility = 'hidden';
  if (gl && gl.finish) gl.finish();
  canvas2D.width = canvas2D.width;
  webglUtils.resizeCanvasToDisplaySize(canvas2D);
  canvas2D.style.visibility = 'visible';
}


function setButtons(buttons) {
  renderedButtons = buttons.map(b => drawButton(b));
}

function render(time) {
  safariFix();

  ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);

  if (isStartingGame) {
    transitionOffset += 40;
    if (transitionOffset > canvas2D.width) {
      canvas2D.classList.add("hide");
      setTimeout(() => {
        canvas2D.classList.remove("hide");
        renderedButtons = [];
        isStartingGame = false;
        transitionOffset = 0;
        gameState = 1;
        startReplyTimer(time);
      }, 500);
    }
  }

  // gamestate 4 is the transition state to 3d
  if (gameState === 4) {
    transitionOffset += 40;
    if (transitionOffset > canvas2D.width) {
      canvas2D.classList.add("hide");
      setTimeout(() => {
        canvas2D.classList.add("hidden");
      }, 500);

      setTimeout(() => {
        gameUI.classList.remove('hide');
        gameUI.classList.remove('hidden');
        if (!cameraMode) {
          textMessages.classList.remove('hidden');
          instructions.classList.remove('hidden');
        }
      }, 500);
    }
  }

  dialog(time)

  fillButton();
  // maybe keep paw if we want to swat at the pictures lol
  if (!gameOver) {
    drawPaw();
  }

  request = requestAnimationFrame(render);
}

addEventListener('mousemove', handleMouseMove);
addEventListener('resize', resize2D);

resize2D();
let request = requestAnimationFrame(render);

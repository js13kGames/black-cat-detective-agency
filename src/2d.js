(() => {
  'use strict';
  let webglUtils = window.webglUtils;

  const cameraUI = document.getElementById("camera-ui");
  const gameUi = document.getElementById("c");
  cameraUI.classList.add("hidden");
  gameUi.classList.add("hidden");

  // TODO: hide game UI

  let mainCanvas = document.getElementById("c2");
  let ctx = mainCanvas.getContext("2d");

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
    const numBoxesX = Math.ceil(mainCanvas.width / boxSize);
    const numBoxesY = Math.ceil(mainCanvas.height / boxSize);
    for (let i = 0; i < numBoxesX; i++) {
      for (let j = 0; j < numBoxesY; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? white : gray;
        ctx.fillRect(i * boxSize, j * boxSize, boxSize, boxSize);
      }
    }
  }

  // because the canvas takes up the entire screen, we don't need to account for the specific canvas position
  // We can just use the client coordinates! But if we did, we'd have to account for the relative position.
  let mouseX;
  let mouseY;
  function handleMouseMove(e) {
    const rect = mainCanvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (mainCanvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (mainCanvas.height / rect.height);
    let isFilling = false;
    renderedButtons.forEach(button => {
      if (ctx.isPointInPath(button.path, e.offsetX, e.offsetY)) {
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
    ctx.fillStyle = lightPurple;
    const computerHeight = mainCanvas.height - 50;
    const computerWidth = mainCanvas.width - 50;
    ctx.fillRect(25, 25, computerWidth, computerHeight);

    // draw the toolbar
    ctx.fillStyle = darkPurple;
    ctx.fillRect(25, 25, computerWidth, 50);

    // add the title! :)
    ctx.fillStyle = 'white';
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Black Cat Detective Agency", 200, 50);

    // draw x box
    ctx.fillStyle = lightPurple;
    ctx.fillRect(computerWidth - 10, 35, 30, 30);
    ctx.fillStyle = darkPurple;
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("x", computerWidth + 5, 50);
  }

  function drawButton(text, fontSize, onClick, alignment) {
    // trying to set the width dynamically
    const width = (fontSize / 1.5) * text.length;
    const height = fontSize * 1.5;

    let x = (mainCanvas.width - width) / 2;
    let y = (mainCanvas.height - height) / 2;
    if (alignment === 'left') {
      x = 75;
      y = mainCanvas.height - height - 50;
    } else if (alignment === 'right') {
      x = mainCanvas.width - width - 75;
      y = mainCanvas.height - height - 50;
    }

    const button = new Path2D();
    button.rect(x, y, width, height);
    ctx.fillStyle = darkPurple;
    ctx.fill(button);
    // add the text
    ctx.fillStyle = 'white';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${fontSize}px monospace`;
    ctx.fillText(text, x + width / 2, y + height / 2);

    // add a border
    ctx.strokeStyle = lighterPurple;
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, width, height);

    return { path: button, x, y, width, height, onClick };
  }

  // https://stackoverflow.com/questions/62270509/javascript-is-it-possible-to-animate-the-fillrect-of-a-shape-in-a-canvas
  function fillButton() {
    if (!activeButton) return;
    ctx.fillStyle = slime;
    ctx.fillRect(activeButton.x, activeButton.y + activeButton.height - Math.min(fillNum, activeButton.height), activeButton.width, Math.min(fillNum, activeButton.height));
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
    renderedButtons = [drawButton('Start', 85, onClick)];
  }

  function drawSpeech(arr) {
    arr.forEach(({ text, side }, index) => {
      const fontSize = 18;
      // trying to set the width dynamically
      const width = (fontSize / 1.5) * text.length;
      const height = fontSize * 1.5;

      // bubble
      const x = side === 'right' ? mainCanvas.width - width - 75 : 75;
      const y = 100 + (50 * index);
      const radii = 10;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'white';
      ctx.beginPath();
      // TODO: this should prob not be round....
      ctx.roundRect(x, y, width, height, radii);
      ctx.fill();
      ctx.stroke();

      // flag
      if (side === 'right') {
        // right side
        ctx.fillStyle = 'white'
        ctx.beginPath();
        ctx.moveTo(x + width + 15, y + height / 2 - 30);
        ctx.lineTo(x + width - 10, y + height / 2 - 15);
        ctx.lineTo(x + width, y + height - 25);
        ctx.closePath();
        ctx.fill();
      } else {
        // left side
        ctx.fillStyle = 'white'
        ctx.beginPath();
        ctx.moveTo(x - 15, y + height / 2 - 30);
        ctx.lineTo(x + 10, y + height / 2 + 10);
        ctx.lineTo(x + 25, y + height / 2);
        ctx.closePath();
        ctx.fill();
      }


      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = darkPurple;
      ctx.fillText(text, x + width / 2, y + height / 2);
    })
  }

  function drawScene1(time) {
    const renderNextScene = () => {
      startReplyTimer(time);
      gameState = 2;
    }
    let textArr = [{ text: 'Hello, is this the Black Cat Detective agency?' }, { text: 'I need help urgently!' }]
    let timeElapsed = time - start;
    let currentIndex = Math.floor(timeElapsed / 1000) >= textArr.length - 1 ? textArr.length - 1 : Math.floor(timeElapsed / 1000);
    drawSpeech(textArr.slice(0, currentIndex + 1));
    if (reply) {
      renderedButtons = [
        drawButton('yeah it\'s me', 35, renderNextScene, 'left'),
        drawButton('who\'s asking?', 35, renderNextScene, 'right')
      ];
    }
  }

  function drawScene2(time) {
    const renderNextScene = () => {
      startReplyTimer(time);
      gameState = 3;
    }
    let textArr = [{ text: 'Hello, is this the Black Cat Detective agency?' }, { text: 'I need help urgently!' }, { text: 'lakjldkfjaaaaaaaaakjdjks', side: 'right' }, { text: 'thank you for confirming that i am talking to a cat!' }, { text: "i need you to do something for me" }]
    let timeElapsed = time - start;
    let currentIndex = Math.floor(timeElapsed / 1000) >= textArr.length - 1 ? textArr.length - 1 : Math.floor(timeElapsed / 1000);
    drawSpeech(textArr.slice(0, currentIndex + 1 + 2));
    if (reply) {
      renderedButtons = [
        drawButton('i don\'t work for free', 35, renderNextScene, 'left'),
        drawButton('hissssssssss', 35, renderNextScene, 'right')
      ];
    }
  }

  function drawScene3(time) {
    const renderNextScene = () => {
      isEnding2dPart = true;
    }
    let textArr = [{ text: 'Hello, is this the Black Cat Detective agency?' }, { text: 'I need help urgently!' }, { text: 'lakjldkfjkjdjks', side: 'right' }, { text: 'thank you for confirming that i am talking to a cat!' }, { text: "i need you to do something for me" }, { text: "dlsfjlsdkjkl", side: 'right' }, { text: "there\'s a dog problem." }, { text: 'i need you to find the pooch pooper' }];
    let timeElapsed = time - start;
    let currentIndex = Math.floor(timeElapsed / 1000) >= textArr.length - 1 ? textArr.length - 1 : Math.floor(timeElapsed / 1000);
    drawSpeech(textArr.slice(0, currentIndex + 1 + 4));
    if (reply) {
      renderedButtons = [
        drawButton('i guess!', 35, renderNextScene, 'left'),
        drawButton('make sure catnip is ready', 35, renderNextScene, 'right')
      ];
    }
  }

  // lol just a little reminder to myself...
  // x position, y position, width, height
  function drawPaw() {
    const heightOffset = 60; // a little bit higher than the center pad
    // if swatCount is high bring out the claws >:) 
    if (swatCount >= 250) {
      // left claws
      ctx.fillStyle = clawGray;
      ctx.beginPath();
      // top center
      ctx.moveTo(mouseX - 45, mouseY - heightOffset - 100);
      // bottom left
      ctx.lineTo(mouseX - 45, mouseY - heightOffset - 45);
      // bottom right
      ctx.lineTo(mouseX - 25, mouseY - heightOffset - 45);
      ctx.closePath();
      ctx.fill();

      // left claw
      ctx.fillStyle = clawGray;
      ctx.beginPath();
      // top center
      ctx.moveTo(mouseX - 95, mouseY - heightOffset - 50);
      // bottom left
      ctx.lineTo(mouseX - 95, mouseY - 75 / 2);
      // bottom right
      ctx.lineTo(mouseX - 75, mouseY - 75 / 2);
      ctx.closePath();
      ctx.fill();

      // right claws
      ctx.fillStyle = clawGray;
      ctx.beginPath();
      // top center
      ctx.moveTo(mouseX + 45, mouseY - heightOffset - 100);
      // bottom left
      ctx.lineTo(mouseX + 45, mouseY - heightOffset - 45);
      // bottom right
      ctx.lineTo(mouseX + 25, mouseY - heightOffset - 45);
      ctx.closePath();
      ctx.fill();

      // right claw
      ctx.fillStyle = clawGray;
      ctx.beginPath();
      // top center
      ctx.moveTo(mouseX + 95, mouseY - heightOffset - 50);
      // bottom left
      ctx.lineTo(mouseX + 95, mouseY - 75 / 2);
      // bottom right
      ctx.lineTo(mouseX + 75, mouseY - 75 / 2);
      ctx.closePath();
      ctx.fill();
    }

    // this is the arm part- it starts at the bottom!
    ctx.fillStyle = furBlack;
    ctx.fillRect(mouseX - 100, mouseY - heightOffset, 200, mainCanvas.height - (mouseY - heightOffset));

    // this is the paw (one bigger box)
    ctx.fillStyle = furBlack;
    ctx.fillRect(mouseX - 70, mouseY - heightOffset - 45, 140, 100);

    // this is the center paw pad
    ctx.fillStyle = pawPink;
    const centerPadSize = 75;
    const centerXPos = mouseX - centerPadSize / 2;
    const centerYPos = mouseY - centerPadSize / 2;
    ctx.fillRect(centerXPos, centerYPos - 15, centerPadSize, centerPadSize);

    // this is the rest of the paw pads
    const littlePadSize = 35;
    ctx.fillStyle = pawPink;
    // left middle pad
    ctx.fillRect(centerXPos - littlePadSize - 8, centerYPos + littlePadSize - 50, littlePadSize, littlePadSize);
    // left right pad
    ctx.fillRect(centerXPos + centerPadSize + 8, centerYPos + littlePadSize - 50, littlePadSize, littlePadSize);
    // top left pad
    ctx.fillRect(mouseX - 45, mouseY - heightOffset - 35, littlePadSize, littlePadSize);
    // top right pad
    ctx.fillRect(mouseX + 10, mouseY - heightOffset - 35, littlePadSize, littlePadSize);

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
      mousePosition.x = mouseX > 150 && mouseX < mainCanvas.width - 150 ? mouseX : mousePosition.x;
      mousePosition.y = mouseY > 150 && mouseY < mainCanvas.height - 150 ? mouseY : mousePosition.y;
      // update the angle the mouse is facing
      // https://stackoverflow.com/questions/33449101/rotate-a-div-towards-the-direction-of-the-mouse-using-atan2
      mousePosition.angle = Math.atan2(mouseY - 200, mouseX - 250) * 180 / Math.PI;
    }

    // save context and apply transform
    ctx.save();
    // this will translate the context to where the mouse is so the following shapes are drawn in the right place
    ctx.translate(mousePosition.x, mousePosition.y);
    ctx.rotate((mousePosition.angle * Math.PI) / 180);
    ctx.scale(2, 2);


    // draw mouse at starting place
    // fun fact i'm using the same raindrop shape that I used in my first js13k game!! :) :) :) 
    ctx.fillStyle = mouseGray;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(0, -40);
    ctx.lineTo(20, 0);
    ctx.arc(0, 0, 20, 50, Math.PI);
    ctx.closePath();
    ctx.fill();

    // add ears
    ctx.fillStyle = mouseGray;
    const size = 10;
    ctx.beginPath();
    ctx.arc(-15, -15, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(15, -15, size, 0, Math.PI * 2);
    ctx.fill();

    // nose
    ctx.fillStyle = furBlack;
    ctx.beginPath();
    ctx.arc(0, -40, 2, 0, Math.PI * 2);
    ctx.fill();

    // tail
    ctx.strokeStyle = mouseGray;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.bezierCurveTo(
      10, 40,
      -30, 60,
      -10, 80
    );
    ctx.stroke();
    // reset the context transform
    ctx.restore();
  }

  // resize the canvas
  function resize() {
    webglUtils.resizeCanvasToDisplaySize(mainCanvas, 1);
    mousePosition = {
      x: 200,
      y: mainCanvas.height - 200,
      angle: 45,
    }
  }

  let transitionOffset = 0;
  let isStartingGame = false;
  let isEnding2dPart = false;
  let gameState = 3; //  0;
  let reply = true;
  let start = null;

  function startReplyTimer(time) {
    reply = false;
    start = time;
  }

  function handleReplyTimer(time, textCount) {
    let seconds = textCount * 1000
    if (!reply && start !== null && time - start > seconds) {
      reply = true;
      start = null;
    } else {
      renderedButtons = [];
    }
  }

  function render(time) {
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    drawBackground();

    if (isStartingGame) {
      transitionOffset += 40;
      if (transitionOffset > mainCanvas.width) {
        renderedButtons = [];
        isStartingGame = false;
        transitionOffset = 0;
        gameState = 1;
        startReplyTimer(time);
      }
    }

    if (isEnding2dPart) {
      transitionOffset += 40;
      if (transitionOffset > mainCanvas.width) {
        // take stuff off the map!
        mainCanvas.classList.add("hidden");
        gameUi.classList.remove("hidden");
        document.getElementById('instructions').classList.remove('hidden');
        cancelAnimationFrame(request);
        return; // this will stop this render loop?
      }
    }

    if (gameState === 0) {
      ctx.save();
      ctx.translate(transitionOffset, 0);
      drawStart();
      ctx.restore();
    }

    // obviously i will update this lol it's cuhrazy rn!!
    if (gameState === 1) {
      handleReplyTimer(time, 3);
      drawComputer();
      drawScene1(time);
    } else if (gameState === 2) {
      handleReplyTimer(time, 3);
      drawComputer();
      drawScene2(time);
    } else if (gameState === 3) {
      ctx.save();
      ctx.translate(transitionOffset, 0);
      handleReplyTimer(time, 4);
      drawComputer();
      drawScene3(time);
      ctx.restore();
    }

    fillButton();
    drawPaw();

    request = requestAnimationFrame(render);
  }

  addEventListener('mousemove', handleMouseMove);
  addEventListener('resize', resize);

  resize();
  let request = requestAnimationFrame(render);
})()
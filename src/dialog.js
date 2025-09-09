function dialog(time) {
  // 2d dialog that happens between missions
  if (gameState === 5) {
    cameraUI.classList.add('hidden');
    textMessages.classList.add('hidden');
    instructions.classList.add('hidden');
    gameUI.classList.add('hidden');
    canvas2D.classList.remove('hidden');
    canvas2D.classList.add('show');
    // timeout to account for css transition
    setTimeout(() => canvas2D.classList.remove('hide'), 100);
    if (dialogTransitionOffset === null) {
      dialogTransitionOffset = canvas2D.width; startReplyTimer(time);
    }
    dialogTransitionOffset -= 40;
    if (dialogTransitionOffset > 0) {
      ctx2D.save(); ctx2D.translate(dialogTransitionOffset, 0); drawScene({ textArr: [] }); ctx2D.restore();
    } else {
      if (gameOver) drawGameOver();
      else {
        handleReplyTimer(time, 3);
        let missionTextArr = [], missionButtonText = 'let\'s go get them!';
        if (missionIndex < missions.length - 1) missionTextArr = [{ photo: dialogImg, side: 'right' }, { text: photoDialog, side: 'left' }, { text: 'now I need you to catch another bad dog...', side: 'left' }, { text: missions[missionIndex + 1].text, side: 'left' }];
        else { missionButtonText = 'see my album!'; missionTextArr = [{ photo: dialogImg, side: 'right' }, { text: photoDialog, side: 'left' }, { text: 'you\'ve caught every bad dog in the park.' }, { text: 'now you can look through your album of suspects', side: 'left' }]; }
        drawScene({ time, textArr: missionTextArr, offset: 0, hasPicture: true });
        dialogTransitionOffset = 0;
        if (reply) setButtons([{ text: missionButtonText, onClick: renderNextMission(), alignment: 'right' }]);
      }
    }
  } else dialogTransitionOffset = null;
  // scene one!
  if (gameState === 0) {
    if (transitionOffset === null) transitionOffset = 0;
    if (transitionOffset > 0) {
      ctx2D.save(); ctx2D.translate(transitionOffset, 0); drawStart(); ctx2D.restore();
    }
    else drawStart();
  } else if (gameState === 1) {
    // all of the text scenes, 1-3
    handleReplyTimer(time, arr1.length);
    drawScene({ time, textArr: arr1, offset: 0 });
    if (reply) setButtons([
      { text: 'yeah, it\'s me', onClick: renderNextScene(2), alignment: 'left' },
      { text: 'who\'s asking?', onClick: renderNextScene(2), alignment: 'right' }
    ]);
  } else if (gameState === 2) {
    handleReplyTimer(time, arr2.length);
    drawScene({ time, textArr: [...arr1, ...arr2], offset: arr1.length - 1 });
    if (reply) setButtons([
      { text: 'i don\'t work for free', onClick: renderNextScene(3), alignment: 'left' },
      { text: 'hisssssssss', onClick: renderNextScene(3), alignment: 'right' }
    ]);
  } else if (gameState === 3 || gameState === 4) { // 4 is transitioning
    handleReplyTimer(time, arr3.length);
    ctx2D.save();
    ctx2D.translate(transitionOffset, 0);
    drawScene({ time, textArr: [...arr1, ...arr2, ...arr3], offset: arr1.length + arr2.length - 1 });
    if (reply) setButtons([
      { text: 'let\'s find them!', onClick: renderNextScene(4), alignment: 'right' }
    ]);
    ctx2D.restore();
  }
}

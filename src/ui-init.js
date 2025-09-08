function createCameraUI() {
  const cameraUI = document.createElement('div');
  cameraUI.id = 'camera-ui';
  cameraUI.className = 'hidden';

  const borderLarge = document.createElement('div');
  borderLarge.id = 'camera-border-large';
  cameraUI.appendChild(borderLarge);

  const borderSmall = document.createElement('div');
  borderSmall.id = 'camera-border-small';
  cameraUI.appendChild(borderSmall);

  const plus = document.createElement('div');
  plus.id = 'plus';
  plus.textContent = '+';
  cameraUI.appendChild(plus);

  document.body.appendChild(cameraUI);
}

function createInstructions() {
  const instructions = document.createElement('div');
  instructions.id = 'instructions';
  instructions.className = 'hidden';

  const block = document.createElement('div');
  block.className = 'instruction-block';

  const title = document.createElement('div');
  title.className = 'instruction-title';
  title.textContent = 'Instructions';
  block.appendChild(title);

  const ul = document.createElement('ul');
  [
    'click or use arrows to look around',
    'spacebar: enter camera mode',
    'z: zoom in',
    'x: zoom out',
    'c: take a picture'
  ].forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    ul.appendChild(li);
  });
  block.appendChild(ul);
  instructions.appendChild(block);

  document.body.appendChild(instructions);
}

function createTextMessages() {
  const textMessages = document.createElement('div');
  textMessages.id = 'text-messages';
  textMessages.className = 'hidden';

  const leftText = document.createElement('div');
  leftText.className = 'text left-text';
  leftText.id = 'mission-text';
  textMessages.appendChild(leftText);

  const album = document.createElement('div');
  album.id = 'album';
  textMessages.appendChild(album);

  document.body.appendChild(textMessages);
}

createCameraUI();
createInstructions();
createTextMessages();

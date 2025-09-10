// https://webglfundamentals.org/webgl/lessons/webgl-tips.html#screenshot
function takePicture(capturedDog, missReason, description) {
  gameUI.toBlob(blob => {
    // for the end screen!
    allBlobs.push({ blob, description });

    // gl.finish() will block javascript execution until all webgl commands are finished by the gpu.
    gl.finish();

    // clear the album element and clear camera mode
    albumElement.classList.remove('hidden');
    albumElement.innerHTML = '';
    cameraMode = false;
    cameraUI.classList.add('hidden');

    // exit 3d mode
    if (capturedDog) {
      gameUI.classList.add('hidden');
      setDialogImage(blob)
      document.exitPointerLock();
      indexDrawn = 0;
      gameState = 5;
      photoDialog = `you caught the culprit: ${capturedDog.dogName} the ${capturedDog.breedName}!`;
      dialogOpen = true;
    } else {
      // stay in 3d mode
      textMessages.classList.remove('hidden');

      // text from client
      const textDiv = document.createElement('div');
      textDiv.classList.add('text');
      textDiv.classList.add('right-text');

      // image text
      const screenshot = new Image();
      screenshot.src = URL.createObjectURL(blob);
      screenshot.classList.add('screenshot');
      screenshot.onload = () => {
        // append image to "album"
        textDiv.appendChild(screenshot);
        albumElement.appendChild(document.createTextNode(' '));
        albumElement.appendChild(textDiv);
        // response message
        const textContent = `${missReason || 'great. you took a picture of nothing.'}`;
        const photoDiv = document.createElement('div');
        photoDiv.classList.add('text');
        photoDiv.classList.add('left-text');
        photoDiv.textContent = textContent;
        albumElement.appendChild(photoDiv);
        URL.revokeObjectURL(screenshot.src); // free memory
      }
    }

  });
}
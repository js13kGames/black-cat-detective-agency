function drawDog(view, dogState, badAction, isBadDog) {
  const time = performance.now() / 1000, secondsBetween = badAction === 'tailChase' ? 7 : 10;
  // intermittent bad actions
  let badActionInProgress = (time - timeSceneStarted > secondsBetween - 1 && badAction && time % secondsBetween < 5 && badAction !== 'speed') ? badAction : (badAction === 'speed' || badAction === 'hotdog') ? badAction : null;
  // for the photo check to see if we caught them in the act
  if (isBadDog) {
    culpritIsMisbehaving = !!badActionInProgress;
  }
  updatePosition(dogState, time, badActionInProgress);
  const world = dogParts.map(() => m4.identity()), idx = Object.fromEntries(dogParts.map((p, i) => [p.name, i]));
  // create a variable to hold the mvp of the torso for camera focus
  let mvp;
  for (let i = 0; i < dogParts.length; i++) {
    const part = dogParts[i], parentIdx = part.parent ? idx[part.parent] : null;
    let partMatrix = parentIdx != null ? m4.copy(world[parentIdx]) : m4.identity(), offset = part.offset || [0, 0, 0];
    if (badActionInProgress === 'hotdog' && part.name === 'tongue') continue;
    const partColor = dogState.partColors && dogState.partColors[part.name] ? dogState.partColors[part.name] : (part.name !== 'tongue' && part.name !== 'nose' ? dogState.wholeColor || part.color || colors.default : part.color || colors.default);
    if (part.name === 'torso') {
      partMatrix = m4.translate(partMatrix, dogState.pos[0], dogState.pos[1], dogState.pos[2]);
      partMatrix = m4.yRotate(partMatrix, dogState.direction);
      partMatrix = m4.scale(partMatrix, dogState.scale, dogState.scale, dogState.scale);
    }

    // floppy ears logic
    let floppyColorOverride = null;
    if (dogState.floppy && (part.name === 'earL' || part.name === 'earR')) {
      offset = [part.name === 'earL' ? -0.69 : 0.69, 0.5 * dogState.scale, -0.4 * dogState.scale];
      floppyColorOverride = [partColor[0] - 15 / 255, partColor[1] - 15 / 255, partColor[2] - 15 / 255, 1.0];
    }

    // modifications to body parts
    let modifiedScale = [];
    if (dogState.modifications) {
      if (dogState.modifications.torso > 0 && part.name === 'torso') {
        modifiedScale = [part.scale[0], part.scale[1], part.scale[2] * dogState.modifications.torso];
      }
      if (dogState.modifications.torso && part.parent === 'torso') {
        offset = [offset[0], offset[1], offset[2] + dogState.modifications.torso * .6 * ((part.name === 'legLB' || part.name === 'legRB' || part.name === 'tail') ? -1 : 1)];
      }
      if (dogState.modifications.tail && part.name === 'tail') { 
        modifiedScale = [part.scale[0], part.scale[1], dogState.modifications.tail]; offset = [offset[0], offset[1], offset[2] + dogState.modifications.tail]; 
      }
      if (dogState.modifications.snout && part.name === 'snout') {
        modifiedScale = [part.scale[0], part.scale[1], dogState.modifications.snout];
      }
      if (dogState.modifications.snout && part.parent === 'snout') {
        offset = [offset[0], offset[1], offset[2] - dogState.modifications.snout * .7];
      }
    }
    partMatrix = m4.translate(partMatrix, offset[0], offset[1], offset[2]);

    // an overly complicated check to see if we should move legs or not, and how!
    if (part.anim && (!badActionInProgress || badActionInProgress === 'speed' || (badActionInProgress === 'jump' && !part.name.includes('leg')) || badAction === 'hotdog')) {
      partMatrix = part.anim(badActionInProgress === 'speed' && part.name.includes('leg') ? time * 4 : time, partMatrix);
    } 
    // tail chase animation
    if (badActionInProgress === 'tailChase') {
      if (part.name === 'tail') { 
        partMatrix = m4.yRotate(partMatrix, Math.PI / 2); 
        partMatrix = m4.translate(partMatrix, 0, 0, 0.5); 
      }
      if (part.name === 'head' || part.parent === 'head' || part.parent === 'snout') {
        partMatrix = m4.yRotate(partMatrix, Math.PI / 2);
      }
    }
    world[i] = partMatrix;
    let obj = drawObject({ view, world: world[i], tX: offset[0], tY: offset[1], tZ: offset[2], sX: modifiedScale[0] || part.scale[0], sY: modifiedScale[1] || part.scale[1], sZ: modifiedScale[2] || part.scale[2], color: floppyColorOverride || partColor });
    if (part.name === 'torso') mvp = obj;
  }
  return mvp;
}

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


function updatePosition(dogState, time, badAction) {
  // apply bad action effects
  if (badAction === 'tailChase') dogState.direction += 0.0873;

  if (badAction === 'speed') dogState.speed = 80;

  if (badAction === 'jump') {
    if (dogState.velocity == null || dogState.pos[1] <= 0) {
      dogState.velocity = dogState.pos[1] = 0.05;
    }
    dogState.pos[1] += dogState.velocity;
    dogState.velocity -= 0.01;
    dogState.pos[1] = dogState.pos[1] > 0.5 ? 0.5 : dogState.pos[1] <= 0 ? 0 : dogState.pos[1];
  } else {
    dogState.pos[1] = 0;
    dogState.velocity = null;
  }

  let t = Math.max(0.001, time * 0.001 - dogState.timeWalking);
  dogState.timeWalking += t;
  let s = dogState.speed * t;
  if (badAction !== 'jump') {
    dogState.pos[0] += Math.sin(dogState.direction) * s;
    dogState.pos[2] += Math.cos(dogState.direction) * s;
  }

  // if the dog has hit the bounds, then turn them around and make them go in another direction!
  let bx = dogState.bounds.x, bz = dogState.bounds.z, p = dogState.pos;
  if (p[0] < bx[0] || p[0] > bx[1] || p[2] < bz[0] || p[2] > bz[1]) {
    dogState.direction += 0.7854;
    // nudge the dog back in bounds
    p[0] = p[0] < bx[0] ? bx[0] + 0.1 : p[0] > bx[1] ? bx[1] - 0.1 : p[0];
    p[2] = p[2] < bz[0] ? bz[0] + 0.1 : p[2] > bz[1] ? bz[1] - 0.1 : p[2];
  }

  // check dogs for collisions with each other
  for (const d of allDogs) {
    if (d.dogName === dogState.dogName) continue;
    let ta = dogState.scale * dogParts[1].scale[2], wa = dogState.scale * dogParts[0].scale[0], da = dogState.scale * dogParts[0].scale[2] + ta;
    let tb = d.scale * dogParts[1].scale[2], wb = d.scale * dogParts[0].scale[0], db = d.scale * dogParts[0].scale[2] + tb;
    let dx = Math.abs(p[0] - d.pos[0]), dz = Math.abs(p[2] - d.pos[2]), n = 0.5;
    if (dx < (wa + wb) / 2 && dz < (da + db) / 2) {
      dogState.direction += 0.7854;
      let mx = (wa + wb) / 2, mz = (da + db) / 2;
      // nudge the dog out of collision!
      if (dx < mx || d.badAction === 'speed') p[0] = d.pos[0] + Math.sign(p[0] - d.pos[0]) * (mx + n);
      if (dz < mz || d.badAction === 'speed') p[2] = d.pos[2] + Math.sign(p[2] - d.pos[2]) * (mz + n);
      break;
    }
  }

  // check for obstacle collisions
  dogState = updateDogStateFromCollision(trees, 1, 1, dogState);
  dogState = updateDogStateFromCollision(bushes, 1, 1, dogState);
  dogState = updateDogStateFromCollision(benches, 2, 0.6, dogState);
}

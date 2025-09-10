
let culpritIsMisbehaving = false;

function inClipSpace(x, y, z) {
  return x >= -1 && x <= 1 && y >= -1 && y <= 1 && z >= 0 && z <= 1;
}

function isObstructed(x, z, obstacles, centerOfObject) {
  for (let obstacle of obstacles) {
    const [ox, oy, oz] = m4.transformPoint(obstacle.mvp, centerOfObject);
    if (inClipSpace(ox, oy, oz) && oz < z && Math.abs(ox - x) < 0.3) {
      return obstacle;
    }
  }
  return null;
}

function isTooFar(view, pos) {
  const dogCam = m4.transformPoint(view, pos);
  const dogCamZ = -dogCam[2];
  const fovScale = 1 / Math.tan(fieldOfViewInRadians * 0.5);
  const maxDistance = fovScale / 0.2;
  return dogCamZ > maxDistance;
}

function isFacingCamera(culprit, view) {
  const forward = [Math.sin(culprit.direction), 0, Math.cos(culprit.direction)];
  const dogHead = [culprit.pos[0], culprit.pos[1] + 1.5 * culprit.scale, culprit.pos[2] + 2.75 * culprit.scale];
  const camPos = [view[12], view[13], view[14]];
  const toCamera = m4.subtractVectors(camPos, dogHead);
  const fNorm = m4.normalize(forward);
  const tNorm = m4.normalize(toCamera);
  const dot = m4.dot(fNorm, tNorm);
  return dot < 0 && Math.abs(dot) > 0.5;
}

function isInView(mvp, centerOfObject) {
  const [x, y, z] = m4.transformPoint(mvp, centerOfObject);
  return inClipSpace(x, y, z);
}

function isObjectInCamera(mvps, obstacles, view, sunMvp) {
  let description = 'Nothing of interest';
  const badMvp = mvps.find(mvp => mvp.isBad);
  const centerOfObject = [0, 0, 0];
  const [bx, by, bz] = m4.transformPoint(badMvp.mvp, centerOfObject);
  let closestDog = null;
  let capturedZDistance = 0;
  let missReason = null;

  for (let culprit of mvps) {
    const [x, y, z] = m4.transformPoint(culprit.mvp, centerOfObject);
    if (!inClipSpace(x, y, z)) continue;

    const obstacle = isObstructed(x, z, obstacles, centerOfObject);
    if (obstacle) {
      if (culprit.isBad) {
        missReason = `that's the ${culprit.breedName}, but they're behind ${obstacle.name}`;
      } else {
        missReason = `that's ${culprit.dogName} the ${culprit.breedName} behind a ${obstacle.name}...`;
      }
      description = `A ${culprit.breedName} obstructed by ${obstacle.name}`;
      continue;
    }

    if (isTooFar(view, culprit.pos)) {
      if (culprit.isBad) {
        missReason = `that's the ${culprit.breedName}, but they're too far away`;
        description = `${culprit.dogName} the ${culprit.breedName} in the distance`;
      } else {
        missReason = 'wow, this will look great in the "museum of stuff that\'s far away"';
        description = 'Something far away';
      }
      continue;
    }

    if (!capturedZDistance || z < capturedZDistance) {
      if (!culprit.isBad && badMvp) {
        const xDist = Math.abs(bx - x);
        if (bz < z && xDist < 0.1) continue;
      }

      if (culprit.isBad && (!culpritIsMisbehaving && culprit.badAction !== 'hotdog')) {
        missReason = `that's the right ${culprit.breedName} but they aren't doing anything!`;
        description = `${culprit.dogName} the ${culprit.breedName} being a good dog`;
        continue;
      } else if (targetObject.mvp && culprit.isBad && culprit.badAction === 'hotdog') {
        if (isFacingCamera(culprit, view)) {
          missReason = `that's the right ${culprit.breedName}, but the hotdog isn't in the picture!`;
          description = `${culprit.dogName} the ${culprit.breedName} running off with my hotdog`;
          continue;
        }
      }
      closestDog = culprit;
      capturedZDistance = z;
    }
  }

  if (closestDog && closestDog.isBad) {
    description = `${closestDog.dogName}, a naughty ${closestDog.breedName}!`;
  } else if (closestDog) {
    missReason = `that's ${closestDog.dogName}, an innocent ${closestDog.breedName}!`;
    description = `${closestDog.dogName}, an innocent ${closestDog.breedName}`;
  }

  if (!missReason && !closestDog) {
    for (let obstacle of obstacles) {
      if (isInView(obstacle.mvp, centerOfObject)) {
        missReason = `what am I supposed to do with a picture of ${obstacle.name}?`;
        description = obstacle.name;
      }
    }
    if (isInView(sunMvp, centerOfObject)) {
      missReason = `MY EYES!!!!`;
      description = 'A blinding light';
    }
  }

  return { capturedDog: closestDog && closestDog.isBad ? closestDog : null, missReason, description };
}

/**
 * Create-a-Dog
 *
 * @module create-a-dog
 */
(function (root, factory) {  // eslint-disable-line
    // TODO: fix my spacing lol
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals
        root.dog = factory();
    }
}(this, function () {
    "use strict";

    const dogNames = ['Sriracha', 'Fizaac', 'Gwen', 'Soren', 'Ivan', 'Ugly Baby', 'Therm', 'Dog Kevin', 'Taylina', 'Gwillex', 'Whivvy', 'Matt']
    // dog types: german shepherd, mutt, golden retriever, westie, pug
    // bad dog activities: eating garbage, running too fast, barking at nothing, silly color, chasing their own tail

    webglUtils = webglUtils || this.webglUtils;
    m4 = m4 || this.m4 || math3d;


    // randomize for tiny dogs
    const scale = .95;
    const dogParts = [
        {
            name: 'torso',
            parent: null,
            // x, y, z movement
            offset: [0 * scale, 1 * scale, 0 * scale],
            // x, y, z size
            scale: [1.8 * scale, 1.2 * scale, 3 * scale],
            anim: (t, M) => M
        },

        // Head block
        {
            name: 'head', parent: 'torso', 
            offset: [0 * scale, 0.9 * scale, 1.7 * scale], 
            scale: [1.0 * scale, 1.0 * scale, 1.0 * scale],
            anim: (t, M) => {
                M = m4.translate(M, 0, 0.05 * Math.sin(t * 6), 0); // tiny bob
                return m4.xRotate(M, 0.05 * Math.sin(t * 2));
            }
        },

        // Snout + nose + tongue
        {
            name: 'snout', parent: 'head', 
            offset: [0 * scale, 0.0 * scale, 0.7 * scale], 
            scale: [0.6 * scale, 0.6 * scale, 0.8 * scale],
            anim: (t, M) => M,
            // brown color
            color: [0.4, 0.2, 0.1, 1.0]
        },
        {
            name: 'nose', parent: 'snout', 
            offset: [0 * scale, 0.15 * scale, 0.5 * scale], 
            scale: [0.2 * scale, 0.2 * scale, 0.2 * scale],
            anim: (t, M) => M,
            color: [0.3, 0.1, 0.1, 1.0]
        },
        {
            name: 'tongue', parent: 'snout', 
            offset: [0 * scale, -0.35 * scale, 0.35 * scale], 
            scale: [0.18 * scale, 0.35 * scale, 0.05 * scale],
             // like the tail, the tongue oscillates but at a consistent frequency!
            // anim: (t, M) => m4.yRotate(M, Math.sin(t * 5)),
            color: [0.8, 0.2, 0.2, 1.0]
        }, 

        // Ears
        {
            name: 'earL', parent: 'head', 
            offset: [-0.45 * scale, 0.6 * scale, -0.1 * scale], 
            scale: [0.18 * scale, 0.5 * scale, 0.18 * scale],
            // anim: (t, M) => m4.zRotate(M, 0.15 * Math.sin(t * 5))
        },
        {
            name: 'earR', parent: 'head', 
            offset: [0.45 * scale, 0.6 * scale, -0.1 * scale], 
            scale: [0.18 * scale, 0.5 * scale, 0.18 * scale],
            // anim: (t, M) => m4.zRotate(M, -0.15 * Math.sin(t * 5))
        },

        // Legs (walk in place)
        {
            name: 'legLF', parent: 'torso', 
            offset: [-0.5 * scale, -0.5 * scale, 1 * scale], 
            scale: [0.5 * scale, 1 * scale, 0.5 * scale],
            anim: (t, M) => m4.xRotate(M, 0.6 * Math.sin(t * 6 + 0))
        },
        {
            name: 'legRF', parent: 'torso', 
            offset: [0.5 * scale, -0.5 * scale, 1 * scale], 
            scale: [0.5 * scale, 1 * scale, 0.5 * scale],
            anim: (t, M) => m4.xRotate(M, 0.6 * Math.sin(t * 6 + Math.PI))
        },
        {
            name: 'legLB', parent: 'torso', 
            offset: [-0.5 * scale, -0.5 * scale, -1 * scale], 
            scale: [0.5 * scale, 1 * scale, 0.5 * scale],
            anim: (t, M) => m4.xRotate(M, 0.6 * Math.sin(t * 6 + Math.PI))
        },
        {
            name: 'legRB', parent: 'torso', 
            offset: [0.5 * scale, -0.5 * scale, -1 * scale], 
            scale: [0.5 * scale, 1 * scale, 0.5 * scale],
            anim: (t, M) => m4.xRotate(M, 0.6 * Math.sin(t * 6 + 0))
        },

        // Tail (wag)
        {
            name: 'tail', parent: 'torso', 
            offset: [0, 0, -2.2 * scale], 
            scale: [0.28 * scale, 0.28 * scale, 1.4 * scale],
            // oscillatory motion
            anim: (t, M) => m4.yRotate(M, Math.sin(t * 8)),
            color: [0.4, 0.2, 0.1, 1.0]
        },
    ];


    function drawCube(gl) {
        const positions = [
            // Front face
            -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,

            // Back face
            -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,

            // Top face
            -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,

            // Bottom face
            -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,

            // Right face
            0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,

            // Left face
            -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5,
        ];

        const normal = [
            // Front face
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

            // Back face
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

            // Top face
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

            // Bottom face
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,

            // Right face
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

            // Left face
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,

        ]

        const indices = [
            // front
            0, 1, 2, 0, 2, 3,
            // back
            4, 5, 6, 4, 6, 7,
            // top
            8, 9, 10, 8, 10, 11,
            // bottom
            12, 13, 14, 12, 14, 15,
            // right
            16, 17, 18, 16, 18, 19,
            // left
            20, 21, 22, 20, 22, 23,
        ];


        // Setup all the needed buffers and attributes.
        return webglUtils.createBufferInfoFromArrays(gl, {
            position: { numComponents: 3, data: positions },
            normal: { numComponents: 3, data: normal },
            indices: { numComponents: 3, data: indices },
        });
    }

    // // note: this is in radians!!!
    // function wrapAngle(angle) {
    //     // while (angle >= 360) {
    //     //     angle -= 360;
    //     // }
    //     // while (angle < 0) {
    //     //     angle += 360;
    //     // }
    //     // return angle;
    //     while (angle > Math.PI) {
    //         angle -= 2 * Math.PI;
    //     }
    //     while (angle < -Math.PI) {
    //         angle += 2 * Math.PI;
    //     }
    //     return angle;
    // }

    const dogState = {
        // keeping track of time spent walking used to 
        timeWalking: 0,
        // original position in world space (randomized to be a little far away from camera)
        pos: [0, 0, -6],
        // direction facing
        direction: 1,
        // size of dog
        scale: 0.5,
        // how fast per second
        speed:  15, // 1.1,
        // how far they can go
        bounds: { x: [-8, 8], z: [-18, -2] },
    };

    /*
    // spinning dog
        const dogState = {
        // keeping track of time spent walking
        timeWalking: 0,
        // original position in world space
        pos: [0, 0, -16],
        // direction facing
        direction: 0,
        // size of dog
        scale: 0.5,
        // how fast per second
        speed:  5, // 1.1,
        // how far they can go (randomized to be a little far away from camera)
        bounds: { x: [-16, 6], z: [-8, 2] },
    };

    */

    // this is for random dogs wander. Bad dogs will have own custom animations!
    function updatePosition(dogState, time) {
        const timeSinceStep = Math.max(0.001, time * 0.001 - dogState.timeWalking);
        dogState.timeWalking += timeSinceStep;
        const step = dogState.speed * timeSinceStep;
        // update x position
        dogState.pos[0] += Math.sin(dogState.direction) * step;
        // update z position
        dogState.pos[2] += Math.cos(dogState.direction) * step;

        // if the dog has hit the bounds, then turn them around and make them go in another direction!
        if (dogState.pos[0] < dogState.bounds.x[0] || dogState.pos[0] > dogState.bounds.x[1] ||
            dogState.pos[2] < dogState.bounds.z[0] || dogState.pos[2] > dogState.bounds.z[1]) {
            // // get the angle of from the z position to the x position
            // const dYaw = Math.atan2(dogState.pos[2], dogState.pos[0]);
            // dogState.direction = wrapAngle(dogState.direction + dYaw);
            dogState.direction += Math.PI; // just move them 180 degrees in radians
        }
        // slowly turn the dog until they're facing their target direction
        // if (dogState.targetDirection !== null) {
        //     const diff = wrapAngle(dogState.targetDirection - dogState.direction);
        //     if (Math.abs(dogState.targetDirection - dogState.direction) > 0.01) {
        //         let updatedDirection = dogState.direction + (diff > 0 ? 1 : -1) * (dogState.speed / 100);
        //         dogState.direction = wrapAngle(updatedDirection);
        //     } else {
        //         dogState.direction = dogState.targetDirection;
        //         dogState.targetDirection = null;
        //     }
        // }
    }

    function drawDog(gl, programInfo, projection, view, time) {
        updatePosition(dogState, time);

        // Create the base cube to work with. 
        // Instead of creating different sized cubes for each part, we can just use one cube and scale it!
        const cube = drawCube(gl);

        const world = dogParts.map(() => m4.identity());
        const idx = Object.fromEntries(dogParts.map((p, i) => [p.name, i]));

        // TODO: going to just do a different func for every body part to make things easy
        for (let i = 0; i < dogParts.length; i++) {
            const part = dogParts[i];
            let partMatrix = part.parent ? m4.copy(world[idx[part.parent]]) : m4.identity();

            // root/global dog transform ONCE on torso (ok for children to inherit)
            if (part.name === 'torso') {
                partMatrix = m4.translate(partMatrix, dogState.pos[0], dogState.pos[1], dogState.pos[2]);
                partMatrix = m4.yRotate(partMatrix, dogState.direction);
                partMatrix = m4.scale(partMatrix, dogState.scale, dogState.scale, dogState.scale); // global size
            }

            // local world offset + animation (no scale)
            partMatrix = m4.translate(partMatrix, part.offset[0], part.offset[1], part.offset[2]);

            // add part-specific animation if needed
            if (part.anim) {
                partMatrix = part.anim(time, partMatrix);
            }

            world[i] = partMatrix;
        }

        // this is what's set in 3d.js
        const lightingUniforms = {
            u_lightWorldPos: [-50, 30, 100],
            u_viewInverse: m4.identity(),
            u_lightColor: [1, 1, 1, 1],
        };

        for (let i = 0; i < dogParts.length; i++) {
            const part = dogParts[i];

            // scale the shape
            const worldMatrix = m4.scale(
                m4.copy(world[i]),
                // x y z scale
                part.scale[0], part.scale[1], part.scale[2]
            );

            // Compute the mvp matrix
            const viewWorld = m4.multiply(view, worldMatrix);
            const mvp = m4.multiply(projection, viewWorld);

            // Set all required uniforms (this is for lighting)
            const u_worldInverseTranspose = m4.identity();
            // transpose for "normal" matrix
            m4.transpose(m4.inverse(worldMatrix), u_worldInverseTranspose);
            const uniformSetters = webglUtils.createUniformSetters(gl, programInfo.program);
            webglUtils.setBuffersAndAttributes(gl, programInfo, cube);
            webglUtils.setUniforms(uniformSetters, {
                u_mvp: mvp,
                u_color: part.color || [0.8, 0.6, 0.3, 1.0],
                u_world: worldMatrix,
                u_worldInverseTranspose: u_worldInverseTranspose,
                u_lightWorldPos: lightingUniforms.u_lightWorldPos,
                u_viewInverse: view, // use camera view matrix as inverse
                u_lightColor: lightingUniforms.u_lightColor,
            });
            webglUtils.drawBufferInfo(gl, cube);
        }
        // TODO: return all dog mvps
    }

    return {
        drawDog: drawDog,
    };

}));

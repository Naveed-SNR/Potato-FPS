import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Stats from 'stats.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';
// wimport { LUTCubeLoader } from 'three/examples/jsm/loaders/LUTCubeLoader.js';
import { LUT3dlLoader } from 'three/examples/jsm/loaders/LUT3dlLoader.js';
import { LUTPass } from 'three/examples/jsm/postprocessing/LUTPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

// Update parameters
const params = {
    firstPerson: true,
    displayCollider: false,
    displayBVH: false,
    visualizeDepth: 10,
    gravity: -9.8,
    playerSpeed: 2.1,
    physicsSteps: 11,
    reset: reset,
    lutIntensity: 0.083,
    lutFile: 'Anime1',
    lutOptions: {
        None: null,
        Anime1: './LUTS/Anime1.3dl',
        Anime2: './LUTS/Anime2.3dl',
        Anime3: './LUTS/Anime3.3dl',
        Anime4: './LUTS/Anime4.3dl',
        Anime5: './LUTS/Anime5.3dl',
        Anime6: './LUTS/Anime6.3dl',
        Anime7: './LUTS/Anime7.3dl',
        Anime8: './LUTS/Anime8.3dl',
        Cinematic: './LUTS/Cinematic.3dl'
    }
};


let renderer, camera, thirdPersonCamera, scene, clock, gui, stats, composer, lutPass, openSound, closeSound, footstepSound, lastFootstepTime = 0;
const FOOTSTEP_INTERVAL = 300;
let environment, collider, visualizer, player, controls;
let pX = -1.1, pY = 0.452, pZ = 11;
let playerIsOnGround = false;
let fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false;
let playerVelocity = new THREE.Vector3();
let upVector = new THREE.Vector3(0, 1, 0);
let tempVector = new THREE.Vector3();
let tempVector2 = new THREE.Vector3();
let tempBox = new THREE.Box3();
let tempMat = new THREE.Matrix4();
let tempSegment = new THREE.Line3();

// Define specific coordinates with messages
const coordinatesWithMessages = [
    {
        position: new THREE.Vector3(pX, pY, pZ),
        title: "Welcome To College IO",
        message: "You are currently at the entry point.",
        isOffice: false
    },
    {
        position: new THREE.Vector3(-5.868, 0.389, 9.249),
        title: "Parking",
        message: "For Cars",
        isOffice: false
    },
    {
        position: new THREE.Vector3(-0.817, 1.299, 2.484),
        title: "This is the General Office",
        message: "Here, you can register for the college. Press 'Esc' To open the registration form",
        isOffice: true
    },
    {
        position: new THREE.Vector3(2.647, 0.389, 8.590),
        title: "Basketball court",
        message: "Here you can play football",
        isOffice: false
    },
    {
        position: new THREE.Vector3(-4.305, 1.274, 0.684),
        title: "Cafeteria",
        message: "Buy or eat food (or both)",
        isOffice: false
    },
    {
        position: new THREE.Vector3(-7.211, 1.274, 2.193),
        title: "Library",
        message: "Read here",
        isOffice: false
    },
    {
        position: new THREE.Vector3(-6.397, 1.274, 0.625),
        title: "Computer Lab",
        message: "Computers here",
        isOffice: false
    },
    {
        position: new THREE.Vector3(-7.410, 1.274, 1.243),
        title: "Classroom",
        message: "For Students",
        isOffice: false
    },
    {
        position: new THREE.Vector3(-2.498, 1.274, 1.226),
        title: "Classroom",
        message: "For Students",
        isOffice: false
    },
    {
        position: new THREE.Vector3(-0.860, 1.274, 0.918),
        title: "Staffroom",
        message: "For Staff",
        isOffice: false
    },


    // Add more coordinates as needed
];

init();
render();

function init() {
    const bgColor = 0x038df3;

    // renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(bgColor, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    // scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(bgColor, 21, 83);

    // lights
    const light = new THREE.DirectionalLight(0xf0f0f0, 1);
    light.position.set(1, 1.5, 1).multiplyScalar(50);
    light.shadow.mapSize.setScalar(2048);
    light.shadow.bias = -1e-4;
    light.shadow.normalBias = 0.05;
    light.castShadow = true;


    //Ambient Light
    const alight = new THREE.AmbientLight(0x909090, 1);
    scene.add(alight);

    const shadowCam = light.shadow.camera;
    shadowCam.bottom = shadowCam.left = -30;
    shadowCam.top = 30;
    shadowCam.right = 45;

    scene.add(light);
    scene.add(new THREE.HemisphereLight(0x404040, 0x223344, 0.4));

    // camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
    thirdPersonCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
    camera.position.set(10, 10, 10);
    thirdPersonCamera.position.set(10, 10, 10);
    camera.far = 100;
    camera.near = 0.01;
    thirdPersonCamera.far = 100;
    thirdPersonCamera.near = 0.01;
    camera.updateProjectionMatrix();
    thirdPersonCamera.updateProjectionMatrix();
    window.camera = camera;

    //Add footsteps sound
    const listener = new THREE.AudioListener();
    camera.add(listener);

    footstepSound = new THREE.Audio(listener);
    openSound = new THREE.Audio(listener);
    closeSound = new THREE.Audio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('./sounds/footsteps.wav', function (buffer) {
        footstepSound.setBuffer(buffer);
        footstepSound.setLoop(false);
        footstepSound.setVolume(0.5);
    });
    audioLoader.load('./sounds/open.flac', function (buffer) {
        openSound.setBuffer(buffer);
        openSound.setLoop(false);
        openSound.setVolume(0.5);
    });
    audioLoader.load('./sounds/close.flac', function (buffer) {
        closeSound.setBuffer(buffer);
        closeSound.setLoop(false);
        closeSound.setVolume(0.5);
    });

    clock = new THREE.Clock();

    // PointerLockControls setup
    controls = new PointerLockControls(camera, renderer.domElement);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    blocker.addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        console.log('Pointer locked');
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', () => {
        console.log('Pointer unlocked');
        blocker.style.display = 'block';

        instructions.style.display = '';

    });


    // stats setup
    stats = new Stats();
    document.body.appendChild(stats.dom);

    loadColliderEnvironment();

    // character
    player = new THREE.Mesh(
        new RoundedBoxGeometry(0.3, 0.542, 0.3, 10, 0.5),
        new THREE.MeshStandardMaterial()
    );
    player.geometry.translate(0, -0.1, 0);
    player.scale.set(0.83, 0.83, 0.83);  // Scale down the player model
    player.capsuleInfo = {
        radius: 0.074,  // Adjusted radius
        segment: new THREE.Line3(new THREE.Vector3(), new THREE.Vector3(0, -0.5, 0.0))  // Adjusted segment
    };
    player.castShadow = true;
    player.receiveShadow = true;
    player.material.shadowSide = 2;
    scene.add(player);
    reset();

    // dat.gui
    gui = new GUI();
    gui.add(params, 'firstPerson').onChange(v => {
        if (!v) {
            thirdPersonCamera.position.sub(controls.getObject().position).normalize().multiplyScalar(10).add(controls.getObject().position);
        }
    });

    const visFolder = gui.addFolder('Visualization');
    visFolder.add(params, 'displayCollider');
    visFolder.add(params, 'displayBVH');
    visFolder.add(params, 'visualizeDepth', 1, 21, 1).onChange(v => {
        visualizer.depth = v;
        visualizer.update();
    });
    visFolder.open();

    const physicsFolder = gui.addFolder('Player');
    physicsFolder.add(params, 'physicsSteps', 0, 30, 1);
    physicsFolder.add(params, 'gravity', -100, 100, 0.01).onChange(v => {
        params.gravity = parseFloat(v);
    });
    physicsFolder.add(params, 'playerSpeed', 1, 20);
    physicsFolder.open();

    const lutFolder = gui.addFolder('LUT');
    lutFolder.add(params, 'lutFile', Object.keys(params.lutOptions)).name('Select LUT').onChange(loadSelectedLUT);
    lutFolder.add(params, 'lutIntensity', 0, 1, 0.001).name('LUT Intensity').onChange(updateLUTIntensity);
    lutFolder.open();

    gui.add(params, 'reset');
    gui.open();

    // Load the default LUT
    loadSelectedLUT(params.lutFile);

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        thirdPersonCamera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    window.addEventListener('keydown', function (e) {
        if (controls.isLocked) {
            switch (e.code) {
                case 'KeyW': fwdPressed = true; break;
                case 'KeyS': bkdPressed = true; break;
                case 'KeyD': rgtPressed = true; break;
                case 'KeyA': lftPressed = true; break;
                case 'Space':
                    if (playerIsOnGround) {
                        playerVelocity.y = 2.2412;
                        playerIsOnGround = false;
                    }
                    break;
            }
        }
    });

    window.addEventListener('keyup', function (e) {
        if (controls.isLocked) {
            switch (e.code) {
                case 'KeyW': fwdPressed = false; break;
                case 'KeyS': bkdPressed = false; break;
                case 'KeyD': rgtPressed = false; break;
                case 'KeyA': lftPressed = false; break;
            }
        }
    });


    // Post-processing setup
    const renderPass = new RenderPass(scene, camera);
    lutPass = new LUTPass();

    composer = new EffectComposer(renderer);
    lutPass.uniforms.intensity = { value: params.lutIntensity };
    composer.addPass(renderPass);
    composer.addPass(lutPass);
    lutPass.enabled = false; // Initially disable LUT pass

    // Load LUT file
    loadLUT(params.lutFile, result => {
        if (result.texture3D || result.texture) {
            const lutTexture = result.texture3D || result.texture;
            lutTexture.minFilter = THREE.LinearFilter;
            lutTexture.magFilter = THREE.LinearFilter;
            lutTexture.generateMipmaps = false;
            lutTexture.encoding = THREE.LinearEncoding; // Ensure the encoding is linear

            lutPass.lut = lutTexture;

            // Debugging information
            console.log('LUT texture loaded:', lutTexture);
            console.log('LUT texture dimensions:', lutTexture.image.width, lutTexture.image.height, lutTexture.image.depth);
            console.log('LUTPass enabled:', lutPass.enabled);
        } else {
            console.error('Failed to load LUT texture.');
        }
    });

}

function loadLUT(filePath, onLoad) {
    const loader = new LUT3dlLoader();
    loader.load(filePath, result => {
        const lutTexture = result.texture3D || result.texture;
        lutTexture.minFilter = THREE.LinearFilter;
        lutTexture.magFilter = THREE.LinearFilter;
        lutTexture.generateMipmaps = false;
        lutTexture.encoding = THREE.LinearEncoding; // Ensure the encoding is linear
        onLoad(result);
    });
}

function loadSelectedLUT(lutKey) {
    const lutFile = params.lutOptions[lutKey];
    if (lutFile) {
        loadLUT(lutFile, result => {
            if (result.texture3D || result.texture) {
                const lutTexture = result.texture3D || result.texture;
                lutTexture.minFilter = THREE.LinearFilter;
                lutTexture.magFilter = THREE.LinearFilter;
                lutTexture.generateMipmaps = false;
                lutTexture.encoding = THREE.LinearEncoding;

                lutPass.lut = lutTexture;
                lutPass.enabled = true;
                console.log('LUT texture loaded:', lutTexture);
            } else {
                console.error('Failed to load LUT texture.');
                lutPass.enabled = false;
            }
        });
    } else {
        lutPass.enabled = false;
    }
}

function updateLUTIntensity(intensity) {
    if (lutPass.enabled && lutPass.lut) {
        lutPass.uniforms.intensity.value = intensity;
        // console.log('LUT intensity updated:', intensity);
    }
}


function ensureConsistentAttributes(geometry) {
    const requiredAttributes = ['position', 'normal', 'uv', 'uv2'];
    requiredAttributes.forEach(attr => {
        if (!geometry.attributes[attr]) {
            if (attr === 'uv' || attr === 'uv2') {
                const uvArray = new Float32Array(geometry.attributes.position.count * 2);
                geometry.setAttribute(attr, new THREE.BufferAttribute(uvArray, 2));
            } else {
                const array = new Float32Array(geometry.attributes.position.count * 3);
                geometry.setAttribute(attr, new THREE.BufferAttribute(array, 3));
            }
        }
    });
}

function loadColliderEnvironment() {
    console.log("Loading model...");

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('three/examples/js/libs/draco/'); // Set the path to the Draco decoder files
    loader.setDRACOLoader(dracoLoader);
    loader.load('./models/hs/hs.glb', res => {
        console.log("Model loaded", res);

        const gltfScene = res.scene;
        gltfScene.scale.setScalar(0.3);
        gltfScene.rotateY(Math.PI)

        // Calculate the bounding box of the model to inspect its orientation
        const box = new THREE.Box3();
        box.setFromObject(gltfScene);

        // Determine the necessary rotation based on bounding box dimensions
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        if (size.x === maxDimension) {
            // Model is lying on its side, rotate to stand up
            gltfScene.rotation.z = Math.PI / 2;
        } else if (size.z === maxDimension) {
            // Model is lying on its back, rotate to stand up
            gltfScene.rotation.x = -Math.PI / 2;
        }

        const toMerge = {};

        gltfScene.traverse(c => {
            if (c.isMesh) {
                if (!c.geometry) {
                    console.warn("Mesh without geometry found:", c);
                    return;
                }

                // Ensure consistent material for leaves and other special cases
                if (c.material && c.material.isMeshBasicMaterial) {
                    const oldMaterial = c.material;
                    c.material = new THREE.MeshStandardMaterial({
                        map: oldMaterial.map,
                        color: oldMaterial.color,
                        opacity: oldMaterial.opacity,
                        transparent: oldMaterial.transparent,
                        emissive: oldMaterial.emissive,
                        emissiveMap: oldMaterial.emissiveMap,
                        emissiveIntensity: oldMaterial.emissiveIntensity,
                        roughness: 1.0,
                        metalness: 0.5
                    });
                }

                const materialKey = JSON.stringify({
                    color: c.material.color.getHex(),
                    map: c.material.map ? c.material.map.id : null,
                    emissive: c.material.emissive.getHex(),
                    emissiveMap: c.material.emissiveMap ? c.material.emissiveMap.id : null,
                    opacity: c.material.opacity
                });

                if (!toMerge[materialKey]) {
                    toMerge[materialKey] = [];
                }

                toMerge[materialKey].push(c);
            }
        });

        environment = new THREE.Group();
        for (const materialKey in toMerge) {
            const arr = toMerge[materialKey];
            const visualGeometries = [];

            arr.forEach(mesh => {
                if (mesh.geometry) {
                    const geom = mesh.geometry.clone();
                    geom.applyMatrix4(mesh.matrixWorld);
                    ensureConsistentAttributes(geom);

                    if (!geom.attributes.uv2) {
                        const uv = geom.attributes.uv;
                        if (uv) {
                            const uv2 = new THREE.BufferAttribute(new Float32Array(uv.array), 2);
                            geom.setAttribute('uv2', uv2);
                        }
                    }

                    visualGeometries.push(geom);
                }
            });

            if (visualGeometries.length) {
                const newGeom = BufferGeometryUtils.mergeGeometries(visualGeometries, false);
                const firstMesh = arr[0];
                const newMaterial = new THREE.MeshStandardMaterial({
                    color: firstMesh.material.color,
                    map: firstMesh.material.map,
                    emissive: firstMesh.material.emissive,
                    emissiveMap: firstMesh.material.emissiveMap,
                    emissiveIntensity: firstMesh.material.emissiveIntensity,
                    roughness: firstMesh.material.roughness,
                    metalness: firstMesh.material.metalness,
                    opacity: firstMesh.material.opacity,
                    transparent: firstMesh.material.transparent,
                    shadowSide: 2
                });

                const newMesh = new THREE.Mesh(newGeom, newMaterial);
                newMesh.castShadow = true;
                newMesh.receiveShadow = true;
                environment.add(newMesh);
            }
        }

        const staticGenerator = new StaticGeometryGenerator(environment);
        staticGenerator.attributes = ['position'];

        const mergedGeometry = staticGenerator.generate();
        mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

        collider = new THREE.Mesh(mergedGeometry);
        collider.material.wireframe = true;
        collider.material.opacity = 1;
        collider.material.transparent = true;

        visualizer = new MeshBVHHelper(collider, params.visualizeDepth);
        scene.add(visualizer);
        scene.add(collider);
        scene.add(environment);

        camera.position.set(pX, pY, pZ);
        camera.lookAt(0, 0, 0)
        thirdPersonCamera.lookAt(0, 0, 0)
        player.position.set(pX, pY, pZ);

        console.log("Environment added to scene");
    }, undefined, error => {
        console.error("An error occurred while loading the model:", error);
    });
}

function reset() {
    playerVelocity.set(0, 0, 0);
    player.position.set(pX, pY, pZ);
    camera.position.sub(player.position);
    camera.position.add(player.position);
}

function updatePlayer(delta) {
    if (playerIsOnGround) {
        playerVelocity.y = delta * params.gravity;
    } else {
        playerVelocity.y += delta * params.gravity;
    }

    player.position.addScaledVector(playerVelocity, delta);
    // Calculate movement direction based on camera's forward vector
    const cameraDirection = controls.getDirection(new THREE.Vector3()).clone();

    if (fwdPressed) {
        tempVector.copy(cameraDirection); // Move forward along the camera's direction
        tempVector.y = 0; // Ignore vertical component
        player.position.addScaledVector(tempVector.normalize(), params.playerSpeed * delta);
    }
    if (bkdPressed) {
        tempVector.copy(cameraDirection).negate(); // Move backward along the opposite of camera's direction
        tempVector.y = 0; // Ignore vertical component
        player.position.addScaledVector(tempVector.normalize(), params.playerSpeed * delta);
    }
    if (lftPressed) {
        tempVector.copy(cameraDirection).applyAxisAngle(upVector, Math.PI / 2); // Move left relative to camera
        tempVector.y = 0; // Ignore vertical component
        player.position.addScaledVector(tempVector.normalize(), params.playerSpeed * delta);
    }
    if (rgtPressed) {
        tempVector.copy(cameraDirection).applyAxisAngle(upVector, -Math.PI / 2); // Move right relative to camera
        tempVector.y = 0; // Ignore vertical component
        player.position.addScaledVector(tempVector.normalize(), params.playerSpeed * delta);
    }

    if (playerIsOnGround && (fwdPressed || bkdPressed || lftPressed || rgtPressed)) {
        const currentTime = performance.now();
        if (!footstepSound.isPlaying && currentTime - lastFootstepTime > FOOTSTEP_INTERVAL) {
            footstepSound.play(0.1);
            lastFootstepTime = currentTime;
        }
    }


    player.updateMatrixWorld();

    const capsuleInfo = player.capsuleInfo;
    tempBox.makeEmpty();
    tempMat.copy(collider.matrixWorld).invert();
    tempSegment.copy(capsuleInfo.segment);

    tempSegment.start.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat);
    tempSegment.end.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat);

    tempBox.expandByPoint(tempSegment.start);
    tempBox.expandByPoint(tempSegment.end);

    tempBox.min.addScalar(-capsuleInfo.radius);
    tempBox.max.addScalar(capsuleInfo.radius);

    collider.geometry.boundsTree.shapecast({
        intersectsBounds: box => box.intersectsBox(tempBox),
        intersectsTriangle: tri => {
            const triPoint = tempVector;
            const capsulePoint = tempVector2;
            const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);
            if (distance < capsuleInfo.radius) {
                const depth = capsuleInfo.radius - distance;
                const direction = capsulePoint.sub(triPoint).normalize();
                tempSegment.start.addScaledVector(direction, depth);
                tempSegment.end.addScaledVector(direction, depth);
            }
        }
    });

    const newPosition = tempVector;
    newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);

    const deltaVector = tempVector2;
    deltaVector.subVectors(newPosition, player.position);

    playerIsOnGround = deltaVector.y > Math.abs(delta * playerVelocity.y * 0.25);

    const offset = Math.max(0.0, deltaVector.length() - 1e-5);
    deltaVector.normalize().multiplyScalar(offset);

    player.position.add(deltaVector);

    if (!playerIsOnGround) {
        deltaVector.normalize();
        playerVelocity.addScaledVector(deltaVector, -deltaVector.dot(playerVelocity));
    } else {
        playerVelocity.set(0, 0, 0);
    }

    camera.position.copy(player.position).add(new THREE.Vector3(0, -0.1, 0));  // Adjust camera height

    if (player.position.y < -25) {
        reset();
    }
    let str = '';
    str += `X: ${camera.position.x.toFixed(3)}`;
    str += ` Y: ${camera.position.y.toFixed(3)}`;
    str += ` Z: ${camera.position.z.toFixed(3)}`;
    toString(str);
    document.getElementById('pp').innerHTML = str;

    checkCoordinatesWithMessages();
}

function checkCoordinatesWithMessages() {
    const playerPosition = player.position;

    for (const coord of coordinatesWithMessages) {
        if (playerPosition.distanceTo(coord.position) < 1.1) { // Adjust the distance threshold as needed
            showTextBox(coord.message, coord.title);
            showForm(coord.isOffice);
            return; // Exit once we find the first matching coordinate
        }
    }
    hideTextBox(); // Hide the text box if the player is not at any specific coordinate
    hideForm();
}

// function createFormField(type, name, placeholder, id, autofocus = false) {
//     const input = document.createElement('input');
//     input.setAttribute('type', type);
//     input.setAttribute('name', name);
//     input.setAttribute('id', id);
//     input.setAttribute('placeholder', placeholder);
//     if (autofocus) {
//         input.setAttribute('autofocus', true);
//     }
//     return input;
// }

function showTextBox(message, title) {
    const textBox = document.getElementById('textBox');

    // Update the heading and description
    const heading = document.querySelector('.area');
    heading.textContent = title;

    const description = document.querySelector('.description');
    description.textContent = message;

    // Make the textBox visible and play the open sound if it's not already visible
    if (controls.isLocked && textBox.style.display !== 'block') {
        textBox.style.display = 'block';
        openSound.play();
    }
}

function hideTextBox() {
    const textBox = document.getElementById('textBox');

    // Hide the textBox and play the close sound if it's currently visible
    if (textBox.style.display === 'block') {
        textBox.style.display = 'none';
        closeSound.play();
    }
}


function showForm(office) {
    let form = document.querySelector('.reg');
    if (office) {
        // // Check if the form already exists, to avoid adding duplicates  
        // form.setAttribute('action', '');
        // form.classList.add('reg');

        // // Clear previous form fields
        // form.innerHTML = '';
        // // Create and append form fields
        // const emailField = createFormField('email', 'email', 'email', 'email', true);
        // const nameField = createFormField('text', 'name', 'Name', 'name');
        // const phoneField = createFormField('tel', 'phone', 'Phone Number', 'phone');
        // const dobField = createFormField('date', 'dob', 'Date of Birth', 'dob');

        // form.appendChild(emailField);
        // form.appendChild(nameField);
        // form.appendChild(phoneField);
        // form.appendChild(dobField);

        // // Programmatically focus the first field after appending it to the DOM
        // emailField.focus();

        if (!controls.isLocked) {
            form.style.display = 'block';
            instructions.style.display = 'none';

        }
        else {
            hideForm()
        }
    }
}


function hideForm() {
    let form = document.querySelector('.reg');

    form.style.display = 'none';


    instructions.style.display = '';
}

function render() {
    stats.update();
    requestAnimationFrame(render);

    const delta = Math.min(clock.getDelta(), 0.1);
    if (params.firstPerson) {
        controls.maxPolarAngle = Math.PI;
        controls.minDistance = 1e-4;
        controls.maxDistance = 1e-4;
    } else {
        thirdPersonCamera.position.copy(player.position).add(new THREE.Vector3(0, 0.3, 1));
        thirdPersonCamera.lookAt(player.position);
    }

    if (collider) {
        collider.visible = params.displayCollider;
        visualizer.visible = params.displayBVH;
        const physicsSteps = params.physicsSteps;
        for (let i = 0; i < physicsSteps; i++) {
            updatePlayer(delta / physicsSteps);
        }
    }

    composer.render();
}
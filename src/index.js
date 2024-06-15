import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Stats from 'stats.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';

const params = {
	firstPerson: true,
	displayCollider: false,
	displayBVH: false,
	visualizeDepth: 10,
	gravity: -30,
	playerSpeed: 1,
	physicsSteps: 5,
	reset: reset,
};

let renderer, camera, scene, clock, gui, stats;
let environment, collider, visualizer, player, controls;
let playerIsOnGround = false;
let fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false;
let playerVelocity = new THREE.Vector3();
let upVector = new THREE.Vector3( 0, 1, 0 );
let tempVector = new THREE.Vector3();
let tempVector2 = new THREE.Vector3();
let tempBox = new THREE.Box3();
let tempMat = new THREE.Matrix4();
let tempSegment = new THREE.Line3();

init();
render();

function init() {
const bgColor = 0x263238 / 2;


// renderer setup
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(bgColor, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// scene setup
scene = new THREE.Scene();
scene.fog = new THREE.Fog(bgColor, 20, 70);

// lights
const light = new THREE.DirectionalLight(0xf0f0f0, 1);
light.position.set(1, 1.5, 1).multiplyScalar(50);
light.shadow.mapSize.setScalar(2048);
light.shadow.bias = -1e-4;
light.shadow.normalBias = 0.05;
light.castShadow = true;

const shadowCam = light.shadow.camera;
shadowCam.bottom = shadowCam.left = -30;
shadowCam.top = 30;
shadowCam.right = 45;

scene.add(light);
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.4));

// camera setup
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(10, 10, 10);
camera.far = 100;
camera.updateProjectionMatrix();
window.camera = camera;

clock = new THREE.Clock();

controls = new OrbitControls(camera, renderer.domElement);


// controls = new PointerLockControls(camera, renderer.domElement);

// document.addEventListener('click', () => {
// 	controls.lock();
// });

// controls.addEventListener('lock', () => {
// 	console.log('Pointer locked');
// });

// controls.addEventListener('unlock', () => {
// 	console.log('Pointer unlocked');
// });


// stats setup
stats = new Stats();
document.body.appendChild(stats.dom);

loadColliderEnvironment();

// character
player = new THREE.Mesh(
	new RoundedBoxGeometry(1.0, 2.0, 1.0, 10, 0.5),
	new THREE.MeshStandardMaterial()
);
player.geometry.translate(0, -0.5, 0);
player.scale.set(0.1, 0.1, 0.1);  // Scale down the player model
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
		camera
			.position
			.sub(controls.target)
			.normalize()
			.multiplyScalar(10)
			.add(controls.target);
	}
});

const visFolder = gui.addFolder('Visualization');
visFolder.add(params, 'displayCollider');
visFolder.add(params, 'displayBVH');
visFolder.add(params, 'visualizeDepth', 1, 20, 1).onChange(v => {
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

gui.add(params, 'reset');
gui.open();

window.addEventListener('resize', function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

window.addEventListener('keydown', function (e) {
	switch (e.code) {
		case 'KeyW': fwdPressed = true; break;
		case 'KeyS': bkdPressed = true; break;
		case 'KeyD': rgtPressed = true; break;
		case 'KeyA': lftPressed = true; break;
		case 'Space':
			if (playerIsOnGround) {
				playerVelocity.y = 10.0;
				playerIsOnGround = false;
			}
			break;
	}
});

window.addEventListener('keyup', function (e) {
	switch (e.code) {
		case 'KeyW': fwdPressed = false; break;
		case 'KeyS': bkdPressed = false; break;
		case 'KeyD': rgtPressed = false; break;
		case 'KeyA': lftPressed = false; break;
	}
});

}


function loadColliderEnvironment() {
    console.log("Loading model...");

    const loader = new GLTFLoader();
    loader.load('./models/college/college.glb', res => {
        console.log("Model loaded", res);

        const gltfScene = res.scene;
        gltfScene.scale.setScalar(1); // Adjust this scale as needed

        // Calculate the bounding box of the model
        const box = new THREE.Box3();
        box.setFromObject(gltfScene);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Position the model
        gltfScene.position.set(10, 0, 10);
        gltfScene.updateMatrixWorld(true);

        const toMerge = {};
        gltfScene.traverse(c => {
            if (c.isMesh) {
                // Convert MeshBasicMaterial to MeshStandardMaterial and preserve original textures
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
                        roughness: 1.0, // Adjust as needed
                        metalness: 0.5 // Adjust as needed
                    });
                }
                const hex = c.material.color.getHex();
                toMerge[hex] = toMerge[hex] || [];
                toMerge[hex].push(c);
            }
        });

        environment = new THREE.Group();
        for (const hex in toMerge) {
            const arr = toMerge[hex];
            const visualGeometries = [];
            arr.forEach(mesh => {
                if (mesh.material && mesh.material.emissive && mesh.material.emissive.r !== 0) {
                    environment.attach(mesh);
                } else {
                    if (mesh.geometry) {  // Ensure mesh has geometry
                        const geom = mesh.geometry.clone();
                        geom.applyMatrix4(mesh.matrixWorld);

                        // Ensure uv2 attribute exists on all geometries
                        if (!geom.attributes.uv2) {
                            const uv = geom.attributes.uv;
                            if (uv) {
                                const uv2 = new THREE.BufferAttribute(new Float32Array(uv.array), 2);
                                geom.setAttribute('uv2', uv2);
                            }
                        }

                        // Ensure all required attributes exist
                        ['position', 'normal', 'uv'].forEach(attr => {
                            if (!geom.attributes[attr]) {
                                const array = new Float32Array(geom.attributes.position.count * (attr === 'uv' ? 2 : 3));
                                geom.setAttribute(attr, new THREE.BufferAttribute(array, attr === 'uv' ? 2 : 3));
                            }
                        });

                        visualGeometries.push(geom);
                    }
                }
            });

            if (visualGeometries.length) {
                const newGeom = BufferGeometryUtils.mergeBufferGeometries(visualGeometries, false); // Merge geometries without transforming
                const newMaterial = new THREE.MeshStandardMaterial({
                    color: parseInt(hex),
                    shadowSide: 2,
                    map: arr[0].material.map, // Use the original texture map from the first mesh
                    emissive: arr[0].material.emissive,
                    emissiveMap: arr[0].material.emissiveMap,
                    emissiveIntensity: arr[0].material.emissiveIntensity,
                    roughness: arr[0].material.roughness,
                    metalness: arr[0].material.metalness
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

        // Adjust camera to center on the model
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // zoom out a little so that the model is fully visible
        camera.position.set(center.x, center.y, cameraZ);
        camera.lookAt(center);
        controls.target.set(center.x, center.y, center.z);
        controls.update();

        // Adjust the player's initial position based on the model's bounding box
        player.position.set(center.x, center.y + size.y / 2 + player.capsuleInfo.radius, center.z);
        controls.target.copy(player.position);
        controls.update();

        console.log("Environment added to scene");
    }, undefined, error => {
        console.error("An error occurred while loading the model:", error);
    });
}



function reset() {
playerVelocity.set( 0, 0, 0 );
player.position.set( 0, 1, 0);
camera.position.sub( controls.target );
controls.target.copy( player.position );
camera.position.add( player.position );
controls.update();
}

function updatePlayer( delta ) {
if ( playerIsOnGround ) {
playerVelocity.y = delta * params.gravity;
} else {
playerVelocity.y += delta * params.gravity;
}



player.position.addScaledVector( playerVelocity, delta );

const angle = controls.getAzimuthalAngle();
if ( fwdPressed ) {
	tempVector.set( 0, 0, - 1 ).applyAxisAngle( upVector, angle );
	player.position.addScaledVector( tempVector, params.playerSpeed * delta );
}
if ( bkdPressed ) {
	tempVector.set( 0, 0, 1 ).applyAxisAngle( upVector, angle );
	player.position.addScaledVector( tempVector, params.playerSpeed * delta );
}
if ( lftPressed ) {
	tempVector.set( - 1, 0, 0 ).applyAxisAngle( upVector, angle );
	player.position.addScaledVector( tempVector, params.playerSpeed * delta );
}
if ( rgtPressed ) {
	tempVector.set( 1, 0, 0 ).applyAxisAngle( upVector, angle );
	player.position.addScaledVector( tempVector, params.playerSpeed * delta );
}

player.updateMatrixWorld();

const capsuleInfo = player.capsuleInfo;
tempBox.makeEmpty();
tempMat.copy( collider.matrixWorld ).invert();
tempSegment.copy( capsuleInfo.segment );

tempSegment.start.applyMatrix4( player.matrixWorld ).applyMatrix4( tempMat );
tempSegment.end.applyMatrix4( player.matrixWorld ).applyMatrix4( tempMat );

tempBox.expandByPoint( tempSegment.start );
tempBox.expandByPoint( tempSegment.end );

tempBox.min.addScalar( - capsuleInfo.radius );
tempBox.max.addScalar( capsuleInfo.radius );

collider.geometry.boundsTree.shapecast( {
	intersectsBounds: box => box.intersectsBox( tempBox ),
	intersectsTriangle: tri => {
		const triPoint = tempVector;
		const capsulePoint = tempVector2;
		const distance = tri.closestPointToSegment( tempSegment, triPoint, capsulePoint );
		if ( distance < capsuleInfo.radius ) {
			const depth = capsuleInfo.radius - distance;
			const direction = capsulePoint.sub( triPoint ).normalize();
			tempSegment.start.addScaledVector( direction, depth );
			tempSegment.end.addScaledVector( direction, depth );
		}
	}
} );

const newPosition = tempVector;
newPosition.copy( tempSegment.start ).applyMatrix4( collider.matrixWorld );

const deltaVector = tempVector2;
deltaVector.subVectors( newPosition, player.position );

playerIsOnGround = deltaVector.y > Math.abs( delta * playerVelocity.y * 0.25 );

const offset = Math.max( 0.0, deltaVector.length() - 1e-5 );
deltaVector.normalize().multiplyScalar( offset );

player.position.add( deltaVector );

if ( ! playerIsOnGround ) {
	deltaVector.normalize();
	playerVelocity.addScaledVector( deltaVector, - deltaVector.dot( playerVelocity ) );
} else {
	playerVelocity.set( 0, 0, 0 );
}

camera.position.sub( controls.target );
controls.target.copy( player.position );
camera.position.add( player.position );

if ( player.position.y < - 25 ) {
	reset();
}

}

function render() {
stats.update();
requestAnimationFrame( render );


const delta = Math.min( clock.getDelta(), 0.1 );
if ( params.firstPerson ) {
	controls.maxPolarAngle = Math.PI;
	controls.minDistance = 1e-4;
	controls.maxDistance = 1e-4;
} else {
	controls.maxPolarAngle = Math.PI / 2;
	controls.minDistance = 1;
	controls.maxDistance = 20;
}

if ( collider ) {
	collider.visible = params.displayCollider;
	visualizer.visible = params.displayBVH;
	const physicsSteps = params.physicsSteps;
	for ( let i = 0; i < physicsSteps; i ++ ) {
		updatePlayer( delta / physicsSteps );
	}
}

controls.update();
renderer.render( scene, camera );

}
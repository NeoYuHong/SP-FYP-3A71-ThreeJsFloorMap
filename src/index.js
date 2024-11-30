import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import * as THREE from 'three';
import floor1 from './floor1.glb';
import * as dat from 'dat.gui';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.querySelector("#floormap").appendChild(renderer.domElement);


const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);

const light2 = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(light2);

const controls = new MapControls(camera, renderer.domElement);

// var controls = new OrbitControls(camera, renderer.domElement);
// controls.minDistance = 2;
// controls.maxDistance = 5;

controls.maxPolarAngle = (Math.PI / 2) * 0.75;
controls.minPolarAngle = (Math.PI / 2) * 0.4;

controls.target.set(10, 0, 4);
controls.maxDistance = 25;
controls.minDistance = 5.5;
controls.zoomSpeed = 1.6;

camera.position.set(13, 5, 10);
camera.rotation.set(-1.1, 0, 0);

controls.update();


const baseBorderSize = 25;
const minPan = new THREE.Vector3(-baseBorderSize, 0, -baseBorderSize);
const maxPan = new THREE.Vector3(baseBorderSize, 0, baseBorderSize);
var _v = new THREE.Vector3();

controls.addEventListener("change", function () {
    _v.copy(controls.target);
    controls.target.clamp(minPan, maxPan);
    _v.sub(controls.target);
    camera.position.sub(_v);
})

let grid = new THREE.GridHelper(baseBorderSize * 2, 100, "white", "white");
grid.position.y = 0.01;
scene.add(grid);

// Load the model
const loader = new GLTFLoader();
var floorScene = null;
loader.load(floor1, function (gltf) {
    scene.add(gltf.scene);
    console.log(gltf.scene)
    floorScene = gltf.scene;
    console.log("added")
}, undefined, function (error) {
    console.error(error);
});

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2(1, 1);
var intersects = [];

var prevObj = null;
var prevColor = null;

var data = {
    hovering: "none"
}


var gui = new dat.GUI();

var box = gui.addFolder('Data');

var controller = box.add(data, 'hovering', 0, 3).name('Hovering over:').listen();

// Make the controller read-only
controller.domElement.querySelector('input').disabled = true;

box.open();

document.onmousemove = function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
}

function onHover(item) {

    if (!item)
        return;

    raycaster.setFromCamera(mouse, camera);
    intersects = raycaster.intersectObject(item);

    if (intersects.length !== 0) {

        data.hovering = intersects[0].object.name;

        if (prevObj && prevColor && intersects[0].object != prevObj) {

            prevObj.material.color.set(prevColor);


            prevColor = null;
            prevObj = null;
        }

        let obj = intersects[0].object;

        if (!prevColor)
            prevColor = new THREE.Color(obj.material.color);

        if (!prevObj)
            prevObj = obj;

        let newMat = obj.material.clone()
        newMat.color.set(0xffff00);
        obj.material = newMat;

    } else {

        if (prevObj && prevColor)
            prevObj.material.color.set(prevColor.getHex());

        data.hovering = "none";

        prevObj = null;
        prevColor = null;

    }
}

function animate(frame) {
    requestAnimationFrame(animate);
    onHover(floorScene)
    renderer.render(scene, camera);
}

animate();
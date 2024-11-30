import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import * as THREE from 'three';
import floor1 from './floor1.glb';
import * as dat from 'dat.gui';
import storeData from './data.json'
import Stats from 'three/examples/jsm/libs/stats.module.js';

var stats = new Stats();
const popup = document.getElementById("popup");
document.body.appendChild(stats.dom);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

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





// Create gui for debug
var gui = new dat.GUI();

// Data folder
var data = {
    hovering: "none",
    storeName: 'nil',
    storeDesc: 'nil',
    clientX: 0,
    clientY: 0
}
var guiData = gui.addFolder('Data');

const hoveringDataGUI = guiData.add(data, 'hovering', 0, 3).name('Hovering over:').listen();
const storeNameGUI = guiData.add(data, 'storeName').name('Store name:').listen();
const storeDescGUI = guiData.add(data, 'storeDesc').name('Store desc:').listen();

hoveringDataGUI.domElement.querySelector('input').disabled = true;
storeNameGUI.domElement.querySelector('input').disabled = true;
storeDescGUI.domElement.querySelector('input').disabled = true;

guiData.open();



// Settings folder
var params = {
    is2D: false,
    showGrid: true,
    borderSize: baseBorderSize
};
var guiSettings = gui.addFolder('Settings');
guiSettings.add(params, "is2D").name("2D").onChange(function (value) {
    if (value) {
        controls.maxPolarAngle = (Math.PI / 2) * 0;
        controls.minPolarAngle = (Math.PI / 2) * 0;
        controls.maxDistance = 50;
        controls.minDistance = 5.5;
        controls.update();
    } else {
        controls.maxPolarAngle = (Math.PI / 2) * 0.75;
        controls.minPolarAngle = (Math.PI / 2) * 0.4;
        controls.maxDistance = 25;
        controls.minDistance = 5.5;
        controls.update();
    }
})
guiSettings.add(params, "showGrid").name("Show Grid").onChange(function (value) {
    grid.visible = value;
})
guiSettings.add(params, "borderSize", 20, 100).name("Border Size").onChange(function (value) {
    minPan.set(-value, 0, -value);
    maxPan.set(value, 0, value);
    _v.copy(controls.target);
    controls.target.clamp(minPan, maxPan);
    _v.sub(controls.target);
    camera.position.sub(_v);

    // properly scale grid to match size
    grid.position.set(0, 0, 0);
    grid.scale.set(value / baseBorderSize, 1, value / baseBorderSize);


})
guiSettings.open();

gui.open();

document.onmousemove = function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
}

document.addEventListener("mousemove", (event) => {
    data.clientX = event.clientX
    data.clientY = event.clientY
})

function onHover(item) {

    if (!item)
        return;

    raycaster.setFromCamera(mouse, camera);
    intersects = raycaster.intersectObject(item);



    if (intersects.length !== 0) {

        if (prevObj && prevColor && intersects[0].object != prevObj) {
            prevObj.material.color.set(prevColor);
            prevColor = null;
            prevObj = null;
        }

        let obj = intersects.find((obj) => obj.object.userData.parent)?.object

        if (!obj) {
            if (intersects[0].object.userData.id)

                data.hovering = intersects[0].object.userData.id;
            else
                data.hovering = intersects[0].object.name;
            data.storeName = 'nil'
            popup.style.display = 'none'
            return
        }

        data.hovering = obj.userData.name;

        let test = storeData.find(({ unit_number }) => unit_number == obj.userData.name)
        data.storeName = test?.stores[0].store_name || 'nil'
        data.storeDesc = test?.stores[0].store_description || 'nil'
        // Set popup content
        popup.innerText = `Unit: ${obj.userData.name}\nStore name: ${test?.stores[0].store_name || 'nil'}\nStore desc: ${test?.stores[0].store_description || 'nil'}`;

        // Set popup position and show it
        popup.style.display = 'block'
        popup.style.left = `${data.clientX + 10}px`;
        popup.style.top = `${data.clientY + 10}px`;
        popup.style.display = "block";

        // let obj = intersects[0].object;

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

        popup.style.display = 'none'

        data.hovering = "none";
        data.storeName = 'nil'
        data.storeDesc = 'nil'

        prevObj = null;
        prevColor = null;

    }
}

function onResize() {
    // Update the renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Update the camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

// Attach the resize event listener
window.addEventListener("resize", onResize);

// Initial setup
onResize();


function animate(frame) {
    stats.begin(); // Begin stats measurement
    stats.end(); // End stats measurement
    requestAnimationFrame(animate);
    onHover(floorScene)
    renderer.render(scene, camera);
}

animate();
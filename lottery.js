import * as THREE from 'https://esm.sh/three@0.180.0';
import { OrbitControls } from 'https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'https://esm.sh/three@0.180.0/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://esm.sh/three@0.180.0/examples/jsm/geometries/TextGeometry.js';

const wheelMount = document.getElementById('wheelCanvas');
const spinBtn = document.getElementById('spinBtn');
const resultDisplay = document.getElementById('resultDisplay');
const setSizeInput = document.getElementById('setSize');
const winnerOverlay = document.getElementById('winnerOverlay');
const winnerNumber = document.getElementById('winnerNumber');
const closeWinnerButton = document.getElementById('closeWinnerButton');

const colors = ["#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ec4899"];
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 8.8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
wheelMount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = false;
controls.enablePan = false;
controls.minDistance = 5.5;
controls.maxDistance = 16;
controls.minPolarAngle = 0.02;
controls.maxPolarAngle = Math.PI - 0.02;
controls.update();
controls.addEventListener('change', () => renderer.render(scene, camera));

scene.add(new THREE.HemisphereLight(0xffffff, 0x263244, 1.8));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(-3, 5, 6);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x9bdcff, 1.2);
fillLight.position.set(4, 1, -3);
scene.add(fillLight);

const wheelGroup = new THREE.Group();
scene.add(wheelGroup);
const pointerShape = new THREE.Shape();
pointerShape.moveTo(-0.2, 2.9);
pointerShape.lineTo(0.2, 2.9);
pointerShape.lineTo(0, 2.34);
pointerShape.closePath();
const pointer = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pointerShape, { depth: 0.16, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.025, bevelThickness: 0.025 }),
    [
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x5b0c22, metalness: 0.24, roughness: 0.3, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color: 0x9f1239, metalness: 0.45, roughness: 0.28, side: THREE.DoubleSide })
    ]
);
pointer.position.z = 0.28;
scene.add(pointer);
let totalSlices = Number(setSizeInput.value);
let prizes = [];
let arcSize = 0;
let currentAngle = 0;
let isSpinning = false;
let labelFont = null;

new FontLoader().load(
    'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/fonts/helvetiker_bold.typeface.json',
    font => {
        labelFont = font;
        if (prizes.length) buildWheel();
    },
    undefined,
    () => {
        resultDisplay.textContent = 'Unable to load the 3D number font.';
    }
);

function resizeRenderer() {
    const width = wheelMount.clientWidth;
    const height = wheelMount.clientHeight;
    if (!width || !height) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
}

new ResizeObserver(resizeRenderer).observe(wheelMount);

function clearWheel() {
    for (const child of [...wheelGroup.children]) {
        wheelGroup.remove(child);
        child.traverse(object => {
            object.geometry?.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                material?.map?.dispose();
                material?.dispose();
            }
        });
    }
}

function buildWheel() {
    clearWheel();
    const radius = 3.35;
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(radius + 0.1, radius + 0.1, 0.42, 96),
        new THREE.MeshStandardMaterial({ color: 0x1b2938, metalness: 0.78, roughness: 0.28 })
    );
    base.rotation.x = Math.PI / 2;
    base.position.z = -0.22;
    base.castShadow = true;
    base.receiveShadow = true;
    wheelGroup.add(base);

    const sliceWidth = Math.PI * 2 / totalSlices;
    for (let index = 0; index < totalSlices; index++) {
        const start = index * sliceWidth + 0.006;
        const end = (index + 1) * sliceWidth - 0.006;
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(radius * Math.cos(start), radius * Math.sin(start));
        shape.absarc(0, 0, radius, start, end, false);
        shape.lineTo(0, 0);
        shape.closePath();

        const color = new THREE.Color(colors[index % colors.length]);
        const sideColor = color.clone().multiplyScalar(0.48);
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.2,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.012,
            bevelThickness: 0.012,
            curveSegments: 4
        });
        const slice = new THREE.Mesh(geometry, [
            new THREE.MeshStandardMaterial({ color, metalness: 0.08, roughness: 0.48, side: THREE.DoubleSide }),
            new THREE.MeshStandardMaterial({ color: sideColor, metalness: 0.32, roughness: 0.36, side: THREE.DoubleSide })
        ]);
        slice.castShadow = true;
        slice.receiveShadow = true;
        wheelGroup.add(slice);

        const middle = (index + 0.5) * sliceWidth;
        if (labelFont) {
            const labelSize = totalSlices > 35 ? 0.2 : totalSlices > 18 ? 0.28 : 0.4;
            const labelGeometry = new TextGeometry(prizes[index].name, {
                font: labelFont,
                size: labelSize,
                depth: 0.05,
                curveSegments: 4,
                bevelEnabled: true,
                bevelThickness: 0.015,
                bevelSize: 0.008,
                bevelSegments: 2
            });
            labelGeometry.computeBoundingBox();
            const labelBounds = labelGeometry.boundingBox;
            labelGeometry.translate(
                -(labelBounds.max.x - labelBounds.min.x) / 2,
                -(labelBounds.max.y - labelBounds.min.y) / 2,
                0
            );
            const label = new THREE.Mesh(labelGeometry, [
                new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.32, roughness: 0.24 }),
                new THREE.MeshStandardMaterial({ color: 0x25334a, metalness: 0.55, roughness: 0.3 })
            ]);
            label.position.set(Math.cos(middle) * radius * 0.77, Math.sin(middle) * radius * 0.77, 0.215);
            label.castShadow = true;
            label.receiveShadow = true;
            wheelGroup.add(label);
        }
    }

    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 0.015, 0.055, 10, 128),
        new THREE.MeshStandardMaterial({ color: 0xf6c86d, metalness: 0.86, roughness: 0.22 })
    );
    rim.position.z = 0.2;
    wheelGroup.add(rim);

    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.18, 48),
        new THREE.MeshStandardMaterial({ color: 0xf4c66a, metalness: 0.82, roughness: 0.2 })
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.24;
    wheelGroup.add(hub);

    const hubRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.27, 0.025, 8, 48),
        new THREE.MeshStandardMaterial({ color: 0xffe4a3, metalness: 0.82, roughness: 0.18 })
    );
    hubRing.position.z = 0.34;
    wheelGroup.add(hubRing);

    wheelGroup.rotation.z = currentAngle;
    renderer.render(scene, camera);
}

function updateWheel() {
    const numberCount = Number(setSizeInput.value);
    if (!Number.isInteger(numberCount) || numberCount < 1 || numberCount > 50) {
        resultDisplay.textContent = "Enter a whole number from 1 to 50.";
        return false;
    }

    totalSlices = numberCount;
    arcSize = (2 * Math.PI) / totalSlices;
    prizes = Array.from({ length: totalSlices }, (_, index) => ({
        name: String(index + 1),
        color: colors[index % colors.length]
    }));
    buildWheel();
    resultDisplay.textContent = `Wheel numbers: 1-${totalSlices}`;
    return true;
}

function spinWheel() {
    if (isSpinning || !updateWheel()) return;

    isSpinning = true;
    spinBtn.disabled = true;
    setSizeInput.disabled = true;
    resultDisplay.textContent = "Spinning...";

    const extraRounds = Math.floor(Math.random() * 5) + 12;
    const randomExtraRad = Math.random() * (2 * Math.PI);
    const startAngle = currentAngle;
    const endAngle = startAngle + extraRounds * 2 * Math.PI + randomExtraRad;
    const startTime = performance.now();
    const rampDuration = 5000;
    const cruiseDuration = 5000;
    const duration = rampDuration * 2 + cruiseDuration;
    const slowSpeed = 0.12;
    const totalDistance = rampDuration * (1 + slowSpeed) + cruiseDuration;

    function distanceAt(elapsed) {
        const rampProgress = Math.min(elapsed / rampDuration, 1);
        const rampCurve = rampProgress ** 3 - 0.5 * rampProgress ** 4;
        const rampDistance = rampDuration * (slowSpeed * rampProgress + (1 - slowSpeed) * rampCurve);

        if (elapsed <= rampDuration) return rampDistance;
        if (elapsed <= rampDuration + cruiseDuration) {
            return rampDuration * (1 + slowSpeed) / 2 + elapsed - rampDuration;
        }

        const decelProgress = Math.min((elapsed - rampDuration - cruiseDuration) / rampDuration, 1);
        const decelCurve = decelProgress - decelProgress ** 3 + 0.5 * decelProgress ** 4;
        return rampDuration * (1 + slowSpeed) / 2 + cruiseDuration
            + rampDuration * (slowSpeed * decelProgress + (1 - slowSpeed) * decelCurve);
    }

    function animateSpin(currentTime) {
        const elapsed = Math.min(currentTime - startTime, duration);
        const progress = elapsed / duration;
        const distanceProgress = distanceAt(elapsed) / totalDistance;
        currentAngle = startAngle + (endAngle - startAngle) * distanceProgress;
        wheelGroup.rotation.z = currentAngle;
        renderer.render(scene, camera);

        if (progress < 1) {
            requestAnimationFrame(animateSpin);
        } else {
            determineWinner();
            isSpinning = false;
            spinBtn.disabled = false;
            setSizeInput.disabled = false;
        }
    }

    requestAnimationFrame(animateSpin);
}

function determineWinner() {
    const normalizedAngle = currentAngle % (2 * Math.PI);
    const pointerOffset = (Math.PI / 2 - normalizedAngle) % (2 * Math.PI);
    const positiveOffset = (pointerOffset + 2 * Math.PI) % (2 * Math.PI);
    const winningIndex = Math.floor(positiveOffset / arcSize) % totalSlices;
    winnerNumber.textContent = prizes[winningIndex].name;
    resultDisplay.textContent = `Winner: ${winnerNumber.textContent}`;
    winnerOverlay.hidden = false;
    closeWinnerButton.focus();
}

updateWheel();

setSizeInput.addEventListener('input', updateWheel);
spinBtn.addEventListener('click', spinWheel);
closeWinnerButton.addEventListener('click', () => {
    winnerOverlay.hidden = true;
    spinBtn.focus();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !winnerOverlay.hidden) {
        winnerOverlay.hidden = true;
        spinBtn.focus();
    }
});

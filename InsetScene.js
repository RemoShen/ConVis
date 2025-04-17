import * as THREE from "three";
import { dendrogram } from "./neuron_dendrogram.js";
import { sharedState } from "./shared_state.js";

export function createInsetScene() {
  // ==================== INITIALIZE ====================
  // Bottom Left Window Size
  const WIDTH = 400;
  const HEIGHT = 400;
  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  // Renderer
  const renderer = new THREE.WebGLRenderer();
  document.body.appendChild(renderer.domElement);
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.left = "20px";
  renderer.domElement.style.bottom = "20px";
  renderer.domElement.classList.add("inset-canvas");
  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambientLight);
  // Materials & Geometry
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xe6e6e6 });
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
  const sphereGeometry = new THREE.SphereGeometry(0.8, 16, 16);

  // ==================== RENDER CLUSTER TREE ====================
  // Tree Bounding Box Calculation
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  function findBounds(node) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
    if (node.children) node.children.forEach(findBounds);
  }
  findBounds(dendrogram);

  const margin = 1;
  minX -= margin;
  maxX += margin;
  minY -= margin;
  maxY += margin;

  // Y-Axis Stretch, Visually stretch the tree to appear taller
  const treeWidth = maxX - minX;
  const treeHeight = maxY - minY;
  const factor = (treeWidth / treeHeight) * 0.75;

  function stretchY(node, factor) {
    node.y *= factor;
    if (node.children) node.children.forEach((child) => stretchY(child, factor));
  }
  stretchY(dendrogram, factor);

  // CAMERA
  const centerX = (minX + maxX) / 2;
  const centerY = (factor * (minY + maxY)) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const aspect = WIDTH / HEIGHT;
  const viewSize = Math.max(width, height / aspect);

  const halfW = (viewSize * aspect) / 2;
  const halfH = viewSize / 2;
  const camera = new THREE.OrthographicCamera(-halfW + centerX, halfW + centerX, halfH + centerY, -halfH + centerY, 1, 1000);
  camera.position.z = 10;

  // === Raycaster & Tooltip ===
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const tooltip = document.createElement("div");
  tooltip.style.borderRadius = "8px";
  tooltip.style.position = "fixed";
  tooltip.style.bottom = "391px";
  tooltip.style.left = "22px";
  tooltip.style.color = "#fff";
  tooltip.style.fontFamily = "sans-serif";
  tooltip.style.background = "rgba(0,0,0,0.25)";
  tooltip.style.padding = "4px 8px";
  tooltip.style.display = "none";
  document.body.appendChild(tooltip);

  // === Tree Rendering ===
  const nodeMeshes = [];

  function renderNode(node) {
    const mesh = new THREE.Mesh(sphereGeometry, nodeMaterial.clone());

    mesh.position.set(node.x, node.y, 0);
    mesh.userData = node;
    nodeMeshes.push(mesh);
    scene.add(mesh);

    if (node.children) {
      // Vertical Lines
      node.children.forEach((child) => {
        const pointsV = [new THREE.Vector3(child.x, child.y, 0), new THREE.Vector3(child.x, node.y, 0)];
        const geoV = new THREE.BufferGeometry().setFromPoints(pointsV);
        scene.add(new THREE.Line(geoV, lineMaterial));

        renderNode(child);
      });
      // Horizontal Lines
      if (node.children.length >= 2) {
        const xs = node.children.map((c) => c.x).sort((a, b) => a - b);
        const pointsH = [new THREE.Vector3(xs[0], node.y, 0), new THREE.Vector3(xs[xs.length - 1], node.y, 0)];
        const geoH = new THREE.BufferGeometry().setFromPoints(pointsH);
        scene.add(new THREE.Line(geoH, lineMaterial));
      }
    }
  }
  renderNode(dendrogram);

  // ==================== RENDER LOOP & INTERACTION ====================

  // === Animation ===
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // === Resize Window ===
  window.addEventListener("resize", () => {
    renderer.setSize(WIDTH, HEIGHT); // fixed size, stays at bottom-left
  });

  // === Zoom ===
  renderer.domElement.addEventListener("wheel", (event) => {
    const zoomSpeed = 1.1;
    const zoomIn = event.deltaY < 0;
    const scale = zoomIn ? 1 / zoomSpeed : zoomSpeed;

    camera.left = centerX + (camera.left - centerX) * scale;
    camera.right = centerX + (camera.right - centerX) * scale;
    camera.top = centerY + (camera.top - centerY) * scale;
    camera.bottom = centerY + (camera.bottom - centerY) * scale;

    camera.updateProjectionMatrix();
  });

  // === Drag ===
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  renderer.domElement.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  renderer.domElement.addEventListener("mouseup", () => {
    isDragging = false;
  });
  renderer.domElement.addEventListener("mouseleave", () => {
    isDragging = false;
  });

  let lastHoveredMesh = null;
  renderer.domElement.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const moveFactor = 4; // Make zooming quick or slow
      const dx = ((moveFactor * (e.clientX - lastX)) / window.innerWidth) * (camera.right - camera.left);
      const dy = ((moveFactor * (e.clientY - lastY)) / window.innerHeight) * (camera.top - camera.bottom);

      camera.left -= dx;
      camera.right -= dx;
      camera.top += dy;
      camera.bottom += dy;

      camera.updateProjectionMatrix();
      lastX = e.clientX;
      lastY = e.clientY;
    }

    // Hover Detection
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeMeshes);

    // Set hovered node to red
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const node = mesh.userData;
      tooltip.textContent = `ID: ${node.id}, Name: ${node.name}, x: ${node.x.toFixed(2)}, y: ${Math.round(node.y / factor)}`;
      tooltip.style.display = "block";
      mesh.material.color.set(0xff0000);
      if (lastHoveredMesh && lastHoveredMesh !== mesh) {
        lastHoveredMesh.material.color.set(0x808080);
      }
      lastHoveredMesh = mesh;
      sharedState.hoveredSubtree = cloneSubtree(node);
    } else {
      tooltip.style.display = "none";
      if (lastHoveredMesh) {
        lastHoveredMesh.material.color.set(0x808080);
        lastHoveredMesh = null;
      }
    }
  });

  // Send neurons of hovered node to shared state
  function cloneSubtree(node) {
    const result = [];
    function traverse(n) {
      if ((!n.children || n.children.length === 0) && n.name) {
        result.push(n.name);
      }
      if (n.children) {
        n.children.forEach(traverse);
      }
    }
    traverse(node);
    const swcPaths = result.map((name) => `/neurons/${name}.swc`);
    return swcPaths;
  }
}

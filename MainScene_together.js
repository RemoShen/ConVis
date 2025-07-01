// 把这个文件改成 MainScene.js
// 就可以把所有neuron全都load完成后再渲染

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { levels } from "./neuron_levels.js"; // 右下角的levels slide bar
import { neuronMeta } from "./neuron_meta.js"; // 右上角的各种neuron信息
import { sharedState } from "./shared_state.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function createMainScene() {
  // ==================== INITIALIZE ====================
  // SCNENE
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  // CAMERA
  // const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000000
  );

  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);
  // RENDERER
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);
  // LIGHT
  const ambientLight = new THREE.AmbientLight(0xffffff, 4);
  scene.add(ambientLight);
  // CONTROL
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 1.2;
  controls.autoRotate = false;
  controls.screenSpacePanning = true;
  controls.keyPanSpeed = 50;
  // COLOR
  const colorSchemes = [
    {
      line: new THREE.MeshStandardMaterial({ color: 0x1f77b4 }), // blue
      point: new THREE.MeshStandardMaterial({ color: 0x1f77b4 }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0xff7f0e }), // orange
      point: new THREE.MeshStandardMaterial({ color: 0xff7f0e }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0x2ca02c }), // green
      point: new THREE.MeshStandardMaterial({ color: 0x2ca02c }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0xd62728 }), // red
      point: new THREE.MeshStandardMaterial({ color: 0xd62728 }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0x9467bd }), // purple
      point: new THREE.MeshStandardMaterial({ color: 0x9467bd }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0x8c564b }), // brown
      point: new THREE.MeshStandardMaterial({ color: 0x8c564b }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0xe377c2 }), // pink
      point: new THREE.MeshStandardMaterial({ color: 0xe377c2 }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0x7f7f7f }), // grey
      point: new THREE.MeshStandardMaterial({ color: 0x7f7f7f }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0xbcbd22 }), // yellow-green
      point: new THREE.MeshStandardMaterial({ color: 0xbcbd22 }),
    },
    {
      line: new THREE.MeshStandardMaterial({ color: 0x17becf }), // cyan
      point: new THREE.MeshStandardMaterial({ color: 0x17becf }),
    },
  ];
  const grayLineMaterial = new THREE.MeshStandardMaterial({ color: 0xbfbfbf }); // light gray
  const grayPointMaterial = new THREE.MeshStandardMaterial({ color: 0xbfbfbf });

  // ==================== LOAD SWC & CREATE NEURON ====================

  const allModelMap = new Map(); // neuron_id -> 3D model
  let zoomThresholds = [];
  let lastLevelName = null;
  let lastHoveredSubtree = null;

  // === 获取数据 ===
  async function fetchNeuronBatch(neuronIds) {
    const query = neuronIds.map(encodeURIComponent).join(",");
    const res = await fetch(`http://localhost:8000/neuron_batch?ids=${query}`);
    if (!res.ok) {
      console.warn("❌ Failed to load neuron batch");
      return {};
    }
    return await res.json(); // { id1: [...], id2: [...], ... }
  }

  // === 构建模型 ===
  function createChunkNeuronModel(batchData) {
    const chunkGroup = new THREE.Group();

    for (const [neuronId, rawArray] of Object.entries(batchData)) {
      const isZeroRow = (row) => row.every((val) => val === 0);
      const nodes = rawArray
        .filter((row) => !isZeroRow(row))
        .map((row) => ({
          id: row[0],
          type: row[1],
          x: row[2],
          y: row[3],
          z: row[4],
          radius: row[5],
          parentId: row[6],
        }));

      const colorScheme = colorSchemes[allModelMap.size % colorSchemes.length];
      const model = createNeuron(nodes, colorScheme);
      model.userData = { neuronId, filePath: neuronId };
      model.traverse((child) => {
        if (child.isMesh) {
          child.userData = { neuronId, filePath: neuronId };
        }
      });

      allModelMap.set(neuronId, model);
      chunkGroup.add(model);
    }

    return chunkGroup;
  }

  function createNeuron(nodes, materials) {
    const group = new THREE.Group();
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    nodes.forEach((node) => {
      if (node.parentId !== -1) {
        const parent = nodeMap.get(node.parentId);
        if (!parent) return;

        const start = new THREE.Vector3(node.x, node.y, node.z);
        const end = new THREE.Vector3(parent.x, parent.y, parent.z);

        const direction = end.clone().sub(start);
        const distance = start.distanceTo(end);
        const numPoints = 4;
        const points = [start];

        for (let i = 1; i < numPoints - 1; i++) {
          const t = i / (numPoints - 1);
          const basePoint = start.clone().lerp(end, t);
          const perpendicular = new THREE.Vector3(
            -direction.y,
            direction.x,
            direction.z
          ).normalize();
          const upVector = new THREE.Vector3(0, 1, 0);
          const sideOffset = perpendicular.multiplyScalar(
            distance * 0.15 * (Math.random() - 0.5)
          );
          const upOffset = upVector.multiplyScalar(
            distance * 0.15 * (Math.random() - 0.5)
          );
          basePoint.add(sideOffset).add(upOffset);
          points.push(basePoint);
        }

        points.push(end);
        const curve = new THREE.CatmullRomCurve3(
          points,
          false,
          "centripetal",
          0.5
        );
        const tubeGeometry = new THREE.TubeGeometry(
          curve,
          16,
          node.radius * 0.2,
          8,
          false
        );
        const tube = new THREE.Mesh(tubeGeometry, materials.line);
        group.add(tube);

        const sphereGeometry = new THREE.SphereGeometry(
          node.radius * 0.5,
          12,
          12
        );
        const sphere = new THREE.Mesh(sphereGeometry, materials.point);
        sphere.position.copy(start);
        group.add(sphere);
      }
    });

    return group;
  }
  function mergeNeuronGeometry(batchData, material) {
    const tubeGeometries = [];
    const sphereGeometries = [];

    for (const [neuronId, rawArray] of Object.entries(batchData)) {
      const isZeroRow = (row) => row.every((val) => val === 0);
      const nodes = rawArray
        .filter((row) => !isZeroRow(row))
        .map((row) => ({
          id: row[0],
          type: row[1],
          x: row[2],
          y: row[3],
          z: row[4],
          radius: row[5],
          parentId: row[6],
        }));

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      for (const node of nodes) {
        if (node.parentId === -1) continue;

        const parent = nodeMap.get(node.parentId);
        if (!parent) continue;

        const start = new THREE.Vector3(node.x, node.y, node.z);
        const end = new THREE.Vector3(parent.x, parent.y, parent.z);
        const direction = end.clone().sub(start);
        const distance = start.distanceTo(end);
        const numPoints = 4;
        const points = [start];

        for (let i = 1; i < numPoints - 1; i++) {
          const t = i / (numPoints - 1);
          const basePoint = start.clone().lerp(end, t);
          const perpendicular = new THREE.Vector3(
            -direction.y,
            direction.x,
            direction.z
          ).normalize();
          const upVector = new THREE.Vector3(0, 1, 0);
          const sideOffset = perpendicular.multiplyScalar(
            distance * 0.15 * (Math.random() - 0.5)
          );
          const upOffset = upVector.multiplyScalar(
            distance * 0.15 * (Math.random() - 0.5)
          );
          basePoint.add(sideOffset).add(upOffset);
          points.push(basePoint);
        }

        points.push(end);
        const curve = new THREE.CatmullRomCurve3(
          points,
          false,
          "centripetal",
          0.5
        );
        const tubeGeo = new THREE.TubeGeometry(
          curve,
          16,
          node.radius * 0.2,
          8,
          false
        );
        tubeGeometries.push(tubeGeo);

        const sphereGeo = new THREE.SphereGeometry(node.radius * 0.5, 12, 12);
        sphereGeo.translate(start.x, start.y, start.z);
        sphereGeometries.push(sphereGeo);
      }
    }

    const mergedTube = mergeGeometries(tubeGeometries, false);
    const mergedSphere = mergeGeometries(sphereGeometries, false);
    const finalGeometry = mergeGeometries([mergedTube, mergedSphere], false);
    return new THREE.Mesh(finalGeometry, material);
  }

  async function showOnlyLevel(levelName) {
    lastLevelName = levelName;

    // 清空 scene 中旧的 mesh（只保留灯光）
    for (const [neuronId, model] of allModelMap.entries()) {
      scene.remove(model);
    }
    allModelMap.clear();

    const levelList = levels[levelName];
    const hoverList = sharedState.hoveredSubtree;
    const visibleIds = Array.isArray(hoverList)
      ? levelList.filter((id) => hoverList.includes(id))
      : levelList;

    const MAX_NEURONS = 4000;
    const limitedIds = visibleIds.slice(0, MAX_NEURONS);

    document.getElementById("loading-indicator").style.display = "block";

    const batchData = await fetchNeuronBatch(limitedIds);
    const color = 0x1f77b4;
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = mergeNeuronGeometry(batchData, mat);
    scene.add(mesh);
    allModelMap.set("merged", mesh); // 保留引用

    centerCameraOnVisibleNeurons();
    document.getElementById("loading-indicator").style.display = "none";
  }

  // === 相机居中可见模型 ===
  let hasCenteredCamera = false;
  function centerCameraOnVisibleNeurons() {
    const totalBox = new THREE.Box3();
    let anyVisible = false;

    for (const model of allModelMap.values()) {
      if (model.visible) {
        const box = new THREE.Box3().setFromObject(model);
        totalBox.union(box);
        anyVisible = true;
      }
    }

    if (anyVisible) {
      const center = totalBox.getCenter(new THREE.Vector3());
      const size = totalBox.getSize(new THREE.Vector3()).length();
      camera.position.set(center.x, center.y, center.z + size * 1.2);

      controls.target.copy(center);
      controls.update();

      // 🟢 这里更新初始位置
      initialCameraPosition = camera.position.clone();
      initialControlTarget = controls.target.clone();

      console.log("📷 camera position", camera.position);
      console.log("🎯 controls.target", controls.target);
    }
  }

  // === 初始化 ===
  window.addEventListener("DOMContentLoaded", async () => {
    const defaultLevel = Object.keys(levels)[0];
    const sliderValue = "1";

    await showOnlyLevel(defaultLevel);

    // ✅ 添加 zoomThresholds 初始化逻辑
    const totalBox = new THREE.Box3();
    for (const model of allModelMap.values()) {
      if (model.visible) {
        const box = new THREE.Box3().setFromObject(model);
        totalBox.union(box);
      }
    }

    const center = totalBox.getCenter(new THREE.Vector3());
    const size = totalBox.getSize(new THREE.Vector3()).length();

    // 初始化 zoom thresholds
    const levelsCount = Object.keys(levels).length;
    zoomThresholds = Array.from(
      { length: levelsCount },
      (_, i) => size * Math.pow(0.7, i)
    );

    camera.position.set(center.x, center.y, center.z + size * 1.2);
    controls.target.copy(center);
    controls.update();

    initialCameraPosition = camera.position.clone();
    initialControlTarget = controls.target.clone();

    slider.value = sliderValue;
    label.textContent = sliderValue;
  });

  // ==================== RENDER LOOP & INTERACTION ====================

  // === RESET CLUSTER BUTTON ===
  // Show entire level instead of shared state intersection
  const toggleButton = document.getElementById("toggle-hover-filter");
  toggleButton.addEventListener("click", () => {
    sharedState.hoveredSubtree = null;
    showOnlyLevel(lastLevelName);
  });

  // === RESET VIEW BUTTON ===
  let initialCameraPosition = new THREE.Vector3(0, 0, 0);
  let initialControlTarget = new THREE.Vector3(0, 0, 0);
  const resetViewButton = document.getElementById("reset-view");
  resetViewButton.addEventListener("click", () => {
    controls.reset();
    camera.position.copy(initialCameraPosition);
    controls.target.copy(initialControlTarget);
    slider.value = "1";
    label.textContent = "1";
    sharedState.hoveredSubtree = null;
  });

  // === SLIDER ===
  const slider = document.getElementById("level-slider");
  const label = document.getElementById("level-value");
  const levelKeys = Object.keys(levels);
  slider.min = 1;
  slider.max = levelKeys.length;
  slider.value = 1;
  let zoomTarget = null;
  slider.addEventListener("input", () => {
    const levelIndex = parseInt(slider.value) - 1;
    const levelName = levelKeys[levelIndex];
    label.textContent = slider.value;
    showOnlyLevel(levelName);
    // // Set target zoom distance for camera (animation handled in animate loop) ⭕DO NOT DELETE
    // if (zoomThresholds.length > levelIndex) {
    //   const targetDistance = zoomThresholds[levelIndex];
    //   const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    //   zoomTarget = controls.target.clone().add(dir.multiplyScalar(targetDistance));
    // }
  });

  // === ZOOM ===
  let lastLevelIndex = -1;
  function updateLevelByZoom() {
    const distance = camera.position.distanceTo(controls.target);
    let levelIndex = 0;
    for (let i = 0; i < zoomThresholds.length; i++) {
      if (distance > zoomThresholds[i]) {
        levelIndex = i;
        break;
      } else {
        levelIndex = zoomThresholds.length - 1;
      }
    }
    if (levelIndex !== lastLevelIndex) {
      const levelName = levelKeys[levelIndex];
      showOnlyLevel(levelName);
      slider.value = (levelIndex + 1).toString();
      label.textContent = slider.value;
      lastLevelIndex = levelIndex;
    }
  }

  // === ANIMATION ===
  function animate() {
    requestAnimationFrame(animate);
    // Smooth zoom toward target position
    if (zoomTarget) {
      camera.position.lerp(zoomTarget, 0.1);
      if (camera.position.distanceTo(zoomTarget) < 1) {
        zoomTarget = null;
      }
    }
    // If hover state changed, re-render current level
    if (sharedState.hoveredSubtree !== lastHoveredSubtree && lastLevelName) {
      lastHoveredSubtree = sharedState.hoveredSubtree;
      showOnlyLevel(lastLevelName);
    }
    controls.update();
    updateLevelByZoom();
    renderer.render(scene, camera);
  }
  animate();

  // === WINDOW RESIZE ===
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // === CLICK ===
  // On click, show neuron metadata from neuron_meta.js in top-right panel
  const neuronMap = new Map(neuronMeta.map((n) => [n.id, n]));
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const infoPanel = document.getElementById("neuron-info");
  const infoText = document.getElementById("neuron-name");
  window.addEventListener("pointerdown", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const visibleMeshes = [];
    for (const model of allModelMap.values()) {
      if (model.visible) {
        model.traverse((child) => {
          if (child.isMesh) visibleMeshes.push(child);
        });
      }
    }

    const intersects = raycaster.intersectObjects(visibleMeshes, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;

      // ⬇ 关键：向上查找带 userData.filePath 的 Group
      let neuronModel = mesh;
      while (
        neuronModel &&
        (!neuronModel.userData || !neuronModel.userData.filePath)
      ) {
        neuronModel = neuronModel.parent;
      }

      if (neuronModel && neuronModel.userData.filePath) {
        const filename = neuronModel.userData.filePath.split("/").pop(); // 取出 A.swc
        const neuronId = filename.replace(".swc", ""); // 取出 A
        const info = neuronMap.get(neuronId);

        if (info) {
          infoText.innerHTML = `
            <strong>ID:</strong> ${info.id}<br>
            <strong>Flow:</strong> ${info.flow}<br>
            <strong>Super Class:</strong> ${info.super_class}<br>
            <strong>Class:</strong> ${info.class}<br>
            <strong>Sub Class:</strong> ${info.sub_class}<br>
            <strong>Cell Type:</strong> ${info.cell_type}<br>
            <strong>Hemibrain Type:</strong> ${info.hemibrain_type}<br>
            <strong>Hemilineage:</strong> ${info.hemilineage}<br>
            <strong>Side:</strong> ${info.side}<br>
            <strong>Nerve:</strong> ${info.nerve}
          `;
          infoPanel.style.display = "block";
        } else {
          infoText.textContent = `Neuron ${neuronId} not found.`;
          infoPanel.style.display = "block";
        }
      }
    } else {
      infoPanel.style.display = "none";
    }
  });

  // ===== HOVER =====
  // On hover, temporarily gray out other neurons
  let hoveredNeuron = null;
  let originalMaterials = new Map(); // key: model, value: { line, point }
  window.addEventListener("pointermove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const visibleMeshes = [];
    for (const model of allModelMap.values()) {
      if (model.visible) {
        model.traverse((child) => {
          if (child.isMesh) visibleMeshes.push(child);
        });
      }
    }
    const intersects = raycaster.intersectObjects(visibleMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const neuron = mesh.parent;
      if (hoveredNeuron !== neuron) {
        hoveredNeuron = neuron;

        for (const [model, mats] of originalMaterials.entries()) {
          model.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry.type === "TubeGeometry") {
                child.material = mats.line;
              } else if (child.geometry.type === "SphereGeometry") {
                child.material = mats.point;
              }
            }
          });
        }
        originalMaterials.clear();
        for (const [filePath, model] of allModelMap.entries()) {
          if (model.visible && model !== neuron) {
            const mats = { line: null, point: null };
            model.traverse((child) => {
              if (child.isMesh) {
                if (child.geometry.type === "TubeGeometry") {
                  mats.line = child.material;
                  child.material = grayLineMaterial;
                } else if (child.geometry.type === "SphereGeometry") {
                  mats.point = child.material;
                  child.material = grayPointMaterial;
                }
              }
            });

            originalMaterials.set(model, mats);
          }
        }
      }
    } else {
      if (hoveredNeuron !== null) {
        for (const [model, mats] of originalMaterials.entries()) {
          model.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry.type === "TubeGeometry") {
                child.material = mats.line;
              } else if (child.geometry.type === "SphereGeometry") {
                child.material = mats.point;
              }
            }
          });
        }
        hoveredNeuron = null;
        originalMaterials.clear();
      }
    }
  });
}

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { levels } from "./neuron_levels.js";
import { neuronMeta } from "./neuron_meta.js";
import { sharedState } from "./shared_state.js";
import { storeOriginalNodes, updateNeuronSimplification, resetNeuronSimplification, neuronSimplificationState } from "./neuron_simplification.js";

export function createMainScene() {
  const pageStartTime = performance.now();

  // ==================== INITIALIZE ====================
  // SCNENE
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  // CAMERA
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
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
  // 1. SWC to Neuron Nodes
  const loadSWCFile = async (file) => {
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line && !line.startsWith("#"));
    const nodes = lines.map((line) => {
      const values = line.split(" ");
      return {
        id: parseInt(values[0]),
        type: parseInt(values[1]),
        x: parseFloat(values[2]),
        y: parseFloat(values[3]),
        z: parseFloat(values[4]),
        radius: parseFloat(values[5]),
        parentId: parseInt(values[6]),
      };
    });
    return nodes;
  };

  // 2. Neuron Nodes to Neural Trees: Sphere + Line (each neuron is a group)
  const createSWCModel = (nodes, materials) => {
    const group = new THREE.Group();

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    nodes.forEach((node) => {
      if (node.parentId !== -1) {
        const parent = nodeMap.get(node.parentId);
        if (!parent) return;

        const start = new THREE.Vector3(node.x, node.y, node.z);
        const end = new THREE.Vector3(parent.x, parent.y, parent.z);

        // Centripetal Catmull-Rom spline with random offsets
        const direction = end.clone().sub(start);
        const distance = start.distanceTo(end);
        const numPoints = 4;
        const points = [start];

        for (let i = 1; i < numPoints - 1; i++) {
          const t = i / (numPoints - 1);
          const basePoint = start.clone().lerp(end, t);
          const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z).normalize();
          const upVector = new THREE.Vector3(0, 1, 0);
          const sideOffset = perpendicular.multiplyScalar(distance * 0.15 * (Math.random() - 0.5));
          const upOffset = upVector.multiplyScalar(distance * 0.15 * (Math.random() - 0.5));
          basePoint.add(sideOffset).add(upOffset);
          points.push(basePoint);
        }

        points.push(end);

        const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
        const tubeGeometry = new THREE.TubeGeometry(curve, 16, node.radius * 0.2, 8, false);
        const tube = new THREE.Mesh(tubeGeometry, materials.line);
        group.add(tube);

        const sphereGeometry = new THREE.SphereGeometry(node.radius * 0.5, 12, 12);
        const sphere = new THREE.Mesh(sphereGeometry, materials.point);
        sphere.position.copy(start);
        group.add(sphere);
      }
    });

    return group;
  };

  // 3. Load all SWCs once and show intersection with shared state by level
  // shared state = neurons selected from bottom-left cluster tree
  const allModelMap = new Map(); // key: file path, value: model
  let isPreloaded = false;
  let zoomThresholds = [];
  async function preloadAllModels() {
    if (isPreloaded) return; // Avoid duplicate loading

    const allFiles = Object.values(levels).flat();

    for (let i = 0; i < allFiles.length; i++) {
      const filePath = allFiles[i];
      if (allModelMap.has(filePath)) continue;

      try {
        const res = await fetch(filePath);
        const file = await res.blob();
        const nodes = await loadSWCFile(file);
        
        // 存储原始节点数据用于简化
        storeOriginalNodes(filePath, nodes);
        
        const colorScheme = colorSchemes[i % colorSchemes.length];
        const model = createSWCModel(nodes, colorScheme);
        model.visible = false;
        model.userData.filePath = filePath; // Store filename info for upper right click panel

        allModelMap.set(filePath, model);
        scene.add(model);
      } catch (err) {
        console.error("Error loading SWC model:", filePath, err);
      }
    }

    // Calculate bounding box of all SWCs
    // Initial view is centered on bounding box, not (0,0,0)
    const totalBox = new THREE.Box3();
    for (const model of allModelMap.values()) {
      const box = new THREE.Box3().setFromObject(model);
      totalBox.union(box);
    }
    const center = totalBox.getCenter(new THREE.Vector3());
    const size = totalBox.getSize(new THREE.Vector3()).length();
    camera.position.set(center.x, center.y, center.z + size * 1.2);
    controls.target.copy(center);
    controls.update();
    // These two are used by the RESET VIEW BUTTON below
    initialCameraPosition = camera.position.clone();
    initialControlTarget = controls.target.clone();

    // GENERATE ZOOM THRESHOLDS BASED ON NUMBER OF LEVELS
    const levelsCount = Object.keys(levels).length;
    zoomThresholds = Array.from({ length: levelsCount }, (_, i) => {
      return size * Math.pow(0.7, i); // Each level scales down to 70%, never negative
    });

    // WHAT'S SHOWN INITIALLY WHEN PAGE LOADED
    // This part is tricky because the HTML slider can only show smaller numbers at the left
    const maxLevelName = Object.keys(levels)[0].toString();
    const sliderValue = "1";
    showOnlyLevel(maxLevelName); // 'level1'
    slider.value = sliderValue; // '1'
    label.textContent = sliderValue; //'1'

    // SHOW LOADING TIME
    // Only measures SWC loading, not rendering
    const loadingTime = ((performance.now() - pageStartTime) / 1000).toFixed(2);
    document.getElementById("loading-time").textContent = `Loaded in ${loadingTime}s`;

    isPreloaded = true;
  }

  // Show intersection of selected level and shared state
  // Use neuron_levels.js to get file paths, then match shared state
  let lastHoveredSubtree = null;
  let lastLevelName = null;
  function showOnlyLevel(levelName) {
    lastLevelName = levelName;
    const levelList = levels[levelName];
    const hoverList = sharedState.hoveredSubtree;
    let visibleSet;
    if (Array.isArray(hoverList)) {
      visibleSet = new Set(levelList.filter((path) => hoverList.includes(path))); // show shared state neurons in this level
    } else {
      visibleSet = new Set(levelList); // show whole level
    }
    for (const [filePath, model] of allModelMap.entries()) {
      // 检查是否有简化模型正在显示
      const isSimplified = neuronSimplificationState.currentSimplificationLevel.has(filePath);
      
      if (visibleSet.has(filePath)) {
        if (!isSimplified) {
          model.visible = true;
        }
      } else {
        model.visible = false;
        // 如果有简化模型，也需要隐藏
        if (isSimplified) {
          const simplificationLevel = neuronSimplificationState.currentSimplificationLevel.get(filePath);
          const cacheKey = `${filePath}_${simplificationLevel}`;
          const simplifiedModel = neuronSimplificationState.simplifiedModels.get(cacheKey);
          if (simplifiedModel) {
            simplifiedModel.visible = false;
          }
        }
      }
    }
  }

  preloadAllModels(); // call loading

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
    
    // 重置所有神经元简化
    for (const filePath of allModelMap.keys()) {
      if (neuronSimplificationState.currentSimplificationLevel.has(filePath)) {
        resetNeuronSimplification(filePath, allModelMap, scene);
      }
    }
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
    // Set target zoom distance for camera (animation handled in animate loop)
    if (zoomThresholds.length > levelIndex) {
      const targetDistance = zoomThresholds[levelIndex];
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
      zoomTarget = controls.target.clone().add(dir.multiplyScalar(targetDistance));
    }
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
  const simplificationContainer = document.getElementById("simplification-container");
  const simplificationSlider = document.getElementById("neuron-simplification-slider");
  const simplificationValue = document.getElementById("simplification-value");
  const resetSimplificationButton = document.getElementById("reset-simplification");
  const applySimplificationButton = document.getElementById("apply-simplification");
  
  // 当前选中的神经元文件路径
  let selectedNeuronPath = null;
  
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
    
    // 也检查简化模型
    for (const model of neuronSimplificationState.simplifiedModels.values()) {
      if (model.visible) {
        model.traverse((child) => {
          if (child.isMesh) visibleMeshes.push(child);
        });
      }
    }

    const intersects = raycaster.intersectObjects(visibleMeshes, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;

      // 向上查找带 userData.filePath 的 Group
      let neuronModel = mesh;
      while (neuronModel && (!neuronModel.userData || !neuronModel.userData.filePath)) {
        neuronModel = neuronModel.parent;
      }

      if (neuronModel && neuronModel.userData.filePath) {
        const filePath = neuronModel.userData.filePath;
        const filename = filePath.split("/").pop(); // 取出 A.swc
        const neuronId = filename.replace(".swc", ""); // 取出 A
        const info = neuronMap.get(neuronId);
        
        // 更新当前选中的神经元
        selectedNeuronPath = filePath;
        
        // 更新简化滑块的值
        const currentSimplificationLevel = neuronSimplificationState.currentSimplificationLevel.get(filePath) || 100;
        simplificationSlider.value = currentSimplificationLevel;
        simplificationValue.textContent = currentSimplificationLevel;

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
          simplificationContainer.style.display = "block";
        } else {
          infoText.textContent = `Neuron ${neuronId} not found.`;
          infoPanel.style.display = "block";
          simplificationContainer.style.display = "block";
        }
      }
    } else {
      infoPanel.style.display = "none";
      selectedNeuronPath = null;
    }
  });

  // 简化滑块事件
  simplificationSlider.addEventListener("input", () => {
    const value = parseInt(simplificationSlider.value);
    simplificationValue.textContent = value;
  });
  
  // 应用简化按钮
  applySimplificationButton.addEventListener("click", () => {
    if (selectedNeuronPath) {
      const simplificationLevel = parseInt(simplificationSlider.value);
      updateNeuronSimplification(selectedNeuronPath, simplificationLevel, allModelMap, scene, colorSchemes);
    }
  });
  
  // 重置简化按钮
  resetSimplificationButton.addEventListener("click", () => {
    if (selectedNeuronPath) {
      resetNeuronSimplification(selectedNeuronPath, allModelMap, scene);
      simplificationSlider.value = 100;
      simplificationValue.textContent = 100;
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
    
    // 也检查简化模型
    for (const model of neuronSimplificationState.simplifiedModels.values()) {
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
        
        // 处理原始模型
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
        
        // 处理简化模型
        for (const [cacheKey, model] of neuronSimplificationState.simplifiedModels.entries()) {
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

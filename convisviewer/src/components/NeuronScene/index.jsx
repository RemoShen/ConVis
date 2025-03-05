import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Parse SWC data
const loadSWCFile = async (file) => {
  const text = await file.text();
  const lines = text
    .split("\n")
    .filter((line) => line && !line.startsWith("#"));
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
      additionalData: values[7] ? parseFloat(values[7]) : null,
    };
  });
  return nodes;
};

const NeuronRenderer = ({ swcData }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!swcData || swcData.length === 0) return;

    // Calculate neuron center point and boundaries
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    swcData.forEach((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      minZ = Math.min(minZ, node.z);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
      maxZ = Math.max(maxZ, node.z);
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Calculate model size
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Setup camera and renderer
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create materials for lines and points (green and blue)
    const createNeuronMaterials = (baseColor) => ({
      line: new THREE.MeshStandardMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.6,
        metalness: 0.1,
        roughness: 0.8,
      }),
      point: new THREE.MeshStandardMaterial({
        color: baseColor,
        transparent: false,
        metalness: 0.3,
        roughness: 0.2,
      }),
    });

    const greenMaterials = createNeuronMaterials(0x00ff00);
    const blueMaterials = createNeuronMaterials(0x0066ff);

    // Create neuron group
    const neuronGroup = new THREE.Group();

    // Create node mapping for quick lookup
    const nodeMap = new Map(swcData.map((node) => [node.id, node]));

    // Find root nodes (nodes with parentId -1)
    const rootNodes = swcData.filter((node) => node.parentId === -1);

    // Assign materials to each root node
    const neuronMaterials = new Map();
    rootNodes.forEach((root, index) => {
      neuronMaterials.set(
        root.id,
        index % 2 === 0 ? greenMaterials : blueMaterials
      );
    });

    // Get the root neuron for a node (by tracing to root)
    const getNeuronRoot = (node, visited = new Set()) => {
      if (visited.has(node.id)) return null;
      visited.add(node.id);
      if (node.parentId === -1) return node;
      const parent = nodeMap.get(node.parentId);
      return parent ? getNeuronRoot(parent, visited) : node;
    };

    // Build neuron tree structure
    const buildNeuronTree = (nodes) => {
      nodes.forEach((node) => {
        if (node.parentId !== -1) {
          const parent = nodeMap.get(node.parentId);
          if (parent) {
            const start = new THREE.Vector3(
              node.x - centerX,
              node.y - centerY,
              node.z - centerZ
            );
            const end = new THREE.Vector3(
              parent.x - centerX,
              parent.y - centerY,
              parent.z - centerZ
            );

            // Get the root neuron for this node
            const rootNode = getNeuronRoot(node);
            const materials = rootNode
              ? neuronMaterials.get(rootNode.id)
              : greenMaterials;

            // Calculate control points for natural curves
            const direction = end.clone().sub(start);
            const distance = start.distanceTo(end);

            // Create multiple control points
            const numPoints = 4; // Number of control points
            const points = [];
            points.push(start);

            // Add intermediate control points
            for (let i = 1; i < numPoints - 1; i++) {
              const t = i / (numPoints - 1);
              const basePoint = start.clone().lerp(end, t);

              // Add random offsets in vertical and horizontal directions
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

            // Create CatmullRom curve
            const curve = new THREE.CatmullRomCurve3(
              points,
              false,
              "centripetal",
              0.5
            );

            // Create tube geometry
            const tubeGeometry = new THREE.TubeGeometry(
              curve,
              16, // curve segments
              node.radius * 0.2, // tube radius
              8, // tube segments
              false // closed
            );

            const tube = new THREE.Mesh(tubeGeometry, materials.line);
            neuronGroup.add(tube);

            // Add sphere at connection points
            const sphereGeometry = new THREE.SphereGeometry(
              node.radius * 0.3, // sphere size
              12, // width segments
              12 // height segments
            );
            const sphere = new THREE.Mesh(sphereGeometry, materials.point);
            sphere.position.copy(start);
            neuronGroup.add(sphere);
          }
        }
      });
    };

    buildNeuronTree(swcData);
    scene.add(neuronGroup);

    // Camera position and controls
    camera.position.set(0, 0, size * 2);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      // Smooth rotation
      neuronGroup.rotation.y += 0.0003;

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [swcData]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100vh" }} />;
};

const NeuronLoader = () => {
  const [swcData, setSwcData] = useState([]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const nodes = await loadSWCFile(file);
      setSwcData(nodes);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.2)",
          padding: "10px",
          borderRadius: "5px",
          backdropFilter: "blur(5px)",
        }}
      >
        <input
          type="file"
          accept=".swc"
          onChange={handleFileChange}
          style={{
            padding: "5px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "3px",
            color: "white",
            background: "transparent",
          }}
        />
      </div>
      <NeuronRenderer swcData={swcData} />
    </div>
  );
};

export default NeuronLoader;

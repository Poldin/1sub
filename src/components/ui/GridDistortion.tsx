import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface GridDistortionProps {
  grid?: number;
  mouse?: number;
  strength?: number;
  relaxation?: number;
  imageSrc: string;
  className?: string;
}

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
uniform vec2 mouse;
uniform float time;
uniform float strength;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  
  // Create grid lines
  vec2 grid = abs(fract(uv * 20.0) - 0.5) / fwidth(uv * 20.0);
  float line = min(grid.x, grid.y);
  
  // Mouse distortion effect - much stronger and more visible
  vec2 mouseDist = uv - mouse;
  float mouseEffect = 1.0 / (1.0 + length(mouseDist) * 3.0);
  vec2 distortion = mouseDist * mouseEffect * strength * 0.5;
  
  // Time-based animation
  vec2 timeOffset = vec2(sin(time * 0.5) * 0.02, cos(time * 0.3) * 0.02);
  
  // Sample background texture with distortion
  vec4 bgColor = texture2D(uTexture, uv - distortion + timeOffset);
  
  // Create grid effect with mouse influence
  vec3 gridColor = vec3(0.0, 0.0, 0.0);
  vec3 lineColor = vec3(0.3 + mouseEffect * 0.2, 0.3 + mouseEffect * 0.2, 0.3 + mouseEffect * 0.2);
  float gridMask = 1.0 - smoothstep(0.0, 1.0, line);
  
  // Mix background with grid - make mouse effect more visible
  vec3 finalColor = mix(bgColor.rgb, mix(gridColor, lineColor, gridMask), 0.4 + mouseEffect * 0.3);
  
  gl_FragColor = vec4(finalColor, bgColor.a);
}
`;

const GridDistortion: React.FC<GridDistortionProps> = ({
  grid = 20,
  mouse = 0.8,
  strength = 2.0,
  relaxation = 0.9,
  imageSrc,
  className = 'w-full h-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const planeRef = useRef<THREE.Mesh | null>(null);
  const imageAspectRef = useRef<number>(1);
  const animationIdRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    camera.position.z = 2;
    cameraRef.current = camera;

    const uniforms = {
      time: { value: 0 },
      mouse: { value: new THREE.Vector2(0.5, 0.5) },
      strength: { value: strength },
      uTexture: { value: null as THREE.Texture | null }
    };

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageSrc, texture => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      imageAspectRef.current = texture.image.width / texture.image.height;
      uniforms.uTexture.value = texture;
      handleResize();
    }, undefined, error => {
      console.error('Error loading texture:', error);
    });

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
    const plane = new THREE.Mesh(geometry, material);
    planeRef.current = plane;
    scene.add(plane);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width === 0 || height === 0) return;

      const containerAspect = width / height;

      renderer.setSize(width, height);

      if (plane) {
        plane.scale.set(containerAspect, 1, 1);
      }

      const frustumHeight = 1;
      const frustumWidth = frustumHeight * containerAspect;
      camera.left = -frustumWidth / 2;
      camera.right = frustumWidth / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = -frustumHeight / 2;
      camera.updateProjectionMatrix();

      // Resolution uniform removed - not needed for simplified shader
    };

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
      resizeObserverRef.current = resizeObserver;
    } else {
      window.addEventListener('resize', handleResize);
    }

    const mouseState = {
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      vX: 0,
      vY: 0
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      mouseState.vX = x - mouseState.prevX;
      mouseState.vY = y - mouseState.prevY;
      Object.assign(mouseState, { x, y, prevX: x, prevY: y });
      
      // Update mouse uniform for shader
      if (uniforms.mouse) {
        uniforms.mouse.value.set(x, y);
        console.log('Mouse position:', x, y); // Debug log
      }
    };

    const handleMouseLeave = () => {
      Object.assign(mouseState, {
        x: 0.5,
        y: 0.5,
        prevX: 0.5,
        prevY: 0.5,
        vX: 0,
        vY: 0
      });
      
      // Reset mouse position to center
      if (uniforms.mouse) {
        uniforms.mouse.value.set(0.5, 0.5);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    handleResize();

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (!renderer || !scene || !camera) return;

      // Update time uniform
      uniforms.time.value += 0.016; // ~60fps
      
      // Update strength uniform
      uniforms.strength.value = strength;

      // Update mouse uniform
      if (uniforms.mouse) {
        uniforms.mouse.value.set(mouseState.x, mouseState.y);
        // Debug: log every 60 frames (once per second)
        if (Math.floor(uniforms.time.value * 60) % 60 === 0) {
          console.log('Animation - Mouse uniform:', uniforms.mouse.value.x, uniforms.mouse.value.y);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }

      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);

      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }

          if (geometry) geometry.dispose();
          if (material) material.dispose();
          if (uniforms.uTexture.value) uniforms.uTexture.value.dispose();

      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      planeRef.current = null;
    };
  }, [grid, mouse, strength, relaxation, imageSrc]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minWidth: '0',
        minHeight: '0'
      }}
    />
  );
};

export default GridDistortion;

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Stars } from "@react-three/drei";
// @ts-ignore
import * as THREE from "three";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function CrystalCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.1;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.2;
      wireRef.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.8, 1]} />
        <MeshDistortMaterial
          color="#7c3aed"
          emissive="#5b21b6"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
          distort={0.25}
          speed={1.5}
          transparent
          opacity={0.92}
        />
      </mesh>

      <mesh ref={wireRef}>
        <icosahedronGeometry args={[2.1, 1]} />
        <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.15} />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshBasicMaterial color="#6d28d9" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function OrbitRing({ radius, speed, color, tilt }: { radius: number; speed: number; color: string; tilt: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.012, 8, 80]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} />
    </mesh>
  );
}

function OrbitDot({ radius, speed, color, startAngle }: { radius: number; speed: number; color: string; startAngle: number }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(startAngle);
  useFrame((_, delta) => {
    t.current += delta * speed;
    if (ref.current) {
      ref.current.position.x = Math.cos(t.current) * radius;
      ref.current.position.z = Math.sin(t.current) * radius;
    }
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={0.5} distance={2} />
    </group>
  );
}

function SmallFragment({ position, speed }: { position: [number, number, number]; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);
  const orig = useRef(position);

  useFrame((_, delta) => {
    t.current += delta * speed;
    if (ref.current) {
      ref.current.position.y = orig.current[1] + Math.sin(t.current) * 0.3;
      ref.current.rotation.x += delta * 1.2;
      ref.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.15, 0]} />
      <meshStandardMaterial
        color="#c084fc"
        emissive="#7c3aed"
        emissiveIntensity={0.8}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[-5, 5, 5]} color="#7c3aed" intensity={8} distance={20} />
      <pointLight position={[5, -3, 3]} color="#06b6d4" intensity={6} distance={20} />
      <pointLight position={[0, 0, 8]} color="#a855f7" intensity={3} distance={15} />

      <Stars radius={40} depth={30} count={800} factor={2} saturation={0.5} fade speed={0.4} />

      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <CrystalCore />
      </Float>

      <OrbitRing radius={3.2} speed={0.4} color="#7c3aed" tilt={0.3} />
      <OrbitRing radius={4.0} speed={0.25} color="#06b6d4" tilt={1.1} />
      <OrbitRing radius={2.6} speed={0.6} color="#c084fc" tilt={0.7} />

      <OrbitDot radius={3.2} speed={0.5} color="#c084fc" startAngle={0} />
      <OrbitDot radius={3.2} speed={0.5} color="#c084fc" startAngle={Math.PI} />
      <OrbitDot radius={4.0} speed={0.3} color="#06b6d4" startAngle={Math.PI / 2} />

      <SmallFragment position={[3.5, 1.5, -1]} speed={0.8} />
      <SmallFragment position={[-3.2, -1.2, 0.5]} speed={1.1} />
      <SmallFragment position={[2.0, -2.5, 1.0]} speed={0.6} />
      <SmallFragment position={[-2.5, 2.0, -0.5]} speed={1.3} />
      <SmallFragment position={[0.5, 3.5, 1.5]} speed={0.9} />
    </>
  );
}

function CrystalFallback({ className }: { className?: string }) {
  return (
    <div className={`${className ?? ""} flex items-center justify-center relative`} style={{ width: "100%", height: "100%" }}>
      <div className="relative w-64 h-64">
        <div className="absolute inset-0 rounded-full border border-purple-500/10 animate-spin-slow" />
        <div className="absolute inset-6 rounded-full border border-cyan-500/8" style={{ animation: "spin-slow 25s linear infinite reverse" }} />
        <div className="absolute inset-12 rounded-full border border-violet-400/12 animate-spin-slow" style={{ animationDuration: "15s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-xl animate-pulse-glow" />
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-600/40 to-purple-900/30 border border-violet-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.3)] animate-float">
              <svg viewBox="0 0 100 100" className="w-14 h-14">
                <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" />
                <polygon points="50,10 90,30 50,50 10,30" fill="rgba(124,58,237,0.15)" stroke="rgba(168,85,247,0.3)" strokeWidth="1" />
                <polygon points="10,30 50,50 10,70" fill="rgba(109,40,217,0.12)" stroke="rgba(167,139,250,0.2)" strokeWidth="1" />
                <polygon points="90,30 90,70 50,50" fill="rgba(139,92,246,0.12)" stroke="rgba(167,139,250,0.2)" strokeWidth="1" />
                <polygon points="10,70 50,50 90,70 50,90" fill="rgba(91,33,182,0.15)" stroke="rgba(168,85,247,0.25)" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div
            key={deg}
            className="absolute w-1.5 h-1.5 rounded-full bg-purple-400/50"
            style={{
              top: "50%", left: "50%",
              transform: `rotate(${deg}deg) translateX(110px) translateY(-50%)`,
              boxShadow: "0 0 6px rgba(168,85,247,0.6)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ThreeScene({ className }: { className?: string }) {
  if (!hasWebGL()) {
    return <CrystalFallback className={className} />;
  }
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}

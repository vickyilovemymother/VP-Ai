import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { motion } from 'motion/react';
import { Sparkles, Camera, Layers, Download, ArrowRight, User, MousePointer2 } from 'lucide-react';

interface ZeroGravityLandingProps {
  onStart: () => void;
}

export const ZeroGravityLanding: React.FC<ZeroGravityLandingProps> = ({ onStart }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const [elements, setElements] = useState<{ id: string; type: string; x: number; y: number; angle: number; label: string; icon: any }[]>([]);

  useEffect(() => {
    if (!sceneRef.current) return;

    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Events } = Matter;

    const engine = Engine.create();
    engine.gravity.y = 0; // Zero gravity
    engine.gravity.x = 0;
    engineRef.current = engine;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Boundaries
    const wallThickness = 100;
    const ground = Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true });
    const ceiling = Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true });
    const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true });
    const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true });

    // Create floating objects
    const items = [
      { id: 'card1', label: 'Model Gen', icon: User, type: 'card', w: 280, h: 180 },
      { id: 'card2', label: 'Pose Pack', icon: Layers, type: 'card', w: 280, h: 180 },
      { id: 'card3', label: 'Export', icon: Download, type: 'card', w: 280, h: 180 },
      { id: 'btn1', label: 'Start Creating', icon: ArrowRight, type: 'button', w: 200, h: 60 },
      { id: 'icon1', label: '', icon: Camera, type: 'icon', w: 60, h: 60 },
      { id: 'icon2', label: '', icon: Sparkles, type: 'icon', w: 60, h: 60 },
    ];

    const bodiesMap: Record<string, Matter.Body> = {};
    const initialElements = items.map((item, i) => {
      const x = Math.random() * (width - 200) + 100;
      const y = Math.random() * (height - 200) + 100;
      const body = Bodies.rectangle(x, y, item.w, item.h, {
        restitution: 0.8,
        frictionAir: 0.02,
        chamfer: { radius: 20 },
        label: item.id
      });
      
      // Give some initial velocity
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 5
      });
      
      bodiesMap[item.id] = body;
      return { ...item, x, y, angle: 0 };
    });

    setElements(initialElements);
    Composite.add(engine.world, [ground, ceiling, leftWall, rightWall, ...Object.values(bodiesMap)]);

    // Mouse constraint for dragging
    const mouse = Mouse.create(sceneRef.current);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });

    Composite.add(engine.world, mouseConstraint);

    // Update loop
    const runner = Runner.create();
    Runner.run(runner, engine);

    const updateState = () => {
      setElements(prev => prev.map(el => {
        const body = bodiesMap[el.id];
        if (!body) return el;
        return {
          ...el,
          x: body.position.x,
          y: body.position.y,
          angle: body.angle
        };
      }));
      requestAnimationFrame(updateState);
    };

    const animationId = requestAnimationFrame(updateState);

    // Handle resize
    const handleResize = () => {
      // Simple reload or repositioning could go here
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, []);

  return (
    <div 
      ref={sceneRef}
      className="fixed inset-0 overflow-hidden bg-[#05020a] select-none"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #1a0b3c 0%, #05020a 100%)'
      }}
    >
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700" />

      {/* Particles */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(30)].map((_, i) => (
          <div 
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-ping"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Hero Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-8xl font-serif font-bold text-white tracking-tighter text-center"
        >
          VP-Ai <br />
          <span className="text-multi-color italic">
            Zero Gravity
          </span>
        </motion.h1>
        <p className="text-white/40 mt-6 font-mono tracking-widest uppercase text-xs">
          Interactive Physics Experience • Drag to Explore
        </p>
      </div>

      {/* Physics Elements */}
      {elements.map((el) => {
        const Icon = el.icon;
        if (el.type === 'card') {
          return (
            <div
              key={el.id}
              className="absolute glass-panel p-6 flex flex-col justify-between cursor-grab active:cursor-grabbing group"
              style={{
                width: 280,
                height: 180,
                left: el.x - 140,
                top: el.y - 90,
                transform: `rotate(${el.angle}rad)`,
                backdropFilter: 'blur(16px)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              }}
            >
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-blue-400">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{el.label}</h3>
                <p className="text-white/40 text-xs mt-1">Advanced AI Photoshoot Pipeline</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/20 uppercase tracking-widest font-bold">
                <MousePointer2 size={10} /> Interaction Active
              </div>
            </div>
          );
        }

        if (el.type === 'button') {
          return (
            <button
              key={el.id}
              onClick={onStart}
              className="absolute bg-white text-black rounded-full font-bold flex items-center justify-center gap-3 cursor-pointer hover:scale-105 transition-transform"
              style={{
                width: 200,
                height: 60,
                left: el.x - 100,
                top: el.y - 30,
                transform: `rotate(${el.angle}rad)`,
                boxShadow: '0 0 30px rgba(255, 255, 255, 0.2)'
              }}
            >
              {el.label} <Icon size={18} />
            </button>
          );
        }

        return (
          <div
            key={el.id}
            className="absolute w-[60px] h-[60px] bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 rounded-2xl flex items-center justify-center text-white/60"
            style={{
              left: el.x - 30,
              top: el.y - 30,
              transform: `rotate(${el.angle}rad)`,
            }}
          >
            <Icon size={24} />
          </div>
        );
      })}

      {/* Instructions Overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/20 text-[10px] uppercase tracking-[0.3em] pointer-events-none">
        Physics Engine: Matter.js • Render: Framer Motion
      </div>
    </div>
  );
};

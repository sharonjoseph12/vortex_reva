'use client';

import React from 'react';

interface MasteryRadarProps {
  data: Record<string, number>;
}

export default function MasteryRadar({ data }: MasteryRadarProps) {
  const categories = ['python', 'design', 'marketing', 'security', 'ai_ml', 'rust'];
  const size = 300;
  const center = size / 2;
  const radius = center - 40;
  
  // Angle for each category
  const angleStep = (Math.PI * 2) / categories.length;

  const getPoint = (index: number, value: number) => {
    // Normalizing value (0-100) to radius
    const r = (value / 100) * radius;
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const points = categories.map((cat, i) => getPoint(i, data[cat] || 10)); // Default min level for visual
  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Grids */}
        {[20, 40, 60, 80, 100].map((step) => (
          <polygon
            key={step}
            points={categories.map((_, i) => {
              const p = getPoint(i, step);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        ))}

        {/* Axis Lines */}
        {categories.map((_, i) => {
          const p = getPoint(i, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="var(--border-color)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* The Radar Shape */}
        <polygon
          points={polyPoints}
          fill="rgba(20, 168, 0, 0.15)"
          stroke="var(--accent-primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          style={{ transition: 'all 0.5s ease' }}
        />

        {/* Data Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--accent-primary)" stroke="white" strokeWidth="1.5" />
        ))}

        {/* Labels */}
        {categories.map((cat, i) => {
          const p = getPoint(i, 120);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: '10px',
                fontWeight: '800',
                textTransform: 'uppercase',
                fill: 'var(--text-tertiary)',
                letterSpacing: '0.05em'
              }}
            >
              {cat.replace('_', ' ')}
            </text>
          );
        })}
      </svg>
      
      {/* Center Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '4px',
        height: '4px',
        background: 'var(--accent-primary)',
        borderRadius: '50%',
        boxShadow: '0 0 20px 5px var(--accent-primary)',
        opacity: 0.5
      }} />
    </div>
  );
}

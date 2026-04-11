'use client';

import React from 'react';

interface PulseChartProps {
  data: Array<{ date: string; value: number }>;
  height?: number;
  color?: string;
  label?: string;
}

export default function PulseChart({ 
  data, 
  height = 120, 
  color = 'var(--accent-primary)',
  label 
}: PulseChartProps) {
  if (!data || data.length < 2) return null;

  const width = 400;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `
    ${padding},${height - padding} 
    ${points} 
    ${width - padding},${height - padding}
  `;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <div style={{ 
          fontSize: '0.65rem', 
          fontFamily: 'var(--font-mono)', 
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          letterSpacing: '0.05em'
        }}>
          {label}
        </div>
      )}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="0.5" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="0.5" />
        
        {/* Area fill */}
        <polyline
          points={areaPoints}
          fill={color}
          fillOpacity="0.05"
        />

        {/* Path line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Current pulse marker */}
        {data.length > 0 && (
          <circle 
            cx={padding + chartWidth} 
            cy={padding + chartHeight - ((data[data.length-1].value - min) / range) * chartHeight}
            r="4"
            fill={color}
          >
            <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  );
}

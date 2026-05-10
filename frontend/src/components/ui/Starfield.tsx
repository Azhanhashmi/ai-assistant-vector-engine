import React, { useEffect, useRef, useState } from 'react';

const generateUUID = () => {
  const lut = Array(256).fill(0).map((_, i) => (i < 16 ? '0' : '') + i.toString(16));
  const d0 = Math.random() * 0xffffffff | 0;
  const d1 = Math.random() * 0xffffffff | 0;
  const d2 = Math.random() * 0xffffffff | 0;
  const d3 = Math.random() * 0xffffffff | 0;
  return (
    lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
    lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
    lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
    lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff]
  );
};

interface StarfieldProps {
  starColor?: string
  bgColor?: string
  speed?: number
  quantity?: number
  opacity?: number
}

export function Starfield({
  starColor = 'rgba(255,255,255,0.8)',
  bgColor = 'rgba(0,0,0,0)',
  speed = 0.5,
  quantity = 300,
  opacity = 0.0,
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const sd = useRef<any>({
    w: 0, h: 0, ctx: null, x: 0, y: 0, z: 0,
    star: { colorRatio: 0, arr: [] }, prevTime: 0,
  });
  const mouse = useRef({ x: 0, y: 0 });
  const cursor = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;

    const setup = () => {
      sd.current.w = parent.clientWidth;
      sd.current.h = parent.clientHeight;
      sd.current.x = sd.current.w / 2;
      sd.current.y = sd.current.h / 2;
      sd.current.z = (sd.current.w + sd.current.h) / 2;
      sd.current.star.colorRatio = 1 / sd.current.z;
      cursor.current = { x: sd.current.x, y: sd.current.y };
      mouse.current = { x: 0, y: 0 };

      canvas.width = sd.current.w;
      canvas.height = sd.current.h;
      sd.current.ctx = canvas.getContext('2d');
      sd.current.ctx.strokeStyle = starColor;

      sd.current.star.arr = Array(quantity).fill(0).map(() => [
        Math.random() * sd.current.w * 2 - sd.current.x * 2,
        Math.random() * sd.current.h * 2 - sd.current.y * 2,
        Math.round(Math.random() * sd.current.z),
        0, 0, 0, 0, true,
      ]);
    };

    const animate = () => {
      const { ctx, w, h, x, y, z, star } = sd.current;
      if (!ctx) return;

      // Resize if needed
      if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
        sd.current.w = parent.clientWidth;
        sd.current.h = parent.clientHeight;
        sd.current.x = sd.current.w / 2;
        sd.current.y = sd.current.h / 2;
        sd.current.z = (sd.current.w + sd.current.h) / 2;
        sd.current.star.colorRatio = 1 / sd.current.z;
        canvas.width = sd.current.w;
        canvas.height = sd.current.h;
        ctx.strokeStyle = starColor;
      }

      const ratio = quantity / 2;
      const compSpeed = speed;

      // Clear
      ctx.fillStyle = bgColor === 'rgba(0,0,0,0)' ? 'rgba(0,0,0,0)' : bgColor;
      ctx.clearRect(0, 0, sd.current.w, sd.current.h);

      // Draw trail
      ctx.fillStyle = 'rgba(5,5,5,0.18)';
      ctx.fillRect(0, 0, sd.current.w, sd.current.h);

      ctx.strokeStyle = starColor;

      sd.current.star.arr = sd.current.star.arr.map((star: any) => {
        const s = [...star];
        s[7] = true;
        s[5] = s[3]; s[6] = s[4];

        s[2] -= compSpeed;
        if (s[2] < 0) { s[2] += sd.current.z; s[7] = false; }
        if (s[2] > sd.current.z) { s[2] -= sd.current.z; s[7] = false; }

        s[3] = sd.current.x + (s[0] / s[2]) * ratio;
        s[4] = sd.current.y + (s[1] / s[2]) * ratio;

        return s;
      });

      sd.current.star.arr.forEach((s: any) => {
        if (s[5] > 0 && s[5] < sd.current.w && s[6] > 0 && s[6] < sd.current.h && s[7]) {
          ctx.lineWidth = (1 - sd.current.star.colorRatio * s[2]) * 2;
          ctx.beginPath();
          ctx.moveTo(s[5], s[6]);
          ctx.lineTo(s[3], s[4]);
          ctx.stroke();
          ctx.closePath();
        }
      });

      animRef.current = requestAnimationFrame(animate);
    };

    setup();
    animate();

    return () => cancelAnimationFrame(animRef.current);
  }, [starColor, bgColor, speed, quantity]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
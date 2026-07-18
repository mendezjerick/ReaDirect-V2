import { useEffect, useRef } from "react";

type ParticleShape = "circle" | "spark";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
  shape: ParticleShape;
}

const TRAIL_COLOR_VARIABLES = [
  "--color-action-primary",
  "--color-accent-coral-soft",
  "--color-accent-sun",
  "--color-text-primary",
] as const;
const MAX_PARTICLES = 72;

function drawParticle(context: CanvasRenderingContext2D, particle: Particle) {
  context.globalAlpha = Math.max(0, particle.life);
  context.fillStyle = particle.color;
  context.beginPath();

  if (particle.shape === "spark") {
    const size = particle.size * 1.4;
    context.moveTo(particle.x, particle.y - size);
    context.lineTo(particle.x + size * 0.42, particle.y - size * 0.42);
    context.lineTo(particle.x + size, particle.y);
    context.lineTo(particle.x + size * 0.42, particle.y + size * 0.42);
    context.lineTo(particle.x, particle.y + size);
    context.lineTo(particle.x - size * 0.42, particle.y + size * 0.42);
    context.lineTo(particle.x - size, particle.y);
    context.lineTo(particle.x - size * 0.42, particle.y - size * 0.42);
  } else {
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  }

  context.closePath();
  context.fill();
}

export function PointerTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!coarsePointer.matches || reducedMotion.matches) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let particles: Particle[] = [];
    let animationFrame = 0;
    let lastTrailPoint = { x: Number.NaN, y: Number.NaN };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * pixelRatio);
      canvas.height = Math.round(window.innerHeight * pixelRatio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const addParticle = (x: number, y: number, burst = false) => {
      const count = burst ? 8 : 2;
      const theme = getComputedStyle(document.documentElement);

      for (let index = 0; index < count; index += 1) {
        const angle = burst
          ? (Math.PI * 2 * index) / count
          : Math.random() * Math.PI * 2;
        const speed = burst ? 0.8 + Math.random() * 1.1 : 0.25;

        const colorVariable =
          TRAIL_COLOR_VARIABLES[
            (particles.length + index) % TRAIL_COLOR_VARIABLES.length
          ];

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.18,
          life: 1,
          size: burst ? 3 + Math.random() * 2.5 : 2.5 + Math.random() * 1.5,
          color: theme.getPropertyValue(colorVariable).trim(),
          shape: (particles.length + index) % 4 === 0 ? "spark" : "circle",
        });
      }

      if (particles.length > MAX_PARTICLES) {
        particles = particles.slice(-MAX_PARTICLES);
      }
    };

    const animate = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles = particles.filter((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.015;
        particle.life -= 0.035;
        drawParticle(context, particle);
        return particle.life > 0;
      });

      context.globalAlpha = 1;
      animationFrame = particles.length
        ? window.requestAnimationFrame(animate)
        : 0;
    };

    const ensureAnimation = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        return;
      }

      lastTrailPoint = { x: event.clientX, y: event.clientY };
      addParticle(event.clientX, event.clientY, true);
      ensureAnimation();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.buttons === 0) {
        return;
      }

      const distance = Math.hypot(
        event.clientX - lastTrailPoint.x,
        event.clientY - lastTrailPoint.y,
      );

      if (!Number.isNaN(distance) && distance < 10) {
        return;
      }

      lastTrailPoint = { x: event.clientX, y: event.clientY };
      addParticle(event.clientX, event.clientY);
      ensureAnimation();
    };

    const handleVisibility = () => {
      if (document.hidden && animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        particles = [];
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="pointer-trail" aria-hidden="true" />
  );
}

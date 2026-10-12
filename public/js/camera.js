import { Vec3, Mat4 } from './math.js';

export class OrbitCamera {
  constructor(canvas) {
    this.canvas = canvas;

    // Coordenadas esféricas actuales y objetivo (para amortiguación suave / damping)
    this.targetRadius = 18.0;
    this.radius = 18.0;

    this.targetTheta = Math.PI / 4; // 45 grados de rotación azimutal inicial
    this.theta = Math.PI / 4;

    this.targetPhi = Math.PI / 5;   // ~36 grados de elevación sobre el plano
    this.phi = Math.PI / 5;

    // Punto al que mira la cámara
    this.lookAtTarget = Vec3.create(0, 0, 0);
    this.currentLookAt = Vec3.create(0, 0, 0);

    // Posición calculada de la cámara
    this.position = Vec3.create(0, 10, 15);

    // Matrices
    this.viewMatrix = Mat4.create();
    this.projMatrix = Mat4.create();
    this.viewProjMatrix = Mat4.create();

    // Estado de interacción
    this.isDragging = false;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.autoRotate = true;
    this.autoRotateSpeed = 0.15; // rad por segundo

    this.initEventListeners();
  }

  initEventListeners() {
    // Evitar menú contextual al hacer clic derecho para permitir Pan
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Down
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.isPanning = e.button === 2 || e.shiftKey; // Clic derecho o Shift+Click para Pan
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    // Mouse Move
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (this.isPanning) {
        // Desplazamiento del punto objetivo (Pan)
        const factor = this.radius * 0.0015;
        const forward = Vec3.create(
          -Math.sin(this.theta),
          0,
          -Math.cos(this.theta)
        );
        const right = Vec3.create(
          Math.cos(this.theta),
          0,
          -Math.sin(this.theta)
        );

        this.lookAtTarget[0] -= right[0] * dx * factor;
        this.lookAtTarget[2] -= right[2] * dx * factor;

        this.lookAtTarget[0] += forward[0] * dy * factor;
        this.lookAtTarget[2] += forward[2] * dy * factor;
      } else {
        // Rotación orbital
        this.targetTheta += dx * 0.006;
        this.targetPhi += dy * 0.006;

        // Limitar ángulo de elevación para no invertir la cámara
        const minPhi = 0.05;
        const maxPhi = Math.PI / 2 - 0.05;
        this.targetPhi = Math.max(minPhi, Math.min(maxPhi, this.targetPhi));
      }
    });

    // Mouse Up
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    // Zoom con rueda del ratón
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      this.targetRadius += e.deltaY * zoomSensitivity * (this.targetRadius * 0.25);
      this.targetRadius = Math.max(3.0, Math.min(60.0, this.targetRadius));
    }, { passive: false });

    // Soporte táctil para móviles / tablets
    let touchStartDist = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.isPanning = false;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;

        this.targetTheta += dx * 0.008;
        this.targetPhi += dy * 0.008;

        const minPhi = 0.05;
        const maxPhi = Math.PI / 2 - 0.05;
        this.targetPhi = Math.max(minPhi, Math.min(maxPhi, this.targetPhi));
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const diff = touchStartDist - dist;
        touchStartDist = dist;
        this.targetRadius += diff * 0.05;
        this.targetRadius = Math.max(3.0, Math.min(60.0, this.targetRadius));
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  reset() {
    this.targetRadius = 18.0;
    this.targetTheta = Math.PI / 4;
    this.targetPhi = Math.PI / 5;
    Vec3.set(this.lookAtTarget, 0, 0, 0);
  }

  update(dt, aspect) {
    if (this.autoRotate && !this.isDragging) {
      this.targetTheta += this.autoRotateSpeed * dt;
    }

    // Amortiguación suave (damping / lerp)
    const damping = Math.min(1.0, dt * 10);
    this.radius += (this.targetRadius - this.radius) * damping;
    this.theta += (this.targetTheta - this.theta) * damping;
    this.phi += (this.targetPhi - this.phi) * damping;

    Vec3.lerp(this.currentLookAt, this.currentLookAt, this.lookAtTarget, damping);

    // Calcular posición de cámara en coordenadas esféricas
    // x = r * sin(theta) * cos(phi)
    // y = r * sin(phi)
    // z = r * cos(theta) * cos(phi)
    const cosPhi = Math.cos(this.phi);
    const sinPhi = Math.sin(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    this.position[0] = this.currentLookAt[0] + this.radius * sinTheta * cosPhi;
    this.position[1] = this.currentLookAt[1] + this.radius * sinPhi;
    this.position[2] = this.currentLookAt[2] + this.radius * cosTheta * cosPhi;

    // Calcular matriz de vista LookAt
    const up = Vec3.create(0, 1, 0);
    Mat4.lookAt(this.viewMatrix, this.position, this.currentLookAt, up);

    // Calcular proyección perspectiva (FOV 60 grados = 1.047 rad)
    const fov = (60 * Math.PI) / 180;
    Mat4.perspective(this.projMatrix, fov, aspect, 0.1, 200.0);

    // ViewProj = Proj * View
    Mat4.multiply(this.viewProjMatrix, this.projMatrix, this.viewMatrix);

    return {
      viewProj: this.viewProjMatrix,
      position: this.position
    };
  }
}

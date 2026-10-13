/**
 * Ruido 3D determinista basado en tabla de permutación pseudoaleatoria
 * inicializada por seed. Garantiza resultados idénticos en cliente y servidor.
 */

export class DeterministicNoise3D {
  private p: Uint8Array;
  private perm: Uint8Array;

  constructor(seedString: string) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.initSeed(seedString);
  }

  private initSeed(seedStr: string): void {
    // Generador congruencial lineal a partir de hash del string
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }

    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    // Barajado Fisher-Yates determinista
    for (let i = 255; i > 0; i--) {
      h = (Math.imul(1103515245, h) + 12345) & 0x7fffffff;
      const j = h % (i + 1);
      const tmp = this.p[i]!;
      this.p[i] = this.p[j]!;
      this.p[j] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255]!;
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    const fz = z - Math.floor(z);

    const u = this.fade(fx);
    const v = this.fade(fy);
    const w = this.fade(fz);

    const A = this.perm[X]! + Y;
    const AA = this.perm[A]! + Z;
    const AB = this.perm[A + 1]! + Z;
    const B = this.perm[X + 1]! + Y;
    const BA = this.perm[B]! + Z;
    const BB = this.perm[B + 1]! + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(this.perm[AA]!, fx, fy, fz), this.grad(this.perm[BA]!, fx - 1, fy, fz)),
        this.lerp(u, this.grad(this.perm[AB]!, fx, fy - 1, fz), this.grad(this.perm[BB]!, fx - 1, fy - 1, fz))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(this.perm[AA + 1]!, fx, fy, fz - 1), this.grad(this.perm[BA + 1]!, fx - 1, fy, fz - 1)),
        this.lerp(u, this.grad(this.perm[AB + 1]!, fx, fy - 1, fz - 1), this.grad(this.perm[BB + 1]!, fx - 1, fy - 1, fz - 1))
      )
    );
  }

  public fbm(x: number, y: number, z: number, octaves = 6, lacunarity = 2.0, persistence = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}

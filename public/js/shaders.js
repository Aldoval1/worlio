/**
 * Worlio Shaders WGSL para el Plano 3D
 */

export const planeShaderWGSL = /* wgsl */ `
struct Uniforms {
  viewProj: mat4x4<f32>,
  model: mat4x4<f32>,
  cameraPos: vec3<f32>,
  time: f32,
  planeSize: f32,
  padding0: f32,
  padding1: f32,
  padding2: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let worldPos4 = uniforms.model * vec4<f32>(in.position, 1.0);
  out.worldPos = worldPos4.xyz;
  out.clipPosition = uniforms.viewProj * worldPos4;
  out.normal = (uniforms.model * vec4<f32>(in.normal, 0.0)).xyz;
  out.uv = in.uv;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let coord = in.worldPos.xz;
  let d = fwidth(coord);

  // Rejilla fina cada 1 unidad métrica
  let grid1 = abs(fract(coord - 0.5) - 0.5) / d;
  let line1 = 1.0 - clamp(min(grid1.x, grid1.y), 0.0, 1.0);

  // Rejilla principal cada 5 unidades métricas
  let grid5 = abs(fract((coord / 5.0) - 0.5) - 0.5) / (d / 5.0);
  let line5 = 1.0 - clamp(min(grid5.x, grid5.y), 0.0, 1.0);

  // Ejes centrales (Eje X = Rojo, Eje Z = Azul)
  let axisX = 1.0 - clamp(abs(in.worldPos.z) / d.y, 0.0, 1.0);
  let axisZ = 1.0 - clamp(abs(in.worldPos.x) / d.x, 0.0, 1.0);

  // Colores base del plano
  let groundBase = vec3<f32>(0.07, 0.09, 0.13); // Suelo gris/azulado oscuro
  let minorGridColor = vec3<f32>(0.22, 0.30, 0.45); // Líneas secundarias
  let majorGridColor = vec3<f32>(0.35, 0.65, 0.95); // Líneas principales
  let colorAxisX = vec3<f32>(0.92, 0.28, 0.32);     // Rojo eje X
  let colorAxisZ = vec3<f32>(0.25, 0.60, 0.98);     // Azul eje Z

  var surfaceColor = groundBase;
  surfaceColor = mix(surfaceColor, minorGridColor, line1 * 0.45);
  surfaceColor = mix(surfaceColor, majorGridColor, line5 * 0.85);
  surfaceColor = mix(surfaceColor, colorAxisX, axisX * 0.95);
  surfaceColor = mix(surfaceColor, colorAxisZ, axisZ * 0.95);

  // Borde exterior suave del plano
  let halfPlane = uniforms.planeSize * 0.5;
  let distFromEdge = min(halfPlane - abs(in.worldPos.x), halfPlane - abs(in.worldPos.z));
  let edgeFade = clamp(distFromEdge / 2.0, 0.0, 1.0);

  // Iluminación direccional suave (Sol)
  let sunDir = normalize(vec3<f32>(0.4, 0.8, 0.3));
  let diffuse = max(dot(in.normal, sunDir), 0.0);
  let ambient = 0.7;
  let litColor = surfaceColor * (ambient + diffuse * 0.3);

  // Niebla de distancia hacia el fondo
  let dist = length(uniforms.cameraPos - in.worldPos);
  let fogNear = 10.0;
  let fogFar = uniforms.planeSize * 0.95;
  let fogFactor = clamp((fogFar - dist) / (fogFar - fogNear), 0.0, 1.0);

  let skyBackground = vec3<f32>(0.03, 0.04, 0.06);
  let finalRgb = mix(skyBackground, litColor, fogFactor * edgeFade);

  return vec4<f32>(finalRgb, 1.0);
}
`;

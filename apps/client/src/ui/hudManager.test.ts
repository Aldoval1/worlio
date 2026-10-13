import { describe, it, expect } from 'vitest';
import { HudStateMachine } from './hudManager.js';

describe('HudStateMachine (T08 Arquitectura UX y Control de Tareas)', () => {
  it('inicia en escala orbital y rol observador por defecto', () => {
    const hud = new HudStateMachine();
    expect(hud.getScale()).toBe('ORBITAL');
    expect(hud.getRole()).toBe('OBSERVER');
    expect(hud.getActiveTool()).toBe('NONE');
  });

  it('bloquea herramientas de construcción en vista orbital', () => {
    const hud = new HudStateMachine('MAYOR');
    expect(hud.getScale()).toBe('ORBITAL');
    const activated = hud.setActiveTool('ROAD_TOOL');
    expect(activated).toBe(false);
    expect(hud.getActiveTool()).toBe('NONE');
  });

  it('permite al alcalde activar herramientas de suelo en escala ciudad', () => {
    const hud = new HudStateMachine('MAYOR');
    hud.setScale('CITY');
    const activated = hud.setActiveTool('ROAD_TOOL');
    expect(activated).toBe(true);
    expect(hud.getActiveTool()).toBe('ROAD_TOOL');
  });

  it('deniega herramientas de construcción a observadores en escala ciudad (Progressive Disclosure)', () => {
    const hud = new HudStateMachine('OBSERVER');
    hud.setScale('CITY');
    const activated = hud.setActiveTool('BUILD_MENU');
    expect(activated).toBe(false);
    expect(hud.getActiveTool()).toBe('NONE');
  });

  it('cancela automáticamente la herramienta si la cámara vuelve a escala orbital', () => {
    const hud = new HudStateMachine('MAYOR');
    hud.setScale('CITY');
    hud.setActiveTool('ZONE_TOOL');
    expect(hud.getActiveTool()).toBe('ZONE_TOOL');

    hud.setScale('ORBITAL');
    expect(hud.getActiveTool()).toBe('NONE');
  });

  it('gestiona cola de notificaciones con límite máximo', () => {
    const hud = new HudStateMachine();
    for (let i = 0; i < 25; i++) {
      hud.pushNotification('INFO', `Alerta de prueba #${i}`);
    }
    expect(hud.getNotifications().length).toBe(20);
    expect(hud.getNotifications()[19]!.message).toBe('Alerta de prueba #24');
  });
});

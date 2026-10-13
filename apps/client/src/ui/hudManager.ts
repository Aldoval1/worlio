export type CameraScale = 'ORBITAL' | 'REGIONAL' | 'CITY' | 'INSPECT_BUILDING';

export type ActiveTool = 'NONE' | 'ROAD_TOOL' | 'ZONE_TOOL' | 'BUILD_MENU';

export type PlayerRole = 'OBSERVER' | 'MAYOR' | 'GENERAL' | 'CHANCELLOR';

export interface NotificationItem {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestampUtc: string;
}

export class HudStateMachine {
  private scale: CameraScale = 'ORBITAL';
  private tool: ActiveTool = 'NONE';
  private role: PlayerRole = 'OBSERVER';
  private notifications: NotificationItem[] = [];

  constructor(initialRole: PlayerRole = 'OBSERVER') {
    this.role = initialRole;
  }

  public setRole(role: PlayerRole): void {
    this.role = role;
    // Si el rol no tiene permisos sobre la herramienta actual, cancelarla
    if (!this.canUseCurrentTool()) {
      this.tool = 'NONE';
    }
  }

  public getRole(): PlayerRole {
    return this.role;
  }

  public setScale(scale: CameraScale): void {
    this.scale = scale;
    // En órbita no se permiten herramientas de suelo
    if (scale === 'ORBITAL' && this.tool !== 'NONE') {
      this.tool = 'NONE';
    }
  }

  public getScale(): CameraScale {
    return this.scale;
  }

  public setActiveTool(tool: ActiveTool): boolean {
    if (this.scale === 'ORBITAL' && tool !== 'NONE') {
      return false; // No se puede construir en vista orbital
    }

    if (tool !== 'NONE') {
      if (this.role !== 'MAYOR') {
        return false; // Solo el alcalde puede activar herramientas de construcción
      }
    }

    this.tool = tool;
    return true;
  }

  public getActiveTool(): ActiveTool {
    return this.tool;
  }

  public canUseCurrentTool(): boolean {
    if (this.tool === 'NONE') return true;
    return this.role === 'MAYOR' && this.scale !== 'ORBITAL';
  }

  public pushNotification(severity: 'INFO' | 'WARNING' | 'CRITICAL', message: string): void {
    this.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      severity,
      message,
      timestampUtc: new Date().toISOString()
    });

    if (this.notifications.length > 20) {
      this.notifications.shift();
    }
  }

  public getNotifications(): readonly NotificationItem[] {
    return this.notifications;
  }
}

import type { LotId, FacilityId, FactionId, ResourceId } from '@universo/shared';

export interface InventoryLot {
  id: LotId;
  locationId: FacilityId;
  ownerId: FactionId;
  resourceId: ResourceId;
  onHand: number;
  reserved: number;
  version: number;
}

export class InventoryDomainService {
  /**
   * Calcula el stock inmediatamente disponible para reserva.
   * Invariante fundamental: available >= 0.
   */
  public static getAvailable(lot: InventoryLot): number {
    const avail = lot.onHand - lot.reserved;
    if (avail < 0) {
      throw new Error(`Invariante corrupto: Lote ${lot.id} tiene disponible negativo (${avail}).`);
    }
    return avail;
  }

  /**
   * Reserva atómicamente una cantidad para un envío o proceso de obra.
   */
  public static reserve(lot: InventoryLot, amount: number): InventoryLot {
    if (amount <= 0) {
      throw new Error(`La cantidad a reservar debe ser positiva (${amount}).`);
    }
    const avail = this.getAvailable(lot);
    if (avail < amount) {
      throw new Error(
        `Existencias insuficientes en lote ${lot.id}. Solicitado: ${amount}, Disponible: ${avail}.`
      );
    }

    return {
      ...lot,
      reserved: lot.reserved + amount,
      version: lot.version + 1
    };
  }

  /**
   * Libera una reserva previa (por ejemplo, cancelación de envío).
   */
  public static release(lot: InventoryLot, amount: number): InventoryLot {
    if (amount <= 0) {
      throw new Error(`La cantidad a liberar debe ser positiva (${amount}).`);
    }
    if (lot.reserved < amount) {
      throw new Error(
        `No se puede liberar más de lo reservado en lote ${lot.id}. Reservado: ${lot.reserved}, a liberar: ${amount}.`
      );
    }

    return {
      ...lot,
      reserved: lot.reserved - amount,
      version: lot.version + 1
    };
  }

  /**
   * Consume material reservado físicamente al salir en un convoy o incorporarse en una obra.
   */
  public static consumeReserved(lot: InventoryLot, amount: number): InventoryLot {
    if (amount <= 0) {
      throw new Error(`La cantidad a consumir debe ser positiva (${amount}).`);
    }
    if (lot.reserved < amount) {
      throw new Error(
        `Consumo no autorizado sin reserva previa en lote ${lot.id}. Reservado: ${lot.reserved}, solicitado: ${amount}.`
      );
    }
    if (lot.onHand < amount) {
      throw new Error(
        `Fallo crítico de stock en mano en lote ${lot.id}. En mano: ${lot.onHand}, requerido: ${amount}.`
      );
    }

    return {
      ...lot,
      onHand: lot.onHand - amount,
      reserved: lot.reserved - amount,
      version: lot.version + 1
    };
  }

  /**
   * Acredita mercancía física que acaba de llegar a destino.
   */
  public static receive(lot: InventoryLot, amount: number): InventoryLot {
    if (amount <= 0) {
      throw new Error(`La cantidad recibida debe ser positiva (${amount}).`);
    }

    return {
      ...lot,
      onHand: lot.onHand + amount,
      version: lot.version + 1
    };
  }
}

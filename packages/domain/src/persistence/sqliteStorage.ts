import fs from 'node:fs';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { RoadType } from '../roads/types.js';
import type {
  RoadSegment,
  TilePersistedState,
  TileResourceDeposit,
  TileTerrainModification
} from './types.js';

let sqlStaticPromise: Promise<SqlJsStatic> | null = null;

async function getSqlStatic(): Promise<SqlJsStatic> {
  if (!sqlStaticPromise) {
    sqlStaticPromise = initSqlJs();
  }
  return sqlStaticPromise;
}

export class TilePersistenceDatabase {
  private db: Database;

  private constructor(db: Database) {
    this.db = db;
    this.initializeSchema();
  }

  /**
   * Inicializa una base de datos SQLite en memoria o a partir de un buffer binario.
   */
  public static async create(initialData?: Uint8Array): Promise<TilePersistenceDatabase> {
    const SQL = await getSqlStatic();
    const db = initialData ? new SQL.Database(initialData) : new SQL.Database();
    return new TilePersistenceDatabase(db);
  }

  /**
   * Carga una base de datos SQLite persistente desde un archivo en disco.
   */
  public static async loadFromFile(filePath: string): Promise<TilePersistenceDatabase> {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return TilePersistenceDatabase.create(new Uint8Array(buffer));
    }
    return TilePersistenceDatabase.create();
  }

  /**
   * Guarda el estado completo de la base de datos SQLite a un archivo en disco.
   */
  public saveToFile(filePath: string): void {
    const data = this.db.export();
    fs.writeFileSync(filePath, Buffer.from(data));
  }

  /**
   * Exporta la base de datos como buffer binario (Uint8Array) para transporte en red o snapshots.
   */
  public exportBinary(): Uint8Array {
    return this.db.export();
  }

  private initializeSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tile_versions (
        tile_id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        last_modified_tick INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tile_terrain_deltas (
        tile_id TEXT NOT NULL,
        vertex_index INTEGER NOT NULL,
        height_delta REAL NOT NULL,
        biome_override TEXT,
        PRIMARY KEY (tile_id, vertex_index)
      );

      CREATE TABLE IF NOT EXISTS tile_roads (
        road_id TEXT PRIMARY KEY,
        tile_id TEXT NOT NULL,
        road_type TEXT NOT NULL,
        u_start REAL NOT NULL,
        v_start REAL NOT NULL,
        u_end REAL NOT NULL,
        v_end REAL NOT NULL,
        width_meters REAL NOT NULL,
        condition REAL NOT NULL,
        created_at_tick INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tile_resource_deposits (
        deposit_id TEXT PRIMARY KEY,
        tile_id TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        initial_reserve REAL NOT NULL,
        current_reserve REAL NOT NULL,
        depleted_amount REAL NOT NULL,
        is_depleted INTEGER NOT NULL,
        last_extracted_tick INTEGER NOT NULL
      );
    `);
  }

  /**
   * Aplica un conjunto de modificaciones de relieve (excavaciones / terraplenes)
   * de forma atómica en una transacción ACID, incrementando la versión del tile.
   */
  public applyTerrainDeltas(
    tileId: string,
    deltas: TileTerrainModification[],
    tick: number
  ): number {
    this.db.run('BEGIN TRANSACTION');
    try {
      // 1. Obtener o inicializar versión
      let version = 1;
      const verStmt = this.db.prepare('SELECT version FROM tile_versions WHERE tile_id = ?');
      verStmt.bind([tileId]);
      if (verStmt.step()) {
        const row = verStmt.getAsObject();
        version = Number(row.version) + 1;
      }
      verStmt.free();

      // 2. Insertar o actualizar deltas de vértices
      for (const delta of deltas) {
        this.db.run(
          `INSERT INTO tile_terrain_deltas (tile_id, vertex_index, height_delta, biome_override)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(tile_id, vertex_index) DO UPDATE SET
             height_delta = height_delta + excluded.height_delta,
             biome_override = COALESCE(excluded.biome_override, tile_terrain_deltas.biome_override);`,
          [tileId, delta.vertexIndex, delta.heightDeltaMeters, delta.biomeOverride ?? null]
        );
      }

      // 3. Actualizar versión del tile
      this.db.run(
        `INSERT INTO tile_versions (tile_id, version, last_modified_tick)
         VALUES (?, ?, ?)
         ON CONFLICT(tile_id) DO UPDATE SET
           version = excluded.version,
           last_modified_tick = excluded.last_modified_tick;`,
        [tileId, version, tick]
      );

      this.db.run('COMMIT');
      return version;
    } catch (err) {
      this.db.run('ROLLBACK');
      throw err;
    }
  }

  /**
   * Registra un segmento de carretera en la tesela en una transacción atómica.
   */
  public saveRoadSegment(road: RoadSegment, tick: number): number {
    this.db.run('BEGIN TRANSACTION');
    try {
      // 1. Version bump
      let version = 1;
      const verStmt = this.db.prepare('SELECT version FROM tile_versions WHERE tile_id = ?');
      verStmt.bind([road.tileId]);
      if (verStmt.step()) {
        const row = verStmt.getAsObject();
        version = Number(row.version) + 1;
      }
      verStmt.free();

      // 2. Insertar carretera
      this.db.run(
        `INSERT INTO tile_roads (road_id, tile_id, road_type, u_start, v_start, u_end, v_end, width_meters, condition, created_at_tick)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(road_id) DO UPDATE SET
           condition = excluded.condition;`,
        [
          road.roadId,
          road.tileId,
          road.roadType,
          road.uStart,
          road.vStart,
          road.uEnd,
          road.vEnd,
          road.widthMeters,
          road.condition,
          road.createdAtTick
        ]
      );

      // 3. Actualizar versión
      this.db.run(
        `INSERT INTO tile_versions (tile_id, version, last_modified_tick)
         VALUES (?, ?, ?)
         ON CONFLICT(tile_id) DO UPDATE SET
           version = excluded.version,
           last_modified_tick = excluded.last_modified_tick;`,
        [road.tileId, version, tick]
      );

      this.db.run('COMMIT');
      return version;
    } catch (err) {
      this.db.run('ROLLBACK');
      throw err;
    }
  }

  /**
   * Registra un depósito de recursos natural en una tesela.
   */
  public registerDeposit(deposit: TileResourceDeposit): void {
    this.db.run(
      `INSERT INTO tile_resource_deposits (deposit_id, tile_id, resource_id, initial_reserve, current_reserve, depleted_amount, is_depleted, last_extracted_tick)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(deposit_id) DO UPDATE SET
         current_reserve = excluded.current_reserve,
         depleted_amount = excluded.depleted_amount,
         is_depleted = excluded.is_depleted,
         last_extracted_tick = excluded.last_extracted_tick;`,
      [
        deposit.depositId,
        deposit.tileId,
        deposit.resourceId,
        deposit.initialReserve,
        deposit.currentReserve,
        deposit.depletedAmount,
        deposit.isDepleted ? 1 : 0,
        deposit.lastExtractedTick
      ]
    );
  }

  /**
   * Extrae recursos de un depósito respetando la ley física de conservación material.
   * Si la reserva no es suficiente o ya está agotado, arroja error impidiendo extracción fantasma.
   */
  public extractResource(
    depositId: string,
    amount: number,
    tick: number
  ): {
    currentReserve: number;
    depletedAmount: number;
    isDepleted: boolean;
  } {
    if (amount <= 0) {
      throw new Error(`La cantidad a extraer debe ser positiva (${amount}).`);
    }

    this.db.run('BEGIN TRANSACTION');
    try {
      const stmt = this.db.prepare(
        'SELECT tile_id, current_reserve, depleted_amount, is_depleted FROM tile_resource_deposits WHERE deposit_id = ?'
      );
      stmt.bind([depositId]);
      if (!stmt.step()) {
        stmt.free();
        throw new Error(`Depósito no encontrado: ${depositId}`);
      }

      const row = stmt.getAsObject();
      stmt.free();

      const current = Number(row.current_reserve);
      const prevDepleted = Number(row.depleted_amount);
      const isDepleted = Boolean(row.is_depleted);
      const tileId = String(row.tile_id);

      if (isDepleted || current <= 0) {
        throw new Error(`El yacimiento ${depositId} está completamente agotado.`);
      }

      if (current < amount) {
        throw new Error(
          `Extracción excedida: Solicitado ${amount}, disponible en yacimiento: ${current}.`
        );
      }

      const newCurrent = current - amount;
      const newDepleted = prevDepleted + amount;
      const nowDepleted = newCurrent <= 0.0001 ? 1 : 0;

      // Actualizar depósito
      this.db.run(
        `UPDATE tile_resource_deposits
         SET current_reserve = ?, depleted_amount = ?, is_depleted = ?, last_extracted_tick = ?
         WHERE deposit_id = ?;`,
        [newCurrent, newDepleted, nowDepleted, tick, depositId]
      );

      // Incrementar versión del tile afectado
      let version = 1;
      const verStmt = this.db.prepare('SELECT version FROM tile_versions WHERE tile_id = ?');
      verStmt.bind([tileId]);
      if (verStmt.step()) {
        const vRow = verStmt.getAsObject();
        version = Number(vRow.version) + 1;
      }
      verStmt.free();

      this.db.run(
        `INSERT INTO tile_versions (tile_id, version, last_modified_tick)
         VALUES (?, ?, ?)
         ON CONFLICT(tile_id) DO UPDATE SET
           version = excluded.version,
           last_modified_tick = excluded.last_modified_tick;`,
        [tileId, version, tick]
      );

      this.db.run('COMMIT');

      return {
        currentReserve: newCurrent,
        depletedAmount: newDepleted,
        isDepleted: Boolean(nowDepleted)
      };
    } catch (err) {
      this.db.run('ROLLBACK');
      throw err;
    }
  }

  /**
   * Obtiene el estado persistido completo de una tesela (versión, deltas, carreteras, depósitos).
   */
  public getTileState(tileId: string): TilePersistedState {
    let version = 0;
    let lastModifiedTick = 0;

    const verStmt = this.db.prepare('SELECT version, last_modified_tick FROM tile_versions WHERE tile_id = ?');
    verStmt.bind([tileId]);
    if (verStmt.step()) {
      const row = verStmt.getAsObject();
      version = Number(row.version);
      lastModifiedTick = Number(row.last_modified_tick);
    }
    verStmt.free();

    // Modificaciones
    const modifications: TileTerrainModification[] = [];
    const deltasStmt = this.db.prepare('SELECT vertex_index, height_delta, biome_override FROM tile_terrain_deltas WHERE tile_id = ?');
    deltasStmt.bind([tileId]);
    while (deltasStmt.step()) {
      const row = deltasStmt.getAsObject();
      modifications.push({
        tileId,
        vertexIndex: Number(row.vertex_index),
        heightDeltaMeters: Number(row.height_delta),
        biomeOverride: row.biome_override ? String(row.biome_override) : undefined
      });
    }
    deltasStmt.free();

    // Carreteras
    const roads: RoadSegment[] = [];
    const roadsStmt = this.db.prepare('SELECT * FROM tile_roads WHERE tile_id = ?');
    roadsStmt.bind([tileId]);
    while (roadsStmt.step()) {
      const row = roadsStmt.getAsObject();
      roads.push({
        roadId: String(row.road_id),
        tileId: String(row.tile_id),
        roadType: String(row.road_type) as RoadType,
        uStart: Number(row.u_start),
        vStart: Number(row.v_start),
        uEnd: Number(row.u_end),
        vEnd: Number(row.v_end),
        widthMeters: Number(row.width_meters),
        condition: Number(row.condition),
        createdAtTick: Number(row.created_at_tick)
      });
    }
    roadsStmt.free();

    // Depósitos
    const deposits: TileResourceDeposit[] = [];
    const depStmt = this.db.prepare('SELECT * FROM tile_resource_deposits WHERE tile_id = ?');
    depStmt.bind([tileId]);
    while (depStmt.step()) {
      const row = depStmt.getAsObject();
      deposits.push({
        depositId: String(row.deposit_id),
        tileId: String(row.tile_id),
        resourceId: String(row.resource_id),
        initialReserve: Number(row.initial_reserve),
        currentReserve: Number(row.current_reserve),
        depletedAmount: Number(row.depleted_amount),
        isDepleted: Boolean(row.is_depleted),
        lastExtractedTick: Number(row.last_extracted_tick)
      });
    }
    depStmt.free();

    return {
      tileId,
      version,
      lastModifiedTick,
      modifications,
      roads,
      deposits
    };
  }

  public close(): void {
    this.db.close();
  }
}

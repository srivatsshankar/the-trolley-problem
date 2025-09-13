/**
 * GroundSystem - Provides an "infinite" tiling ground under the tracks.
 * Keeps a grid of tiles centered around a target (trolley or camera)
 * and repositions tiles as the target moves.
 */
import * as THREE from 'three';

export interface GroundSystemConfig {
  tileSize?: number;        // Size of each ground tile (world units)
  gridHalfExtent?: number;  // Number of tiles to each side of center (1 => 3x3)
  color?: number;           // Ground color
  receiveShadows?: boolean; // Whether tiles receive shadows
}

export class GroundSystem {
  private scene: THREE.Scene;
  private config: Required<GroundSystemConfig>;
  private tiles: THREE.Mesh[] = [];
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshLambertMaterial;
  private currentCenterTile: { ix: number; iz: number } = { ix: 0, iz: 0 };

  constructor(scene: THREE.Scene, config?: GroundSystemConfig) {
    this.scene = scene;
    this.config = {
      tileSize: 200,
      gridHalfExtent: 1, // 3x3 grid by default
      color: 0x90EE90,   // light green
      receiveShadows: true,
      ...config,
    } as Required<GroundSystemConfig>;

    this.geometry = new THREE.PlaneGeometry(this.config.tileSize, this.config.tileSize);
    this.material = new THREE.MeshLambertMaterial({ color: this.config.color });
  }

  /** Initialize tiles and add to scene */
  public initialize(initialTarget: THREE.Vector3 = new THREE.Vector3()): void {
    const { gridHalfExtent } = this.config;

    // Clear any existing
    this.dispose();

    const center = this.worldToTile(initialTarget);
    this.currentCenterTile = center;

    for (let dz = -gridHalfExtent; dz <= gridHalfExtent; dz++) {
      for (let dx = -gridHalfExtent; dx <= gridHalfExtent; dx++) {
        const mesh = new THREE.Mesh(this.geometry, this.material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = this.config.receiveShadows;
        mesh.frustumCulled = false; // Never cull ground tiles

        const tileX = (center.ix + dx) * this.config.tileSize;
        const tileZ = (center.iz + dz) * this.config.tileSize;
        mesh.position.set(tileX, 0, tileZ);

        this.tiles.push(mesh);
        this.scene.add(mesh);
      }
    }
  }

  /** Update tile positions based on target location */
  public update(target: THREE.Vector3): void {
    const neededCenter = this.worldToTile(target);
    if (neededCenter.ix === this.currentCenterTile.ix && neededCenter.iz === this.currentCenterTile.iz) {
      return; // still within current center tile
    }

    // Shift tiles to new center
    this.currentCenterTile = neededCenter;
    this.layoutTiles();
  }

  /** Arrange the existing tile meshes around current center */
  private layoutTiles(): void {
    const { gridHalfExtent, tileSize } = this.config;
    let i = 0;
    for (let dz = -gridHalfExtent; dz <= gridHalfExtent; dz++) {
      for (let dx = -gridHalfExtent; dx <= gridHalfExtent; dx++) {
        const mesh = this.tiles[i++];
        const tileX = (this.currentCenterTile.ix + dx) * tileSize;
        const tileZ = (this.currentCenterTile.iz + dz) * tileSize;
        mesh.position.set(tileX, 0, tileZ);
      }
    }
  }

  /** Convert world position to tile indices */
  private worldToTile(pos: THREE.Vector3): { ix: number; iz: number } {
    const { tileSize } = this.config;
    const ix = Math.floor(pos.x / tileSize);
    const iz = Math.floor(pos.z / tileSize);
    return { ix, iz };
  }

  /** Dispose meshes/materials/geometry */
  public dispose(): void {
    if (this.tiles.length) {
      this.tiles.forEach(t => {
        this.scene.remove(t);
        // geometry/material are shared, don't dispose per-tile
      });
      this.tiles = [];
    }
  }
}

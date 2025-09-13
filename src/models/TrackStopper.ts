/**
 * TrackStopper - Traditional wooden railway buffer at the end of tracks
 * Consists of a thick wooden buffer beam, wooden support posts, and metal reinforcement
 */

import * as THREE from 'three';

export interface TrackStopperConfig {
  bufferWidth: number;
  bufferHeight: number;
  bufferDepth: number;
  postWidth: number;
  postHeight: number;
  postDepth: number;
  bumpWidth: number;
  bumpHeight: number;
  bumpDepth: number;
  bufferColor: number;
  postColor: number;
  bumpColor: number;
  position: THREE.Vector3;
}

export class TrackStopper {
  private group: THREE.Group;
  private buffer!: THREE.Mesh;
  private posts: THREE.Mesh[] = [];
  private bumps: THREE.Mesh[] = [];
  private config: TrackStopperConfig;

  constructor(config: TrackStopperConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = 'TrackStopper';

    this.createModel();
    this.positionModel();
  }

  /**
   * Create the 3D model components
   */
  private createModel(): void {
    this.createBuffer();
    this.createPosts();
    this.createBumps();
  }

  /**
   * Create the main buffer block
   */
  private createBuffer(): void {
    const bufferGeometry = new THREE.BoxGeometry(
      this.config.bufferWidth,
      this.config.bufferHeight,
      this.config.bufferDepth
    );

    const bufferMaterial = new THREE.MeshLambertMaterial({
      color: this.config.bufferColor
    });

    this.buffer = new THREE.Mesh(bufferGeometry, bufferMaterial);
    this.buffer.castShadow = true;
    this.buffer.receiveShadow = true;
    this.buffer.name = 'TrackStopperBuffer';

    this.group.add(this.buffer);
  }

  /**
   * Create the supporting posts
   */
  private createPosts(): void {
    const postGeometry = new THREE.BoxGeometry(
      this.config.postWidth,
      this.config.postHeight,
      this.config.postDepth
    );

    const postMaterial = new THREE.MeshLambertMaterial({
      color: this.config.postColor
    });

    // Create two posts positioned at the ends of the buffer
    const postSpacing = this.config.bufferWidth - this.config.postWidth;
    const postPositions = [
      new THREE.Vector3(-postSpacing / 2, 0, 0),
      new THREE.Vector3(postSpacing / 2, 0, 0)
    ];

    for (let i = 0; i < 2; i++) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.copy(postPositions[i]);
      post.position.y = -this.config.bufferHeight / 2 - this.config.postHeight / 2;
      post.castShadow = true;
      post.receiveShadow = true;
      post.name = `TrackStopperPost${i}`;

      this.posts.push(post);
      this.group.add(post);
    }
  }

  /**
   * Create cushioned bumpers to soften momentum
   */
  private createBumps(): void {
    // Create cylindrical rubber/cushioned bumpers
    const bumperGeometry = new THREE.CylinderGeometry(
      this.config.bumpWidth / 2,  // radius
      this.config.bumpWidth / 2,  // radius
      this.config.bumpHeight,     // height
      16                          // segments for smooth cylinder
    );

    const bumperMaterial = new THREE.MeshLambertMaterial({
      color: this.config.bumpColor
    });

    // Create two large cushioned bumpers positioned at track width
    const bumperPositions = [
      new THREE.Vector3(-this.config.bufferWidth * 0.3, 0, this.config.bufferDepth / 2 + this.config.bumpDepth / 2),
      new THREE.Vector3(this.config.bufferWidth * 0.3, 0, this.config.bufferDepth / 2 + this.config.bumpDepth / 2)
    ];

    for (let i = 0; i < 2; i++) {
      const bumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
      bumper.position.copy(bumperPositions[i]);
      bumper.rotation.x = Math.PI / 2; // Rotate to face forward
      bumper.castShadow = true;
      bumper.receiveShadow = true;
      bumper.name = `TrackStopperBumper${i}`;

      this.bumps.push(bumper);
      this.group.add(bumper);
    }
  }

  /**
   * Position the entire model
   */
  private positionModel(): void {
    this.group.position.copy(this.config.position);
  }

  /**
   * Get the 3D group for adding to scene
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Get the position of the track stopper
   */
  public getPosition(): THREE.Vector3 {
    return this.config.position.clone();
  }

  /**
   * Set new position
   */
  public setPosition(newPosition: THREE.Vector3): void {
    this.config.position.copy(newPosition);
    this.group.position.copy(this.config.position);
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

/**
 * Create a traditional wooden railway buffer positioned behind the trolley
 */
export function createTrackStopper(position: THREE.Vector3): TrackStopper {
  const config: TrackStopperConfig = {
    // Narrower wooden buffer beam to match track width
    bufferWidth: 4.0,
    bufferHeight: 1.2,
    bufferDepth: 0.8,
    // Wooden support posts
    postWidth: 0.3,
    postHeight: 2.5,
    postDepth: 0.3,
    // Large cylindrical bumpers for momentum absorption
    bumpWidth: 1.2,
    bumpHeight: 0.6,
    bumpDepth: 0.4,
    // Traditional railway wood colors - weathered timber
    bufferColor: 0x8B4513,  // Saddle brown - main wooden beam
    postColor: 0x654321,    // Dark brown - support posts
    bumpColor: 0x2F4F4F,    // Dark slate gray - rubber/cushioned bumpers
    position: position
  };

  return new TrackStopper(config);
}

import * as THREE from 'three';

export interface GameOver3DConfig {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
}

export class GameOver3D {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private group: THREE.Group = new THREE.Group();
  private buttons: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredButton: THREE.Mesh | null = null;
  private isVisible = false;
  private animationId?: number;
  private time = 0;

  // Elements
  private titleGroup?: THREE.Group;
  private subtitleGroup?: THREE.Group;
  private scoreGroup?: THREE.Group;
  private hitGroup?: THREE.Group;
  private avoidedGroup?: THREE.Group;

  // Callbacks
  private onRideAgain?: () => void;
  private onMainMenu?: () => void;

  constructor(cfg: GameOver3DConfig) {
    this.scene = cfg.scene;
    this.camera = cfg.camera;
    this.renderer = cfg.renderer;
    this.loadFont().then(() => this.build());
    this.setupEvents();
  }

  private async loadFont(): Promise<void> {
    try {
      const fontFace = new FontFace('Minecraft', 'url(./assets/fonts/Minecraft.ttf)');
      const loaded = await fontFace.load();
      document.fonts.add(loaded);
      console.log('GameOver3D: Minecraft font loaded');
    } catch (e) {
      console.warn('GameOver3D: Failed to load Minecraft font', e);
    }
  }

  private build(): void {
    // Title
    this.titleGroup = this.create3DTitle('GAME OVER');
    this.titleGroup.position.y = 6.0;
    this.group.add(this.titleGroup);

    // Subtitle (bobbing)
    this.subtitleGroup = this.createLayeredText('THANK YOU FOR RIDING', 56, '#FFFFFF', true);
    this.subtitleGroup.position.set(0, 4.0, 0.6);
    this.group.add(this.subtitleGroup);

    // Stats
    this.scoreGroup = this.createLayeredText('Final Score: 0', 46, '#FFFFFF', true);
    this.scoreGroup.position.set(0, 2.2, 0.6);
    this.group.add(this.scoreGroup);

    this.hitGroup = this.createLayeredText('People Hit: 0', 40, '#4A90E2', true);
    this.hitGroup.position.set(0, 0.9, 0.6);
    this.group.add(this.hitGroup);

    this.avoidedGroup = this.createLayeredText('People Avoided: 0', 40, '#E24A4A', true);
    this.avoidedGroup.position.set(0, -0.2, 0.6);
    this.group.add(this.avoidedGroup);

    // Buttons
    const rideAgain = this.create3DButton('Ride Again', -3.0, () => this.onRideAgain?.());
    const mainMenu = this.create3DButton('Main Menu', -5.2, () => this.onMainMenu?.());
    this.buttons.push(rideAgain, mainMenu);
    this.group.add(rideAgain, mainMenu);

    // Face camera
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.group.lookAt(
      this.group.position.x - dir.x,
      this.group.position.y - dir.y,
      this.group.position.z - dir.z
    );

    this.scene.add(this.group);
    // Hidden by default; only show when explicitly requested
    this.group.visible = false;
  }

  private create3DTitle(text: string): THREE.Group {
    const group = new THREE.Group();
    const letters = text.split('');
    const letterWidth = 0.8;
    const totalWidth = letters.length * letterWidth;
    const startX = -totalWidth / 2;
    letters.forEach((ch, i) => {
      if (ch === ' ') return;
      const letterGroup = this.create3DLetter(ch);
      letterGroup.position.x = startX + i * letterWidth;
      letterGroup.userData = { originalY: 0 };
      group.add(letterGroup);
    });
    return group;
  }

  private create3DLetter(ch: string): THREE.Group {
    const g = new THREE.Group();
    const depthLayers = 15;
    const layerDepth = 0.02;
    for (let i = 0; i < depthLayers; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 128; canvas.height = 128;
      const fontFamily = document.fonts.check('1px Minecraft') ? 'Minecraft' : 'monospace';
      ctx.font = 'bold 100px ' + fontFamily;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // Fill
      const progress = i / (depthLayers - 1);
      const gray = Math.floor(255 * (1 - progress * 0.6));
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      // Stroke only on front
      if (i === 0) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4; // Strong outline
        ctx.strokeText(ch, 64, 64);
      }
      ctx.fillText(ch, 64, 64);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshPhongMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
      const geom = new THREE.PlaneGeometry(1.2, 1.5);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = -i * layerDepth;
      g.add(mesh);
    }
    return g;
  }

  private createLayeredText(text: string, size: number, color: string, outline: boolean): THREE.Group {
    const group = new THREE.Group();
    const layers = [
      { z: -0.12, color: '#111111' },
      { z: -0.08, color: '#333333' },
      { z: -0.04, color: '#666666' },
      { z: 0.0, color }
    ];
    layers.forEach((layer, idx) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 1400; canvas.height = Math.ceil(size * 2.6);
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0,0,canvas.width, canvas.height);
      const fontFamily = document.fonts.check('1px Minecraft') ? 'Minecraft' : 'Arial, sans-serif';
      ctx.font = `${size}px ${fontFamily}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (outline && idx === layers.length - 1) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2, Math.floor(size * 0.06));
        ctx.strokeText(text, canvas.width/2, canvas.height/2);
      }
      ctx.fillStyle = layer.color;
      ctx.fillText(text, canvas.width/2, canvas.height/2);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
      const aspect = canvas.width / canvas.height;
      const heightUnits = Math.max(0.9, size / 40); // scale approx by font size
      const widthUnits = heightUnits * aspect;
      const geom = new THREE.PlaneGeometry(widthUnits, heightUnits);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = layer.z;
      group.add(mesh);
    });
    return group as any;
  }

  private create3DButton(text: string, y: number, cb: () => void): THREE.Mesh {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 1.6, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xFF4444 })
    );
    body.castShadow = true; body.receiveShadow = true;
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(6.3, 1.7, 0.25),
      new THREE.MeshLambertMaterial({ color: 0xCC2222 })
    );
    border.position.z = -0.05;
    body.add(border);
    group.add(body);

    const textMesh = this.createButtonText(text);
    textMesh.position.z = 0.61;
    group.add(textMesh);

    group.position.set(0, y, 0.6);
    group.rotation.x = -0.05; group.rotation.y = 0.03;
    group.traverse((o) => { if ((o as any).isMesh) (o as THREE.Mesh).renderOrder = 1; });

    group.userData = {
      callback: cb,
      originalColor: 0xFF4444,
      hoverColor: 0xFF6666,
      currentColor: 0xFF4444,
      targetColor: 0xFF4444,
      transitionSpeed: 0.1,
      buttonMesh: body,
      originalRotationX: -0.05,
      originalRotationY: 0.03
    };

    return group as any;
  }

  private createButtonText(text: string): THREE.Mesh {
    const group = new THREE.Group();
    const layers = [
      { z: -0.12, color: '#000000', size: 72 },
      { z: -0.06, color: '#AA0000', size: 72 },
      { z: 0, color: '#FFFFFF', size: 70 }
    ];
    layers.forEach((layer, index) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 1200; canvas.height = 180;
      const fontFamily = document.fonts.check('1px Minecraft') ? 'Minecraft' : 'Arial, sans-serif';
      ctx.font = `${layer.size}px ${fontFamily}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (index === layers.length - 1) {
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
        ctx.strokeText(text, canvas.width/2, canvas.height/2);
      }
      ctx.fillStyle = layer.color;
      ctx.fillText(text, canvas.width/2, canvas.height/2);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
      const geom = new THREE.PlaneGeometry(5.8, 1.3);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = layer.z;
      group.add(mesh);
    });
    return group as any;
  }

  private setupEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('click', () => this.onClick());
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isVisible) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.buttons, true);
    if (this.hoveredButton) { this.resetHover(this.hoveredButton); this.hoveredButton = null; }
    if (intersects.length > 0) {
      const btn = this.findButton(intersects[0]);
      if (btn) { this.applyHover(btn); this.hoveredButton = btn; this.renderer.domElement.style.cursor = 'pointer'; }
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private onClick(): void {
    if (!this.isVisible) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.buttons, true);
    if (intersects.length > 0) {
      const btn = this.findButton(intersects[0]);
      if (btn && btn.userData.callback) btn.userData.callback();
    }
  }

  private findButton(intersect: THREE.Intersection): THREE.Mesh | null {
    let obj = intersect.object;
    while (obj.parent && !this.buttons.includes(obj as THREE.Mesh)) obj = obj.parent;
    return this.buttons.includes(obj as THREE.Mesh) ? (obj as THREE.Mesh) : null;
  }

  private applyHover(button: THREE.Mesh): void {
    button.userData.targetColor = button.userData.hoverColor;
    button.position.z = 0.8;
    button.scale.setScalar(1.1);
    button.rotation.x = (button.userData.originalRotationX || -0.05) - 0.03;
    button.rotation.y = (button.userData.originalRotationY || 0.03) + 0.01;
  }
  private resetHover(button: THREE.Mesh): void {
    button.userData.targetColor = button.userData.originalColor;
    button.position.z = 0.6;
    button.scale.setScalar(1.0);
    button.rotation.x = button.userData.originalRotationX || -0.05;
    button.rotation.y = button.userData.originalRotationY || 0.03;
  }

  private updateTransitions(): void {
    this.buttons.forEach(btn => {
      const ud = btn.userData;
      if (ud.currentColor !== ud.targetColor) {
        const cur = new THREE.Color(ud.currentColor);
        const tgt = new THREE.Color(ud.targetColor);
        cur.lerp(tgt, ud.transitionSpeed);
        ud.currentColor = cur.getHex();
        const mesh = ud.buttonMesh as THREE.Mesh;
        if (mesh && mesh.material instanceof THREE.MeshLambertMaterial) {
          mesh.material.color.setHex(ud.currentColor);
        }
      }
    });
  }

  private animate = (): void => {
    if (!this.isVisible) return;
    this.time += 0.016;
    this.updateTransitions();
    // Subtitle bobbing
    if (this.subtitleGroup) {
      const baseY = 4.0;
      const offset = Math.sin(this.time * 1.6) * 0.18;
      this.subtitleGroup.position.y = baseY + offset;
    }
    this.animationId = requestAnimationFrame(this.animate);
  };

  public setStats(stats: { score: number; peopleHit: number; peopleAvoided: number; }): void {
    // Rebuild text groups for updated values
    const replace = (oldGroup: THREE.Group | undefined, newGroup: THREE.Group, pos: THREE.Vector3) => {
      if (oldGroup) this.group.remove(oldGroup);
      newGroup.position.copy(pos);
      this.group.add(newGroup);
      return newGroup;
    };
    this.scoreGroup = replace(this.scoreGroup, this.createLayeredText(`Final Score: ${stats.score}`, 46, '#FFFFFF', true), new THREE.Vector3(0, 2.2, 0.6));
    this.hitGroup = replace(this.hitGroup, this.createLayeredText(`People Hit: ${stats.peopleHit}`, 40, '#4A90E2', true), new THREE.Vector3(0, 0.9, 0.6));
    this.avoidedGroup = replace(this.avoidedGroup, this.createLayeredText(`People Avoided: ${stats.peopleAvoided}`, 40, '#E24A4A', true), new THREE.Vector3(0, -0.2, 0.6));
  }

  public onRideAgainCallback(cb: () => void): void { this.onRideAgain = cb; }
  public onMainMenuCallback(cb: () => void): void { this.onMainMenu = cb; }

  public show(): void {
    this.group.visible = true;
    this.isVisible = true;
    this.animate();
  }
  public hide(): void {
    this.group.visible = false;
    this.isVisible = false;
    if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = undefined; }
    if (this.hoveredButton) { this.resetHover(this.hoveredButton); this.hoveredButton = null; }
  }

  public dispose(): void {
    this.hide();
    this.scene.remove(this.group);
    this.group.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose()); else c.material.dispose();
      }
    });
  }
}

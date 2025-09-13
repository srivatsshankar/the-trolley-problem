/**
 * Menu3D - 3D menu component using Three.js
 * Provides 3D "Start Ride", "Options", and "Instructions" buttons with 3D "Trolley Problem" title
 */

import * as THREE from 'three';
import { createTrolley, Trolley } from '../models/Trolley';

export interface Menu3DConfig {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
}

export class Menu3D {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private menuGroup: THREE.Group;
  private buttons: THREE.Mesh[] = [];
  private titleGroup?: THREE.Group;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredButton: THREE.Mesh | null = null;
  private isVisible: boolean = false;

  // Animation properties
  private animationTime: number = 0;
  private animationId?: number;

  // Decorative trolley beneath the menu
  private trolleyContainer?: THREE.Group;
  private trolley?: Trolley;

  // Background removed

  // Callbacks
  private onStartGame?: () => void;
  private onShowOptions?: () => void;
  private onShowInstructions?: () => void;

  constructor(config: Menu3DConfig) {
    this.scene = config.scene;
    this.camera = config.camera;
    this.renderer = config.renderer;
    this.menuGroup = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();


    this.loadFontAndCreateMenu();
    this.setupEventListeners();
  }

  /**
   * Load font and create menu
   */
  private loadFontAndCreateMenu(): void {
    // For now, we'll use canvas-based 3D text since TTF conversion is complex
    // This will create 3D-looking text using canvas textures with proper depth
    console.log('Creating menu with custom font styling...');
    this.createMenuWithCustomFont();
  }



  /**
   * Create menu with custom font styling
   */
  private createMenuWithCustomFont(): void {
    // Load the Minecraft font first
    this.loadMinecraftFont().then(() => {
      // Create 3D-styled title using the custom font
      this.create3DStyledTitle();

      // Create 3D buttons with custom font
      this.create3DStyledButtons();

      // Position the menu group to face the camera directly
      this.menuGroup.position.set(0, 0, 0);

      // Make the menu face the camera by rotating it
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      this.menuGroup.lookAt(
        this.menuGroup.position.x - cameraDirection.x,
        this.menuGroup.position.y - cameraDirection.y,
        this.menuGroup.position.z - cameraDirection.z
      );

      this.scene.add(this.menuGroup);

      // Add a decorative trolley underneath the buttons
      this.addDecorativeTrolley();
    });
  }

  /**
   * Load Minecraft font via CSS
   */
  private async loadMinecraftFont(): Promise<void> {
    return new Promise((resolve) => {
      // Create font face
      const fontFace = new FontFace('Minecraft', 'url(/src/assets/fonts/Minecraft.ttf)');

      fontFace.load().then((loadedFont) => {
        document.fonts.add(loadedFont);
        console.log('Minecraft font loaded successfully');
        resolve();
      }).catch((error) => {
        console.warn('Could not load Minecraft font:', error);
        resolve(); // Continue anyway with fallback
      });
    });
  }

  /**
   * Create a 3D blocky cloud using Three.js boxes with varied shapes and better shadows
   */
  private create3DBlockyCloud(index: number = 0): THREE.Group {
    const cloudGroup = new THREE.Group();
    
    // Fuller, brighter material with lighting
    const cloudMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      emissive: 0x9a9a9a,
      transparent: false,
      opacity: 1.0,
      shininess: 10,
      specular: 0xaaaaaa
    });

    // Varied, picturesque patterns with added depth and fullness
    const cloudPatterns = [
      // Pattern 0: Classic cumulus cloud (full center, rounded top, thick base)
      [
        { x: 0, y: 0, z: 0, size: 0.9 },
        { x: 0.9, y: 0.05, z: 0, size: 0.7 },
        { x: -0.9, y: 0.05, z: 0, size: 0.7 },
        { x: 1.6, y: 0.1, z: 0, size: 0.55 },
        { x: -1.6, y: 0.1, z: 0, size: 0.55 },
        { x: 0.45, y: 0.7, z: 0.05, size: 0.55 },
        { x: -0.45, y: 0.7, z: 0.05, size: 0.55 },
        { x: 0, y: 1.0, z: 0.05, size: 0.5 },
        { x: 0.35, y: 1.2, z: 0.05, size: 0.4 },
        { x: -0.35, y: 1.2, z: 0.05, size: 0.4 },
        // back/front depth for fullness
        { x: 0.2, y: 0.2, z: 0.25, size: 0.6 },
        { x: -0.2, y: 0.2, z: -0.25, size: 0.6 },
        // thicker base
        { x: 0.8, y: -0.35, z: 0.05, size: 0.45 },
        { x: -0.8, y: -0.35, z: 0.05, size: 0.45 },
        { x: 0, y: -0.4, z: 0.1, size: 0.55 }
      ],
      // Pattern 1: Stretched horizontal cloud (flat, scenic)
      [
        { x: 0, y: 0, z: 0, size: 0.75 },
        { x: 1.2, y: 0.05, z: 0, size: 0.8 },
        { x: -1.2, y: 0.05, z: 0, size: 0.8 },
        { x: 2.1, y: 0.1, z: 0.02, size: 0.55 },
        { x: -2.1, y: 0.1, z: -0.02, size: 0.55 },
        { x: 2.6, y: 0.0, z: 0.03, size: 0.45 },
        { x: -2.6, y: 0.0, z: -0.03, size: 0.45 },
        { x: 0.6, y: 0.5, z: 0.02, size: 0.55 },
        { x: -0.6, y: 0.5, z: -0.02, size: 0.55 },
        { x: 1.6, y: 0.35, z: 0.02, size: 0.45 },
        { x: -1.6, y: 0.35, z: -0.02, size: 0.45 },
        { x: 0, y: 0.65, z: 0.02, size: 0.45 }
      ],
      // Pattern 2: Tall puffy cloud (towering)
      [
        { x: 0, y: 0, z: 0, size: 0.95 },
        { x: 0.7, y: 0, z: 0.03, size: 0.65 },
        { x: -0.7, y: 0, z: -0.03, size: 0.65 },
        { x: 0, y: 0.8, z: 0.02, size: 0.8 },
        { x: 0.45, y: 0.9, z: 0.02, size: 0.55 },
        { x: -0.45, y: 0.9, z: -0.02, size: 0.55 },
        { x: 0, y: 1.35, z: 0.02, size: 0.65 },
        { x: 0.3, y: 1.55, z: 0.02, size: 0.45 },
        { x: -0.3, y: 1.55, z: -0.02, size: 0.45 },
        { x: 0, y: 1.85, z: 0.02, size: 0.35 },
        { x: 0.55, y: 0.45, z: 0.18, size: 0.45 },
        { x: -0.55, y: 0.45, z: -0.18, size: 0.45 }
      ],
      // Pattern 3: Wispy scattered (more cohesive than before)
      [
        { x: 0, y: 0, z: 0, size: 0.6 },
        { x: 1.3, y: 0.2, z: 0.02, size: 0.5 },
        { x: -1.3, y: 0.2, z: -0.02, size: 0.5 },
        { x: 2.1, y: 0.1, z: 0.02, size: 0.4 },
        { x: -2.1, y: 0.1, z: -0.02, size: 0.4 },
        { x: 0.7, y: 0.55, z: 0.02, size: 0.35 },
        { x: -0.7, y: 0.55, z: -0.02, size: 0.35 },
        { x: 1.7, y: 0.4, z: 0.02, size: 0.35 },
        { x: -1.7, y: 0.4, z: -0.02, size: 0.35 },
        { x: 0.35, y: 0.75, z: 0.02, size: 0.35 },
        { x: -0.35, y: 0.75, z: -0.02, size: 0.35 },
        { x: 0.95, y: 0.1, z: 0.15, size: 0.35 },
        { x: -0.95, y: 0.1, z: -0.15, size: 0.35 }
      ],
      // Pattern 4: Compact rounded cloud (dense and full)
      [
        { x: 0, y: 0, z: 0, size: 1.0 },
        { x: 0.75, y: 0.1, z: 0.02, size: 0.8 },
        { x: -0.75, y: 0.1, z: -0.02, size: 0.8 },
        { x: 1.25, y: 0.2, z: 0.02, size: 0.6 },
        { x: -1.25, y: 0.2, z: -0.02, size: 0.6 },
        { x: 0.35, y: 0.65, z: 0.02, size: 0.7 },
        { x: -0.35, y: 0.65, z: -0.02, size: 0.7 },
        { x: 0, y: 1.0, z: 0.02, size: 0.6 },
        { x: 0.65, y: 0.85, z: 0.02, size: 0.5 },
        { x: -0.65, y: 0.85, z: -0.02, size: 0.5 },
        { x: 0.45, y: 0.3, z: 0.2, size: 0.55 },
        { x: -0.45, y: 0.3, z: -0.2, size: 0.55 },
        { x: 0, y: 0.45, z: 0.25, size: 0.45 },
        { x: 0.2, y: 0.75, z: 0.12, size: 0.4 },
        { x: -0.2, y: 0.75, z: -0.12, size: 0.4 }
      ]
    ];

    const pattern = cloudPatterns[index % cloudPatterns.length];

    pattern.forEach(block => {
      const geometry = new THREE.BoxGeometry(block.size, block.size, block.size);
      const mesh = new THREE.Mesh(geometry, cloudMaterial);
      mesh.position.set(block.x, block.y, block.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      cloudGroup.add(mesh);
    });

    // Non-uniform scaling to appear fuller
    const baseScale = 0.85 + Math.random() * 0.8; // 0.85 - 1.65
    cloudGroup.scale.set(baseScale * 1.25, baseScale * 1.15, baseScale);
    
    // Slight random rotation for natural variation
    cloudGroup.rotation.y = (Math.random() - 0.5) * 0.4;
    cloudGroup.rotation.z = (Math.random() - 0.5) * 0.15;

    return cloudGroup;
  }

  /**
   * Add a decorative trolley under the menu buttons that gently rocks side-to-side
   */
  private addDecorativeTrolley(): void {
    // Ensure we don't add multiple times
    if (this.trolleyContainer) {
      this.menuGroup.remove(this.trolleyContainer);
      this.trolleyContainer = undefined;
      this.trolley = undefined;
    }

    const container = new THREE.Group();
    container.name = 'MenuDecorativeTrolleyContainer';

    // Create trolley with defaults
    const trolley = createTrolley();
    const trolleyGroup = trolley.getGroup();

    // Slightly smaller so it fits neatly under the menu
    trolleyGroup.scale.set(0.9, 0.9, 0.9);
    // Angle a bit toward the camera for a nicer look
    trolleyGroup.rotation.y = Math.PI * 0.1;

    // Force trolley to render behind buttons (handles smoke transparency)
    trolleyGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.renderOrder = 0; // behind buttons (buttons set to 1)
      }
    });

    // Add to container; place further behind buttons
    container.add(trolleyGroup);
    container.position.set(0, -8.5, -2.0);

    // Enable shadows for consistency
    trolleyGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    this.menuGroup.add(container);
    this.trolleyContainer = container;
    this.trolley = trolley;
  }



  /**
   * Create 3D-styled title with thick 3D letters
   */
  private create3DStyledTitle(): void {
    this.titleGroup = new THREE.Group();

    const text = 'TROLLEY PROBLEM';
    const letters = text.split('');

    // Calculate letter spacing - much closer together
    const letterWidth = 0.8; // Reduced from 0.8 to bring letters closer
    const totalWidth = letters.length * letterWidth;
    const startX = -totalWidth / 2;

    letters.forEach((letter, letterIndex) => {
      if (letter === ' ') return; // Skip spaces

      const letterGroup = this.create3DLetter(letter, letterIndex);
      letterGroup.position.x = startX + letterIndex * letterWidth;
  letterGroup.position.y = 6.0; // raise title slightly more to give extra space below

      // Inverse curvature - positive rotation curves inward
      letterGroup.rotation.x = 0.3;

  // Store reference for wave animation
  letterGroup.userData = { letterIndex, originalY: 6.0, originalX: startX + letterIndex * letterWidth };

      this.titleGroup!.add(letterGroup);
    });

    this.menuGroup.add(this.titleGroup!);

    // Start the bobbing animation
    this.startTitleAnimation();
  }

  /**
   * Create a single 3D letter with depth
   */
  private create3DLetter(letter: string, letterIndex: number): THREE.Group {
    const letterGroup = new THREE.Group();

    // Create multiple depth layers to simulate 3D thickness - just clean text layers
    const depthLayers = 15; // More layers for smoother 3D effect
    const layerDepth = 0.02; // Smaller distance between layers for smoother effect

    for (let i = 0; i < depthLayers; i++) {
      const z = -i * layerDepth;

      // Create canvas for this letter
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 128;
      canvas.height = 128;

      // Clear canvas
      context.fillStyle = 'transparent';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Use Minecraft font if available
      const fontFamily = document.fonts.check('1px Minecraft') ? 'Minecraft' : 'monospace';
      context.font = 'bold 100px ' + fontFamily; // Increased from 80px to 120px
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      // Smooth color gradient from front to back for 3D effect
      const progress = i / (depthLayers - 1); // 0 to 1 from front to back
      let color: string;

      if (i === 0) {
        // Front face - pure white with subtle stroke
        color = '#FFFFFF';
        context.strokeStyle = '#F0F0F0';
        context.lineWidth = 1;
        context.strokeText(letter, canvas.width / 2, canvas.height / 2);
      } else {
        // Smooth gradient from white to darker gray for depth
        const grayValue = Math.floor(255 * (1 - progress * 0.6)); // From 255 to ~102
        color = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
      }

      context.fillStyle = color;
      context.fillText(letter, canvas.width / 2, canvas.height / 2);

      // Create texture and material
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });

      // Create plane geometry for this layer - bigger letters
      const geometry = new THREE.PlaneGeometry(1.2, 1.5); // Increased from 0.8, 1 to 1.2, 1.5
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = z;

      // Store layer info for animation
      mesh.userData = { layerIndex: i, letterIndex, originalZ: z };

      letterGroup.add(mesh);
    }

    return letterGroup;
  }



  /**
   * Create 3D-styled buttons
   */
  private create3DStyledButtons(): void {
    const buttonData = [
      // Spread buttons further apart vertically for improved readability on small displays
      { text: 'Start Ride', y: 1.2, callback: () => this.onStartGame?.() },
      { text: 'Options', y: -1.6, callback: () => this.onShowOptions?.() }, // wider gap between buttons
      { text: 'Instructions', y: -4.0, callback: () => this.onShowInstructions?.() } // wider gap between buttons
    ];

    buttonData.forEach((data, index) => {
      const button = this.create3DStyledButton(data.text, data.y, data.callback);
      // Merge with existing userData instead of overwriting it
      button.userData = {
        ...button.userData, // Keep existing userData from create3DStyledButton
        index,
        originalY: data.y,
        callback: data.callback
      };
      this.buttons.push(button);
      this.menuGroup.add(button);
    });
  }

  /**
   * Create a single 3D-styled button with Minecraft font
   */
  private create3DStyledButton(text: string, yPosition: number, callback: () => void): THREE.Mesh {
    const buttonGroup = new THREE.Group();

    // Create simple 3D button with lighting-based shadows
    const button3D = this.create3DButtonGeometry();
    buttonGroup.add(button3D);

    // Add 3D-styled text
    const textMesh = this.create3DStyledButtonText(text);
  textMesh.position.z = 0.61; // Position text on front of thicker button (1.2/2 + small offset)
    buttonGroup.add(textMesh);

    // Position the button
    buttonGroup.position.y = yPosition;
  buttonGroup.position.z = 0.6; // Default forward position (deeper button)

    // Add subtle 3D rotation to show button edges while keeping it mostly facing the user
    buttonGroup.rotation.x = -0.05; // Slight downward tilt to show top edge
    buttonGroup.rotation.y = 0.03;  // Very slight left rotation to show right edge

    // Ensure buttons render over trolley (fix smoke appearing in front)
    buttonGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.renderOrder = 1; // above trolley
      }
    });

    // Store callback, colors, and animation properties in userData
    buttonGroup.userData = {
      callback,
      originalColor: 0xFF4444, // Start with the brighter red as default
      hoverColor: 0xFF6666,   // Even brighter red for hover
      currentColor: 0xFF4444,
      targetColor: 0xFF4444,
      transitionSpeed: 0.1,
      buttonMesh: button3D, // Store reference to the single button mesh
      originalRotationX: -0.05, // Store original rotations for hover effects
      originalRotationY: 0.03
    };

    return buttonGroup as any; // Cast to Mesh for compatibility
  }

  /**
   * Create 3D button geometry with game-style appearance
   */
  private create3DButtonGeometry(): THREE.Mesh {
    // Create rounded button geometry to match game buttons
    const geometry = new THREE.BoxGeometry(6.2, 1.6, 0.3); // Thinner depth like game buttons
    
    // Create gradient-like material to match game button styling
    const material = new THREE.MeshLambertMaterial({
      color: 0xFF4444, // Bright red like game buttons
      transparent: false
    });

    const button = new THREE.Mesh(geometry, material);
    button.castShadow = true;
    button.receiveShadow = true;

    // Add border effect by creating a slightly larger red border mesh
    const borderGeometry = new THREE.BoxGeometry(6.3, 1.7, 0.25);
    const borderMaterial = new THREE.MeshLambertMaterial({
      color: 0xCC2222, // Lighter red border (lighter than main button color)
      transparent: false
    });
    const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    borderMesh.position.z = -0.05; // Behind the main button
    button.add(borderMesh);

    return button;
  }



  /**
   * Create 3D-styled button text using Minecraft font
   */
  private create3DStyledButtonText(text: string): THREE.Mesh {
    const textGroup = new THREE.Group();

    // Create multiple layers for proper 3D text depth with moderately sized font
    const textLayers = [
      { z: -0.12, color: '#660000', size: 72 }, // Deep shadow
      { z: -0.09, color: '#880000', size: 72 }, // Medium shadow
      { z: -0.06, color: '#AA0000', size: 72 }, // Light shadow
      { z: -0.03, color: '#CC0000', size: 72 }, // Near shadow
      { z: 0, color: '#FFFFFF', size: 70 }      // White front text
    ];

    textLayers.forEach((layer, index) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
  canvas.width = 1200; // Larger canvas for bigger, crisper text
  canvas.height = 180; // Proportional height for larger font

      // Clear canvas
      context.fillStyle = 'transparent';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Use Minecraft font if available - same as title
      const fontFamily = document.fonts.check('1px Minecraft') ? 'Minecraft' : 'Arial, sans-serif';
      context.font = `${layer.size}px ${fontFamily}`; // Removed 'bold'
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      // Add letter spacing by drawing each character individually
      const letters = text.split('');
  const letterSpacing = layer.size * 0.12; // Slightly tighter spacing at larger sizes
      const totalWidth = letters.reduce((width, letter) => {
        return width + context.measureText(letter).width + letterSpacing;
      }, 0) - letterSpacing; // Remove last spacing

      let currentX = (canvas.width - totalWidth) / 2;

      // Add subtle stroke for front layer only
      if (index === textLayers.length - 1) {
        context.strokeStyle = '#F8F8F8';
        context.lineWidth = 2;

        // Draw stroke for each letter with spacing
        currentX = (canvas.width - totalWidth) / 2;
        letters.forEach((letter) => {
          const letterWidth = context.measureText(letter).width;
          context.strokeText(letter, currentX + letterWidth / 2, canvas.height / 2);
          currentX += letterWidth + letterSpacing;
        });
      }

      context.fillStyle = layer.color;

      // Draw each letter with spacing
      currentX = (canvas.width - totalWidth) / 2;
      letters.forEach((letter) => {
        const letterWidth = context.measureText(letter).width;
        context.fillText(letter, currentX + letterWidth / 2, canvas.height / 2);
        currentX += letterWidth + letterSpacing;
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });

      // Larger text geometry for better readability
  const geometry = new THREE.PlaneGeometry(5.8, 1.3);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = layer.z;
      textGroup.add(mesh);
    });

    return textGroup as any; // Cast to Mesh for compatibility
  }

  /**
   * Set up event listeners for mouse interaction
   */
  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (event) => {
      if (!this.isVisible) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.handleMouseMove();
    });

    canvas.addEventListener('click', (event) => {
      if (!this.isVisible) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.handleClick();
    });
  }

  /**
   * Handle mouse movement for hover effects
   */
  private handleMouseMove(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.buttons, true);

    // Reset previous hover
    if (this.hoveredButton) {
      this.resetButtonHover(this.hoveredButton);
      this.hoveredButton = null;
    }

    // Apply hover to new button
    if (intersects.length > 0) {
      const button = this.getButtonFromIntersect(intersects[0]);
      if (button) {
        this.applyButtonHover(button);
        this.hoveredButton = button;
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  /**
   * Handle click events
   */
  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.buttons, true);

    if (intersects.length > 0) {
      const button = this.getButtonFromIntersect(intersects[0]);
      if (button && button.userData.callback) {
        console.log('Menu3D: Button clicked');
        button.userData.callback();
      }
    }
  }

  /**
   * Get button group from intersection
   */
  private getButtonFromIntersect(intersect: THREE.Intersection): THREE.Mesh | null {
    let object = intersect.object;
    while (object.parent && !this.buttons.includes(object as THREE.Mesh)) {
      object = object.parent;
    }
    return this.buttons.includes(object as THREE.Mesh) ? object as THREE.Mesh : null;
  }

  /**
   * Apply hover effect to button
   */
  private applyButtonHover(button: THREE.Mesh): void {
    // Set target color for smooth transition
    button.userData.targetColor = button.userData.hoverColor;

    // More dramatic 3D hover effects
    button.position.z = 0.8; // Move even further forward on hover
    button.scale.setScalar(1.1); // More noticeable scale increase

    // Enhanced rotation that builds on the base 3D rotation with safety checks
    const originalRotationX = button.userData.originalRotationX || -0.05;
    const originalRotationY = button.userData.originalRotationY || 0.03;

    button.rotation.x = originalRotationX - 0.03; // Slightly more downward tilt
    button.rotation.y = originalRotationY + 0.01; // Slightly more left rotation
  }

  /**
   * Reset button hover effect
   */
  private resetButtonHover(button: THREE.Mesh): void {
    // Set target color for smooth transition back
    button.userData.targetColor = button.userData.originalColor;

    // Reset 3D effects to default forward position
    button.position.z = 0.6; // Return to default forward position
    button.scale.setScalar(1.0);

    // Return to original 3D rotation instead of flat with safety checks
    button.rotation.x = button.userData.originalRotationX || -0.05;
    button.rotation.y = button.userData.originalRotationY || 0.03;
  }

  /**
   * Update button color transitions
   */
  private updateButtonTransitions(): void {
    this.buttons.forEach(button => {
      const userData = button.userData;
      if (userData.currentColor !== userData.targetColor) {
        // Smooth color interpolation
        const currentColor = new THREE.Color(userData.currentColor);
        const targetColor = new THREE.Color(userData.targetColor);

        currentColor.lerp(targetColor, userData.transitionSpeed);
        userData.currentColor = currentColor.getHex();

        // Apply color to the single button mesh
        const buttonMesh = userData.buttonMesh;
        if (buttonMesh && buttonMesh.material instanceof THREE.MeshPhongMaterial) {
          buttonMesh.material.color.setHex(userData.currentColor);
        }
      }
    });
  }

  /**
   * Update button gentle floating animation
   */
  private updateButtonFloating(): void {
    this.buttons.forEach((button, buttonIndex) => {
      const userData = button.userData;
      const originalY = userData.originalY || 0;

      // Create gentle floating motion with different phases for each button
      const floatPhase = this.animationTime * 1.2 + buttonIndex * 0.8; // Slower speed, staggered timing
      const floatOffset = Math.sin(floatPhase) * 0.08; // Gentle 0.08 unit amplitude

      // Secondary subtle wave for more organic movement
      const secondaryFloat = Math.sin(floatPhase * 1.5 + Math.PI / 3) * 0.03;

      // Apply the floating animation only if not being hovered
      // (hover effects will override this with their own positioning)
      if (button !== this.hoveredButton) {
        button.position.y = originalY + floatOffset + secondaryFloat;
      }
    });
  }

  /**
   * Update background (removed)
   */
  private updateBackgroundAnimation(): void {
    // background animation removed
  }

  /**
   * Create a 3D blocky cloud - removed
   */

  /**
   * Start title bobbing and wave animation
   */
  private startTitleAnimation(): void {
    const animate = () => {
      if (!this.isVisible) {
        return;
      }

      this.animationTime += 0.016; // Assuming ~60fps

      // Update button color transitions
      this.updateButtonTransitions();

      // Button gentle floating animation
      this.updateButtonFloating();

      // Title animation (only if title exists)
      if (this.titleGroup) {
        // Overall gentle bobbing motion for the entire title group
        const bobOffset = Math.sin(this.animationTime * 1.5) * 0.15; // Slower, more pronounced bob
        this.titleGroup.position.y = bobOffset;

        // Wave effect - animate each letter individually with more pronounced wave motion
        this.titleGroup.children.forEach((letterGroup, letterIndex) => {
          if (letterGroup instanceof THREE.Group) {
            const originalY = letterGroup.userData.originalY || 3;

            // Create more pronounced wave effect with smoother phase progression
            const wavePhase = this.animationTime * 2 + letterIndex * 0.8; // Slower time, more spacing between letters
            const waveOffset = Math.sin(wavePhase) * 0.3; // Increased amplitude from 0.1 to 0.3

            // Secondary wave for more complex motion
            const secondaryWave = Math.sin(wavePhase * 1.5 + Math.PI / 4) * 0.1;

            // Apply combined wave motion
            letterGroup.position.y = originalY + waveOffset + secondaryWave;

            // More pronounced rotation wave that follows the vertical motion
            const rotationWave = Math.sin(wavePhase + Math.PI / 6) * 0.08; // Increased from 0.03
            letterGroup.rotation.z = rotationWave;

            // Enhanced curve animation that flows with the wave
            const curveAnimation = Math.sin(wavePhase * 0.7) * 0.1; // Increased amplitude
            letterGroup.rotation.x = 0.3 + curveAnimation;

            // Scale wave for breathing effect
            const scaleWave = 1 + Math.sin(wavePhase * 1.2) * 0.05;
            letterGroup.scale.setScalar(scaleWave);

            // Animate individual depth layers for ripple effect
            letterGroup.children.forEach((layer, layerIndex) => {
              if (layer instanceof THREE.Mesh && layer.userData.layerIndex !== undefined) {
                const depthWave = Math.sin(wavePhase + layerIndex * 0.2) * 0.02; // Increased amplitude
                layer.position.z = layer.userData.originalZ + depthWave;
              }
            });
          }
        });
      }

      // Background animation
      this.updateBackgroundAnimation();

      // Update decorative trolley gentle rocking
      if (this.trolley) {
        // Constant small speed so rocking stays active without moving
        this.trolley.update(0.016, 1.0);
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Stop title animation
   */
  private stopTitleAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }
  }

  /**
   * Show the 3D menu
   */
  public show(): void {
    console.log('Menu3D: show() called');
    this.menuGroup.visible = true;
    this.isVisible = true;

    // Restart animation if title exists
    if (this.titleGroup) {
      this.startTitleAnimation();
    }

    console.log('Menu3D: menu is now visible');
  }

  /**
   * Hide the 3D menu
   */
  public hide(): void {
    console.log('Menu3D: hide() called');
    this.menuGroup.visible = false;
    this.isVisible = false;

    // Stop title animation
    this.stopTitleAnimation();

    // Reset any hover states
    if (this.hoveredButton) {
      this.resetButtonHover(this.hoveredButton);
      this.hoveredButton = null;
    }

    console.log('Menu3D: menu is now hidden');
  }

  /**
   * Set callback for start game action
   */
  public onStartGameCallback(callback: () => void): void {
    this.onStartGame = callback;
  }

  /**
   * Set callback for options action
   */
  public onOptionsCallback(callback: () => void): void {
    this.onShowOptions = callback;
  }

  /**
   * Set callback for instructions action
   */
  public onInstructionsCallback(callback: () => void): void {
    this.onShowInstructions = callback;
  }

  /**
   * Check if menu is currently visible
   */
  public isMenuVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Dispose of the menu and clean up
   */
  public dispose(): void {
    this.scene.remove(this.menuGroup);
    this.isVisible = false;

    // Stop animations
    this.stopTitleAnimation();

    // Clean up geometries and materials
    this.menuGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    // Dispose trolley resources
    if (this.trolley) {
      this.trolley.dispose();
      this.trolley = undefined;
    }
    if (this.trolleyContainer) {
      this.menuGroup.remove(this.trolleyContainer);
      this.trolleyContainer = undefined;
    }
  }
}
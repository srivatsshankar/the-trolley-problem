// Simple test to verify section-based speed progression
import { TrolleyController } from './src/systems/TrolleyController.ts';
import { DEFAULT_CONFIG } from './src/models/GameConfig.ts';
import * as THREE from 'three';

console.log('Testing section-based speed progression...');

// Create trolley controller
const trolleyController = new TrolleyController(DEFAULT_CONFIG);

console.log('Initial state:');
console.log(`- Speed: ${trolleyController.speed.toFixed(2)}`);
console.log(`- Speed multiplier: ${trolleyController.getSpeedMultiplier().toFixed(2)}x`);
console.log(`- Sections passed: ${trolleyController.sectionsPassed}`);
console.log(`- Position: z=${trolleyController.position.z.toFixed(2)}`);

// Test section-based speed increases
const sectionLength = DEFAULT_CONFIG.tracks.segmentLength * 2.5;
console.log(`\nSection length: ${sectionLength}`);

// Move to first section boundary
console.log('\n--- Moving to first section boundary ---');
trolleyController.setPosition(new THREE.Vector3(0, 0, sectionLength + 1));
trolleyController.update(0.016);

console.log(`- Speed: ${trolleyController.speed.toFixed(2)} (expected: ${(DEFAULT_CONFIG.trolley.baseSpeed * 1.05).toFixed(2)})`);
console.log(`- Speed multiplier: ${trolleyController.getSpeedMultiplier().toFixed(2)}x (expected: 1.05x)`);
console.log(`- Sections passed: ${trolleyController.sectionsPassed} (expected: 1)`);

// Move to second section boundary
console.log('\n--- Moving to second section boundary ---');
trolleyController.setPosition(new THREE.Vector3(0, 0, sectionLength * 2 + 1));
trolleyController.update(0.016);

console.log(`- Speed: ${trolleyController.speed.toFixed(2)} (expected: ${(DEFAULT_CONFIG.trolley.baseSpeed * Math.pow(1.05, 2)).toFixed(2)})`);
console.log(`- Speed multiplier: ${trolleyController.getSpeedMultiplier().toFixed(2)}x (expected: 1.10x)`);
console.log(`- Sections passed: ${trolleyController.sectionsPassed} (expected: 2)`);

// Move to third section boundary
console.log('\n--- Moving to third section boundary ---');
trolleyController.setPosition(new THREE.Vector3(0, 0, sectionLength * 3 + 1));
trolleyController.update(0.016);

console.log(`- Speed: ${trolleyController.speed.toFixed(2)} (expected: ${(DEFAULT_CONFIG.trolley.baseSpeed * Math.pow(1.05, 3)).toFixed(2)})`);
console.log(`- Speed multiplier: ${trolleyController.getSpeedMultiplier().toFixed(2)}x (expected: 1.16x)`);
console.log(`- Sections passed: ${trolleyController.sectionsPassed} (expected: 3)`);

// Test that it caps at 5x base speed
console.log('\n--- Testing speed cap at 5x base speed ---');
for (let i = 0; i < 50; i++) {
  trolleyController.increaseSectionSpeed();
}

console.log(`- Speed: ${trolleyController.speed.toFixed(2)} (should be capped at ${(DEFAULT_CONFIG.trolley.baseSpeed * 5).toFixed(2)})`);
console.log(`- Speed multiplier: ${trolleyController.getSpeedMultiplier().toFixed(2)}x (should be capped at 5.00x)`);
console.log(`- Sections passed: ${trolleyController.sectionsPassed}`);

// Test reset
console.log('\n--- Testing reset ---');
trolleyController.reset();

console.log(`- Speed: ${trolleyController.speed.toFixed(2)} (should be ${DEFAULT_CONFIG.trolley.baseSpeed.toFixed(2)})`);
console.log(`- Speed multiplier: ${trolleyController.getSpeedMultiplier().toFixed(2)}x (should be 1.00x)`);
console.log(`- Sections passed: ${trolleyController.sectionsPassed} (should be 0)`);

console.log('\n✅ Section-based speed progression test completed!');
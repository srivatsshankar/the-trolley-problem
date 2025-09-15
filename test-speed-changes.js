// Simple test to verify the new speed mechanics work
import { TrolleyController } from './src/systems/TrolleyController.ts';
import { DEFAULT_CONFIG } from './src/models/GameConfig.ts';
import * as THREE from 'three';

console.log('Testing new speed mechanics...');
console.log(`Base speed: ${DEFAULT_CONFIG.trolley.baseSpeed}`);
console.log(`Max speed multiplier: ${DEFAULT_CONFIG.trolley.maxSpeedMultiplier}x`);

// Create trolley controller
const trolleyController = new TrolleyController(DEFAULT_CONFIG);

console.log('\nInitial state:');
console.log(`- Speed: ${trolleyController.speed.toFixed(2)}`);
console.log(`- Speed multiplier: ${trolleyController.getSpeedMultiplier().toFixed(2)}x`);
console.log(`- Sections passed: ${trolleyController.sectionsPassed}`);

// Test 25% increase per section
console.log('\n--- Testing 25% increase per section ---');

// Section 1: 1.25x base speed
trolleyController.increaseSectionSpeed();
console.log(`Section 1: Speed ${trolleyController.speed.toFixed(2)} (${trolleyController.getSpeedMultiplier().toFixed(2)}x) - Expected: ${(DEFAULT_CONFIG.trolley.baseSpeed * 1.25).toFixed(2)} (1.25x)`);

// Section 2: 1.25^2 = 1.5625x base speed  
trolleyController.increaseSectionSpeed();
console.log(`Section 2: Speed ${trolleyController.speed.toFixed(2)} (${trolleyController.getSpeedMultiplier().toFixed(2)}x) - Expected: ${(DEFAULT_CONFIG.trolley.baseSpeed * Math.pow(1.25, 2)).toFixed(2)} (1.56x)`);

// Section 3: 1.25^3 = 1.953125x base speed
trolleyController.increaseSectionSpeed();
console.log(`Section 3: Speed ${trolleyController.speed.toFixed(2)} (${trolleyController.getSpeedMultiplier().toFixed(2)}x) - Expected: ${(DEFAULT_CONFIG.trolley.baseSpeed * Math.pow(1.25, 3)).toFixed(2)} (1.95x)`);

// Test that it caps at 7x base speed
console.log('\n--- Testing speed cap at 7x base speed ---');
for (let i = 0; i < 20; i++) {
  trolleyController.increaseSectionSpeed();
}

const maxExpectedSpeed = DEFAULT_CONFIG.trolley.baseSpeed * 7;
console.log(`Final speed: ${trolleyController.speed.toFixed(2)} (${trolleyController.getSpeedMultiplier().toFixed(2)}x)`);
console.log(`Should be capped at: ${maxExpectedSpeed.toFixed(2)} (7.00x)`);
console.log(`Sections passed: ${trolleyController.sectionsPassed}`);

// Verify it's actually capped
if (trolleyController.speed <= maxExpectedSpeed + 0.01) {
  console.log('✅ Speed cap working correctly!');
} else {
  console.log('❌ Speed cap not working!');
}

// Test reset
console.log('\n--- Testing reset ---');
trolleyController.reset();
console.log(`After reset: Speed ${trolleyController.speed.toFixed(2)} (${trolleyController.getSpeedMultiplier().toFixed(2)}x), Sections: ${trolleyController.sectionsPassed}`);

console.log('\n✅ Speed mechanics test completed!');
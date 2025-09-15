// Simple test to verify speed calculation logic
console.log('Testing speed progression calculations...');

const baseSpeed = 5.0;
const maxSpeedMultiplier = 5.0;

console.log(`Base speed: ${baseSpeed}`);
console.log(`Max speed multiplier: ${maxSpeedMultiplier}x`);
console.log('');

// Test section-based speed progression (5% per section)
console.log('Section-based speed progression (5% per section):');
for (let sections = 0; sections <= 35; sections++) {
  const rawMultiplier = Math.pow(1.05, sections);
  const clampedMultiplier = Math.min(maxSpeedMultiplier, rawMultiplier);
  const speed = baseSpeed * clampedMultiplier;
  
  if (sections <= 10 || sections % 5 === 0 || clampedMultiplier >= maxSpeedMultiplier) {
    console.log(`Section ${sections}: ${speed.toFixed(2)} speed (${clampedMultiplier.toFixed(2)}x)`);
    
    if (clampedMultiplier >= maxSpeedMultiplier) {
      console.log(`  ✅ Reached max speed at section ${sections}`);
      break;
    }
  }
}

console.log('');

// Calculate how many sections to reach 5x speed
let sectionsToMax = 0;
while (Math.pow(1.05, sectionsToMax) < maxSpeedMultiplier) {
  sectionsToMax++;
}

console.log(`Sections needed to reach 5x speed: ${sectionsToMax}`);
console.log(`At section ${sectionsToMax}: ${(baseSpeed * Math.pow(1.05, sectionsToMax)).toFixed(2)} speed (${Math.pow(1.05, sectionsToMax).toFixed(2)}x)`);

console.log('');
console.log('✅ Speed calculation test completed!');
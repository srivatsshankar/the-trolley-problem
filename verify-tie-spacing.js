/**
 * Verification script to check tie spacing across railway track segments
 * This script simulates the tie positioning logic to verify the fix
 */

// Configuration matching RailwayTrack.ts
const DEFAULT_RAILWAY_CONFIG = {
  length: 25.0,
  tieSpacing: 0.6,
  segmentLength: 25.0
};

/**
 * Simulate the old tie creation logic (before fix)
 */
function createTiesOld(segmentPosition, config) {
  const ties = [];
  const tieCount = Math.floor(config.length / config.tieSpacing) + 1;
  const startZ = -config.length / 2;
  
  for (let i = 0; i < tieCount; i++) {
    const localTieZ = startZ + (i * config.tieSpacing);
    const globalTieZ = segmentPosition + localTieZ;
    ties.push({
      localZ: localTieZ,
      globalZ: globalTieZ,
      segmentPos: segmentPosition
    });
  }
  
  return ties;
}

/**
 * Simulate the new tie creation logic (after fix)
 */
function createTiesNew(segmentPosition, config) {
  const ties = [];
  const globalStartZ = segmentPosition - config.length / 2;
  const globalEndZ = segmentPosition + config.length / 2;
  
  // Find the first tie position that should be within this segment
  const firstGlobalTieIndex = Math.ceil(globalStartZ / config.tieSpacing);
  const lastGlobalTieIndex = Math.floor(globalEndZ / config.tieSpacing);
  
  for (let globalTieIndex = firstGlobalTieIndex; globalTieIndex <= lastGlobalTieIndex; globalTieIndex++) {
    const globalTieZ = globalTieIndex * config.tieSpacing;
    const localTieZ = globalTieZ - segmentPosition;
    
    // Only create tie if it's within the segment bounds
    if (Math.abs(localTieZ) <= config.length / 2 + 0.01) {
      ties.push({
        localZ: localTieZ,
        globalZ: globalTieZ,
        segmentPos: segmentPosition,
        globalIndex: globalTieIndex
      });
    }
  }
  
  return ties;
}

/**
 * Analyze tie spacing to find issues
 */
function analyzeTieSpacing(allTies, method) {
  console.log(`\n=== ${method} Method Analysis ===`);
  
  // Sort ties by global position
  allTies.sort((a, b) => a.globalZ - b.globalZ);
  
  console.log(`Total ties: ${allTies.length}`);
  
  // Check spacing between consecutive ties
  const spacingIssues = [];
  for (let i = 1; i < allTies.length; i++) {
    const spacing = allTies[i].globalZ - allTies[i-1].globalZ;
    const expectedSpacing = DEFAULT_RAILWAY_CONFIG.tieSpacing;
    
    if (Math.abs(spacing - expectedSpacing) > 0.01) {
      spacingIssues.push({
        index: i,
        tie1: allTies[i-1],
        tie2: allTies[i],
        spacing: spacing,
        expected: expectedSpacing,
        difference: spacing - expectedSpacing
      });
    }
  }
  
  console.log(`Spacing issues found: ${spacingIssues.length}`);
  
  if (spacingIssues.length > 0) {
    console.log('\nSpacing Issues:');
    spacingIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. Between ties at Z=${issue.tie1.globalZ.toFixed(2)} and Z=${issue.tie2.globalZ.toFixed(2)}`);
      console.log(`     Spacing: ${issue.spacing.toFixed(3)} (expected: ${issue.expected.toFixed(3)}, diff: ${issue.difference.toFixed(3)})`);
      console.log(`     Segments: ${issue.tie1.segmentPos} -> ${issue.tie2.segmentPos}`);
    });
  } else {
    console.log('✓ All tie spacing is correct!');
  }
  
  return spacingIssues;
}

/**
 * Test tie spacing across multiple segments
 */
function testTieSpacing() {
  console.log('Testing Railway Tie Spacing Fix');
  console.log('================================');
  
  // Test with 3 consecutive segments
  const segmentPositions = [-25, 0, 25]; // Matching segmentLength = 25
  
  // Test old method
  console.log('\n--- Testing OLD method (before fix) ---');
  const oldTies = [];
  segmentPositions.forEach(pos => {
    const segmentTies = createTiesOld(pos, DEFAULT_RAILWAY_CONFIG);
    oldTies.push(...segmentTies);
    console.log(`Segment at Z=${pos}: ${segmentTies.length} ties`);
  });
  
  const oldIssues = analyzeTieSpacing(oldTies, 'OLD');
  
  // Test new method
  console.log('\n--- Testing NEW method (after fix) ---');
  const newTies = [];
  segmentPositions.forEach(pos => {
    const segmentTies = createTiesNew(pos, DEFAULT_RAILWAY_CONFIG);
    newTies.push(...segmentTies);
    console.log(`Segment at Z=${pos}: ${segmentTies.length} ties`);
  });
  
  const newIssues = analyzeTieSpacing(newTies, 'NEW');
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Old method issues: ${oldIssues.length}`);
  console.log(`New method issues: ${newIssues.length}`);
  
  if (newIssues.length === 0 && oldIssues.length > 0) {
    console.log('✅ FIX SUCCESSFUL: Tie spacing issues resolved!');
  } else if (newIssues.length === 0 && oldIssues.length === 0) {
    console.log('ℹ️  No issues found in either method');
  } else {
    console.log('❌ FIX INCOMPLETE: Issues still exist');
  }
}

// Run the test
testTieSpacing();
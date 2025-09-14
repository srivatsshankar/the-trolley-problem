/**
 * SparkLogic - simple helper for enabling wheel sparks after N segments
 */
export function shouldEnableWheelSparks(segmentsPassed: number, threshold: number = 5): boolean {
  return segmentsPassed >= threshold;
}

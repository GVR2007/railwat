// test-params.ts - Thorough testing of parameter computation functions
import { computeTrainParameters } from './lib/computeTrainParameters';
import { computeTrackParameters } from './lib/computeTrackParameters';
import { computeCollisionParameters } from './lib/computeCollisionParameters';
import { computeEnvironmentParameters } from './lib/computeEnvironmentParameters';
import { computeNetworkLoadParameters } from './lib/computeNetworkLoadParameters';
import { computeSafetyParameters } from './lib/computeSafetyParameters';
import { computeHealthParameters } from './lib/computeHealthParameters';

// Mock data for testing
const mockTrains = [
  {
    id: 'T1',
    speed: 100,
    priority: 2,
    lat: 28.6139,
    lon: 77.2090,
    progress: 0.5
  },
  {
    id: 'T2',
    speed: 120,
    priority: 3,
    lat: 26.8467,
    lon: 80.9462,
    progress: 0.3
  }
];

const mockStations = [
  { name: 'DEL', lat: 28.6139, lon: 77.2090 },
  { name: 'LKO', lat: 26.8467, lon: 80.9462 }
];

const mockEdges = [
  { source: 'DEL', target: 'LKO' }
];

console.log('🧪 Starting thorough testing of parameter computation functions...\n');

let testCount = 0;
let passCount = 0;

function test(name: string, testFn: () => boolean) {
  testCount++;
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ ${name}`);
      passCount++;
    } else {
      console.log(`❌ ${name}`);
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${(error as Error).message}`);
  }
}

try {
  // Test 1: Train parameters computation
  test('Train parameters computed (p1-p20)', () => {
    const trainParams = computeTrainParameters(mockTrains);
    const paramCount = Object.keys(trainParams).length;
    console.log(`   - Computed ${paramCount} train parameters`);
    return paramCount === 20;
  });

  // Test 2: Track parameters computation
  test('Track parameters computed (p21-p40)', () => {
    const trackParams = computeTrackParameters(mockStations, mockEdges);
    const paramCount = Object.keys(trackParams).length;
    console.log(`   - Computed ${paramCount} track parameters`);
    return paramCount === 20;
  });

  // Test 3: Safety parameters computation
  test('Safety parameters computed (p41-p60)', () => {
    const safetyParams = computeSafetyParameters(mockTrains, mockEdges);
    const paramCount = Object.keys(safetyParams).length;
    console.log(`   - Computed ${paramCount} safety parameters`);
    return paramCount === 20;
  });

  // Test 4: Collision parameters computation
  test('Collision parameters computed (p61-p80)', () => {
    const collisionParams = computeCollisionParameters(mockTrains);
    const paramCount = Object.keys(collisionParams).length;
    console.log(`   - Computed ${paramCount} collision parameters`);
    return paramCount === 20;
  });

  // Test 5: Environment parameters computation
  test('Environment parameters computed (p81-p100)', () => {
    const trackParams = computeTrackParameters(mockStations, mockEdges);
    const envParams = computeEnvironmentParameters(mockStations, trackParams);
    const paramCount = Object.keys(envParams).length;
    console.log(`   - Computed ${paramCount} environment parameters`);
    return paramCount === 20;
  });

  // Test 6: Network load parameters computation
  test('Network load parameters computed (p101-p120)', () => {
    const collisionParams = computeCollisionParameters(mockTrains);
    const networkParams = computeNetworkLoadParameters(mockTrains, mockStations, mockEdges, collisionParams);
    const paramCount = Object.keys(networkParams).length;
    console.log(`   - Computed ${paramCount} network load parameters`);
    return paramCount === 20;
  });

  // Test 7: Health parameters computation
  test('Health parameters computed (p121-p140)', () => {
    const healthParams = computeHealthParameters(mockTrains);
    const paramCount = Object.keys(healthParams).length;
    console.log(`   - Computed ${paramCount} health parameters`);
    return paramCount === 20;
  });

  // Test 8: All parameters combined
  test('All parameters combined (p1-p140)', () => {
    const trainParams = computeTrainParameters(mockTrains);
    const trackParams = computeTrackParameters(mockStations, mockEdges);
    const safetyParams = computeSafetyParameters(mockTrains, mockEdges);
    const collisionParams = computeCollisionParameters(mockTrains);
    const envParams = computeEnvironmentParameters(mockStations, trackParams);
    const networkParams = computeNetworkLoadParameters(mockTrains, mockStations, mockEdges, collisionParams);
    const healthParams = computeHealthParameters(mockTrains);

    const allParams = {
      ...trainParams,
      ...trackParams,
      ...safetyParams,
      ...collisionParams,
      ...envParams,
      ...networkParams,
      ...healthParams
    };

    const totalParams = Object.keys(allParams).length;
    console.log(`   - Total parameters: ${totalParams}/140`);
    return totalParams === 140;
  });

  // Test 9: Parameter value ranges
  test('All parameters within valid range [0,1]', () => {
    const trainParams = computeTrainParameters(mockTrains);
    const trackParams = computeTrackParameters(mockStations, mockEdges);
    const safetyParams = computeSafetyParameters(mockTrains, mockEdges);
    const collisionParams = computeCollisionParameters(mockTrains);
    const envParams = computeEnvironmentParameters(mockStations, trackParams);
    const networkParams = computeNetworkLoadParameters(mockTrains, mockStations, mockEdges, collisionParams);
    const healthParams = computeHealthParameters(mockTrains);

    const allParams = {
      ...trainParams,
      ...trackParams,
      ...safetyParams,
      ...collisionParams,
      ...envParams,
      ...networkParams,
      ...healthParams
    };

    const invalidParams = Object.entries(allParams).filter(([key, value]) => value < 0 || value > 1);
    if (invalidParams.length > 0) {
      console.log(`   - Invalid parameters: ${invalidParams.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }
    return invalidParams.length === 0;
  });

  // Test 10: Edge case - empty trains
  test('Handles empty train array', () => {
    try {
      const trainParams = computeTrainParameters([]);
      const collisionParams = computeCollisionParameters([]);
      const healthParams = computeHealthParameters([]);
      const safetyParams = computeSafetyParameters([], mockEdges);
      const networkParams = computeNetworkLoadParameters([], mockStations, mockEdges, collisionParams);

      // Should not crash and should return valid parameters
      const allValid = [trainParams, collisionParams, healthParams, safetyParams, networkParams]
        .every(params => Object.values(params).every(v => v >= 0 && v <= 1));

      return allValid;
    } catch (error) {
      console.log(`   - Error with empty trains: ${(error as Error).message}`);
      return false;
    }
  });

  console.log(`\n📊 Test Results: ${passCount}/${testCount} tests passed`);

  if (passCount === testCount) {
    console.log('🎉 All tests passed! Parameter assignment system is working correctly.');
    console.log('✅ Thorough testing completed successfully.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }

} catch (error) {
  console.error('💥 Test suite failed with error:', (error as Error).message);
}

// Simple test script to verify parameter computation functions
const { computeTrainParameters } = require('./lib/computeTrainParameters.ts');
const { computeTrackParameters } = require('./lib/computeTrackParameters.ts');
const { computeCollisionParameters } = require('./lib/computeCollisionParameters.ts');
const { computeEnvironmentParameters } = require('./lib/computeEnvironmentParameters.ts');
const { computeNetworkLoadParameters } = require('./lib/computeNetworkLoadParameters.ts');
const { computeHealthParameters } = require('./lib/computeHealthParameters.ts');

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

console.log('Testing parameter computation functions...');

try {
  // Test train parameters
  const trainParams = computeTrainParameters(mockTrains);
  console.log('✓ Train parameters computed:', Object.keys(trainParams).length, 'parameters');

  // Test track parameters
  const trackParams = computeTrackParameters(mockStations, mockEdges);
  console.log('✓ Track parameters computed:', Object.keys(trackParams).length, 'parameters');

  // Test collision parameters
  const collisionParams = computeCollisionParameters(mockTrains);
  console.log('✓ Collision parameters computed:', Object.keys(collisionParams).length, 'parameters');

  // Test environment parameters
  const envParams = computeEnvironmentParameters(mockStations, trackParams);
  console.log('✓ Environment parameters computed:', Object.keys(envParams).length, 'parameters');

  // Test network load parameters
  const networkParams = computeNetworkLoadParameters(mockTrains, mockStations, mockEdges, collisionParams);
  console.log('✓ Network load parameters computed:', Object.keys(networkParams).length, 'parameters');

  // Test health parameters
  const healthParams = computeHealthParameters(mockTrains);
  console.log('✓ Health parameters computed:', Object.keys(healthParams).length, 'parameters');

  // Verify parameter ranges (should be 0-1)
  const allParams = { ...trainParams, ...trackParams, ...collisionParams, ...envParams, ...networkParams, ...healthParams };
  const invalidParams = Object.entries(allParams).filter(([key, value]) => value < 0 || value > 1);

  if (invalidParams.length === 0) {
    console.log('✓ All parameters are within valid range [0, 1]');
  } else {
    console.log('✗ Invalid parameters found:', invalidParams);
  }

  console.log('Total parameters computed:', Object.keys(allParams).length);
  console.log('Test completed successfully!');

} catch (error) {
  console.error('✗ Test failed with error:', error.message);
}

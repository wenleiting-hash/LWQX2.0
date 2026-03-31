
function testSidExtraction(pid, sidInput) {
  let SID = sidInput;
  if (!SID && pid && pid.includes('_')) {
    const parts = pid.split('_');
    if (parts.length >= 3) {
      SID = parts[2];
    }
  }
  return SID;
}

const testCases = [
  { pid: 'mm_90082353_3402400017_116243300175', sid: '', expected: '3402400017' },
  { pid: 'mm_90082353_3402400017_116243300175', sid: 'manual_sid', expected: 'manual_sid' },
  { pid: 'simple_pid', sid: '', expected: '' },
  { pid: '', sid: 'manual_sid', expected: 'manual_sid' }
];

testCases.forEach((tc, i) => {
  const result = testSidExtraction(tc.pid, tc.sid);
  if (result === tc.expected) {
    console.log(`Test Case ${i + 1}: PASSED`);
  } else {
    console.log(`Test Case ${i + 1}: FAILED (Expected: ${tc.expected}, Got: ${result})`);
  }
});

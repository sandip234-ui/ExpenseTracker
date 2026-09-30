import assert from 'node:assert'
import { app } from './src/app.js'

console.log('--- Testing FinTrack Backend Health Endpoint ---')

const server = app.listen(0, async () => {
  const port = server.address().port
  const url = `http://localhost:${port}/api/health`

  try {
    const res = await fetch(url)
    assert.strictEqual(res.status, 200, 'HTTP status should be 200')

    const data = await res.json()
    console.log('Health response payload:', JSON.stringify(data, null, 2))

    assert.strictEqual(data.status, 'ok', 'Status should be "ok"')
    assert.strictEqual(data.service, 'FinTrack API', 'Service should be "FinTrack API"')
    assert.ok(data.timestamp, 'Timestamp should be present')

    // Test 404 handler
    const notFoundRes = await fetch(`http://localhost:${port}/api/nonexistent`)
    assert.strictEqual(notFoundRes.status, 404, 'HTTP status for nonexistent route should be 404')
    const notFoundData = await notFoundRes.json()
    assert.strictEqual(notFoundData.status, 'error', '404 status should be "error"')

    console.log('✅ ALL BACKEND HEALTH & ERROR TESTS PASSED SUCCESSFULLY!')
    server.close(() => process.exit(0))
  } catch (err) {
    console.error('❌ Test failed:', err)
    server.close(() => process.exit(1))
  }
})

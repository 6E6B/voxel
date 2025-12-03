/**
 * Net-Log Control Component
 *
 * This component provides an interface to control Electron's net-log functionality.
 * You can use this as a standalone debug panel or integrate it into your settings.
 *
 * Usage:
 * - Import this component into your app
 * - Display it in a debug/settings panel
 * - Use the IPC calls directly: window.api.getNetLogStatus(), etc.
 */

import { useState, useEffect } from 'react'

export function NetLogControl() {
  const [isLogging, setIsLogging] = useState(false)
  const [logPath, setLogPath] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  // Check initial status
  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const status = await window.api.getNetLogStatus()
      setIsLogging(status.isLogging)
      setLogPath(status.logPath)
    } catch (error) {
      console.error('Failed to get net-log status:', error)
    }
  }

  const handleStart = async () => {
    try {
      const result = await window.api.startNetLog()
      setStatusMessage(result.message)
      if (result.success) {
        await checkStatus()
      }
    } catch (error) {
      console.error('Failed to start net-log:', error)
      setStatusMessage('Failed to start logging')
    }
  }

  const handleStop = async () => {
    try {
      const result = await window.api.stopNetLog()
      setStatusMessage(result.message)
      if (result.success) {
        await checkStatus()
      }
    } catch (error) {
      console.error('Failed to stop net-log:', error)
      setStatusMessage('Failed to stop logging')
    }
  }

  const copyPath = () => {
    if (logPath) {
      navigator.clipboard.writeText(logPath)
      setStatusMessage('Path copied to clipboard!')
    }
  }

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #333',
        borderRadius: '8px',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        maxWidth: '600px'
      }}
    >
      <h3 style={{ marginTop: 0 }}>Network Logging Control</h3>

      <div style={{ marginBottom: '15px' }}>
        <strong>Status:</strong>{' '}
        <span style={{ color: isLogging ? '#4ade80' : '#f87171' }}>
          {isLogging ? 'Active' : 'Inactive'}
        </span>
      </div>

      {logPath && (
        <div style={{ marginBottom: '15px' }}>
          <strong>Log File:</strong>
          <div
            style={{
              marginTop: '5px',
              padding: '8px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px',
              fontSize: '12px',
              wordBreak: 'break-all',
              fontFamily: 'monospace'
            }}
          >
            {logPath}
          </div>
          <button
            onClick={copyPath}
            style={{
              marginTop: '5px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Copy Path
          </button>
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#2a2a2a',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {statusMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleStart}
          disabled={isLogging}
          style={{
            padding: '10px 20px',
            backgroundColor: isLogging ? '#555' : '#4ade80',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: isLogging ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          Start Logging
        </button>

        <button
          onClick={handleStop}
          disabled={!isLogging}
          style={{
            padding: '10px 20px',
            backgroundColor: !isLogging ? '#555' : '#f87171',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: !isLogging ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          Stop Logging
        </button>

        <button
          onClick={checkStatus}
          style={{
            padding: '10px 20px',
            backgroundColor: '#60a5fa',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Refresh Status
        </button>
      </div>

      <div
        style={{
          marginTop: '15px',
          fontSize: '12px',
          color: '#888',
          lineHeight: '1.5'
        }}
      >
        <p style={{ margin: '5px 0' }}>
          📝 Network logs capture detailed information about all network requests.
        </p>
        <p style={{ margin: '5px 0' }}>
          💾 Logs are saved to: <code>AppData\Roaming\voxel\net-logs\</code>
        </p>
        <p style={{ margin: '5px 0' }}>
          🔍 Use these logs to debug network issues, API errors, or CORS problems.
        </p>
      </div>
    </div>
  )
}

// Quick example of using the API directly in your code:
export async function exampleUsage() {
  // Check if logging is active
  const status = await window.api.getNetLogStatus()

  // Get the current log file path
  await window.api.getNetLogPath()

  // Start logging if not already active
  if (!status.isLogging) {
    await window.api.startNetLog()
  }

  // Stop logging
  await window.api.stopNetLog()
}

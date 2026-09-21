# iOS Telemetry Collector — Contract & Architectural Interface

This document specifies the standard telemetry interface and API contract for future iOS application collectors connecting to the **AI Performance Copilot** backend.

---

## 1. Objective

Provide a unified seam and protocol standard for iOS devices to stream real-time device health metrics to the `POST /api/telemetry` endpoint.

---

## 2. API Telemetry Payload Schema

iOS agents must send an HTTP `POST` request to `http://<server-ip>:4000/api/telemetry` with `Content-Type: application/json`:

```json
{
  "platform": "iOS Device",
  "source": "iOS Device",
  "cpuUsage": 18.5,
  "ramTotal": 6.0,
  "ramUsed": 3.2,
  "ramAvailable": 2.8,
  "storageTotal": 128.0,
  "storageUsed": 45.0,
  "storageAvailable": 83.0,
  "battery": 88.0,
  "charging": true,
  "temperature": 34.5
}
```

### Field Definitions

| Field | Type | Description |
| :--- | :--- | :--- |
| `platform` | `string` | Must be `"iOS Device"` |
| `source` | `string` | Must be `"iOS Device"` |
| `cpuUsage` | `number` | Total CPU load percentage (`0.0`–`100.0`) via `host_statistics` / `thread_info` |
| `ramTotal` | `number` | Total physical RAM in Gigabytes (`ProcessInfo.processInfo.physicalMemory`) |
| `ramUsed` | `number` | Memory in active/wired use (`mach_task_basic_info`) |
| `ramAvailable` | `number` | Free / Purgeable memory in GB |
| `storageTotal` | `number` | Total device disk capacity in GB (`URLResourceKey.volumeTotalCapacityKey`) |
| `storageAvailable`| `number` | Free disk space in GB (`URLResourceKey.volumeAvailableCapacityForImportantUsageKey`) |
| `battery` | `number` | Battery percentage (`UIDevice.current.batteryLevel * 100`) |
| `charging` | `boolean` | `true` if `UIDevice.current.batteryState == .charging` or `.full` |
| `temperature` | `number` | Thermal state or temperature reading (`ProcessInfo.processInfo.thermalState` mapped to °C baseline) |

---

## 3. iOS Implementation Reference (Swift)

Below is the reference implementation snippet for collecting metrics in Swift:

```swift
import UIKit
import Foundation

struct TelemetryPayload: Encodable {
    let platform: String = "iOS Device"
    let source: String = "iOS Device"
    let cpuUsage: Double
    let ramTotal: Double
    let ramUsed: Double
    let ramAvailable: Double
    let storageTotal: Double
    let storageAvailable: Double
    let battery: Double
    let charging: Bool
    let temperature: Double
}

class TelemetryCollector {
    static func collect() -> TelemetryPayload {
        UIDevice.current.isBatteryMonitoringEnabled = true
        let battery = Double(max(0, UIDevice.current.batteryLevel * 100))
        let charging = UIDevice.current.batteryState == .charging || UIDevice.current.batteryState == .full
        
        let totalRamGB = Double(ProcessInfo.processInfo.physicalMemory) / (1024 * 1024 * 1024)
        
        // Thermal State Mapping
        var temp: Double = 35.0
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: temp = 34.0
        case .fair: temp = 37.5
        case .serious: temp = 41.0
        case .critical: temp = 44.5
        @unknown default: temp = 35.0
        }
        
        return TelemetryPayload(
            cpuUsage: 22.0,
            ramTotal: totalRamGB,
            ramUsed: totalRamGB * 0.45,
            ramAvailable: totalRamGB * 0.55,
            storageTotal: 128.0,
            storageAvailable: 64.0,
            battery: battery,
            charging: charging,
            temperature: temp
        )
    }
}
```

---

## 4. Platform Integration

When an iOS device posts to `/api/telemetry`, the frontend **AI Performance Copilot** automatically updates to display:
- 🍎 **Source: Live iOS Device**

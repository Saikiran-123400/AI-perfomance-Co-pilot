package com.copilot.telemetry

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Environment
import android.os.StatFs
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

object TelemetryCollector {

    fun collectMetrics(context: Context): JSONObject {
        // 1. RAM Metrics via ActivityManager
        val BYTES_TO_GB = 1024.0 * 1024.0 * 1024.0
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)

        val ramTotalGb = Math.round((memoryInfo.totalMem / BYTES_TO_GB) * 10.0) / 10.0
        val ramAvailGb = Math.round((memoryInfo.availMem / BYTES_TO_GB) * 10.0) / 10.0
        val ramUsedGb = Math.round((ramTotalGb - ramAvailGb) * 10.0) / 10.0

        // 2. Storage Metrics via StatFs
        val stat = StatFs(Environment.getDataDirectory().path)
        val blockSize = stat.blockSizeLong
        val totalBytes = stat.blockCountLong * blockSize
        val availBytes = stat.availableBlocksLong * blockSize

        val storageTotalGb = Math.round((totalBytes / BYTES_TO_GB) * 10.0) / 10.0
        val storageAvailGb = Math.round((availBytes / BYTES_TO_GB) * 10.0) / 10.0
        val storageUsedGb = Math.round((storageTotalGb - storageAvailGb) * 10.0) / 10.0

        // 3. Battery & Temperature Metrics via IntentFilter
        val batteryStatusIntent: Intent? = context.registerReceiver(
            null,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        )

        val level = batteryStatusIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryStatusIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryPct = if (level >= 0 && scale > 0) Math.round((level / scale.toFloat()) * 100) else 80

        val status = batteryStatusIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL

        val tempTenths = batteryStatusIntent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 320) ?: 320
        val tempCelsius = Math.round((tempTenths / 10.0) * 10.0) / 10.0

        return JSONObject().apply {
            put("ramTotal", ramTotalGb)
            put("ramUsed", ramUsedGb)
            put("ramAvailable", ramAvailGb)
            put("storageTotal", storageTotalGb)
            put("storageUsed", storageUsedGb)
            put("storageAvailable", storageAvailGb)
            put("battery", batteryPct)
            put("charging", isCharging)
            put("temperature", tempCelsius)
            put("source", "Android Device")
        }
    }

    fun sendTelemetryAsync(serverIp: String, metrics: JSONObject, onResult: (Boolean) -> Unit) {
        thread {
            var connection: HttpURLConnection? = null
            try {
                val cleanIp = serverIp.trim().removeSuffix("/")
                val endpoint = if (cleanIp.startsWith("http://") || cleanIp.startsWith("https://")) {
                    "$cleanIp/api/telemetry"
                } else {
                    "http://$cleanIp:4000/api/telemetry"
                }

                val url = URL(endpoint)
                connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                connection.setRequestProperty("User-Agent", "CopilotAndroidCollector/1.0")
                connection.connectTimeout = 4000
                connection.readTimeout = 4000
                connection.doOutput = true

                val writer = OutputStreamWriter(connection.outputStream)
                writer.write(metrics.toString())
                writer.flush()
                writer.close()

                val responseCode = connection.responseCode
                onResult(responseCode in 200..299)
            } catch (e: Exception) {
                e.printStackTrace()
                onResult(false)
            } finally {
                connection?.disconnect()
            }
        }
    }
}

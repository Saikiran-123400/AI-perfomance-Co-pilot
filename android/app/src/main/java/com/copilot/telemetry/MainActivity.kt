package com.copilot.telemetry

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.EditText
import android.widget.TextView

class MainActivity : Activity() {

    private var isRunning = false
    private val handler = Handler(Looper.getMainLooper())
    private val intervalMs = 5000L

    private lateinit var ipInput: EditText
    private lateinit var toggleButton: Button
    private lateinit var statusText: TextView
    private lateinit var previewText: TextView

    private val telemetryRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return

            val metrics = TelemetryCollector.collectMetrics(this@MainActivity)
            val ip = ipInput.text.toString()

            runOnUiThread {
                previewText.text = """
                    RAM: ${metrics.optDouble("ramUsed")}/${metrics.optDouble("ramTotal")} GB (${metrics.optDouble("ramAvailable")} GB free)
                    Storage: ${metrics.optDouble("storageAvailable")} GB free / ${metrics.optDouble("storageTotal")} GB
                    Battery: ${metrics.optInt("battery")}% (Charging: ${metrics.optBoolean("charging")})
                    Temperature: ${metrics.optDouble("temperature")}°C
                    Source: ${metrics.optString("source")}
                """.trimIndent()
            }

            TelemetryCollector.sendTelemetryAsync(ip, metrics) { success ->
                runOnUiThread {
                    statusText.text = if (success) {
                        "🟢 Telemetry sent successfully to $ip"
                    } else {
                        "🔴 Error sending telemetry to $ip (Check Wi-Fi IP & Backend Port 4000)"
                    }
                }
            }

            handler.postDelayed(this, intervalMs)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 40, 40, 40)
        }

        val titleText = TextView(this).apply {
            text = "AI Phone Performance Copilot"
            textSize = 20f
            setTypeface(null, android.graphics.Typeface.BOLD)
        }

        val subtitleText = TextView(this).apply {
            text = "Live Android Device Telemetry Collector"
            textSize = 12f
            setPadding(0, 4, 0, 30)
        }

        val ipLabel = TextView(this).apply {
            text = "Backend Server IP Address (e.g., 192.168.1.50):"
            textSize = 12f
        }

        ipInput = EditText(this).apply {
            setText("192.168.1.50")
            setSingleLine()
        }

        toggleButton = Button(this).apply {
            text = "Start Telemetry Collector"
            setOnClickListener {
                if (isRunning) {
                    stopCollector()
                } else {
                    startCollector()
                }
            }
        }

        statusText = TextView(this).apply {
            text = "Status: Collector stopped"
            textSize = 12f
            setPadding(0, 20, 0, 20)
        }

        previewText = TextView(this).apply {
            text = "Tap Start to preview & stream live telemetry metrics."
            textSize = 12f
            setPadding(20, 20, 20, 20)
            setBackgroundColor(0xFFF1F5F9.toInt())
        }

        layout.addView(titleText)
        layout.addView(subtitleText)
        layout.addView(ipLabel)
        layout.addView(ipInput)
        layout.addView(toggleButton)
        layout.addView(statusText)
        layout.addView(previewText)

        setContentView(layout)
    }

    private fun startCollector() {
        isRunning = true
        toggleButton.text = "Stop Telemetry Collector"
        statusText.text = "🟡 Initializing telemetry stream..."
        handler.post(telemetryRunnable)
    }

    private fun stopCollector() {
        isRunning = false
        toggleButton.text = "Start Telemetry Collector"
        statusText.text = "Status: Collector stopped"
        handler.removeCallbacks(telemetryRunnable)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCollector()
    }
}

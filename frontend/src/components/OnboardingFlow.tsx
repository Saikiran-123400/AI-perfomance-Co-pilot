import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { TelemetrySample } from '../types';

interface Props {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<'welcome' | 'setup'>('welcome');
  const [checking, setChecking] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetrySample | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  const runSetupCheck = async () => {
    setChecking(true);
    try {
      const data = await apiClient.getLatestTelemetry();
      setTelemetry(data);
      setBackendConnected(data !== null);
    } catch {
      setBackendConnected(false);
      setTelemetry(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (step === 'setup') {
      runSetupCheck();
    }
  }, [step]);

  if (step === 'welcome') {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xs">
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              AI Performance Copilot
            </h1>

            <p className="mt-3 text-base font-semibold text-slate-700">
              Understand your device. Find performance problems. Keep your system running smoothly.
            </p>

            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Monitor CPU, memory, GPU, battery, temperature, network, and active applications from one place.
            </p>

            <div className="mt-6">
              <button
                onClick={() => setStep('setup')}
                className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                Get Started
              </button>
            </div>
          </div>

          <hr className="my-8 border-slate-150" />

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200/70">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                REAL DEVICE DATA
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                No simulated performance metrics
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200/70">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                CONTINUOUS MONITORING
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Track changes while you work
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200/70">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                PERFORMANCE ANALYSIS
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Understand what is affecting your device
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Device Setup Check Screen
  const agentDetected = telemetry !== null;
  const metricsAvailable = telemetry !== null && typeof telemetry.cpuUsage === 'number';

  const cpuAvailable = metricsAvailable;
  const memoryAvailable = metricsAvailable && typeof telemetry.ramUsage === 'number';
  const batteryAvailable = metricsAvailable && telemetry.batteryLevel !== null;
  const gpuAvailable = metricsAvailable && telemetry.gpuUsage !== null && telemetry.gpuUsage !== undefined;
  const networkAvailable = metricsAvailable && telemetry.networkLatencyMs !== null && telemetry.networkLatencyMs !== undefined;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">Let's set up your device</h2>
        <p className="mt-1 text-xs text-slate-500">
          Checking local service connections and system metrics availability.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-200 text-sm font-medium">
            <span className="text-slate-700">Backend service</span>
            {checking ? (
              <span className="text-xs text-slate-400">Checking...</span>
            ) : backendConnected ? (
              <span className="text-xs font-bold text-emerald-700">✓ Connected</span>
            ) : (
              <span className="text-xs font-bold text-rose-600">✗ Unreachable</span>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-200 text-sm font-medium">
            <span className="text-slate-700">Telemetry agent</span>
            {checking ? (
              <span className="text-xs text-slate-400">Checking...</span>
            ) : agentDetected ? (
              <span className="text-xs font-bold text-emerald-700">✓ Detected</span>
            ) : (
              <span className="text-xs font-bold text-amber-600">Pending Agent</span>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-200 text-sm font-medium">
            <span className="text-slate-700">Device metrics stream</span>
            {checking ? (
              <span className="text-xs text-slate-400">Checking...</span>
            ) : metricsAvailable ? (
              <span className="text-xs font-bold text-emerald-700">✓ Available</span>
            ) : (
              <span className="text-xs font-bold text-amber-600">Unavailable</span>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-150 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Hardware Signal Inventory
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2.5">
              <span className="font-semibold text-slate-700">CPU</span>
              <span className={cpuAvailable ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                {cpuAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2.5">
              <span className="font-semibold text-slate-700">Memory</span>
              <span className={memoryAvailable ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                {memoryAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2.5">
              <span className="font-semibold text-slate-700">Battery</span>
              <span className={batteryAvailable ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                {batteryAvailable ? 'Available' : 'Unavailable on AC'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2.5">
              <span className="font-semibold text-slate-700">GPU</span>
              <span className={gpuAvailable ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                {gpuAvailable ? 'Available' : 'Unavailable on this device'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2.5 sm:col-span-2">
              <span className="font-semibold text-slate-700">Network Latency</span>
              <span className={networkAvailable ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                {networkAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-slate-150 pt-5">
          <button
            onClick={runSetupCheck}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Re-check status
          </button>
          <button
            onClick={onComplete}
            className="rounded-lg bg-slate-900 px-6 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

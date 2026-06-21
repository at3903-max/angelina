import Foundation
import SwiftUI

struct ContentView: View {
    private enum TimerStatus {
        case idle
        case running
        case paused
    }

    private enum DurationField {
        case hours
        case minutes
        case seconds
    }

    @State private var hours = 0
    @State private var minutes = 25
    @State private var seconds = 0
    @State private var remainingSeconds = 25 * 60
    @State private var status: TimerStatus = .idle
    @FocusState private var focusedField: DurationField?

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var configuredDuration: Int {
        max(0, hours) * 3_600 + max(0, minutes) * 60 + max(0, seconds)
    }

    private var canStart: Bool {
        status == .paused ? remainingSeconds > 0 : configuredDuration > 0
    }

    private var canStop: Bool {
        status != .idle || remainingSeconds != configuredDuration
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 12) {
                    Text(timeString(from: remainingSeconds))
                        .font(.system(size: 72, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                        .accessibilityLabel("Countdown display")

                    Text(statusLabel)
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }

                durationEditor

                HStack(spacing: 12) {
                    Button("Start", action: startTimer)
                        .buttonStyle(.borderedProminent)
                        .disabled(!canStart || status == .running)

                    Button("Pause", action: pauseTimer)
                        .buttonStyle(.bordered)
                        .disabled(status != .running)

                    Button("Stop", action: stopTimer)
                        .buttonStyle(.bordered)
                        .disabled(!canStop)
                }
                .controlSize(.large)

                Spacer()
            }
            .padding()
            .navigationTitle("Pomodoro Timer")
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()

                    Button("Done") {
                        focusedField = nil
                    }
                }
            }
            .onReceive(timer) { _ in
                tick()
            }
            .onChange(of: hours) { _ in
                durationChanged()
            }
            .onChange(of: minutes) { _ in
                durationChanged()
            }
            .onChange(of: seconds) { _ in
                durationChanged()
            }
        }
    }

    private var durationEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Set countdown duration")
                .font(.headline)

            HStack(spacing: 12) {
                durationField("Hours", value: $hours, field: .hours)
                durationField("Minutes", value: $minutes, field: .minutes)
                durationField("Seconds", value: $seconds, field: .seconds)
            }
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var statusLabel: String {
        switch status {
        case .idle:
            return remainingSeconds == 0 ? "Finished" : "Ready"
        case .running:
            return "Running"
        case .paused:
            return "Paused"
        }
    }

    private func durationField(_ title: String, value: Binding<Int>, field: DurationField) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)

            TextField("0", value: value, format: .number)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
                .multilineTextAlignment(.center)
                .focused($focusedField, equals: field)
                .accessibilityLabel(title)
        }
    }

    private func startTimer() {
        focusedField = nil

        if status != .paused {
            remainingSeconds = configuredDuration
        }

        guard remainingSeconds > 0 else {
            status = .idle
            return
        }

        status = .running
    }

    private func pauseTimer() {
        guard status == .running else {
            return
        }

        status = .paused
    }

    private func stopTimer() {
        status = .idle
        remainingSeconds = configuredDuration
    }

    private func tick() {
        guard status == .running else {
            return
        }

        guard remainingSeconds > 1 else {
            remainingSeconds = 0
            status = .idle
            return
        }

        remainingSeconds -= 1
    }

    private func durationChanged() {
        clampDurationInputs()

        if status == .idle {
            remainingSeconds = configuredDuration
        }
    }

    private func clampDurationInputs() {
        hours = max(0, hours)
        minutes = max(0, minutes)
        seconds = max(0, seconds)
    }

    private func timeString(from totalSeconds: Int) -> String {
        let clampedSeconds = max(0, totalSeconds)
        let hours = clampedSeconds / 3_600
        let minutes = (clampedSeconds % 3_600) / 60
        let seconds = clampedSeconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }

        return String(format: "%02d:%02d", minutes, seconds)
    }
}

#Preview {
    ContentView()
}

import SwiftUI
import Combine

#if os(iOS)
import UIKit
#endif

struct ContentView: View {
    @StateObject private var store = SkinPodStore()
    @State private var selectedTab: AppTab = .today
    @State private var showingCamera = false

    var body: some View {
        PhonePreviewShell {
            ZStack(alignment: .bottom) {
                NavigationStack {
                    activeScreen
                }

                PhoneTabBar(selectedTab: $selectedTab)
            }
            .background(Palette.background)
            .ignoresSafeArea(.keyboard, edges: .bottom)
        }
        #if os(iOS)
        .sheet(isPresented: $showingCamera) {
            CameraPicker(mode: store.scanMode) { image in
                store.completeScan(image: image)
            }
            .ignoresSafeArea()
        }
        #endif
    }

    @ViewBuilder
    private var activeScreen: some View {
        switch selectedTab {
        case .today:
            TodayView(store: store, showingCamera: $showingCamera)
        case .routine:
            RoutineView(store: store)
        case .scan:
            ScanHubView(store: store, showingCamera: $showingCamera)
        case .trends:
            TrendsView(store: store)
        case .profile:
            ProfileView(store: store)
        }
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case today
    case routine
    case scan
    case trends
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .today:
            return "Today"
        case .routine:
            return "Routine"
        case .scan:
            return "Scan"
        case .trends:
            return "Trends"
        case .profile:
            return "Profile"
        }
    }

    var icon: String {
        switch self {
        case .today:
            return "sun.max"
        case .routine:
            return "checklist"
        case .scan:
            return "plus"
        case .trends:
            return "chart.bar.fill"
        case .profile:
            return "person"
        }
    }
}

struct PhonePreviewShell<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        #if os(macOS)
        ZStack {
            Color(red: 0.90, green: 0.93, blue: 0.91)
                .ignoresSafeArea()

            content
                .frame(width: 393, height: 852)
                .clipShape(RoundedRectangle(cornerRadius: 38))
                .overlay(
                    RoundedRectangle(cornerRadius: 38)
                        .stroke(Color.black.opacity(0.10), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.18), radius: 24, x: 0, y: 18)
        }
        #else
        content
        #endif
    }
}

struct PhoneTabBar: View {
    @Binding var selectedTab: AppTab

    var body: some View {
        HStack(spacing: 0) {
            tabButton(.today)
            tabButton(.routine)
            scanButton
            tabButton(.trends)
            tabButton(.profile)
        }
        .padding(.horizontal, 12)
        .padding(.top, 10)
        .padding(.bottom, 12)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.black.opacity(0.06))
                .frame(height: 1)
        }
    }

    private func tabButton(_ tab: AppTab) -> some View {
        Button {
            selectedTab = tab
        } label: {
            VStack(spacing: 4) {
                Image(systemName: tab.icon)
                    .font(.system(size: 20, weight: selectedTab == tab ? .semibold : .regular))
                Text(tab.title)
                    .font(.caption2.weight(selectedTab == tab ? .semibold : .regular))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .foregroundStyle(selectedTab == tab ? Palette.green : Color.secondary)
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var scanButton: some View {
        Button {
            selectedTab = .scan
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 60, height: 60)
                .background(Palette.green)
                .clipShape(Circle())
                .shadow(color: Palette.green.opacity(0.35), radius: 10, x: 0, y: 5)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

struct TodayView: View {
    @ObservedObject var store: SkinPodStore
    @Binding var showingCamera: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AppHeader()

                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Good morning, Olivia")
                            .font(.subheadline)
                        Text("May 20, 2025")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text("Today's Skin Check")
                            .font(.largeTitle.weight(.bold))
                            .foregroundStyle(Palette.ink)
                            .padding(.top, 10)
                            .lineLimit(2)
                            .minimumScaleFactor(0.82)
                        Text("Your daily snapshot of skin health")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer(minLength: 8)
                    ScoreGauge(score: store.todayScore)
                }

                NavigationLink {
                    InsightsView(store: store, showingCamera: $showingCamera)
                } label: {
                    ZStack(alignment: .bottom) {
                        SkinPhotoPreview(name: "TodayScanPreview", height: 224)

                        HStack(spacing: 14) {
                            ConcernIcon(systemName: "waveform.path.ecg", color: .red)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Mild irritation detected")
                                    .font(.headline)
                                    .foregroundStyle(Palette.ink)
                                Text("Redness +6% from yesterday")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            Label("View Insights", systemImage: "chevron.right")
                                .labelStyle(.titleAndIcon)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Palette.ink)
                                .lineLimit(1)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(.white.opacity(0.86))
                                .clipShape(Capsule())
                        }
                        .padding(14)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(12)
                    }
                }
                .buttonStyle(.plain)

                SkinAnalysisCard()

                TriggerInsightsCard()

                TipCard(text: "Hydration is key. Drink water and continue using gentle, barrier-supporting products.")

                Disclaimer()
            }
            .screenPadding()
        }
        .safeAreaInset(edge: .bottom) {
            Color.clear.frame(height: 84)
        }
        .background(Palette.background)
    }
}

struct InsightsView: View {
    @ObservedObject var store: SkinPodStore
    @Binding var showingCamera: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AppHeader()

                VStack(alignment: .leading, spacing: 4) {
                    Text("Today's Insights")
                        .font(.largeTitle.weight(.bold))
                        .foregroundStyle(Palette.ink)
                    Text("Analysis completed - May 20, 2025 8:41 AM")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                SkinPhotoPreview(name: "InsightsScanPreview", height: 210)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Detected Concerns")
                        .font(.headline)

                    VStack(spacing: 10) {
                        DetectedConcernCard(title: "Redness", level: "Mild", tip: "Calm and soothe with hydrating ingredients.", icon: "face.smiling.inverse", color: .red)
                        DetectedConcernCard(title: "Blemish", level: "Mild", tip: "Keep pores clean and avoid picking.", icon: "circle.grid.cross", color: .orange)
                        DetectedConcernCard(title: "Dryness", level: "Mild", tip: "Boost hydration and strengthen moisture barrier.", icon: "water.waves", color: .yellow)
                    }
                }
                .card()

                SkinMetricsCard()

                TriggerInsightsCard()

                VStack(alignment: .leading, spacing: 14) {
                    Text("Recommended Actions")
                        .font(.headline)

                    VStack(spacing: 14) {
                        ActionTile(icon: "drop", title: "Hydrate", detail: "Drink enough water throughout the day.")
                        ActionTile(icon: "shippingbox", title: "Use a Gentle Moisturizer", detail: "Lock in moisture and support your barrier.")
                        ActionTile(icon: "sun.max", title: "Apply Sunscreen", detail: "Use SPF 30+ broad spectrum daily.")
                        ActionTile(icon: "flask", title: "Avoid Harsh Actives", detail: "Skip exfoliants and strong actives today.")
                    }
                }
                .card()

                Button {
                    store.scanMode = .frontCamera
                    #if os(iOS)
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        showingCamera = true
                    } else {
                        store.startScan()
                    }
                    #else
                    store.startScan()
                    #endif
                } label: {
                    Label("Scan Another Photo", systemImage: "camera")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                }
                .buttonStyle(.borderedProminent)
                .tint(Palette.green)

                Disclaimer()
            }
            .screenPadding()
        }
        .safeAreaInset(edge: .bottom) {
            Color.clear.frame(height: 84)
        }
        .background(Palette.background)
    }
}

struct TrendsView: View {
    @ObservedObject var store: SkinPodStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AppHeader()

                VStack(alignment: .leading, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Progress & Trends")
                            .font(.largeTitle.weight(.bold))
                            .foregroundStyle(Palette.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                        Text("7 days first. Skinpod collects trends from real daily photos and check-ins.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Picker("Range", selection: $store.trendRange) {
                        Text("7 Days").tag(7)
                        Text("14 Days").tag(14)
                    }
                    .pickerStyle(.segmented)
                    .frame(maxWidth: 220)
                }

                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Skin Health Score")
                                    .font(.headline)
                                HStack(alignment: .firstTextBaseline, spacing: 3) {
                                    Text("\(store.todayScore)")
                                        .font(.system(size: 54, weight: .bold))
                                        .foregroundStyle(Palette.ink)
                                    Text("/100")
                                        .font(.title3)
                                        .foregroundStyle(.secondary)
                                }
                                Text("+12 points from 7 days ago")
                                    .font(.caption)
                                    .foregroundStyle(Palette.green)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 4) {
                                Text("Photo based")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(Palette.greenDark)
                                Text("Daily scan data")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.top, 4)
                        }

                        TrendLineChart(values: store.weekScores)
                            .frame(height: 128)
                    }
                }
                .card()

                SkinPhotoPreview(name: "TrendComparisonPreview", height: 176)

                VStack(alignment: .leading, spacing: 12) {
                    Text("What Changed")
                        .font(.headline)

                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                        ChangeCard(title: "Redness", value: "-12%", status: "Improved", color: .red)
                        ChangeCard(title: "Acne Spots", value: "8 to 5", status: "Improved", color: .orange)
                        ChangeCard(title: "Texture", value: "Stable", status: "No change", color: .yellow)
                        ChangeCard(title: "Hydration", value: "+15%", status: "Improved", color: .blue)
                    }
                }
                .card()

                VStack(spacing: 12) {
                    TriggerCorrelationCard()
                    ConsistencyCard()
                }

                WeeklyReportCard()

                TipCard(text: "Great progress. Keep prioritizing sleep and hydration to support your skin barrier.")
                Disclaimer()
            }
            .screenPadding()
        }
        .safeAreaInset(edge: .bottom) {
            Color.clear.frame(height: 84)
        }
        .background(Palette.background)
    }
}

struct ScanHubView: View {
    @ObservedObject var store: SkinPodStore
    @Binding var showingCamera: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AppHeader()

                Text("Choose Scan Mode")
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)

                VStack(spacing: 10) {
                    ForEach(ScanMode.allCases) { mode in
                        Button {
                            store.scanMode = mode
                        } label: {
                            HStack(spacing: 12) {
                                ConcernIcon(systemName: mode.icon, color: mode.color)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(mode.title)
                                        .font(.headline)
                                        .foregroundStyle(Palette.ink)
                                        .lineLimit(1)
                                    Text(mode.subtitle)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)
                                }
                                Spacer(minLength: 8)
                                if store.scanMode == mode {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(Palette.green)
                                }
                            }
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(store.scanMode == mode ? Palette.green.opacity(0.10) : Palette.card)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(store.scanMode == mode ? Palette.green.opacity(0.25) : Color.gray.opacity(0.10)))
                        }
                        .buttonStyle(.plain)
                    }
                }

                Button {
                    if store.scanMode == .skinPod {
                        store.completeScan(image: nil)
                    } else {
                        #if os(iOS)
                        if UIImagePickerController.isSourceTypeAvailable(.camera) {
                            showingCamera = true
                        } else {
                            store.completeScan(image: nil)
                        }
                        #else
                        store.completeScan(image: nil)
                        #endif
                    }
                } label: {
                    Label(store.scanMode == .skinPod ? "Run Skinpod Demo Scan" : "Open Camera", systemImage: "viewfinder")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                }
                .buttonStyle(.borderedProminent)
                .tint(Palette.green)

                Text("Front and back camera scans are the app-first MVP. If the published app performs well with customers, Skinpod can later expand into a handheld machine with fixed light and distance.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .card()
            }
            .screenPadding()
        }
        .safeAreaInset(edge: .bottom) {
            Color.clear.frame(height: 84)
        }
        .background(Palette.background)
    }
}

struct RoutineView: View {
    @ObservedObject var store: SkinPodStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AppHeader()
                VStack(alignment: .leading, spacing: 6) {
                    Text("Routine")
                        .font(.largeTitle.weight(.bold))
                        .foregroundStyle(Palette.ink)
                    Text("Simple daily record of what was used and completed.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                RoutineTrackerCard(store: store)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Product Shelf")
                        .font(.headline)
                    ProductRow(name: "Gentle Cleanser", detail: "AM + PM - barrier friendly", icon: "drop")
                    ProductRow(name: "Hydrating Serum", detail: "AM - supports dryness score", icon: "sparkles")
                    ProductRow(name: "Moisturizer", detail: "AM + PM - current streak 12 days", icon: "shippingbox")
                    ProductRow(name: "Sunscreen", detail: "AM - missing today", icon: "sun.max")
                }
                .card()

                VStack(alignment: .leading, spacing: 10) {
                    Text("Routine Notes")
                        .font(.headline)
                    Text("Record changes here so weekly reports can compare products used with skin issues and photo trends.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .card()
            }
            .screenPadding()
        }
        .safeAreaInset(edge: .bottom) {
            Color.clear.frame(height: 84)
        }
        .background(Palette.background)
    }
}

struct ProfileView: View {
    @ObservedObject var store: SkinPodStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AppHeader()
                VStack(alignment: .leading, spacing: 6) {
                    Text("Profile")
                        .font(.largeTitle.weight(.bold))
                        .foregroundStyle(Palette.ink)
                    Text("Personalized skin profile, products, reports, and concerns.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Skin Profile")
                        .font(.headline)
                    ProfileLine(title: "Skin type", value: "Combination")
                    ProfileLine(title: "Main goals", value: "Redness, texture, hydration")
                    ProfileLine(title: "Sensitivity", value: "Moderate")
                    ProfileLine(title: "Tracking style", value: "Daily quick scan")
                }
                .card()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Personalized Records")
                        .font(.headline)
                    ProfileLine(title: "Products used", value: "4 active")
                    ProfileLine(title: "Reports saved", value: "\(store.reportsSaved)")
                    ProfileLine(title: "Skin issues watched", value: "Redness, acne, dryness")
                    ProfileLine(title: "Latest scan", value: "Today 8:41 AM")
                }
                .card()

                Disclaimer()
            }
            .screenPadding()
        }
        .safeAreaInset(edge: .bottom) {
            Color.clear.frame(height: 84)
        }
        .background(Palette.background)
    }
}

struct AppHeader: View {
    var body: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "leaf")
                    .foregroundStyle(Palette.green)
                Text("Skinpod")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Palette.greenDark)
            }

            Spacer()

            Image(systemName: "bell")
                .font(.headline)

            ZStack(alignment: .bottomTrailing) {
                Circle()
                    .fill(Color.gray.opacity(0.18))
                    .frame(width: 42, height: 42)
                    .overlay(
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 34))
                            .foregroundStyle(.secondary)
                    )
                Circle()
                    .fill(Palette.green)
                    .frame(width: 10, height: 10)
                    .overlay(Circle().stroke(.white, lineWidth: 2))
            }
        }
    }
}

struct ScoreGauge: View {
    let score: Int

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .trim(from: 0.14, to: 0.86)
                    .stroke(Palette.green.opacity(0.16), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(90))
                Circle()
                    .trim(from: 0.14, to: 0.14 + (0.72 * CGFloat(score) / 100))
                    .stroke(Palette.green, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(90))
                VStack(spacing: 0) {
                    Text("\(score)")
                        .font(.system(size: 38, weight: .bold))
                        .foregroundStyle(Palette.ink)
                    Text("/100")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 108, height: 90)

            Text("Skin Health Score")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }
}

struct SkinAnalysisCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Skin Analysis")
                    .font(.headline)
                Spacer()
                Label("Photo + check-in", systemImage: "camera.metering.matrix")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Palette.greenDark)
                    .lineLimit(1)
            }

            Text("Today's analysis shows mild barrier stress, with redness and dryness moving up compared with yesterday.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            MetricRow(name: "Redness", value: "Elevated", icon: "face.smiling.inverse", color: .red, trend: "Up")
            MetricRow(name: "Acne", value: "Mild", icon: "bandage", color: .orange, trend: "Up")
            MetricRow(name: "Dryness", value: "Moderate", icon: "water.waves", color: .yellow, trend: "Up")
            MetricRow(name: "Oiliness", value: "Balanced", icon: "drop", color: .green, trend: "Down")
            MetricRow(name: "Texture", value: "Good", icon: "circle.grid.3x3", color: .blue, trend: "Down")
        }
        .card()
    }
}

struct TriggerItem: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
    let color: Color
    let opacity: Double
}

struct TriggerGroup: Identifiable {
    let id = UUID()
    let title: String
    let items: [TriggerItem]
}

struct TriggerInsightsCard: View {
    let groups: [TriggerGroup] = [
        TriggerGroup(title: "Lifestyle", items: [
            TriggerItem(name: "Stress", icon: "brain.head.profile", color: .red, opacity: 0.16),
            TriggerItem(name: "Poor Sleep", icon: "moon", color: .orange, opacity: 0.16),
            TriggerItem(name: "Workout", icon: "dumbbell", color: .green, opacity: 0.14),
            TriggerItem(name: "Sun", icon: "sun.max", color: .yellow, opacity: 0.18)
        ]),
        TriggerGroup(title: "Diet habits", items: [
            TriggerItem(name: "Dairy", icon: "cup.and.saucer", color: .gray, opacity: 0.12),
            TriggerItem(name: "Spicy food", icon: "flame", color: .red, opacity: 0.13),
            TriggerItem(name: "High sugar", icon: "birthday.cake", color: .pink, opacity: 0.12),
            TriggerItem(name: "Alcohol", icon: "wineglass", color: .red, opacity: 0.12)
        ]),
        TriggerGroup(title: "Product + environment", items: [
            TriggerItem(name: "New Product", icon: "bottle", color: .gray, opacity: 0.12),
            TriggerItem(name: "Weather", icon: "cloud", color: .blue, opacity: 0.14),
            TriggerItem(name: "Mask", icon: "facemask", color: .purple, opacity: 0.12),
            TriggerItem(name: "Pollution", icon: "aqi.medium", color: .brown, opacity: 0.12)
        ])
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Trigger Insights")
                    .font(.headline)
                Text("Part of the analysis: log lifestyle, diet, product, and environment habits so Skinpod can compare them with real photo changes.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            ForEach(groups) { group in
                VStack(alignment: .leading, spacing: 8) {
                    Text(group.title)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Palette.ink)

                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                        ForEach(group.items) { trigger in
                            Label(trigger.name, systemImage: trigger.icon)
                                .font(.caption.weight(.medium))
                                .lineLimit(1)
                                .minimumScaleFactor(0.78)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 10)
                                .background(trigger.color.opacity(trigger.opacity))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            }
        }
        .card()
    }
}

struct RoutineTrackerCard: View {
    @ObservedObject var store: SkinPodStore

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Routine Tracker")
                    .font(.headline)
                Spacer()
                Text("\(store.completedRoutineCount)/\(store.routineSteps.count)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.greenDark)
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Tap each simple step once it is done.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                ForEach(store.routineSteps) { step in
                    RoutineCheckRow(step: step) {
                        store.toggleRoutineStep(step)
                    }
                }
            }
        }
        .card()
    }
}

struct RoutineCheckRow: View {
    let step: RoutineStep
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                Image(systemName: step.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(step.isCompleted ? Palette.green : Color.secondary)
                VStack(alignment: .leading, spacing: 3) {
                    Text(step.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Palette.ink)
                    Text(step.period)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(step.isCompleted ? "Done" : "Check")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(step.isCompleted ? Palette.greenDark : .secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(step.isCompleted ? Palette.green.opacity(0.12) : Color.gray.opacity(0.10))
                    .clipShape(Capsule())
            }
            .padding(12)
            .background(step.isCompleted ? Palette.green.opacity(0.08) : Palette.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.gray.opacity(0.12)))
        }
        .buttonStyle(.plain)
    }
}

struct MetricRow: View {
    let name: String
    let value: String
    let icon: String
    let color: Color
    let trend: String

    var body: some View {
        HStack(spacing: 10) {
            ConcernIcon(systemName: icon, color: color, size: 27)
            Text(name)
                .font(.subheadline)
                .lineLimit(1)
            Spacer(minLength: 6)
            Circle()
                .fill(color)
                .frame(width: 5, height: 5)
            Text(value)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Text(trend)
                .font(.caption.weight(.bold))
                .foregroundStyle(trend == "Up" ? .red : .green)
                .frame(width: 38, alignment: .trailing)
        }
    }
}

struct SkinMetricsCard: View {
    let metrics = [
        ("Redness", 78, "+6%", Color.red),
        ("Acne", 32, "+4%", Color.orange),
        ("Dryness", 64, "+8%", Color.yellow),
        ("Oiliness", 38, "-5%", Color.green),
        ("Texture", 41, "-2%", Color.blue)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Skin Metrics")
                    .font(.headline)
                Spacer()
                Text("Compare with yesterday")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ForEach(metrics, id: \.0) { metric in
                HStack {
                    Text(metric.0)
                        .font(.subheadline)
                        .frame(width: 82, alignment: .leading)
                    ProgressView(value: Double(metric.1), total: 100)
                        .tint(metric.3)
                    Text("\(metric.1)%")
                        .font(.caption)
                        .frame(width: 38)
                    Text(metric.2)
                        .font(.caption)
                        .foregroundStyle(metric.2.contains("+") ? .red : .green)
                        .frame(width: 38, alignment: .trailing)
                }
            }
        }
        .card()
    }
}

struct DetectedConcernCard: View {
    let title: String
    let level: String
    let tip: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ConcernIcon(systemName: icon, color: color)
            Text(title)
                .font(.headline)
            Text(level)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(color)
            Text(tip)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.gray.opacity(0.12)))
    }
}

struct ActionTile: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        HStack(spacing: 12) {
            ConcernIcon(systemName: icon, color: Palette.green)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ChangeCard: View {
    let title: String
    let value: String
    let status: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(Palette.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.70)
            Text(status)
                .font(.caption2)
                .foregroundStyle(status == "No change" ? .orange : Palette.green)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct TriggerCorrelationCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Trigger Correlation")
                .font(.headline)
            CorrelationRow(name: "Poor Sleep", value: "0.72", icon: "moon")
            CorrelationRow(name: "Alcohol", value: "0.68", icon: "wineglass")
            CorrelationRow(name: "High Sugar", value: "0.61", icon: "birthday.cake")
            Button("View All Insights") {}
                .buttonStyle(.bordered)
                .tint(Palette.green)
                .frame(maxWidth: .infinity)
        }
        .card()
    }
}

struct CorrelationRow: View {
    let name: String
    let value: String
    let icon: String

    var body: some View {
        HStack {
            ConcernIcon(systemName: icon, color: .red, size: 30)
            VStack(alignment: .leading, spacing: 3) {
                Text(name)
                    .font(.caption.weight(.semibold))
                Text("High correlation")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(value)
                .font(.caption.weight(.bold))
                .foregroundStyle(.red)
        }
        .padding(8)
        .background(Color.red.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct ConsistencyCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Routine Consistency")
                .font(.headline)

            HStack {
                ZStack {
                    Circle()
                        .stroke(Palette.green.opacity(0.18), lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: 0.86)
                        .stroke(Palette.green, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    VStack {
                        Text("86%")
                            .font(.title2.weight(.bold))
                        Text("Completed")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: 92, height: 92)

                VStack(alignment: .leading, spacing: 5) {
                    Text("Current Streak")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("12 days")
                        .font(.title2.weight(.bold))
                    Text("Best: 21 days")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }

            Button("View Routine History") {}
                .buttonStyle(.bordered)
                .tint(Palette.green)
        }
        .card()
    }
}

struct WeeklyReportCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Weekly Report")
                        .font(.headline)
                    Text("Generated automatically every 7 days for your records.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "doc.richtext")
                    .font(.title2)
                    .foregroundStyle(Palette.green)
            }

            HStack {
                Button("Export PDF") {}
                    .buttonStyle(.bordered)
                Button("Share") {}
                    .buttonStyle(.bordered)
            }
        }
        .card()
    }
}

struct TrendLineChart: View {
    let values: [Int]

    var body: some View {
        GeometryReader { proxy in
            let points = normalizedPoints(in: proxy.size)

            ZStack {
                VStack {
                    ForEach(0..<4, id: \.self) { _ in
                        Divider()
                        Spacer()
                    }
                }
                .opacity(0.45)

                Path { path in
                    guard let first = points.first else { return }
                    path.move(to: first)
                    for point in points.dropFirst() {
                        path.addLine(to: point)
                    }
                }
                .stroke(Palette.green, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))

                ForEach(Array(points.enumerated()), id: \.offset) { _, point in
                    Circle()
                        .fill(Palette.green)
                        .frame(width: 7, height: 7)
                        .position(point)
                }
            }
        }
    }

    private func normalizedPoints(in size: CGSize) -> [CGPoint] {
        guard let minValue = values.min(), let maxValue = values.max(), values.count > 1 else { return [] }
        let range = max(maxValue - minValue, 1)
        return values.enumerated().map { index, value in
            let x = CGFloat(index) / CGFloat(values.count - 1) * size.width
            let y = size.height - (CGFloat(value - minValue) / CGFloat(range) * size.height * 0.74 + size.height * 0.13)
            return CGPoint(x: x, y: y)
        }
    }
}

struct TipCard: View {
    let text: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "sparkles")
                .font(.title)
                .foregroundStyle(Color.blue)
            VStack(alignment: .leading, spacing: 4) {
                Text("Daily Tip")
                    .font(.headline)
                Text(text)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "drop.fill")
                .font(.largeTitle)
                .foregroundStyle(Color.blue.opacity(0.35))
        }
        .padding(16)
        .background(LinearGradient(colors: [Color.blue.opacity(0.12), Color.green.opacity(0.08)], startPoint: .leading, endPoint: .trailing))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct ConcernIcon: View {
    let systemName: String
    let color: Color
    var size: CGFloat = 42

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: size * 0.42, weight: .medium))
            .foregroundStyle(color)
            .frame(width: size, height: size)
            .background(color.opacity(0.12))
            .clipShape(Circle())
    }
}

struct ProductRow: View {
    let name: String
    let detail: String
    let icon: String

    var body: some View {
        HStack(spacing: 12) {
            ConcernIcon(systemName: icon, color: Palette.green, size: 34)
            VStack(alignment: .leading, spacing: 3) {
                Text(name)
                    .font(.subheadline.weight(.semibold))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 5)
    }
}

struct ProfileLine: View {
    let title: String
    let value: String

    var body: some View {
        HStack {
            Text(title)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.trailing)
        }
        .font(.subheadline)
    }
}

struct SkinPhotoPreview: View {
    let name: String
    let height: CGFloat

    var body: some View {
        ZStack {
            LinearGradient(colors: [Palette.green.opacity(0.14), Color.orange.opacity(0.10)], startPoint: .topLeading, endPoint: .bottomTrailing)

            Image(name)
                .resizable()
                .scaledToFill()

            VStack {
                Spacer()
                HStack {
                    Label("Skin photo scan", systemImage: "camera.viewfinder")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Palette.ink)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(.white.opacity(0.82))
                        .clipShape(Capsule())
                    Spacer()
                }
                .padding(12)
            }
        }
        .frame(height: height)
        .frame(maxWidth: .infinity)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}

struct Disclaimer: View {
    var body: some View {
        Label("Skinpod is for informational purposes only and is not a medical diagnosis tool. Always consult a dermatologist for medical concerns.", systemImage: "shield")
            .font(.caption)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.horizontal)
    }
}

enum ScanMode: String, CaseIterable, Identifiable, Codable {
    case frontCamera
    case backCamera
    case skinPod

    var id: String { rawValue }

    var title: String {
        switch self {
        case .frontCamera:
            return "Front camera"
        case .backCamera:
            return "Back camera"
        case .skinPod:
            return "Skinpod device"
        }
    }

    var subtitle: String {
        switch self {
        case .frontCamera:
            return "Fast daily selfie scan for skin trends."
        case .backCamera:
            return "Closer, clearer scan for texture and pores."
        case .skinPod:
            return "Future handheld scanner with fixed light and distance."
        }
    }

    var icon: String {
        switch self {
        case .frontCamera:
            return "camera.viewfinder"
        case .backCamera:
            return "camera.macro"
        case .skinPod:
            return "circle.hexagongrid.circle"
        }
    }

    var color: Color {
        switch self {
        case .frontCamera:
            return .blue
        case .backCamera:
            return .orange
        case .skinPod:
            return Palette.green
        }
    }
}

struct RoutineStep: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let period: String
    var isCompleted: Bool
}

@MainActor
final class SkinPodStore: ObservableObject {
    @Published var todayScore = 78
    @Published var trendRange = 7
    @Published var scanMode: ScanMode = .frontCamera
    @Published var weekScores = [50, 47, 55, 58, 64, 77, 81]
    @Published var scansCompleted = 0
    @Published var reportsSaved = 4
    @Published var routineSteps: [RoutineStep] = [
        RoutineStep(name: "Cleanser", period: "AM + PM", isCompleted: true),
        RoutineStep(name: "Serum", period: "AM", isCompleted: true),
        RoutineStep(name: "Moisturizer", period: "AM + PM", isCompleted: true),
        RoutineStep(name: "Sunscreen", period: "AM", isCompleted: false),
        RoutineStep(name: "Treatment", period: "PM", isCompleted: true)
    ]

    var completedRoutineCount: Int {
        routineSteps.filter(\.isCompleted).count
    }

    func startScan() {
        completeScan(image: nil)
    }

    func completeScan(image: PlatformImage?) {
        let delta = Int.random(in: -3...5)
        todayScore = min(max(todayScore + delta, 0), 100)
        if !weekScores.isEmpty {
            weekScores.removeFirst()
        }
        weekScores.append(todayScore)
        scansCompleted += 1
    }

    func toggleRoutineStep(_ step: RoutineStep) {
        guard let index = routineSteps.firstIndex(of: step) else { return }
        routineSteps[index].isCompleted.toggle()
    }
}

enum Palette {
    static let green = Color(red: 0.30, green: 0.62, blue: 0.33)
    static let greenDark = Color(red: 0.10, green: 0.35, blue: 0.25)
    static let ink = Color(red: 0.05, green: 0.16, blue: 0.16)
    static let background = Color(red: 0.97, green: 0.98, blue: 0.97)
    static let card = Color.white
}

extension View {
    func card() -> some View {
        self
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.gray.opacity(0.12)))
            .shadow(color: Color.black.opacity(0.035), radius: 10, x: 0, y: 5)
    }

    func screenPadding() -> some View {
        self
            .padding(.horizontal, 18)
            .padding(.top, 18)
            .padding(.bottom, 8)
    }
}

#if os(iOS)
typealias PlatformImage = UIImage

struct CameraPicker: UIViewControllerRepresentable {
    let mode: ScanMode
    let onImage: (UIImage?) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .camera
        picker.allowsEditing = false

        if mode == .frontCamera, UIImagePickerController.isCameraDeviceAvailable(.front) {
            picker.cameraDevice = .front
        } else if UIImagePickerController.isCameraDeviceAvailable(.rear) {
            picker.cameraDevice = .rear
        }

        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let parent: CameraPicker

        init(parent: CameraPicker) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            parent.onImage(info[.originalImage] as? UIImage)
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
#else
typealias PlatformImage = Never
#endif

#Preview {
    ContentView()
}

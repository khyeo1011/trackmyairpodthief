// frontend/lib/utils.ts

// Battery Status Parser
export const parseBatteryBitmask = (status: string | number) => {
    const raw = typeof status === "string"
        ? (status.startsWith("0b") ? parseInt(status.slice(2), 2) : parseInt(status, 10))
        : status;

    if (isNaN(raw)) return { label: "Unknown", color: "bg-slate-100 text-slate-500", percentage: 0 };

    const isCharging = (raw >> 7) & 0x01;
    const percentage = raw & 0x7F; // Isolates bits 0-6

    // Categorize percentage into levels
    let levelKey = 0;
    if (percentage >= 100) levelKey = 7;
    else if (percentage > 85) levelKey = 6;
    else if (percentage > 70) levelKey = 5;
    else if (percentage > 50) levelKey = 4;
    else if (percentage > 25) levelKey = 3;
    else if (percentage > 10) levelKey = 2;
    else if (percentage > 0) levelKey = 1;
    else levelKey = 0;

    const levels: Record<number, { label: string; color: string }> = {
        0: { label: "Empty", color: "bg-red-200 text-red-900" },
        1: { label: "Critical", color: "bg-red-100 text-red-700" },
        2: { label: "Low", color: "bg-orange-100 text-orange-700" },
        3: { label: "Mid-Low", color: "bg-yellow-100 text-yellow-700" },
        4: { label: "Medium", color: "bg-blue-100 text-blue-700" },
        5: { label: "Mid-High", color: "bg-emerald-50 text-emerald-600" },
        6: { label: "High", color: "bg-emerald-100 text-emerald-700" },
        7: { label: "Full", color: "bg-green-100 text-green-800" },
    };

    const info = levels[levelKey];
    return {
        ...info,
        percentage,
        label: isCharging ? `${info.label} (${percentage}%) ⚡` : `${info.label} (${percentage}%)`
    };
};

// Geography / Map Utilities
export function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Map Icon Generator
export const getIconUrl = (opacity: number) => {
    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4f46e5" width="40" height="40" style="opacity: ${opacity}; filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.2));">
    <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
  </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

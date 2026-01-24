"use client";

interface BatteryStatusProps {
    status: string | number;
}

// Bit 0-2: Level (0-7), Bit 3: Charging (1 = Yes)
const parseBatteryBitmask = (status: string | number) => {
    const raw = typeof status === "string"
        ? (status.startsWith("0b") ? parseInt(status.slice(2), 2) : parseInt(status, 10))
        : status;

    if (isNaN(raw)) return { label: "Unknown", color: "bg-slate-100 text-slate-500" };

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

export default function BatteryStatus({ status }: BatteryStatusProps) {
    const battery = parseBatteryBitmask(status);
    
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${battery.color}`}>
            {battery.label}
        </span>
    );
}

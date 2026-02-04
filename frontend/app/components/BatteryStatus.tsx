"use client";

import { parseBatteryBitmask } from "@/lib/utils";

interface BatteryStatusProps {
    status: string | number;
}

export default function BatteryStatus({ status }: BatteryStatusProps) {
    const battery = parseBatteryBitmask(status);
    
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${battery.color}`}>
            {battery.label}
        </span>
    );
}

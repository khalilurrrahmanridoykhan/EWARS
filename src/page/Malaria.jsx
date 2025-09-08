import React, { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import "leaflet/dist/leaflet.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import HierarchicalMultiSelect from "@/components/HierarchicalMultiSelect";

// Demo chart data
const chartData = [
    { month: "August", threshold: 10, predicted: 12, actual: 9 },
    { month: "September", threshold: 12, predicted: 14, actual: 11 },
    { month: "October", threshold: 15, predicted: 16, actual: 13 },
    { month: "November", threshold: 17, predicted: 18, actual: 16 },
    { month: "December", threshold: 20, predicted: 21, actual: 19 },
];

// Month helper
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function getMonthVariants(startDate) {
    const currentMonth = startDate.getMonth();
    const currentYear = startDate.getFullYear();
    const prev = new Date(currentYear, currentMonth - 1, 1);
    const next = new Date(currentYear, currentMonth + 1, 1);
    return [
        { label: `${monthNames[prev.getMonth()]} ${prev.getFullYear()}` },
        { label: `${monthNames[currentMonth]} ${currentYear}` },
        { label: `${monthNames[next.getMonth()]} ${next.getFullYear()}` },
    ];
}

// Map Card
function MapCard({ title }) {
    return (
        <div className="border rounded shadow bg-white">
            <div className="bg-[#004bad] text-white px-2 py-1 font-semibold text-sm">
                {title}
            </div>
            <div className="h-56">
                <MapContainer center={[23.81, 90.41]} zoom={7} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                </MapContainer>
            </div>
        </div>
    );
}

export default function RiskTracker() {
    const [divisions, setDivisions] = useState([])
    const [districts, setDistricts] = useState([])
    const [upazilas, setUpazilas] = useState([])
    const [sites, setSites] = useState([])

    const [site, setSite] = useState("");
    const [startMonth, setStartMonth] = useState("");
    const [endMonth, setEndMonth] = useState("");

    const baseDate = new Date();
    const months = getMonthVariants(baseDate);

    return (
        <div className="flex flex-col lg:flex-row">
            {/* Sidebar */}
            <aside className="w-full lg:w-[30%] lg:max-w-sm bg-blue-50 border-b lg:border-r border-gray-300 p-4 space-y-4">
                <h1 className="text-xl font-bold text-blue-900">Malaria Risk Tracker</h1>

                {/* Responsive grid for filters */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                    <HierarchicalMultiSelect
                        label="Division"
                        options={["Chattogram", "Dhaka", "Khulna"]}
                        selected={divisions}
                        setSelected={setDivisions}
                    />

                    <HierarchicalMultiSelect
                        label="District"
                        options={["Bandarban", "Cox’s Bazar", "Dhaka"]}
                        selected={districts}
                        setSelected={setDistricts}
                    />

                    <HierarchicalMultiSelect
                        label="Upazila"
                        options={["Sadar", "Rowangchhari", "Thanchi"]}
                        selected={upazilas}
                        setSelected={setUpazilas}
                    />

                    <HierarchicalMultiSelect
                        label="Surveillance Sites"
                        options={["BITID, Sadar Hospital", "CMCH", "ICDDRB"]}
                        selected={sites}
                        setSelected={setSites}
                    />

                    <MonthPicker label="Start Month" date={startMonth} setDate={setStartMonth} />
                    <MonthPicker label="End Month" date={endMonth} setDate={setEndMonth} />
                </div>

                <button className="w-full bg-[#004bad]/80 cursor-pointer hover:bg-[#004bad] text-white font-semibold py-2 rounded">
                    Generate
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {months.map((m, i) => (
                        <MapCard key={`pred-${i}`} title={`Predictive API – ${m.label}`} />
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {months.map((m, i) => (
                        <MapCard key={`act-${i}`} title={`Actual API – ${m.label}`} />
                    ))}
                </div>

                <div className="mt-6 bg-white border rounded shadow p-4">
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="threshold" stroke="red" />
                            <Line type="monotone" dataKey="predicted" stroke="blue" />
                            <Line type="monotone" dataKey="actual" stroke="green" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </main>
        </div>
    );
}

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

function MonthPicker({ label, date, setDate }) {
    const [open, setOpen] = useState(false)
    const [year, setYear] = useState(new Date().getFullYear())

    const handleSelect = (monthIndex) => {
        const newDate = new Date(year, monthIndex, 1)
        setDate(newDate)
        setOpen(false)
    }

    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black">{label}</label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button className="flex w-full justify-between items-center rounded border px-3 py-2 text-left text-sm bg-white shadow-sm">
                        {date ? format(date, "MMMM yyyy") : "Pick a month"}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="p-4 w-64">
                    <div className="flex justify-between items-center mb-3">
                        <button onClick={() => setYear(year - 1)}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-medium">{year}</span>
                        <button onClick={() => setYear(year + 1)}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {months.map((m, idx) => (
                            <button
                                key={m}
                                onClick={() => handleSelect(idx)}
                                className={`p-2 rounded text-sm hover:bg-gray-100 ${date &&
                                    format(date, "MMMM yyyy") === `${m} ${year}` &&
                                    "bg-black text-white"
                                    }`}
                            >
                                {m.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
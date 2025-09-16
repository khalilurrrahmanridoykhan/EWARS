import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush
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
    { month: "September", threshold: 3, predicted: 14, actual: 11 },
    { month: "October", threshold: 15, predicted: 16, actual: 13 },
    { month: "November", threshold: 17, predicted: 18, actual: 16 },
    { month: "December", threshold: 20, predicted: 21, actual: 19 },
];

// Month helper
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];


export default function RiskTracker() {
    const [geoJson, setGeoJson] = useState(null);
    const [selectedDivisions, setSelectedDivisions] = useState([]);
    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [selectedUpazilas, setSelectedUpazilas] = useState([]);

    const [sites, setSites] = useState([]);

    const [site, setSite] = useState("");
    const [startMonth, setStartMonth] = useState("");
    const [endMonth, setEndMonth] = useState("");

    const baseDate = new Date();
    const months = getMonthVariants(baseDate);


    // Load geojson and setup initial selection
    useEffect(() => {
        fetch("/upazila_simplified2.json")
            .then(res => res.json())
            .then(data => {
                setGeoJson(data);
                const h = buildHierarchy(data.features);
                setSelectedDivisions(h.divisions);
                setSelectedDistricts([...new Set(h.divisions.flatMap(div => h.districts[div] || []))]);
                setSelectedUpazilas([...new Set(Object.values(h.districts).flatMap(dists => dists.flatMap(dist => h.upazilas[dist] || [])))]);
            });
    }, []);

    // Memoize hierarchy for performance
    const hierarchy = useMemo(() => geoJson ? buildHierarchy(geoJson.features) : { divisions: [], districts: {}, upazilas: {} }, [geoJson]);

    useEffect(() => {
        if (!selectedDivisions.length) {
            setSelectedDistricts([]);
            setSelectedUpazilas([]);
            return;
        }
        // Collect all districts under the selected divisions
        const validDists = [
            ...new Set(selectedDivisions.flatMap(div => hierarchy.districts[div] || []))
        ];
        setSelectedDistricts(validDists);

        // Collect all upazilas under those districts
        const validUpa = [
            ...new Set(validDists.flatMap(dist => hierarchy.upazilas[dist] || []))
        ];
        setSelectedUpazilas(validUpa);
    }, [selectedDivisions, hierarchy]);

    useEffect(() => {
        if (!selectedDistricts.length) {
            setSelectedUpazilas([]);
            return;
        }
        const validUpa = [
            ...new Set(selectedDistricts.flatMap(dist => hierarchy.upazilas[dist] || []))
        ];
        setSelectedUpazilas(validUpa);
    }, [selectedDistricts, hierarchy]);

    // Dynamic options for district and upazila
    const districtOptions = useMemo(() =>
        [...new Set(selectedDivisions.flatMap(div => hierarchy.districts[div] || []))],
        [selectedDivisions, hierarchy]
    );
    const upazilaOptions = useMemo(() =>
        [...new Set(selectedDistricts.flatMap(dist => hierarchy.upazilas[dist] || []))],
        [selectedDistricts, hierarchy]
    );

    // Filtered geojson for the map
    const filteredGeoJson = useMemo(() => {
        if (!geoJson) return null;
        return {
            ...geoJson,
            features: geoJson.features.filter(f =>
                selectedDivisions.includes(f.properties.DIV_NAME) &&
                selectedDistricts.includes(f.properties.DIS_NAME) &&
                selectedUpazilas.includes(f.properties.UPA_NAME)
            )
        };
    }, [geoJson, selectedDivisions, selectedDistricts, selectedUpazilas]);

    return (
        <div className="flex flex-col lg:flex-row">
            {/* Sidebar */}
            <aside className="w-full lg:w-[30%] lg:max-w-sm bg-blue-50 border-b lg:border-r border-gray-300 p-4 space-y-4">
                <h1 className="text-xl font-bold text-blue-900">Malaria Risk Tracker</h1>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                    <HierarchicalMultiSelect
                        label="Division"
                        options={hierarchy.divisions}
                        selected={selectedDivisions}
                        setSelected={setSelectedDivisions}
                    />
                    <HierarchicalMultiSelect
                        label="District"
                        options={districtOptions}
                        selected={selectedDistricts}
                        setSelected={setSelectedDistricts}
                        disabled={!selectedDivisions.length}
                    />
                    <HierarchicalMultiSelect
                        label="Upazila"
                        options={upazilaOptions}
                        selected={selectedUpazilas}
                        setSelected={setSelectedUpazilas}
                        disabled={!selectedDistricts.length}
                    />

                    {/* <HierarchicalMultiSelect
                        label="Surveillance Sites"
                        options={["BITID, Sadar Hospital", "CMCH", "ICDDRB"]}
                        selected={sites}
                        setSelected={setSites}
                    /> */}

                    <MonthPicker label="Predict Month" date={startMonth} setDate={setStartMonth} />
                    {/* <MonthPicker label="End Month" date={endMonth} setDate={setEndMonth} /> */}
                </div>

                {/* <button className="w-full bg-[#004bad]/80 cursor-pointer hover:bg-[#004bad] text-white font-semibold py-2 rounded">
                    Generate
                </button> */}
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {months.map((m, i) => (
                        <MapCard
                            key={`pred-${i}`}
                            title={`Predictive API – ${m.label}`}
                            geojson={filteredGeoJson}   // pass the same filtered geojson to every map
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {months.map((m, i) => (
                        <MapCard
                            key={`act-${i}`}
                            title={`Actual API – ${m.label}`}
                            geojson={filteredGeoJson}
                        />
                    ))}
                </div>

                <div className="mt-6 bg-white border rounded shadow p-4">
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="threshold" stroke="#ef4444" /> {/* red */}
                            <Line type="monotone" dataKey="predicted" stroke="#3b82f6" /> {/* blue */}
                            <Line type="monotone" dataKey="actual" stroke="#22c55e" /> {/* green */}

                            <Brush
                                dataKey="month"
                                height={40}
                                stroke="#6366f1"   // Indigo border
                                travellerWidth={12}
                                fill="#eef2ff"     // Soft background
                                tickFormatter={(val) => val.slice(0, 3)}
                            >
                                {/* Mini chart inside brush */}
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="2 2" strokeOpacity={0.2} />
                                    <Line type="monotone" dataKey="threshold" stroke="#ef4444" dot={false} />
                                    <Line type="monotone" dataKey="predicted" stroke="#3b82f6" dot={false} />
                                    <Line type="monotone" dataKey="actual" stroke="#22c55e" dot={false} />
                                </LineChart>
                            </Brush>
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


function GeoJSONLayer({ geojson }) {
    const map = useMap();

    useEffect(() => {
        if (!geojson) return;

        // Remove previous geoJSON layers
        map.eachLayer(layer => {
            if (layer.feature) map.removeLayer(layer);
        });

        // Add new layer
        const layer = L.geoJSON(geojson, {
            style: {
                color: "#2563eb",
                weight: 1,
                fillColor: "#93c5fd",
                fillOpacity: 0.5,
            },
            onEachFeature: (feature, lyr) => {
                if (feature.properties) {
                    lyr.bindPopup(
                        `<b>Upazila:</b> ${feature.properties.UPA_NAME || "Unknown"}`
                    );
                }
            },
        });
        layer.addTo(map);

        if (geojson.features.length > 0) {
            map.fitBounds(layer.getBounds());
        }
        // Cleanup: remove the layer on unmount/update
        return () => {
            map.removeLayer(layer);
        };
    }, [geojson, map]);

    return null;
}



function buildHierarchy(features) {
    const divs = new Set();
    const dists = {};
    const upas = {};

    features.forEach(f => {
        const div = f.properties.DIV_NAME;
        const dist = f.properties.DIS_NAME;
        const upa = f.properties.UPA_NAME;

        if (div) divs.add(div);

        if (div && dist) {
            dists[div] ||= new Set();
            dists[div].add(dist);
        }

        if (dist && upa) {
            upas[dist] ||= new Set();
            upas[dist].add(upa);
        }
    });

    // Convert sets to arrays
    return {
        divisions: [...divs],
        districts: Object.fromEntries(Object.entries(dists).map(([k, v]) => [k, [...v]])),
        upazilas: Object.fromEntries(Object.entries(upas).map(([k, v]) => [k, [...v]])),
    };
}


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
function MapCard({ title, geojson }) {
    return (
        <div className="border rounded shadow bg-white">
            <div className="bg-[#004bad] text-white px-2 py-1 font-semibold text-sm">{title}</div>
            <div className="h-56">
                <MapContainer center={[23.81, 90.41]} zoom={7} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    {geojson && <GeoJSONLayer geojson={geojson} />}
                </MapContainer>
            </div>
        </div>
    );
}

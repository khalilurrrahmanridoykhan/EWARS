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
import { toast } from "sonner";
import axios from "axios";
import { keyframes } from "@emotion/react";

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


export default function MalariaRiskTracker() {
    const [geoJson, setGeoJson] = useState(null);
    const [actualData, setActualData] = useState([]);

    const [selectedDivisions, setSelectedDivisions] = useState([]);
    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [selectedUpazilas, setSelectedUpazilas] = useState([]);

    const [sites, setSites] = useState([]);

    const [site, setSite] = useState("");
    const [startMonth, setStartMonth] = useState("");
    const [endMonth, setEndMonth] = useState("");

    const [selectedMonth, setSelectedMonth] = useState("");     // e.g. "2025-01-01"
    const [selectedUpazila, setSelectedUpazila] = useState(""); // e.g. "Teknaf"
    const [forecastResults, setForecastResults] = useState([]); // Will hold the API re

    const baseDate = new Date();
    const months = useMemo(
        () => getMonthVariants(selectedMonth ? new Date(selectedMonth) : new Date()),
        [selectedMonth]
    );

    console.log("actualData:", actualData);



    // Load geojson and setup initial selection
    useEffect(() => {
        fetch("/upazila_simplified3.json")
            .then(res => res.json())
            .then(data => {
                setGeoJson(data);
                const h = buildHierarchy(data.features);
                setSelectedDivisions(h.divisions);
                setSelectedDistricts([...new Set(h.divisions.flatMap(div => h.districts[div] || []))]);
                setSelectedUpazilas([...new Set(Object.values(h.districts).flatMap(dists => dists.flatMap(dist => h.upazilas[dist] || [])))]);
            });
    }, []);


    useEffect(() => {
        // Only run when geoJson is loaded
        if (!geoJson || !geoJson.features) return;

        const allowedUpazilas = new Set(
            geoJson.features.map(f =>
                String(f.properties?.UPA_NAME).trim().toLowerCase()
            )
        );

        axios
            .get("/lmis/admin/mis-api-data")
            .then(res => {
                const rawData = res.data;

                // Filter to only those upazilas we have in the geojson
                const filtered = rawData.filter(d =>
                    allowedUpazilas.has(String(d.UpazilaName).trim().toLowerCase())
                );

                setActualData(filtered);
            })
            .catch(e => {
                setActualData([]);
                console.error("Failed to load LMIS malaria data", e);
                toast?.error("Failed to load LMIS malaria data");
            });
    }, [geoJson]);


    const getAdjacentMonths = (selectedDate) => {
        // selectedDate is a JS Date object
        const prev = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
        const curr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);

        return [prev, curr, next].map(d => d.toISOString().slice(0, 10));
    };

    const handleGenerate = async () => {
        if (!selectedUpazilas.length || !selectedMonth) {
            toast.error("Please select at least one Upazila and a month.");
            return;
        }
        const months = getAdjacentMonths(selectedMonth);
        const results = await Promise.all(
            selectedUpazilas.flatMap(upazila =>
                months.map(month =>
                    axios.post("/api/predict_simple", { upa_name: upazila, forecast_month: month })
                        .then(res => {
                            toast.success(`Data loaded for ${upazila} (${month})`);
                            return { ...res.data, upa_name: upazila, forecast_month: month };
                        })
                        .catch(() => {
                            toast.error(`Failed to fetch data for ${upazila} - ${month}`);
                            return null;
                        })
                )
            )
        );
        setForecastResults(results.filter(Boolean));
    };




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

    const filteredGeoJson = useMemo(() => {
        if (!geoJson) return null;
        const features = geoJson.features.filter(f =>
            selectedDivisions.includes(f.properties.DIV_NAME) &&
            selectedDistricts.includes(f.properties.DIS_NAME) &&
            selectedUpazilas.includes(f.properties.UPA_NAME)
        );
        return { ...geoJson, features };
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
                    />

                    <MonthPicker label="Predict Month" date={selectedMonth} setDate={setSelectedMonth} />
                    <button onClick={handleGenerate} className="w-full bg-[#004bad]/80 cursor-pointer hover:bg-[#004bad] text-white font-semibold py-2 rounded">
                        Generate
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {months.map((m, i) => (
                        <MapCard
                            key={`pred-${i}`}
                            title={`Predictive Case – ${getPreviousMonthLabel(m.label)}`}
                            geojson={filteredGeoJson}
                            forecastResults={forecastResults}
                            forecastMonth={m.code}
                            type="forecast"
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {months.map((m, i) => (
                        <MapCard
                            key={`act-${i}`}
                            title={`Actual Case – ${getPreviousMonthLabel(m.label)}`}
                            geojson={filteredGeoJson}
                            actualData={actualData}
                            actualMonth={m.code}
                            type="actual"
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
                            <Line type="monotone" dataKey="predicted" stroke="#3b82f6" dot={<BlinkingDot />} /> {/* blue */}
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#22c55e"
                                dot={<BlinkingDot />}
                            />

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

// function GeoJSONLayer({ geojson, forecastResults, forecastMonth }) {
//     const map = useMap();

//     useEffect(() => {
//         if (!geojson) return;

//         function getPrediction(upa) {
//             if (!forecastResults) return null;
//             // Robust case and space comparison:
//             return forecastResults.find(
//                 res =>
//                     res.upa_name.trim().toLowerCase() === upa.trim().toLowerCase() &&
//                     res.forecast_month === forecastMonth
//             );
//         }



//         map.eachLayer(layer => {
//             if (layer.feature) map.removeLayer(layer);
//         });

//         const layer = L.geoJSON(geojson, {
//             style: feature => {
//                 const upa = feature?.properties?.UPA_NAME;
//                 const pred = getPrediction(upa);
//                 let fillColor = "#eee";
//                 if (pred && pred.pred_cases !== undefined) {
//                     const cases = Number(pred.pred_cases) || 0;
//                     fillColor = cases > 100 ? "#ef4444" : (cases > 50 ? "#fbbf24" : "#22c55e");
//                 }
//                 return {
//                     color: "#000",
//                     weight: 0.2,
//                     fillColor,
//                     fillOpacity: 0.7,
//                 };
//             },
//             onEachFeature: (feature, lyr) => {
//                 const upa = feature?.properties?.UPA_NAME;
//                 const pred = getPrediction(upa);

//                 let html = `
//         <div style="font-family: Arial, sans-serif; font-size: 11px; color: #333; max-width: 180px;">
//             <table style="border-collapse: collapse; width: 100%;">
//                 <tr>
//                     <td style="padding: 2px 4px; font-weight: bold;">Upazila</td>
//                     <td style="padding: 2px 4px;">${upa || "Unknown"}</td>
//                 </tr>
//     `;

//                 if (pred && pred.pred_cases !== undefined) {
//                     html += `
//                 <tr>
//                     <td style="padding: 2px 4px; font-weight: bold;">Month</td>
//                     <td style="padding: 2px 4px;">${pred.forecast_month}</td>
//                 </tr>
//                 <tr>
//                     <td style="padding: 2px 4px; font-weight: bold;">Cases</td>
//                     <td style="padding: 2px 4px;">${pred.pred_cases}</td>
//                 </tr>
//             </table>
//         </div>
//         `;
//                 } else {
//                     html += `
//             </table>
//             <div style="margin-top: 2px; font-style: italic; color: #777;">
//                 No prediction data
//             </div>
//         </div>
//         `;
//                 }

//                 lyr.bindPopup(html);
//             }

//             ,
//         });
//         layer.addTo(map);

//         if (geojson.features.length > 0) {
//             map.fitBounds(layer.getBounds());
//         }
//         return () => {
//             map.removeLayer(layer);
//         };
//     }, [geojson, map, forecastResults, forecastMonth]);
//     return null;
// }

function GeoJSONLayer({ geojson, forecastResults, forecastMonth, actualData, actualMonth, type }) {
    const map = useMap();

    useEffect(() => {
        if (!geojson) return;

        function getActual(upa) {
            if (!actualData || !actualMonth) return null;

            // Find the matching record
            // actualMonth is in "YYYY-MM-DD", extract year & month
            const [year, monthNum] = actualMonth.split("-");
            const monthName = monthNames[parseInt(monthNum, 10) - 1]; // "January", ...

            return actualData.find(
                d =>
                    String(d.UpazilaName).trim().toLowerCase() === String(upa).trim().toLowerCase() &&
                    String(d.ReportYear) === year &&
                    // LMIS API month is "January", capitalize, compare
                    String(d.ReportMonth).toLowerCase() === monthName.toLowerCase()
            );
        }

        function getPrediction(upa) {
            if (!forecastResults) return null;
            return forecastResults.find(
                res =>
                    res.upa_name.trim().toLowerCase() === upa.trim().toLowerCase() &&
                    res.forecast_month === forecastMonth
            );
        }

        map.eachLayer(layer => {
            if (layer.feature) map.removeLayer(layer);
        });

        const layer = L.geoJSON(geojson, {
            style: feature => {
                const upa = feature?.properties?.UPA_NAME;
                // Decide which data to use
                let fillColor = "#eee";
                let cases = null;
                if (type === "forecast") {
                    const pred = getPrediction(upa);
                    if (pred && pred.pred_cases !== undefined) {
                        cases = Number(pred.pred_cases) || 0;
                        fillColor = cases > 100 ? "#ef4444" : cases > 50 ? "#fbbf24" : "#22c55e";
                    }
                } else if (type === "actual") {
                    const actual = getActual(upa);
                    if (actual && actual.CASEE !== undefined) {
                        cases = Number(actual.CASEE) || 0;
                        fillColor = cases > 100 ? "#ef4444" : cases > 50 ? "#fbbf24" : "#22c55e";
                    }
                }
                return {
                    color: "#000",
                    weight: 0.2,
                    fillColor,
                    fillOpacity: 0.7,
                };
            },
            onEachFeature: (feature, lyr) => {
                const upa = feature?.properties?.UPA_NAME;
                let html =
                    `<div style="font-family: Arial, sans-serif; font-size: 11px; color: #333; max-width: 180px;">
            <table style="border-collapse: collapse; width: 100%;">
              <tr>
                <td style="padding: 2px 4px; font-weight: bold;">Upazila</td>
                <td style="padding: 2px 4px;">${upa || "Unknown"}</td>
              </tr>`;

                if (type === "forecast") {
                    const pred = getPrediction(upa);
                    if (pred && pred.pred_cases !== undefined) {
                        html += `
              <tr>
                <td style="padding: 2px 4px; font-weight: bold;">Month</td>
                <td style="padding: 2px 4px;">${pred.forecast_month}</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px; font-weight: bold;">Cases</td>
                <td style="padding: 2px 4px;">${pred.pred_cases}</td>
              </tr>`;
                    } else {
                        html += `
              </table>
              <div style="margin-top: 2px; font-style: italic; color: #777;">
                No prediction data
              </div>
            </div>`;
                    }
                } else if (type === "actual") {
                    const actual = getActual(upa);
                    if (actual && actual.CASEE !== undefined) {
                        html += `
              <tr>
                <td style="padding: 2px 4px; font-weight: bold;">Month</td>
                <td style="padding: 2px 4px;">${actual.ReportMonth} ${actual.ReportYear}</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px; font-weight: bold;">Cases</td>
                <td style="padding: 2px 4px;">${actual.CASEE}</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px;">Tests</td>
                <td style="padding: 2px 4px;">${actual.TEST}</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px;">Deaths</td>
                <td style="padding: 2px 4px;">${actual.DEATH}</td>
              </tr>`;
                    } else {
                        html += `
              </table>
              <div style="margin-top: 2px; font-style: italic; color: #777;">
                No actual data
              </div>
            </div>`;
                    }
                }

                lyr.bindPopup(html);
            },
        });
        layer.addTo(map);

        if (geojson.features.length > 0) {
            map.fitBounds(layer.getBounds());
        }
        return () => {
            map.removeLayer(layer);
        };
    }, [geojson, map, forecastResults, forecastMonth, actualData, actualMonth, type]);
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
    const curr = new Date(currentYear, currentMonth, 1);
    const next = new Date(currentYear, currentMonth + 1, 1);
    return [
        { label: `${monthNames[prev.getMonth()]} ${prev.getFullYear()}`, code: prev.toISOString().slice(0, 10) },
        { label: `${monthNames[currentMonth]} ${currentYear}`, code: curr.toISOString().slice(0, 10) },
        { label: `${monthNames[next.getMonth()]} ${next.getFullYear()}`, code: next.toISOString().slice(0, 10) },
    ];
}


// // Map Card
// function MapCard({ title, geojson, forecastResults, forecastMonth }) {
//     return (
//         <div className="border rounded shadow bg-white">
//             <div className="bg-[#004bad] text-white px-2 py-1 font-semibold text-sm">{title}</div>
//             <div className="h-56">
//                 <MapContainer center={[23.81, 90.41]} zoom={7} className="h-full w-full">
//                     <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
//                     {geojson && (
//                         <GeoJSONLayer
//                             geojson={geojson}
//                             forecastResults={forecastResults}
//                             forecastMonth={forecastMonth} // Pass down
//                         />
//                     )}
//                 </MapContainer>
//             </div>
//         </div>
//     );
// }


function MapCard({ title, geojson, forecastResults, forecastMonth, actualData, actualMonth, type }) {
    return (
        <div className="border rounded shadow bg-white">
            <div className="bg-[#004bad] text-white px-2 py-1 font-semibold text-sm">{title}</div>
            <div className="h-56">
                <MapContainer center={[23.81, 90.41]} zoom={7} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    {geojson && (
                        <GeoJSONLayer
                            geojson={geojson}
                            forecastResults={type === 'forecast' ? forecastResults : undefined}
                            forecastMonth={type === 'forecast' ? forecastMonth : undefined}
                            actualData={type === 'actual' ? actualData : undefined}
                            actualMonth={type === 'actual' ? actualMonth : undefined}
                            type={type}
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}




const BlinkingDot = ({ cx, cy, value, payload }) => {
    if (value > payload.threshold) {
        return (
            <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
                className="blink-dot"
            />
        );
    }
    return (
        <circle
            cx={cx}
            cy={cy}
            r={4}
            fill="#22c55e"
            stroke="#fff"
            strokeWidth={1}
        />
    );
};

function getPreviousMonthLabel(label) {
    // Example: input = "January 2025"
    const [monthStr, yearStr] = label.split(" ");
    let monthIdx = monthNames.findIndex(m => m === monthStr);
    let year = parseInt(yearStr, 10);
    monthIdx--;
    if (monthIdx < 0) {
        monthIdx = 11; // December
        year--;
    }
    return `${monthNames[monthIdx]} ${year}`;
}
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { ChevronDown } from "lucide-react";

// Demo chart data
const chartData = [
    { month: "August", threshold: 10, predicted: 12 },
    { month: "September", threshold: 3, predicted: 14 },
    { month: "October", threshold: 15, predicted: 16 },
    { month: "November", threshold: 17, predicted: 18 },
    { month: "December", threshold: 20, predicted: 21 },
];

// Month helper
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const EMAILS = [
    { email: "sabberrahman.contact@gmail.com", label: "District Manager" },
    { email: "hasibulahmedpulok@gmail.com", label: "Ministry Official" },
    { email: "sajidgeo1707@gmail.com", label: "Ministry Official" },
];

const COLORS = [
    "#6366f1", "#22c55e", "#eab308", "#f43f5e", "#0ea5e9", "#b91c1c",
    "#06b6d4", "#facc15", "#84cc16", "#3b82f6", "#d97706", "#10b981"
    // ...add enough for your max upazilas; or use d3-scheme
];
const chartColor = idx => COLORS[idx % COLORS.length];

function Alert() {
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

    const [threshold, setThreshold] = useState(100);


    const [alertModal, setAlertModal] = useState(false);
    const [mailRecipients, setMailRecipients] = useState(EMAILS.map(e => e.email)); // all selected by default
    const [mailSubject, setMailSubject] = useState("Malaria Prediction Alert");
    const [mailBody, setMailBody] = useState("");
    const [selectedUpazilasAlert, setSelectedUpazilasAlert] = useState([]); // for selecting data to include

    const [customBody, setCustomBody] = useState(false);



    console.log("actualData:", actualData);



    // Load geojson and setup initial selection
    useEffect(() => {
        fetch("/upazila_simplified5.json")
            .then(res => res.json())
            .then(data => {
                setGeoJson(data);
                const h = buildHierarchy(data.features);
                setSelectedDivisions(h.divisions);
                setSelectedDistricts([...new Set(h.divisions.flatMap(div => h.districts[div] || []))]);
                setSelectedUpazilas([...new Set(Object.values(h.districts).flatMap(dists => dists.flatMap(dist => h.upazilas[dist] || [])))]);
            });
    }, []);


    // useEffect(() => {
    //     // Only run when geoJson is loaded
    //     if (!geoJson || !geoJson.features) return;

    //     // Get allowed UpazilaIDs
    //     const allowedUpazilaIDs = new Set(
    //         geoJson.features.map(f =>
    //             String(f.properties?.UpazilaID)
    //         )
    //     );

    //     axios
    //         .get("/lmis/admin/mis-api-data")
    //         .then(res => {
    //             const rawData = res.data;

    //             // Map UpazillaID -> UpazilaID for uniformity
    //             const normalized = rawData.map(d => ({
    //                 ...d,
    //                 UpazilaID: d.UpazilaID || d.UpazillaID // use either if present
    //             }));

    //             const allowedUpazilaIDs = new Set(
    //                 geoJson.features.map(f => String(f.properties?.UpazilaID))
    //             );

    //             const filtered = normalized.filter(d =>
    //                 allowedUpazilaIDs.has(String(d.UpazilaID))
    //             );

    //             setActualData(filtered);
    //         })
    //         .catch(e => {
    //             setActualData([]);
    //             console.error("Failed to load LMIS malaria data", e);
    //             toast?.error("Failed to load LMIS malaria data");
    //         });
    // }, [geoJson]);



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

    // const chartMonths = useMemo(
    //     () => getMonthVariants(selectedMonth ? new Date(selectedMonth) : new Date()),
    //     [selectedMonth]
    // );
    // const actualMonth = chartMonths[1];

    // const mapMonths = useMemo(
    //     () => [selectedMonth ? new Date(selectedMonth) : new Date()],
    //     [selectedMonth]
    // );


    const dynamicChartData = useMemo(() => {
        // On load - no forecastResults
        if (!forecastResults || forecastResults.length === 0) {
            return months.map(m => ({
                month: m.label,       // Use the month label string from getMonthVariants
                threshold,
                predicted: null
            }));
        }
        return months.map(m => {
            const pred = forecastResults.find(f => f.forecast_month === m.code);
            return {
                month: m.label,       // X axis from getMonthVariants
                threshold,
                predicted: pred ? Math.round(pred.pred_cases) : null
            };
        });
    }, [forecastResults, months, threshold]);


    const upazilaAlertOptions = useMemo(
        () => Array.from(new Set(
            (forecastResults || []).map(d => d.upa_name)
        )),
        [forecastResults]
    );

    // Get unique upazilas from forecastResults (user's selected ones)
    const upazilas = useMemo(() => (
        Array.from(new Set(forecastResults.map(d => d.upa_name)))
    ), [forecastResults]);

    // Chart X axis: months as before
    const monthCodes = months.map(m => m.code);

    const chartSeriesData = useMemo(() => {
        return months.map(month => {
            const entry = { month: month.label, threshold };
            upazilas.forEach(upz => {
                // Find this upazila's prediction for this month
                const pred = forecastResults.find(d =>
                    d.upa_name === upz && d.forecast_month === month.code
                );
                entry[upz] = pred ? Math.round(pred.pred_cases) : null;
            });
            return entry;
        });
    }, [months, upazilas, forecastResults, threshold]);

    return (
        <div className="flex flex-col h-screen lg:flex-row">
            {/* Sidebar */}
            <aside className="w-full lg:w-[20%] lg:max-w-sm bg-blue-50 border-b lg:border-r border-gray-300 p-4 space-y-4">
                {/* <h1 className="text-xl font-bold text-blue-900">Malaria Risk Tracker</h1> */}

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
                    <div className="flex items-center gap-2 mb-4">
                        <label className="font-semibold text-sm text-black" htmlFor="threshold-input">
                            Threshold:
                        </label>
                        <input
                            id="threshold-input"
                            type="number"
                            value={threshold}
                            min={0}
                            onChange={e => setThreshold(Number(e.target.value))}
                            className="border bg-white rounded px-2 py-1 w-20"
                            style={{ fontSize: "14px" }}
                        />
                    </div>
                    <button onClick={handleGenerate} className="w-full bg-[#004bad]/80 cursor-pointer hover:bg-[#004bad] text-white font-semibold py-2 rounded">
                        Generate
                    </button>
                    <button
                        onClick={() => {
                            setSelectedUpazilasAlert(upazilaAlertOptions); // Preselect all
                            setMailBody(""); // or build initial if wanted
                            setAlertModal(true);
                        }}

                        className="w-full bg-[#004bad]/80 cursor-pointer hover:bg-[#004bad] text-white font-semibold py-2 rounded">
                        Send Alert
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 px-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className=" bg-white border rounded shadow p-4">
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={chartSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="threshold" stroke="#ef4444" isAnimationActive={false} strokeWidth={2} dot={false} />

                                {upazilas.map((upz, idx) => (
                                    <Line
                                        key={upz}
                                        type="monotone"
                                        dataKey={upz}
                                        name={upz}
                                        stroke={chartColor(idx)}
                                        dot={<BlinkingDot />}
                                        strokeWidth={2}
                                        connectNulls
                                        isAnimationActive={false}
                                    />
                                ))}

                                <Brush
                                    dataKey="month"
                                    height={40}
                                    stroke="#6366f1"
                                    travellerWidth={12}
                                    fill="#eef2ff"
                                    tickFormatter={val => val.slice(0, 3)}
                                >
                                    <LineChart data={chartSeriesData}>
                                        <CartesianGrid strokeDasharray="2 2" strokeOpacity={0.2} />
                                        <Line type="monotone" dataKey="threshold" stroke="#ef4444" dot={false} />
                                        {upazilas.map((upz, idx) => (
                                            <Line
                                                key={upz}
                                                type="monotone"
                                                dataKey={upz}
                                                name={upz}
                                                stroke={chartColor(idx)}
                                                dot={false}
                                                strokeWidth={2}
                                                connectNulls
                                                isAnimationActive={false}
                                            />
                                        ))}
                                    </LineChart>
                                </Brush>

                            </LineChart>

                        </ResponsiveContainer>
                    </div>

                    {months.slice(-1).map((m, i) => (
                        <MapCard
                            key={`pred-${i}`}
                            title={`Predictive Case – ${getPreviousMonthLabel(m.label)}`}
                            geojson={filteredGeoJson}
                            forecastResults={forecastResults}
                            forecastMonth={m.code}
                            type="forecast"
                            threshold={threshold}
                        />
                    ))}

                </div>

                {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
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
                </div> */}



            </main>
            {alertModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
                    {/* Modal Box */}
                    <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-2xl h-[80%] flex flex-col overflow-hidden animate-in fade-in duration-200">

                        {/* Header */}
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-gray-50">
                            <h2 className="font-semibold text-lg">📧 Send Alert Email</h2>
                            <button
                                onClick={() => setAlertModal(false)}
                                className="p-2 rounded-full hover:bg-gray-200"
                            >
                                ✖
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                            {/* Recipients */}
                            <div>
                                <label className="font-medium text-sm block mb-1">Recipients:</label>
                                <div className="space-y-2">
                                    {EMAILS.map(e => (
                                        <label key={e.email} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 accent-blue-600"
                                                checked={mailRecipients.includes(e.email)}
                                                onChange={ev =>
                                                    setMailRecipients(r =>
                                                        ev.target.checked
                                                            ? [...r, e.email]
                                                            : r.filter(x => x !== e.email)
                                                    )
                                                }
                                            />
                                            <span>
                                                {e.label || e.email}{" "}
                                                <span className="text-xs text-gray-500">({e.email})</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="font-medium text-sm block mb-1">Subject:</label>
                                <input
                                    type="text"
                                    className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={mailSubject}
                                    onChange={e => setMailSubject(e.target.value)}
                                />
                            </div>

                            {/* Upazila selection */}
                            <div>
                                <label className="font-medium text-sm block mb-1">Upazila Data to Include:</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {upazilaAlertOptions.map(upz => (
                                        <label key={upz} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 accent-blue-600"
                                                checked={selectedUpazilasAlert.includes(upz)}
                                                onChange={ev =>
                                                    setSelectedUpazilasAlert(checked =>
                                                        ev.target.checked
                                                            ? [...checked, upz]
                                                            : checked.filter(x => x !== upz)
                                                    )
                                                }
                                            />
                                            <span>{upz}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Body */}
                            {/* <div>
                                <label className="font-medium text-sm block mb-1">Body Preview:</label>
                                <div className="border rounded-lg p-3 w-full bg-gray-50" style={{ minHeight: 120 }}>
                                    <div dangerouslySetInnerHTML={{ __html: mailBody }} />
                                </div>
                            </div> */}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 border-t px-5 py-3 bg-gray-50">
                            <button
                                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                                onClick={() => setAlertModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                                onClick={async () => {
                                    let body = mailBody;
                                    if (!body) {
                                        const rows = (forecastResults || [])
                                            .filter(d => selectedUpazilasAlert.includes(d.upa_name))
                                            .map(d => {
                                                const cases = Math.round(d.pred_cases);
                                                const risk = getRiskTag(cases);
                                                return `<tr>
            <td>${d.upa_name}</td>
            <td>${d.forecast_month}</td>
            <td style="text-align:center;">${cases}</td>
            <td style="text-align:center;">${risk}</td>
          </tr>`;
                                            })
                                            .join("");
                                        body = `<h3>Malaria Prediction Alert</h3>
        <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
          <tr>
            <th>Upazila</th>
            <th>Month</th>
            <th>Predicted Cases</th>
            <th>Risk</th>
          </tr>
          ${rows}
        </table>`;
                                    }
                                    try {
                                        await axios.post("http://localhost:5000/send-alert", {
                                            emails: mailRecipients,
                                            subject: mailSubject,
                                            body
                                        });
                                        toast.success("Alert email sent!");
                                        setAlertModal(false);
                                    } catch (e) {
                                        toast.error(
                                            "Failed to send mail: " + (e.response?.data?.message || e.message)
                                        );
                                    }
                                }}
                            >
                                Send
                            </button>

                        </div>
                    </div>
                </div>
            )}


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

function GeoJSONLayer({ geojson, forecastResults, forecastMonth, actualData, actualMonth, type, threshold = 100 }) {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

    const geoJsonRef = useRef(null);
    const labelsRef = useRef([]);

    useEffect(() => {
        const handleZoom = () => setZoom(map.getZoom());
        map.on("zoomend", handleZoom);
        return () => map.off("zoomend", handleZoom);
    }, [map]);

    function getActual(upaID) {
        if (!actualData || !actualMonth) return null;
        const [year, monthNum] = actualMonth.split("-");
        const monthName = monthNames[parseInt(monthNum, 10) - 1];
        return actualData.find(
            d =>
                String(d.UpazilaID) === String(upaID) &&
                String(d.ReportYear) === year &&
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

    // Find upazilas above threshold
    const bips = useMemo(() => {
        if (!geojson || !forecastResults) return [];
        return geojson.features
            .map((feature) => {
                const upa = feature.properties.UPA_NAME;
                const pred = forecastResults.find(res =>
                    res.upa_name?.trim().toLowerCase() === upa?.trim().toLowerCase() &&
                    res.forecast_month === forecastMonth
                );
                const cases = pred ? Number(pred.pred_cases) : 0;
                if (cases > threshold && feature.geometry) {
                    const centroid = getCentroid(feature.geometry);
                    // Return [lat, lng]
                    return { center: [centroid[1], centroid[0]], upa };
                }
                return null;
            })
            .filter(Boolean);
    }, [geojson, forecastResults, forecastMonth, threshold]);


    // Build polygons + labels
    useEffect(() => {
        if (!geojson) return;

        // remove old polygons + labels
        if (geoJsonRef.current) {
            map.removeLayer(geoJsonRef.current);
        }
        labelsRef.current.forEach(m => map.removeLayer(m));
        labelsRef.current = [];

        const layer = L.geoJSON(geojson, {
            style: feature => {
                const upaID = feature?.properties?.UpazilaID;
                const upa = feature?.properties?.UPA_NAME;
                let fillColor = "#eee";
                let cases = null;

                if (type === "forecast") {
                    const pred = getPrediction(upa);
                    if (pred && pred.pred_cases !== undefined) {
                        cases = Number(pred.pred_cases) || 0;
                        fillColor =
                            cases > threshold
                                ? "#ef4444"
                                : cases > 0.5 * threshold
                                    ? "#fbbf24"
                                    : "#22c55e";
                    }
                } else if (type === "actual") {
                    const actual = getActual(upaID);
                    if (actual && actual.CASEE !== undefined) {
                        cases = Number(actual.CASEE) || 0;
                        fillColor =
                            cases > 100 ? "#ef4444" : cases > 50 ? "#fbbf24" : "#22c55e";
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
                const upaID = feature?.properties?.UpazilaID;
                const upa = feature?.properties?.UPA_NAME;

                let html = `<div style="font-family: Arial, sans-serif; font-size: 11px; color: #333; max-width: 180px;">
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
                  <td style="padding: 2px 4px;">${pred.pred_cases.toFixed(0)}</td>
              </tr>`;
                    } else {
                        html += `</table>
              <div style="margin-top: 2px; font-style: italic; color: #777;">
                No prediction data
              </div>
            </div>`;
                    }
                } else if (type === "actual") {
                    const actual = getActual(upaID);
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
                        html += `</table>
              <div style="margin-top: 2px; font-style: italic; color: #777;">
                No actual data
              </div>
            </div>`;
                    }
                }

                lyr.bindPopup(html);

                // Forecast labels (only created once, toggled later)
                if (type === "forecast" && forecastResults) {
                    const pred = getPrediction(upa);
                    if (pred && pred.pred_cases !== undefined) {
                        const centroid = getCentroid(feature.geometry);
                        const div = L.divIcon({
                            html: `<div style="
                background:rgba(255,255,255,.80);
                border-radius:4px;
                padding:1px 4px;
                font-weight:bold;
                font-size:${zoom >= 12 ? 12 : 10}px;
                color:#111;
                border:1px solid #999;
                box-shadow:0 1px 3px #0002;
              ">${Math.round(pred.pred_cases)}</div>`,
                            iconSize: [30, 20],
                            iconAnchor: [15, 10],
                        });
                        const labelMarker = L.marker([centroid[1], centroid[0]], {
                            icon: div,
                            interactive: false,
                        });
                        labelMarker.addTo(map);
                        labelsRef.current.push(labelMarker);
                    }
                }
            },
        });

        layer.addTo(map);
        geoJsonRef.current = layer;

        if (geojson.features.length > 0) {
            map.fitBounds(layer.getBounds());
        }
    }, [geojson, map, forecastResults, forecastMonth, actualData, actualMonth, type, threshold]);

    // Toggle label visibility on zoom
    useEffect(() => {
        labelsRef.current.forEach(marker => {
            if (zoom < 8) {
                map.removeLayer(marker);
            } else {
                if (!map.hasLayer(marker)) {
                    marker.addTo(map);
                }
            }
        });
    }, [zoom, map]);

    return (
        <>
            {type === "forecast" && bips.map((bip, i) => (
                <BippingMarker
                    key={bip.upa + i}
                    center={bip.center}
                    color="#ef4444"
                    size={28}
                    borderColor="#fff"
                    borderWidth={4}
                    zIndex={1400}
                />
            ))}
        </>
    );
}

function BippingMarker({
    center,
    color = "#ef4444", // plain color instead of Tailwind class
    size = 28,
    borderColor = "rgba(255,255,255,0.6)", // softer white
    borderWidth = 2, // thinner border
    zIndex = 1200,
}) {
    const map = useMap();

    useEffect(() => {
        if (!center) return;

        const el = document.createElement("div");
        el.innerHTML = `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          position:absolute;top:0;left:0;right:0;bottom:0;
          background:${color};
          opacity:0.7;
          border-radius:50%;
          animation:bip-pulse 1.2s infinite alternate;
          width:${size}px;height:${size}px;
        "></div>

      </div>
    `;

        const marker = L.marker(center, {
            icon: L.divIcon({
                className: "",
                html: el,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
            }),
            interactive: false,
        }).addTo(map);

        marker.setZIndexOffset(zIndex);

        return () => marker.remove();
    }, [center, color, size, borderColor, borderWidth, zIndex, map]);

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


function MapCard({
    title,
    geojson,
    forecastResults,
    forecastMonth,
    actualData,
    actualMonth,
    type,
    threshold = 100
}) {
    // NEW: Collapsed state, default open
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={`border rounded shadow bg-white ${collapsed ? 'h-4' : ''} transition-all duration-300`}>
            <div className="flex items-center justify-between bg-[#004bad] text-white px-2 py-1 font-semibold text-sm">
                <span>{title}</span>
                <button
                    type="button"
                    aria-label={collapsed ? "Expand map" : "Collapse map"}
                    onClick={() => setCollapsed(c => !c)}
                    className="ml-2 focus:outline-none cursor-pointer"
                >
                    {/* You can use a plus/minus, chevrons, or emojis */}
                    {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>
            {!collapsed && (
                <div className="h-[320px]">
                    <MapContainer center={[23.81, 90.41]} zoom={7} className="h-full w-full" zoomControl={false}>
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                        {geojson && (
                            <GeoJSONLayer
                                geojson={geojson}
                                forecastResults={type === 'forecast' ? forecastResults : undefined}
                                forecastMonth={type === 'forecast' ? forecastMonth : undefined}
                                actualData={type === 'actual' ? actualData : undefined}
                                actualMonth={type === 'actual' ? actualMonth : undefined}
                                type={type}
                                threshold={threshold}
                            />
                        )}
                    </MapContainer>
                </div>
            )}
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

function getCentroid(geometry) {
    let coords = [];
    if (geometry.type === "Polygon") {
        coords = geometry.coordinates[0];
    } else if (geometry.type === "MultiPolygon") {
        coords = geometry.coordinates[0][0];
    }
    if (!coords.length) return [0, 0];
    let area = 0, cx = 0, cy = 0;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const [x0, y0] = coords[j], [x1, y1] = coords[i];
        const f = x0 * y1 - x1 * y0;
        area += f;
        cx += (x0 + x1) * f;
        cy += (y0 + y1) * f;
    }
    area /= 2;
    cx /= 6 * area;
    cy /= 6 * area;
    return [cx, cy];
}



export default Alert

function getRiskTag(cases) {
    if (cases > 100)
        return `<span style="color:#fff; background:#ef4444; border-radius:5px; padding:2px 7px; font-weight:bold;">High</span>`;
    if (cases > 50)
        return `<span style="color:#fff; background:#f59e42; border-radius:5px; padding:2px 7px; font-weight:bold;">Mid</span>`;
    return `<span style="color:#fff; background:#22c55e; border-radius:5px; padding:2px 7px; font-weight:bold;">Low</span>`;
}
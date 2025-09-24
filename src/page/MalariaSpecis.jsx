import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, ZoomControl } from "react-leaflet";
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
import populationData from "../../public/upazila_population.json";


// Month helper
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const COLORS = [
    "#6366f1", "#22c55e", "#eab308", "#f43f5e", "#0ea5e9", "#b91c1c",
    "#06b6d4", "#facc15", "#84cc16", "#3b82f6", "#d97706", "#10b981"
    // ...add enough for your max upazilas; or use d3-scheme
];
const chartColor = idx => COLORS[idx % COLORS.length];


export default function MalariaSpecies() {
    const [geoJson, setGeoJson] = useState(null);
    const [actualData, setActualData] = useState([]);

    const [selectedDivisions, setSelectedDivisions] = useState([]);
    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [selectedUpazilas, setSelectedUpazilas] = useState([]);

    const [sites, setSites] = useState([]);

    const [site, setSite] = useState("");
    const [startMonth, setStartMonth] = useState("");
    const [endMonth, setEndMonth] = useState("");

    const [selectedUpazila, setSelectedUpazila] = useState(""); // e.g. "Teknaf"
    const [forecastResults, setForecastResults] = useState([]); // Will hold the API re

    const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });
    const [fetching, setFetching] = useState(false);


    const baseDate = new Date();

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [selectedMonth, setSelectedMonth] = useState(prevMonth);

    // only one month
    const get12Months = (selectedDate) => {
        let arr = [];
        for (let i = 0; i < 1; i++) {
            const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - (11 - i), 1);
            arr.push({
                label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
                code: d.toISOString().slice(0, 10),
            });
        }
        return arr;
    };

    const months = useMemo(
        () => get12Months(selectedMonth ? new Date(selectedMonth) : new Date()),
        [selectedMonth]
    );

    function getMonthYear(rawDate) {
        const date = typeof rawDate === "string" ? new Date(rawDate) : rawDate;
        if (!date || typeof date.getMonth !== "function") return { month: "", year: "" };
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return {
            month: monthNames[date.getMonth()],
            year: date.getFullYear().toString()
        };
    }

    const { month, year } = getMonthYear(selectedMonth);

    // Filter only selected month’s data
    const monthData = useMemo(() =>
        actualData.filter(
            d => d.ReportMonth === month && d.ReportYear === year
        ),
        [actualData, selectedMonth]
    );

    const speciesKeys = ["PV", "PF", "MIXED"];
    const speciesData = speciesKeys.map(species =>
        monthData.map(d => ({
            ...d,
            PV: species === "PV" ? d.PV : "0",
            PF: species === "PF" ? d.PF : "0",
            MIXED: species === "MIXED" ? d.MIXED : "0"
        }))
    );




    console.log("months:", months);
    const mapMonths = months.slice(-3); // last 3 months for the maps
    console.log("mapMonths:", mapMonths);



    const [threshold, setThreshold] = useState(100);

    console.log("actualData:", actualData);

    console.log("forecastResults:", forecastResults);



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

    //mis data
    useEffect(() => {
        // Only run when geoJson is loadedL.geo
        if (!geoJson || !geoJson.features) return;

        // Get allowed UpazilaIDs
        const allowedUpazilaIDs = new Set(
            geoJson.features.map(f =>
                String(f.properties?.UpazilaID)
            )
        );

        axios
            .get("/lmis/admin/mis-api-data")
            .then(res => {
                const rawData = res.data;

                // Map UpazillaID -> UpazilaID for uniformity
                const normalized = rawData.map(d => ({
                    ...d,
                    UpazilaID: d.UpazilaID || d.UpazillaID // use either if present
                }));

                const allowedUpazilaIDs = new Set(
                    geoJson.features.map(f => String(f.properties?.UpazilaID))
                );

                const filtered = normalized.filter(d =>
                    allowedUpazilaIDs.has(String(d.UpazilaID))
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

    function getPreviousMonthLabel(label) {
        if (!label || typeof label !== "string" || !label.includes(" ")) return "";
        const [monthStr, yearStr] = label.split(" ");
        let monthIdx = monthNames.findIndex(m => m === monthStr);
        let year = parseInt(yearStr, 10);
        monthIdx--;
        if (monthIdx < 0) {
            monthIdx = 11;
            year--;
        }
        return `${monthNames[monthIdx]} ${year}`;
    }


    console.log("geoJson:", geoJson);


    const handleGenerate = async () => {
        if (!selectedUpazilas.length || !selectedMonth) {
            toast.error("Please select at least one Upazila and a month.");
            return;
        }

        setFetching(true);

        try {
            // Precompute selected upazilas with ids (fast lookup, single pass)
            const selectedUpaObjs = selectedUpazilas.map(name => {
                // Use UPA_NAME from properties for matching
                const feature = geoJson.features.find(
                    f => (
                        f.properties.UPA_NAME &&
                        f.properties.UPA_NAME.trim().toLowerCase() === name.trim().toLowerCase()
                    )
                );
                return feature
                    ? { name, id: String(feature.properties.UpazilaID) }
                    : null;
            }).filter(Boolean);

            console.log("selectedUpaObjs:", selectedUpaObjs);

            const selectedUpazilaIds = new Set(selectedUpaObjs.map(u => u.id)); // Set for O(1) lookups

            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;

            const endpoints = [
                { type: "PV", url: "/models/target_pv/predict_all" },
                { type: "PF", url: "/models/target_pf/predict_all" },
                { type: "MIXED", url: "/models/target_mixed/predict_all" }
            ];

            try {
                const results = await Promise.allSettled(
                    endpoints.map(e =>
                        axios.post(e.url, { year, month }).then(res =>
                            res.data
                                .filter(d => selectedUpazilaIds.has(String(d.upazila_id)))
                                .map(d => ({ ...d, type: e.type }))
                        )
                    )
                );

                // Collect successful results and flatten
                const fulfilled = results
                    .filter(r => r.status === "fulfilled")
                    .flatMap(r => r.value);

                results.forEach(r => {
                    if (r.status === "fulfilled" && Array.isArray(r.value)) {
                        r.value.forEach(item => {
                            if (item.error) {
                                toast.error(`Prediction error (Upazila ${item.upazila_id}): ${item.error}`);
                            }
                        });
                    }
                });


                // 🚩 Add this enrichment step RIGHT HERE:
                const forecastResultsWithCases = fulfilled.map(pred => {
                    const popObj = populationData.find(
                        p => String(p.UpazilaID) === String(pred.upazila_id)
                    );
                    const population = popObj && popObj.Population && popObj.Population[year]
                        ? popObj.Population[year]
                        : 0;
                    return {
                        ...pred,
                        pred_cases: Math.round(population * Number(pred.predicted_rate)),
                        population,
                        year
                    };
                });

                setForecastResults(forecastResultsWithCases);
                toast.success("Predictions generated successfully!");
            } catch (error) {
                toast.error("Failed to generate predictions.");
            } finally {
                setFetching(false);
            }
        } catch (error) {
            toast.error("Unexpected error while generating predictions.");
        } finally {
            setFetching(false);
        }
    };



    console.log("forecastResults:", forecastResults);

    // Utility: runs async funcs in batches of N with delay between each batch
    async function runBatchedRequests(fetchFuncs, batchSize = 1, delayMs = 400) {
        const results = [];

        for (let i = 0; i < fetchFuncs.length; i += batchSize) {
            const batch = fetchFuncs.slice(i, i + batchSize);

            // Wait for this batch to settle (all promises), regardless of success or failure
            const batchResults = await Promise.allSettled(batch.map(fn => fn()));

            // Collect all results (including rejected ones)
            batchResults.forEach(result => {
                if (result.status === "fulfilled") {
                    results.push(result.value);
                } else {
                    console.error("Batch request failed", result.reason);
                }
            });

            // Update progress
            updateProgress(results.length, fetchFuncs.length);

            // Wait for 400ms before starting the next batch
            await delayMsFunc(delayMs);
        }

        return results;
    }

    // Update progress state
    function updateProgress(completed, total) {
        const percentage = Math.floor((completed / total) * 100);
        setProgress(prevState => ({
            ...prevState,
            completed,
            percentage
        }));
    }

    // Utility function to delay for a specified amount of time (in ms)
    function delayMsFunc(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



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

    const upazilas = useMemo(() => (
        Array.from(new Set(forecastResults.map(d => d.upa_name)))
    ), [forecastResults]);

    const upazilas2 = useMemo(() => {
        const predNames = forecastResults.map(d => d.upa_name && d.upa_name.trim()).filter(Boolean);
        const actNames = actualData.map(d => d.UpazilaName && d.UpazilaName.trim()).filter(Boolean);
        return Array.from(
            new Set([...predNames, ...actNames].map(n => n.toLowerCase()))
        ).map(n => predNames.find(p => p.toLowerCase() === n) || actNames.find(a => a.toLowerCase() === n) || n);
    }, [forecastResults, actualData]);


    const chartSeriesData = useMemo(() => {
        return months.map(month => {
            const entry = { month: month.label, threshold };
            upazilas2.forEach((upz) => {
                // Find prediction for this upazila and month
                const pred = forecastResults.find(
                    d => d.upa_name && d.upa_name.trim().toLowerCase() === upz.trim().toLowerCase() &&
                        d.forecast_month === month.code
                );
                entry[`${upz}_predicted`] = pred ? Math.round(pred.pred_cases) : null;

                // Find actual for this upazila and month
                const actual = actualData.find(
                    d => d.UpazilaName && d.UpazilaName.trim().toLowerCase() === upz.trim().toLowerCase() &&
                        String(d.ReportYear) === String(new Date(month.code).getFullYear()) &&
                        d.ReportMonth && d.ReportMonth.trim().toLowerCase() ===
                        monthNames[new Date(month.code).getMonth()].toLowerCase()
                );
                entry[`${upz}_actual`] = actual ? Number(actual.CASEE) : null;
            });

            return entry;
        });
    }, [months, upazilas, forecastResults, actualData, threshold]);



    console.log("chartSeriesData:", chartSeriesData);
    console.log("speciesKeys:", speciesKeys);
    console.log("speciesData:", speciesData);
    console.log("selelcted upazila", selectedUpazilas)



    return (
        <div className="flex flex-col lg:flex-row">
            {/* {fetching && <ProgressOverlay progress={progress} />} */}

            {/* Sidebar */}
            <aside className="w-full lg:w-[20%] lg:max-w-sm bg-blue-50 border-b lg:border-r border-gray-300 px-4 py-1 space-y-4">
                {/* <h1 className="text-xl font-bold text-blue-900">Malaria Risk Tracker</h1> */}

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 z-[999]">
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
                    <button
                        onClick={handleGenerate}
                        disabled={fetching}
                        className="w-full bg-[#004bad]/80 cursor-pointer hover:bg-[#004bad] text-white font-semibold py-2 rounded flex items-center justify-center"
                    >
                        {fetching ? (
                            <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span>Generate</span>
                        )}
                    </button>


                    <div className="col-span-2 lg:col-span-1">
                        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-2 gap-4 justify-items-center items-center">

                            <img src="/images/dghs.png" alt="DGHS" className="h-8 sm:h-10 lg:h-16 w-auto object-contain" />
                            <img src="/images/mis.png" alt="MIS" className="h-8 sm:h-10 lg:h-16 w-auto object-contain" />
                            <img src="/images/iedcr.png" alt="IEDCR" className="h-8 sm:h-10 lg:h-16 w-auto object-contain" />
                            <img src="/images/unops.png" alt="UNOPS" className="h-8 sm:h-10 lg:h-16 w-auto object-contain" />
                            <img src="/images/brac.png" alt="BRAC" className="h-8 sm:h-10 lg:h-16 w-auto object-contain" />
                            <img src="/images/moru.png" alt="MORU" className="h-8 sm:h-10 lg:h-16 w-auto object-contain" />
                            <img src="/images/groupmapper.png" alt="GroupMapper" className="h-8 sm:h-10 lg:h-16 w-auto object-contain" />
                            <img src="/images/imacs.png" alt="imacs" className="h-8 sm:h-10 lg:h-16 w-auto object-contain" />




                        </div>
                    </div>





                </div>
            </aside >

            {/* Main Content */}
            <div main className="flex-1 px-4 overflow-y-auto" >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {["PV", "PF", "MIXED"].map(type => (
                        <MapCard
                            key={type}
                            title={`Predicted ${type} case – ${format(selectedMonth, "MMMM yyyy")}`}
                            geojson={filteredGeoJson}
                            forecastResults={forecastResults.filter(res => res.type === type)}  // ← fix here!
                            type="forecast"
                            forecastMonth={format(selectedMonth, "yyyy-MM")}
                            threshold={threshold}
                        />
                    ))}



                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {speciesKeys.map((species, i) => (
                        <MapCard
                            key={`species-${species}`}
                            title={`Actual ${species} Cases – ${month} ${year}`}
                            geojson={filteredGeoJson}
                            actualData={speciesData[i]}
                            actualMonth={`${year}-${String(monthNames.indexOf(month) + 1).padStart(2, '0')}-01`}
                            type="actual"
                            threshold={threshold}
                            species={species}
                        />
                    ))}
                </div>



                {/* <div className="bg-white border rounded shadow p-4">
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />

                            <Legend />  <Tooltip
                                className="z-[999]"
                                content={({ active, payload, label }) => {
                                    if (!active || !payload) return null;
                                    return (
                                        <div className="p-2 bg-white border rounded shadow">
                                            <div className="font-bold mb-2">{label}</div>
                                            {payload.map((p, i) => {
                                                let kind =
                                                    p.dataKey.endsWith("_actual")
                                                        ? "Actual"
                                                        : p.dataKey.endsWith("_predicted")
                                                            ? "Prediction"
                                                            : "";
                                                return (
                                                    <div key={p.dataKey} style={{ color: p.color }}>
                                                        {p.name}
                                                        : <b>{p.value}</b>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }}
                            />
                            <Line type="monotone" dataKey="threshold" stroke="#ef4444" dot={false} />
                            {upazilas.map((upz, idx) => (
                                <React.Fragment key={upz}>
                                    <Line
                                        type="monotone"
                                        dataKey={`${upz}_predicted`}
                                        name={`${upz} (predicted)`}
                                        stroke={chartColor(idx)}
                                        dot={false}
                                        strokeWidth={2}
                                        connectNulls
                                        isAnimationActive={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={`${upz}_actual`}
                                        name={`${upz} (actual)`}
                                        stroke={chartColor(idx)}
                                        dot={false}
                                        strokeDasharray="6 3"
                                        strokeWidth={2}
                                        connectNulls
                                        isAnimationActive={false}
                                    />
                                </React.Fragment>
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
                </div> */}

            </div>
        </div >
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
                <PopoverContent className="p-4 w-64 z-[9999]">
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


function GeoJSONLayer({
    geojson,
    forecastResults,
    forecastMonth,
    actualData,
    actualMonth,
    type,
    threshold = 100,
    species
}) {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());
    const geoJsonRef = useRef(null);
    const labelsRef = useRef([]);

    useEffect(() => {
        // Sync zoom state
        const handleZoom = () => setZoom(map.getZoom());
        map.on("zoomend", handleZoom);
        return () => map.off("zoomend", handleZoom);
    }, [map]);

    function getActual(upaID) {
        if (!actualData || !actualMonth) return null;
        const [year, monthNum] = actualMonth.split('-');
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

    function getPredictionAPI(upaID) {
        if (!forecastResults) return null;
        // console.log("Looking for:", upaID, "in", forecastResults);
        return forecastResults.find(
            res => String(res.upazila_id) === String(upaID)
        );
    }


    function getCentroid(geometry) {
        let coords = [];
        if (geometry.type === "Polygon") coords = geometry.coordinates[0];
        else if (geometry.type === "MultiPolygon") coords = geometry.coordinates[0][0];
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

    const bips = useMemo(() => {
        if (!geojson) return [];
        return geojson.features.map(feature => {
            const upa = feature.properties.UPA_NAME;
            const upaID = feature.properties.UpazilaID;
            let cases = null;
            if (type === "forecast") {
                const pred = getPredictionAPI(upaID);
                cases = pred && pred.pred_cases !== undefined ? Number(pred.pred_cases) : 0;
            } else if (type === "actual") {
                const actual = getActual(upaID);
                if (actual) {
                    if (species === 'PV') cases = Number(actual.PV ?? 0);
                    else if (species === 'PF') cases = Number(actual.PF ?? 0);
                    else if (species === 'MIXED') cases = Number(actual.MIXED ?? 0);
                }
            }
            if (cases > threshold && feature.geometry) {
                const centroid = getCentroid(feature.geometry);
                return { center: [centroid[1], centroid[0]], upa };
            }
            return null;
        }).filter(Boolean);
    }, [geojson, forecastResults, forecastMonth, actualData, actualMonth, type, threshold, species]);


    // Remove all polygon/label layers before new draw
    useEffect(() => {
        if (!geojson) return;

        if (geoJsonRef.current) map.removeLayer(geoJsonRef.current);
        labelsRef.current.forEach(marker => map.removeLayer(marker));
        labelsRef.current = [];

        const layer = L.geoJSON(geojson, {
            style: feature => {
                const upaID = feature?.properties?.UpazilaID;
                const upa = feature?.properties?.UPA_NAME;
                let cases = null;

                if (type === "forecast") {
                    const pred = getPredictionAPI(upaID);
                    if (pred && pred.pred_cases !== undefined) {
                        cases = Number(pred.pred_cases) || 0;
                    }
                } else if (type === "actual") {
                    const actual = getActual(upaID);
                    if (actual) {
                        if (species === "PV") cases = Number(actual.PV ?? 0);
                        else if (species === "PF") cases = Number(actual.PF ?? 0);
                        else if (species === "MIXED") cases = Number(actual.MIXED ?? 0);
                    }
                }

                let fillColor = "#cccccc";
                if (cases >= 200) fillColor = "#bd0026";
                else if (cases >= 100) fillColor = "#f03b20";
                else if (cases >= 50) fillColor = "#fd8d3c";
                else if (cases >= 11) fillColor = "#fecc5c";
                else if (cases >= 1) fillColor = "#ffffb2";
                // 0–10 stays #ffffb2

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

                let cases = null;
                if (type === "forecast") {
                    const pred = getPredictionAPI(upaID);
                    if (pred && pred.pred_cases !== undefined)
                        cases = Math.round(pred.pred_cases);
                } else if (type === "actual") {
                    const actual = getActual(upaID);
                    if (actual) {
                        if (species === "PV") cases = Number(actual.PV ?? 0);
                        else if (species === "PF") cases = Number(actual.PF ?? 0);
                        else if (species === "MIXED") cases = Number(actual.MIXED ?? 0);
                    }
                }

                // --- POPUP INFO ---
                let html =
                    `<div style="font-family: Arial, sans-serif; font-size: 11px; color: #333; max-width: 180px;">
            <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 2px 4px; font-weight: bold;">Upazila</td>
              <td style="padding: 2px 4px;">${upa || "Unknown"}</td>
            </tr>`;
                if (type === "forecast") {
                    const pred = getPredictionAPI(upaID);
                    if (pred && pred.pred_cases !== undefined) {
                        html += `

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
                    if (type === "actual" && actual) {
                        let caseLabel = species === 'PV' ? 'PV Cases' : species === 'PF' ? 'PF Cases' : 'Mixed Cases';
                        let speciesValue = species === 'PV' ? actual.PV : species === 'PF' ? actual.PF : actual.MIXED;
                        html += `
    <tr>
      <td style="padding: 2px 4px; font-weight: bold;">Month</td>
      <td style="padding: 2px 4px;">${actual.ReportMonth} ${actual.ReportYear}</td>
    </tr>
    <tr>
      <td style="padding: 2px 4px; font-weight: bold;">${caseLabel}</td>
      <td style="padding: 2px 4px;">${speciesValue}</td>
    </tr>
  `;
                    }
                    else {
                        html += `</table>
              <div style="margin-top: 2px; font-style: italic; color: #777;">
                No actual data
              </div>
            </div>`;
                    }
                }
                lyr.bindPopup(html);

                // --- ZOOM LABELS ---
                if (cases !== null && zoom >= 9) {
                    const centroid = getCentroid(feature.geometry);
                    const div = L.divIcon({
                        className: "",
                        html: `<div style="
        color:#fff;
        font-size:13px;
        font-weight:600;
        text-shadow: 0 0 3px #000; /* makes white text readable */
    ">
      ${cases}
    </div>`,
                        iconAnchor: [0, 0], // anchor top-left so text isn’t misaligned
                    });

                    const marker = L.marker([centroid[1], centroid[0]], {
                        icon: div,
                        interactive: false,
                    });
                    marker.addTo(map);
                    labelsRef.current.push(marker);
                }
            }
        });

        layer.addTo(map);
        geoJsonRef.current = layer;
        if (geojson.features.length > 0) map.fitBounds(layer.getBounds());

        return () => {
            map.removeLayer(layer);
            labelsRef.current.forEach(m => map.removeLayer(m));
            labelsRef.current = [];
        };
    }, [geojson, map, forecastResults, forecastMonth, actualData, actualMonth, type, threshold]);

    // Toggle label marker visibility on zoom change
    useEffect(() => {
        (labelsRef.current || []).forEach(marker => {
            if (zoom < 9) map.removeLayer(marker);
            else if (!map.hasLayer(marker)) marker.addTo(map);
        });
    }, [zoom, map]);

    return (
        <>
            {bips.map((bip, i) => (
                <BippingMarker
                    key={bip.upa + i}
                    center={bip.center}
                    color="#ef4444"
                    size={32}
                    borderColor="#fff"
                    borderWidth={4}
                    zIndex={1400}
                />
            ))}
        </>
    );
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
    threshold = 100,
    species
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
                <div className="h-56">
                    <MapContainer center={[23.81, 90.41]} zoom={7} className="h-full w-full" >
                        <div style={{
                            position: "absolute", top: 6, right: 6, zIndex: 3001,
                            background: "#fff", padding: "2px 6px", borderRadius: 6,
                            boxShadow: "0 1px 4px #0001", fontSize: 10, lineHeight: 1.18, border: "1px solid #eee"
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{
                                    display: "inline-block", width: 9, height: 9, background: "#cccccc", marginRight: 3,
                                    borderRadius: 2, border: "1px solid #bbb"
                                }} /> 0
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{
                                    display: "inline-block", width: 9, height: 9, background: "#ffffb2", marginRight: 3,
                                    borderRadius: 2, border: "1px solid #ddd"
                                }} /> 1–10
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{
                                    display: "inline-block", width: 9, height: 9, background: "#fecc5c", marginRight: 3, borderRadius: 2
                                }} /> 11–49
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{
                                    display: "inline-block", width: 9, height: 9, background: "#fd8d3c", marginRight: 3, borderRadius: 2
                                }} /> 50–99
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{
                                    display: "inline-block", width: 9, height: 9, background: "#f03b20", marginRight: 3, borderRadius: 2
                                }} /> 100–199
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{
                                    display: "inline-block", width: 9, height: 9, background: "#bd0026", marginRight: 3, borderRadius: 2
                                }} /> 200+
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                                <span style={{
                                    display: "inline-block", width: 9, height: 9, background: "#bd0026",
                                    borderRadius: "50%", boxShadow: "0 0 0 1px #fff", animation: "bip-pulse 1s infinite alternate"
                                }} /> threshold
                            </div>
                        </div>


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
                                species={species}
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

function getPolygonCentroid(coords) {
    let area = 0, cx = 0, cy = 0;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const [x0, y0] = coords[j], [x1, y1] = coords[i];
        const f = x0 * y1 - x1 * y0;
        area += f;
        cx += (x0 + x1) * f;
        cy += (y0 + y1) * f;
    }
    area /= 2;
    cx /= (6 * area);
    cy /= (6 * area);
    return [cx, cy]; // [lng, lat]
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


function ProgressOverlay({ progress }) {
    return (
        <div style={{
            position: 'fixed',
            zIndex: 9999,
            top: 0, left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <div style={{ fontSize: 22, marginBottom: 20, color: '#333' }}>
                Fetching prediction data...
            </div>
            <div style={{ width: 320 }}>
                <ProgressBar percentage={progress.percentage} />
                <div style={{ marginTop: 10, color: '#666', textAlign: 'center' }}>

                    <span className="text-lg text-black">{progress.percentage}%</span>  &nbsp;|&nbsp; <span className="text-xs"> {progress.completed} / {progress.total} </span>
                </div>
            </div>
        </div>
    );
}


const ProgressBar = ({ percentage }) => (
    <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: 8, height: 22, overflow: 'hidden' }}>
        <div style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #4caf50 60%, #66bb6a 100%)',
            height: '100%',
            borderRadius: 8,
            transition: 'width 0.2s'
        }} />
    </div>
);

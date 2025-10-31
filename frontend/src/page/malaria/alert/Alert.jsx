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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import populationData from "../../../assets/upazila_population.json";


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

    const [selectedUpazila, setSelectedUpazila] = useState(""); // e.g. "Teknaf"
    const [forecastResults, setForecastResults] = useState([]); // Will hold the API re

    const baseDate = new Date();
    // const months = useMemo(
    //     () => getMonthVariants(selectedMonth ? new Date(selectedMonth) : new Date()),
    //     [selectedMonth]
    // );

    const [threshold, setThreshold] = useState(100);


    const [alertModal, setAlertModal] = useState(false);
    const [mailRecipients, setMailRecipients] = useState(EMAILS.map(e => e.email)); // all selected by default
    const [mailSubject, setMailSubject] = useState("Malaria Prediction Alert");
    const [mailBody, setMailBody] = useState("");
    const [selectedUpazilasAlert, setSelectedUpazilasAlert] = useState([]); // for selecting data to include

    const [customBody, setCustomBody] = useState(false);
    const [customEmails, setCustomEmails] = useState([]);
    const [newEmailInput, setNewEmailInput] = useState('');

    const [sendingMail, setSendingMail] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [ReportFetch, setReportFetching] = useState(false)

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [selectedMonth, setSelectedMonth] = useState(prevMonth);



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
    console.log("selectedUpazilas", selectedUpazilas)
    console.log("geojson", geoJson)


    const getAdjacentMonths = (selectedDate) => {
        // selectedDate is a JS Date object
        const prev = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
        const curr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);

        return [prev, curr, next].map(d => d.toISOString().slice(0, 10));
    };

    function get12Months(selectedDate) {
        let arr = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 11 + i, 1);
            arr.push({
                label: monthNames[d.getMonth()] + " " + d.getFullYear(),
                code: d.toISOString().slice(0, 10),
            });
        }
        return arr;
    }

    const months = useMemo(() =>
        get12Months(selectedMonth ? new Date(selectedMonth) : new Date()),
        [selectedMonth]);

    const handleGenerate = async () => {
        if (!selectedUpazilas.length || !selectedMonth) {
            toast.error("Please select at least one Upazila and a month.");
            return;
        }
        setFetching(true);
        try {
            // Lookup upazila IDs for selected upazilas from geoJson features
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



            const selectedUpazilaIds = new Set(selectedUpaObjs.map(u => u.id)); // Set for O(1) lookups

            // console.log("GeoJSON features count:", geoJson.features.length);
            // console.log("GeoJSON example keys:", Object.keys(geoJson.features[0].properties));
            // console.log("selectedUpazilas:🙌🙌🙌🙌🙌", selectedUpazilas);
            // console.log("selectedUpaObjs:😍😍😍😍😍", selectedUpaObjs);



            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            // console.log("------------------endpoint entry-------------");
            const endpoints = [
                { type: "PV", url: "/models/target_pv/predict_all" },
                { type: "PF", url: "/models/target_pf/predict_all" },
                { type: "MIXED", url: "/models/target_mixed/predict_all" }
            ];
            // console.log("------------------endpoint end-------------");
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
                // console.log("------------------result end-------------", results);
                // Collect successful results and flatten
                const fulfilled = results
                    .filter(r => r.status === "fulfilled")
                    .flatMap(r => r.value);
                console.log("------------------fulfiled end-------------", fulfilled);
                results.forEach(r => {
                    if (r.status === "fulfilled" && Array.isArray(r.value)) {
                        r.value.forEach(item => {
                            if (item.error) {
                                toast.error(`Prediction error (Upazila ${item.upazila_id}): ${item.error}`);
                            }
                        });
                    }
                });
                console.log("------------------result foreach end-------------");
                console.log("------------------forecastResultsWithCases starttttttttt -------------");

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
                console.log("------------------forecastResultsWithCases enddd 🏆🏆🏆🏆 -------------", forecastResultsWithCases);
                setForecastResults(forecastResultsWithCases);
                toast.success("Predictions generated successfully!");
            } catch (error) {
                console.log(error)
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

    // Batching utility: runs async fetch functions in batches
    async function runBatchedRequests(fetchFuncs, batchSize = 1, delayMs = 300) {
        const results = [];
        for (let i = 0; i < fetchFuncs.length; i += batchSize) {
            const batch = fetchFuncs.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch.map(fn => fn()));

            batchResults.forEach(result => {
                if (result.status === "fulfilled") {
                    results.push(result.value);
                } else {
                    console.error("Batch request failed", result.reason);
                }
            });

            // Optional: update UI progress here
            // updateProgress(results.length, fetchFuncs.length);

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        return results;
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

    console.log("forecastResults", forecastResults)
    console.log("filtergeojson", filteredGeoJson)
    console.log("selelcted month", selectedMonth)


    // async function handleGenerateReport() {
    //     try {
    //         const payload = {
    //             month: selectedMonth,
    //             predictions: forecastResults,     // same structure as before
    //             regionGeojson: filteredGeoJson,   // selected polygons
    //         };

    //         const response = await fetch("http://localhost:5000/generate-report-inline", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify(payload),
    //         });

    //         if (!response.ok) throw new Error("Failed to generate PDF");

    //         // Get the PDF blob and trigger download
    //         const blob = await response.blob();
    //         const url = URL.createObjectURL(blob);
    //         const link = document.createElement("a");
    //         link.href = url;
    //         link.download = `Malaria_Early_Warning_Report_${format(selectedMonth, "MMMM_yyyy")}.pdf`;
    //         document.body.appendChild(link);
    //         link.click();
    //         link.remove();
    //         URL.revokeObjectURL(url);

    //         toast.success("Report downloaded successfully!");
    //     } catch (err) {
    //         console.error("Report generation failed:", err);
    //         toast.error("Failed to generate report");
    //     }
    // }

    async function handleGenerateReport() {
        setReportFetching(true)
        try {
            const payload = {
                month: selectedMonth,
                predictions: forecastResults, // same structure as before
                regionGeojson: filteredGeoJson, // selected polygons
            };

            const response = await fetch("http://localhost:5000/generate-report-inline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to generate PDF");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Malaria_Early_Warning_Report_${format(selectedMonth, "MMMM_yyyy")}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            toast.success("Report downloaded successfully!");

            toast.success("Report opened successfully!");
        } catch (err) {
            console.error("Report generation failed:", err);
            toast.error("Failed to generate report");
        } finally { setReportFetching(false) }
    }



    return (
        <div className="flex flex-col lg:flex-row">

            {sendingMail && <SendMailOverlay />}


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
                    <button
                        onClick={() => {
                            setSelectedUpazilasAlert(upazilaAlertOptions); // Preselect all
                            setMailBody(""); // or build initial if wanted
                            setAlertModal(true);
                        }}


                        className="w-full bg-[#004bad]/80 cursor-pointer hover:bg-[#004bad] text-white font-semibold py-2 rounded">
                        Send alert
                    </button>
                    <button
                        disabled={ReportFetch}
                        onClick={async () => {
                            try {

                                await handleGenerateReport(); // Await PDF generation, which auto-downloads

                                toast.success("Download successful!");
                            } catch (err) {

                                toast.error("Download failed. Please try again.");
                                console.error("PDF download failed:", err);
                            }
                        }}


                        className="w-full bg-[#004bad]/80 cursor-pointer hover:bg-[#004bad] text-white font-semibold py-2 rounded flex items-center justify-center">
                        {ReportFetch ? (
                            <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span>Download report</span>
                        )}
                    </button>
                </div>
            </aside>

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



                {/* <div className=" bg-white border rounded shadow p-4">
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
                </div> */}

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



            {alertModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
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
                                <div className="space-y-2 mt-2">
                                    {[...EMAILS.map(e => e.email), ...customEmails].map(email => (
                                        <label key={email} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 accent-blue-600"
                                                checked={mailRecipients.includes(email)}
                                                onChange={ev =>
                                                    setMailRecipients(ev.target.checked
                                                        ? [...mailRecipients, email]
                                                        : mailRecipients.filter(x => x !== email)
                                                    )
                                                }
                                            />
                                            <span>{email}</span>
                                            {customEmails.includes(email) && (
                                                <button
                                                    className="text-xs text-red-500 ml-2"
                                                    onClick={() =>
                                                        setCustomEmails(customEmails.filter(x => x !== email))
                                                    }
                                                    type="button"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </label>
                                    ))}
                                </div>

                            </div>

                            <div className="mt-2 flex gap-2">
                                <input
                                    type="email"
                                    value={newEmailInput}
                                    onChange={e => setNewEmailInput(e.target.value)}
                                    className="border rounded px-3 py-2 w-full"
                                    placeholder="Add custom email address"
                                />
                                <button
                                    onClick={() => {
                                        if (newEmailInput && !customEmails.includes(newEmailInput)) {
                                            setCustomEmails([...customEmails, newEmailInput]);
                                            setNewEmailInput('');
                                        }
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded"
                                    type="button"
                                >
                                    Add
                                </button>
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
                                    setSendingMail(true);
                                    try {
                                        await axios.post("https://ewars-mails.onrender.com/send-alert", {
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
                                    } finally {
                                        setSendingMail(false);
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


                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
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


function SendMailOverlay() {
    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0, 0, 0, 0.5)", zIndex: 99999,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", transition: "opacity 0.3s ease-in-out"
        }}>
            <div style={{
                fontSize: 24, marginBottom: 20, color: "#ffffff", fontWeight: "bold",
                textAlign: "center", letterSpacing: "1px", animation: "fadeIn 0.5s ease-in-out"
            }}>
                Sending mail...
            </div>
            <div className="loader" style={{
                borderTop: "8px solid #fff", borderRight: "8px solid transparent", borderRadius: "50%",
                width: "40px", height: "40px", borderWidth: "8px", animation: "spin 1s linear infinite"
            }} />
        </div>
    );
}

function replaceOklchColors(root, fallback = "#cccccc") {
    if (!root) return;
    root.querySelectorAll("*").forEach((el) => {
        ["backgroundColor", "color", "borderColor"].forEach(prop => {
            // Get computed style
            const computed = getComputedStyle(el)[prop];
            if (computed && computed.startsWith("oklch(")) {
                el.style[prop] = fallback;
            }
        });
    });
}

async function downloadReport() {
    const pdf = new jsPDF("p", "pt", "a4");

    for (let i = 0; i < 3; i++) {
        const mapBox = document.querySelectorAll(".h-56")[i];
        const title = [
            "Predicted PV case – August 2025",
            "Predicted PF case – August 2025",
            "Predicted MIXED case – August 2025"
        ][i];

        // Fix oklch colors before screenshot
        replaceOklchColors(mapBox, "#cccccc");

        // Draw title
        if (i !== 0) pdf.addPage();
        pdf.setFontSize(18);
        pdf.text(title, 40, 40);

        // Draw map
        const canvas = await html2canvas(mapBox, { useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 40, 60, 500, 250);

        // (Optional) restore original styles if you want
    }

    pdf.save("malaria-prediction-report.pdf");
}

const styles = {
    fadeIn: {
        animation: "fadeIn 0.5s ease-in-out"
    },
    spin: {
        animation: "spin 1s linear infinite"
    }
}

// Add CSS keyframes for animations
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`, styleSheet.cssRules.length);



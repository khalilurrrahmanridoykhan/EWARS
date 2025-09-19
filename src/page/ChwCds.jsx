import HierarchicalMultiSelect from '@/components/HierarchicalMultiSelect';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react'
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster"

import {
    LineChart, Line,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, Legend, LabelList, ResponsiveContainer,
    CartesianGrid,
    Brush
} from 'recharts';


function ChwCds() {
    const [allData, setAllData] = useState(null);
    const [error, setError] = useState("");

    // States for each filter; all start as []
    const [selectedDivisions, setSelectedDivisions] = useState([]);
    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [selectedUpazilas, setSelectedUpazilas] = useState([]);
    const [selectedUnions, setSelectedUnions] = useState([]);
    const [selectedWards, setSelectedWards] = useState([]);
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [selectedOrganizations, setSelectedOrganizations] = useState([]);
    const [selectedDiseases, setSelectedDiseases] = useState([]);

    const [filteredSubmissions, setFilteredSubmissions] = useState([]);
    const [dateRange, setDateRange] = useState([null, null]); // [startDate, endDate]
    const [collapsed, setCollapsed] = useState(false);



    console.log("alldata", allData);
    console.log("filteredSubmissions", filteredSubmissions);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = "cb1aa06c8b01ca913f88b1517f43e70dbba03b97";
                const response = await axios.get(
                    "https://admin2.commicplan.com/api/api/forms/1079/",
                    {
                        headers: { Authorization: `Token ${token}` }
                    }
                );
                setAllData(response.data);
            } catch (err) {
                setError(String(err));
            }
        };
        fetchData();
    }, []);

    const h = useMemo(
        () => (allData ? extractHierarchy(allData.submission || []) : null),
        [allData]
    );



    // On data load, select everything by default
    useEffect(() => {
        if (!h) return;
        setSelectedDivisions(h.divisionOptions);
        setSelectedDistricts(h.districtOptions);
        setSelectedUpazilas(h.upazilaOptions);
        setSelectedUnions(h.unionOptions);
        setSelectedWards(h.wardOptions);
        setSelectedAreas(h.areaOptions);
        setSelectedOrganizations(h.organizationOptions);
        setSelectedDiseases(h.diseaseOptions);
    }, [!!h]);

    // Chaining logic
    useEffect(() => {
        if (!h) return;
        // Sync children with selected parents (Division→District)
        setSelectedDistricts(
            autoChainSelect(selectedDivisions, h.divisionToDistricts, selectedDistricts)
        );
    }, [selectedDivisions]);
    useEffect(() => {
        if (!h) return;
        // Sync children with selected parents (District→Upazila)
        setSelectedUpazilas(
            autoChainSelect(selectedDistricts, h.districtToUpazilas, selectedUpazilas)
        );
    }, [selectedDistricts]);
    useEffect(() => {
        if (!h) return;
        setSelectedUnions(
            autoChainSelect(selectedUpazilas, h.upazilaToUnions, selectedUnions)
        );
    }, [selectedUpazilas]);
    useEffect(() => {
        if (!h) return;
        setSelectedWards(
            autoChainSelect(selectedUnions, h.unionToWards, selectedWards)
        );
    }, [selectedUnions]);
    useEffect(() => {
        if (!h) return;
        setSelectedAreas(
            autoChainSelect(selectedWards, h.wardToAreas, selectedAreas)
        );
    }, [selectedWards]);

    function handleDivisionChange(next) {
        setSelectedDivisions(next);
        setSelectedDistricts(
            districtOptions.filter(dis =>
                next.some(div => h.divisionToDistricts[div]?.includes(dis))
            )
        );
        setSelectedUpazilas([]);
        setSelectedUnions([]);
        setSelectedWards([]);
        setSelectedAreas([]);
        setSelectedOrganizations([]);
        setSelectedDiseases([]);
    }

    function handleDistrictChange(next) {
        setSelectedDistricts(next);
        setSelectedUpazilas(
            upazilaOptions.filter(upa =>
                next.some(dis => h.districtToUpazilas[dis]?.includes(upa))
            )
        );
        setSelectedUnions([]);
        setSelectedWards([]);
        setSelectedAreas([]);
        setSelectedOrganizations([]);
        setSelectedDiseases([]);
    }

    function handleUpazilaChange(next) {
        setSelectedUpazilas(next);
        setSelectedUnions(
            unionOptions.filter(uni =>
                next.some(upa => h.upazilaToUnions[upa]?.includes(uni))
            )
        );
        setSelectedWards([]);
        setSelectedAreas([]);
        setSelectedOrganizations([]);
        setSelectedDiseases([]);
    }

    function handleUnionChange(next) {
        setSelectedUnions(next);
        setSelectedWards(
            wardOptions.filter(war =>
                next.some(uni => h.unionToWards[uni]?.includes(war))
            )
        );
        setSelectedAreas([]);
        setSelectedOrganizations([]);
        setSelectedDiseases([]);
    }

    function handleWardChange(next) {
        setSelectedWards(next);
        setSelectedAreas(
            areaOptions.filter(area =>
                next.some(war => h.wardToAreas[war]?.includes(area))
            )
        );
        setSelectedOrganizations([]);
        setSelectedDiseases([]);
    }

    function handleAreaChange(next) {
        setSelectedAreas(next);
        // org/disease always filtered by visible rows
        setSelectedOrganizations([]);
        setSelectedDiseases([]);
    }

    function handleOrganizationChange(next) {
        setSelectedOrganizations(next);
    }

    function handleDiseaseChange(next) {
        setSelectedDiseases(next);
    }

    // Parents as a mapping for convenience
    const filterState = {
        division: selectedDivisions,
        district: selectedDistricts,
        upazila: selectedUpazilas,
        union: selectedUnions,
        ward: selectedWards,
        area: selectedAreas,
    };

    const divisionOptions = useMemo(() =>
        h && h.allRows ? filterOptions(h.allRows, ['division'], filterState) : [],
        [h, filterState]
    );

    const districtOptions = useMemo(() =>
        h && h.allRows ? filterOptions(h.allRows, ['division', 'district'], filterState) : [],
        [h, filterState]
    );

    const upazilaOptions = useMemo(() =>
        h && h.allRows ? filterOptions(h.allRows, ['division', 'district', 'upazila'], filterState) : [],
        [h, filterState]
    );

    const unionOptions = useMemo(() =>
        h && h.allRows ? filterOptions(h.allRows, ['division', 'district', 'upazila', 'union'], filterState) : [],
        [h, filterState]
    );

    const wardOptions = useMemo(() =>
        h && h.allRows ? filterOptions(h.allRows, ['division', 'district', 'upazila', 'union', 'ward'], filterState) : [],
        [h, filterState]
    );

    const areaOptions = useMemo(() =>
        h && h.allRows ? filterOptions(h.allRows, ['division', 'district', 'upazila', 'union', 'ward', 'area'], filterState) : [],
        [h, filterState]
    );

    const filteredRows = useMemo(() =>
        h && h.allRows
            // Only show rows for which ALL NOT-EMPTY filters match
            ? h.allRows.filter(row =>
                (!selectedDivisions.length || selectedDivisions.includes(row.division)) &&
                (!selectedDistricts.length || selectedDistricts.includes(row.district)) &&
                (!selectedUpazilas.length || selectedUpazilas.includes(row.upazila)) &&
                (!selectedUnions.length || selectedUnions.includes(row.union)) &&
                (!selectedWards.length || selectedWards.includes(row.ward)) &&
                (!selectedAreas.length || selectedAreas.includes(row.area))
            )
            : [],
        [h, selectedDivisions, selectedDistricts, selectedUpazilas, selectedUnions, selectedWards, selectedAreas]
    );

    const organizationOptions = useMemo(() =>
        filteredRows.length > 0
            ? getUnique(filteredRows.map(row => row.organization).filter(Boolean))
            : [],
        [filteredRows]
    );

    const diseaseOptions = useMemo(() =>
        filteredRows.length > 0
            ? getUnique(filteredRows.flatMap(row => row.disease).filter(Boolean))
            : [],
        [filteredRows]
    );

    useEffect(() => {
        // Only auto-select if the options list actually changed (new options)
        setSelectedOrganizations(prev =>
            organizationOptions.length && !prev.length
                ? organizationOptions
                : prev.filter(v => organizationOptions.includes(v))
        );
    }, [organizationOptions]);

    // Auto-select all visible disease options
    useEffect(() => {
        setSelectedDiseases(prev =>
            diseaseOptions.length && !prev.length
                ? diseaseOptions
                : prev.filter(v => diseaseOptions.includes(v))
        );
    }, [diseaseOptions]);

    useEffect(() => {
        if (!h || !h.allRows) {
            setFilteredSubmissions([]);
            return;
        }
        const [start, end] = dateRange;
        const filtered = h.allRows.filter(row =>
            (!selectedDivisions.length || selectedDivisions.includes(row.division)) &&
            (!selectedDistricts.length || selectedDistricts.includes(row.district)) &&
            (!selectedUpazilas.length || selectedUpazilas.includes(row.upazila)) &&
            (!selectedUnions.length || selectedUnions.includes(row.union)) &&
            (!selectedWards.length || selectedWards.includes(row.ward)) &&
            (!selectedAreas.length || selectedAreas.includes(row.area)) &&
            (!selectedOrganizations.length || selectedOrganizations.includes(row.organization)) &&
            (
                !selectedDiseases.length ||
                row.disease.some(d => selectedDiseases.includes(d))
            ) &&
            (!start || !row.day || row.day >= start) &&
            (!end || !row.day || row.day <= end)
        );
        setFilteredSubmissions(filtered);
    }, [
        h,
        selectedDivisions,
        selectedDistricts,
        selectedUpazilas,
        selectedUnions,
        selectedWards,
        selectedAreas,
        selectedOrganizations,
        selectedDiseases,
        dateRange
    ]);


    const allDays = useMemo(() => (
        h && h.allRows
            ? getUnique(h.allRows.map(x => x.day).filter(Boolean)).sort()
            : []
    ), [h]);

    const minDay = allDays[0];
    const maxDay = allDays[allDays.length - 1];

    // Enforce clamping on setDateRange
    const clampDate = (d, minD, maxD) =>
        d < minD ? minD : d > maxD ? maxD : d;

    function handleDateRangeChange([from, to]) {
        if (!minDay || !maxDay) return;
        // Clamp within min/max
        const clampedFrom = clampDate(from, minDay, maxDay);
        const clampedTo = clampDate(to, minDay, maxDay);
        setDateRange([clampedFrom, clampedTo]);
    }

    // On initial data load, select full range
    useEffect(() => {
        if (minDay && maxDay) setDateRange([minDay, maxDay]);
    }, [minDay, maxDay]);

    function calculateMetrics(submissions) {
        // Line chart: submissions over time
        const submissionsPerDay = {};
        submissions.forEach(row => {
            const day = row.day || row.date; // Both allowed, derived from direct.end
            if (!day) return;
            submissionsPerDay[day] = (submissionsPerDay[day] || 0) + 1;
        });
        const submissionsOverTime = Object.keys(submissionsPerDay)
            .sort()
            .map(day => ({ name: day, value: submissionsPerDay[day] }));

        // Suspected Ratio Pie and Count
        let suspected = 0, notSuspected = 0, suspectedOther = 0;
        submissions.forEach(x => {
            const suspectedVal = x.suspectedinthedisease;
            if (suspectedVal === "yes") suspected++;
            else if (suspectedVal === "no") notSuspected++;
            else suspectedOther++;
        });

        // Suspected Disease Count Bar
        const diseaseCounts = {};
        submissions.forEach(x => {
            if (Array.isArray(x.disease)) x.disease.forEach(d => {
                diseaseCounts[d] = (diseaseCounts[d] || 0) + 1;
            });
            else if (x.disease) diseaseCounts[x.disease] = (diseaseCounts[x.disease] || 0) + 1;
        });
        const suspectedDiseaseBar = Object.entries(diseaseCounts)
            .map(([disease, count]) => ({ name: disease, value: count }));

        // Referral Rate Pie
        let referredYes = 0, referredNo = 0, referredOther = 0;
        submissions.forEach(x => {
            const referredVal = x.referred;
            if (referredVal === "yes") referredYes++;
            else if (referredVal === "no") referredNo++;
            else referredOther++;
        });

        // Referral facility type Pie
        const facilityTypeCounts = {};
        submissions.forEach(x => {
            if (x.referralplace) facilityTypeCounts[x.referralplace] = (facilityTypeCounts[x.referralplace] || 0) + 1;
        });
        const facilityTypePie = Object.entries(facilityTypeCounts).map(([name, value]) => ({ name, value }));

        // Gender counts Pie
        let male = 0, female = 0, pregnant = 0, otherGender = 0;
        submissions.forEach(x => {
            if (x.sex === "male") male++;
            else if (x.sex === "female") female++;
            else otherGender++;
            if (x.preg === "yes") pregnant++;
        });
        const genderPie = [
            { name: "Male", value: male },
            { name: "Female", value: female },
            { name: "Pregnant", value: pregnant },
            { name: "Other", value: otherGender }
        ];

        // Bednet Usage Pie
        let bednetYes = 0, bednetNo = 0, bednetOther = 0;
        submissions.forEach(x => {
            const val = x.bednetusepracticeduringsleep;
            if (val === "yes") bednetYes++;
            else if (val === "no") bednetNo++;
            else bednetOther++;
        });
        const bednetPie = [
            { name: "Yes", value: bednetYes },
            { name: "No", value: bednetNo },
            { name: "Other", value: bednetOther }
        ];

        // Handwashing Pie
        let washYes = 0, washNo = 0, washOther = 0;
        submissions.forEach(x => {
            const val = x.handwashingpracticewithsoapwater;
            if (val === "yes") washYes++;
            else if (val === "no") washNo++;
            else washOther++;
        });
        const washPie = [
            { name: "Yes", value: washYes },
            { name: "No", value: washNo },
            { name: "Other", value: washOther }
        ];

        // Latrine Type Bar
        const latrineTypes = {};
        submissions.forEach(x => {
            if (x.typelatrineuse) latrineTypes[x.typelatrineuse] = (latrineTypes[x.typelatrineuse] || 0) + 1;
        });
        const latrineBar = Object.entries(latrineTypes).map(([name, value]) => ({ name, value }));

        // Mosquito Breeding Sites Pie
        let breedYes = 0, breedNo = 0, breedOther = 0;
        submissions.forEach(x => {
            const val = x.presenceofstagnantwatermosquitobreedingsites;
            if (val === "yes") breedYes++;
            else if (val === "no") breedNo++;
            else breedOther++;
        });
        const mosquitoBreedPie = [
            { name: "Yes", value: breedYes },
            { name: "No", value: breedNo },
            { name: "Other", value: breedOther }
        ];

        // Mosquito Larvae Pie
        let larvaeYes = 0, larvaeNo = 0, larvaeOther = 0;
        submissions.forEach(x => {
            const val = x.presenceofmosquitolarvae;
            if (val === "yes" || val === "aedes" || val === "others") larvaeYes++;
            else if (val === "no") larvaeNo++;
            else larvaeOther++;
        });
        const mosquitoLarvaePie = [
            { name: "Yes", value: larvaeYes },
            { name: "No", value: larvaeNo },
            { name: "Other", value: larvaeOther }
        ];

        // Disaster in Last Week Pie
        let disasterYes = 0, disasterNo = 0, disasterOther = 0;
        submissions.forEach(x => {
            const val = x.didanydisasteroccurinlast7days;
            if (val === "yes") disasterYes++;
            else if (val === "no") disasterNo++;
            else disasterOther++;
        });
        const disasterWeekPie = [
            { name: "Yes", value: disasterYes },
            { name: "No", value: disasterNo },
            { name: "Other", value: disasterOther }
        ];

        // Disaster Type Bar
        const disasterTypes = {};
        submissions.forEach(x => {
            const types = Array.isArray(x.whattypes)
                ? x.whattypes : (typeof x.whattypes === "string"
                    ? x.whattypes.split(" ").filter(Boolean) : []);
            types.forEach(type => { disasterTypes[type] = (disasterTypes[type] || 0) + 1; });
        });
        const disasterTypeBar = Object.entries(disasterTypes).map(([name, value]) => ({ name, value }));

        // MAP data fix: ensure latitude/longitude are properly parsed for each submission!
        const mapMarkers = submissions
            .filter(x => typeof x.latitude === "number" && typeof x.longitude === "number")
            .map(x => ({
                lat: x.latitude,
                lng: x.longitude,
                info: x // Additional info to show in popup
            }));

        return {
            submissionsOverTime,
            suspectedRatioPie: [
                { name: "Suspected", value: suspected },
                { name: "Not Suspected", value: notSuspected },
                { name: "Other", value: suspectedOther }
            ],
            referralRatePie: [
                { name: "Yes", value: referredYes },
                { name: "No", value: referredNo },
                { name: "Other", value: referredOther }
            ],
            genderPie,
            facilityTypePie,
            bednetPie,
            washPie,
            mosquitoBreedPie,
            mosquitoLarvaePie,
            disasterWeekPie,
            suspectedDiseaseBar,
            latrineBar,
            disasterTypeBar,
            totalSubmissions: submissions.length,
            percentSuspected: Math.round(100 * suspected / ((suspected + notSuspected + suspectedOther) || 1)),
            referralRate: Math.round(100 * referredYes / ((referredYes + referredNo + referredOther) || 1)),
            bednetPercent: Math.round(100 * bednetYes / ((bednetYes + bednetNo + bednetOther) || 1)),
            handwashPercent: Math.round(100 * washYes / ((washYes + washNo + washOther) || 1)),
            mosquitoBreedPercent: Math.round(100 * breedYes / ((breedYes + breedNo + breedOther) || 1)),
            mosquitoLarvaePercent: Math.round(100 * larvaeYes / ((larvaeYes + larvaeNo + larvaeOther) || 1)),
            disasterWeekPercent: Math.round(100 * disasterYes / ((disasterYes + disasterNo + disasterOther) || 1)),
            mapMarkers // This is the array for your map rendering!
        };
    }




    const metrics = useMemo(() => calculateMetrics(filteredSubmissions), [filteredSubmissions]);
    console.log("metrics", metrics);

    const points = useMemo(
        () => filteredSubmissions
            .filter(x => x.latitude && x.longitude)
            .map(x => ({
                ...x,
                lat: x.latitude,
                lng: x.longitude,
            })),
        [filteredSubmissions]
    );

    // const organizationOptions = useMemo(
    //     () => getUnique(filteredSubmissions.map(sub => sub.organization).filter(Boolean)),
    //     [filteredSubmissions]
    // );

    // const diseaseOptions = useMemo(
    //     () => getUnique(filteredSubmissions.flatMap(sub => sub.disease).filter(Boolean)),
    //     [filteredSubmissions]
    // );


    // if (!h) return <div>Loading...</div>;
    if (!h || !h.allRows) {
        return <div>Loading...</div>;
    }
    if (error) return <div>{error}</div>;



    return (
        <div>
            <div className="bg-blue-50 p-4 rounded-xl shadow-md mb-6">
                <button
                    type="button"
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    aria-label={collapsed ? "Expand" : "Collapse"}
                    onClick={() => setCollapsed(prev => !prev)}
                >
                    {collapsed ? (
                        // Chevron down
                        <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="transition-transform"
                        >
                            <path d="M4 6l4 4 4-4" />
                        </svg>
                    ) : (
                        // Chevron up
                        <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="transition-transform"
                        >
                            <path d="M4 10l4-4 4 4" />
                        </svg>
                    )}
                    <span>{collapsed ? "Show" : "Hide"} filters</span>
                </button>

                {!collapsed && (<div className="grid grid-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    {/* Date Range Picker (static for now) */}


                    <div className="flex flex-col min-w-[220px] gap-2">
                        <p className="font-medium text-gray-700">Date range</p>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-[280px] justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange[0] && dateRange[1] ? (
                                        <>
                                            {format(new Date(dateRange[0]), "LLL dd, y")} –{" "}
                                            {format(new Date(dateRange[1]), "LLL dd, y")}
                                        </>
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="range"
                                    numberOfMonths={2}
                                    selected={{
                                        from: dateRange[0] ? new Date(dateRange[0]) : undefined,
                                        to: dateRange[1] ? new Date(dateRange[1]) : undefined,
                                    }}
                                    min={new Date(minDay)}
                                    max={new Date(maxDay)}
                                    onSelect={(range) => {
                                        if (!range) return;
                                        handleDateRangeChange([
                                            range.from
                                                ? range.from.toISOString().split("T")[0]
                                                : minDay,
                                            range.to
                                                ? range.to.toISOString().split("T")[0]
                                                : maxDay,
                                        ]);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <HierarchicalMultiSelect
                        label="Division"
                        options={divisionOptions}
                        selected={selectedDivisions}
                        setSelected={handleDivisionChange}
                    />

                    <HierarchicalMultiSelect
                        label="District"
                        options={districtOptions}
                        selected={selectedDistricts}
                        setSelected={handleDistrictChange}
                        disabled={!selectedDivisions.length}
                    />

                    <HierarchicalMultiSelect
                        label="Upazila"
                        options={upazilaOptions}
                        selected={selectedUpazilas}
                        setSelected={handleUpazilaChange}
                        disabled={!selectedDistricts.length}
                    />

                    <HierarchicalMultiSelect
                        label="Union"
                        options={unionOptions}
                        selected={selectedUnions}
                        setSelected={handleUnionChange}
                        disabled={!selectedUpazilas.length}
                    />

                    <HierarchicalMultiSelect
                        label="Ward"
                        options={wardOptions}
                        selected={selectedWards}
                        setSelected={handleWardChange}
                        disabled={!selectedUnions.length}
                    />

                    <HierarchicalMultiSelect
                        label="Village (Area)"
                        options={areaOptions}
                        selected={selectedAreas}
                        setSelected={handleAreaChange}
                        disabled={!selectedWards.length}
                    />

                    <HierarchicalMultiSelect
                        label="Organization"
                        options={organizationOptions}
                        selected={selectedOrganizations}
                        setSelected={handleOrganizationChange}
                        disabled={!selectedAreas.length}
                    />

                    <HierarchicalMultiSelect
                        label="Disease"
                        options={diseaseOptions}
                        selected={selectedDiseases}
                        setSelected={handleDiseaseChange}
                        disabled={!selectedAreas.length}
                    />

                </div>)}

            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]">
                <LineCard
                    title="Submissions Over Time"
                    data={metrics.submissionsOverTime}
                    stat={metrics.totalSubmissions}
                />

                <MultiPieCard
                    title="Suspected Ratio"
                    data={metrics.suspectedRatioPie}
                    colors={["#FF6361", "#005fbe", "#d9534f"]}
                    stat={`${metrics.percentSuspected}%`}
                />

                <PieCard
                    title="Referral Rate"
                    data={metrics.referralRatePie}
                    colors={["#005fbe", "#FF6361"]}
                    stat={`${metrics.referralRate}%`}
                />

                <MultiPieCard
                    title="Gender Distribution"
                    data={metrics.genderPie}
                    colors={["#3296FA", "#FF6361", "#C50080"]}
                    stat={metrics.genderPie.reduce((sum, d) => sum + d.value, 0)}
                />

                <div className="row-span-2 md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2">
                    <DashboardCard title="Map">
                        <div className="w-full h-full" style={{ minHeight: 350 }}>
                            <PatientMap points={points} />
                        </div>
                    </DashboardCard>
                </div>

                <MultiPieCard
                    title="Facility Type"
                    data={metrics.facilityTypePie}
                    colors={["#3296FA", "#ffaf42", "#d9534f"]}
                    stat={metrics.facilityTypePie.reduce((sum, d) => sum + d.value, 0)}
                />

                <PieCard
                    title="Bednet Usage"
                    data={metrics.bednetPie}
                    colors={["#005fbe", "#FF6361"]}
                    stat={`${metrics.bednetPercent}%`}
                />

                <HorizontalBarCard
                    title="Suspected Disease Count"
                    data={metrics.suspectedDiseaseBar}
                    colors={["#FF6361", "#3296FA", "#60B76D"]}
                    stat={metrics.suspectedDiseaseBar.reduce((sum, d) => sum + d.value, 0)}
                />

                <HorizontalBarCard
                    title="Latrine Type"
                    data={metrics.latrineBar}
                    colors={["#3296FA", "#60B76D"]}
                    stat={metrics.latrineBar.reduce((sum, d) => sum + d.value, 0)}
                />

                <HorizontalBarCard
                    title="Disaster Types"
                    data={metrics.disasterTypeBar}
                    colors={["#FFB300", "#FF6361", "#3296FA", "#60B76D"]}
                    stat={metrics.disasterTypeBar.reduce((sum, d) => sum + d.value, 0)}
                />
                <PieCard
                    title="Handwashing Facilities"
                    data={metrics.washPie}
                    colors={["#FF6361", "#005fbe", "#d9534f"]}
                    stat={`${metrics.handwashPercent}%`}
                />

                <PieCard
                    title="Mosquito Breeding Sites"
                    data={metrics.mosquitoBreedPie}
                    colors={["#FF6361", "#005fbe", "#d9534f"]}
                    stat={`${metrics.mosquitoBreedPercent}%`}
                />

                <PieCard
                    title="Mosquito Larvae Found"
                    data={metrics.mosquitoLarvaePie}
                    colors={["#FF6361", "#005fbe", "#d9534f"]}
                    stat={`${metrics.mosquitoLarvaePercent}%`}
                />

                <PieCard
                    title="Disaster in Last Week"
                    data={metrics.disasterWeekPie}
                    colors={["#FF6361", "#005fbe", "#d9534f"]}
                    stat={`${metrics.disasterWeekPercent}%`}
                />

            </div>
        </div>

    )
}

export default ChwCds

// const DashboardCard = ({ title, children, barColor = "#005fbe" }) => (
//     <div className="rounded-md shadow border border-blue-800 flex flex-col w-full h-full bg-white overflow-hidden">
//         {/* Colored Title Bar */}
//         <div
//             style={{ background: barColor }}
//             className="px-3 py-2"
//         >
//             <h3 className="text-base font-bold text-white tracking-tight">
//                 {title}
//             </h3>
//         </div>
//         {/* Chart/Content Area: fills all, NO extra padding or margin */}
//         <div className="flex-1 flex items-center justify-center w-full h-full">
//             <div className="w-full h-full flex items-center justify-center">
//                 {children}
//             </div>
//         </div>
//     </div>
// );



function autoChainSelect(valueList, mapping, allSelected) {
    let out = [];
    valueList.forEach(val => {
        if (mapping[val]) out.push(...mapping[val]);
    });
    return getUnique([...allSelected, ...out]);
}

// Chained option generator
function filterOptions(rows, keys, parentSelected) {
    return getUnique(
        rows
            .filter(row =>
                keys.slice(0, -1).every(
                    (k, i) => !parentSelected[k]?.length || parentSelected[k].includes(row[k])
                )
            )
            .map(row => row[keys[keys.length - 1]])
            .filter(Boolean)
    );
}
function autoChainDeselect(deselected, mapping, childSelected) {
    // Remove any child keys that are children of *any* deselected parent
    const toRemove = deselected.flatMap(val => mapping[val] || []);
    return childSelected.filter(x => !toRemove.includes(x));
}

function getUnique(arr) {
    return Array.from(new Set(arr)).filter(Boolean);
}

function flattenSubmission(x) {
    const direct = x.data;

    // Detect if this is mobile-style submission (no nested groups, flat keys mostly)
    const isMobileSubmission = direct.hasOwnProperty('_id') && direct._id === 'form_1079';

    if (isMobileSubmission) {
        // Mobile submission field extraction (assumes flat structure)
        const latitudeLongitude = (direct.location || '').split(' ');
        let latitude = null, longitude = null;
        if (latitudeLongitude.length >= 2) {
            longitude = Number(latitudeLongitude[0]);
            latitude = Number(latitudeLongitude[1]);
        }

        return {
            division: direct.division || '',
            district: direct.district || '',
            upazila: direct.upazila || '',
            union: direct.union || '',
            ward: direct.ward || '',
            area: direct.area || '',
            age: direct.age || '',
            sex: direct.sex || '',
            preg: direct.pregnent || direct.pregnant || 'no',
            hhid: direct.hh_id || '',
            hhheadname: direct.hh_head_name || '',
            mobilenumber: direct.mobile_number || direct.mobile_number || '', // sometimes mobile_number or mobile_number
            patientidtype: direct.patient_id_type || '',
            suspectedinthedisease: direct.suspected_in_the_disease || 'no',
            disease: direct.suspected_disease ? direct.suspected_disease.split(' ').filter(Boolean) : [],
            nameofthepersonwithsuspectedcase: direct.name_of_the_person_with_suspected_case || '',
            useridentification: direct.user_identification_11_9943_01976848561 || '',
            organization: direct.organization || '',
            designation: direct.designation_1 || direct.designation || '',
            nameofstaff: direct.name_of_staff || '',
            referred: direct.referred || direct.referred_new || 'no',
            referralplace: direct.referral_place || '',
            ifreferredtogovt: direct.if_referred_to_govt || '',
            bednetusepracticeduringsleep: direct.bed_net_use_practice_during_sleep || 'no',
            handwashingpracticewithsoapwater: direct.handwashing_practice_with_soap__water || 'no',
            typelatrineuse: direct.type_latrine_use || '',
            presenceofmosquitolarvae: direct.presence_of_mosquito_larvae || 'no',
            presenceofstagnantwatermosquitobreedingsites: direct.presence_of_stagnant_water_mosquito_breeding_sites || 'no',
            didanydisasteroccurinlast7days: direct.did_any_disaster_occur_in_last_7_days_ || 'no',
            whattypes: direct.what_types ? direct.what_types.split(' ').filter(Boolean) : [],
            noofalreadydiagnosedcasesofdengueinthehh: Number(direct['no._of_already_diagnosed_cases_of_dengue_in_the_hh_1']) || 0,
            noofalreadydiagnosedcasesofmalariainthehh: Number(direct['no._of_already_diagnosed_cases_of_malaria_in_the_hh']) || 0,
            noofalreadydiagnosedcasesofawdinthehh: Number(direct['no._of_already_diagnosed_cases_of_awd_in_the_hh']) || 0,
            date: direct.end ? direct.end.slice(0, 10) : direct.date || null,
            remarks: direct.remarks || '',
            location: direct.location || '',
            latitude,
            longitude
        };
    } else {
        // Enketo web submission extraction (nested groups)
        const referralInfo = direct['referral-relatedinformation'] || {};
        const healthWorkerInfo = direct['healthworkersinformation'] || {};
        const healthBehaviour = direct['healthbehaviour'] || {};
        const disasterInfo = direct['disaster-relatedinformation'] || {};
        const environmentInfo = direct['environmentalrelatedinformation'] || {};
        const suspectedPatientInfo = direct['suspectedpatient-relatedinformation'] || {};
        const alreadyDiagnosed = direct['informationofalreadyidentifiedpatients'] || {};

        const locationStr = suspectedPatientInfo.location || '';
        const locParts = locationStr.split(' ');
        let latitude = null, longitude = null;
        if (locParts.length >= 2) {
            latitude = Number(locParts[0]);
            longitude = Number(locParts[1]);
        }

        return {
            division: suspectedPatientInfo.division || '',
            district: suspectedPatientInfo.district || '',
            upazila: suspectedPatientInfo.upazila || '',
            union: suspectedPatientInfo.union || '',
            ward: suspectedPatientInfo.ward || '',
            area: suspectedPatientInfo.area || '',
            age: suspectedPatientInfo.age || '',
            sex: suspectedPatientInfo.sex || '',
            preg: suspectedPatientInfo.pregnent || suspectedPatientInfo.pregnant || 'no',
            hhid: suspectedPatientInfo.hhid || '',
            hhheadname: suspectedPatientInfo.hhheadname || '',
            mobilenumber: suspectedPatientInfo.mobilenumber || '',
            patientidtype: suspectedPatientInfo.patientidtype || '',
            suspectedinthedisease: suspectedPatientInfo.suspectedinthedisease || 'no',
            disease: suspectedPatientInfo.suspecteddisease ? suspectedPatientInfo.suspecteddisease.split(' ').filter(Boolean) : [],
            nameofthepersonwithsuspectedcase: suspectedPatientInfo.nameofthepersonwithsuspectedcase || '',
            useridentification: suspectedPatientInfo.useridentification11994301976848561 || '',
            organization: healthWorkerInfo.organization || '',
            designation: healthWorkerInfo.designation1 || healthWorkerInfo.designation || '',
            nameofstaff: healthWorkerInfo.nameofstaff || '',
            referred: referralInfo.referred || 'no',
            referralplace: referralInfo.referralplace || '',
            ifreferredtogovt: referralInfo.ifreferredtogovt || '',
            bednetusepracticeduringsleep: healthBehaviour.bednetusepracticeduringsleep || 'no',
            handwashingpracticewithsoapwater: healthBehaviour.handwashingpracticewithsoapwater || 'no',
            typelatrineuse: healthBehaviour.typelatrineuse || '',
            presenceofmosquitolarvae: environmentInfo.presenceofmosquitolarvae || 'no',
            presenceofstagnantwatermosquitobreedingsites: environmentInfo.presenceofstagnantwatermosquitobreedingsites || 'no',
            didanydisasteroccurinlast7days: disasterInfo.didanydisasteroccurinlast7days || 'no',
            whattypes: disasterInfo.whattypes ? disasterInfo.whattypes.split(' ').filter(Boolean) : [],
            noofalreadydiagnosedcasesofdengueinthehh: Number(alreadyDiagnosed.noofalreadydiagnosedcasesofdengueinthehh1) || 0,
            noofalreadydiagnosedcasesofmalariainthehh: Number(alreadyDiagnosed.noofalreadydiagnosedcasesofmalariainthehh) || 0,
            noofalreadydiagnosedcasesofawdinthehh: Number(alreadyDiagnosed.noofalreadydiagnosedcasesofawdinthehh) || 0,
            date: direct.end ? direct.end.slice(0, 10) : direct.date || null,
            remarks: direct.remarks || '',
            location: locationStr,
            latitude,
            longitude
        };
    }
}





function extractHierarchy(submissions) {
    // For hierarchical filter dropdowns
    const divisions = [];
    const divisionToDistricts = {};
    const districtToUpazilas = {};
    const upazilaToUnions = {};
    const unionToWards = {};
    const wardToAreas = {};
    const allDistricts = [];
    const allUpazilas = [];
    const allUnions = [];
    const allWards = [];
    const allAreas = [];
    const organizations = [];
    const diseases = [];

    // FLATTEN allRows for filtering/charts
    const allRows = [];

    for (const x of submissions) {
        // Use robust flattening, skip if empty
        const row = flattenSubmission(x);
        if (!row) continue;

        // Populate hierarchies
        const { division, district, upazila, union, ward, area, organization, disease } = row;

        // Division to district
        if (division) {
            divisions.push(division);
            divisionToDistricts[division] = divisionToDistricts[division] || [];
            if (district) divisionToDistricts[division].push(district);
        }
        // District to upazila
        if (district) {
            allDistricts.push(district);
            districtToUpazilas[district] = districtToUpazilas[district] || [];
            if (upazila) districtToUpazilas[district].push(upazila);
        }
        // Upazila to union
        if (upazila) {
            allUpazilas.push(upazila);
            upazilaToUnions[upazila] = upazilaToUnions[upazila] || [];
            if (union) upazilaToUnions[upazila].push(union);
        }
        // Union to wards
        if (union) {
            allUnions.push(union);
            unionToWards[union] = unionToWards[union] || [];
            if (ward) unionToWards[union].push(ward);
        }
        // Ward to areas
        if (ward) {
            allWards.push(ward);
            wardToAreas[ward] = wardToAreas[ward] || [];
            if (area) wardToAreas[ward].push(area);
        }
        if (area) {
            allAreas.push(area);
        }
        // Organizations
        if (organization) organizations.push(organization);
        // Diseases (may be array)
        if (disease && Array.isArray(disease)) diseases.push(...disease);
        else if (disease) diseases.push(disease);

        allRows.push(row);
    }

    return {
        divisionOptions: getUnique(divisions),
        districtOptions: getUnique(allDistricts),
        upazilaOptions: getUnique(allUpazilas),
        unionOptions: getUnique(allUnions),
        wardOptions: getUnique(allWards),
        areaOptions: getUnique(allAreas),
        organizationOptions: getUnique(organizations),
        diseaseOptions: getUnique(diseases),
        divisionToDistricts: Object.fromEntries(
            Object.entries(divisionToDistricts).map(([k, v]) => [k, getUnique(v)])),
        districtToUpazilas: Object.fromEntries(
            Object.entries(districtToUpazilas).map(([k, v]) => [k, getUnique(v)])),
        upazilaToUnions: Object.fromEntries(
            Object.entries(upazilaToUnions).map(([k, v]) => [k, getUnique(v)])),
        unionToWards: Object.fromEntries(
            Object.entries(unionToWards).map(([k, v]) => [k, getUnique(v)])),
        wardToAreas: Object.fromEntries(
            Object.entries(wardToAreas).map(([k, v]) => [k, getUnique(v)])),
        allRows, // *** This is your flat, filterable DASHBOARD DATA ***
    };
}

// function PieCard({ title, data, colors }) {
//     return (
//         <DashboardCard title={title}>
//             <PieChart width={120} height={120}>
//                 <Pie
//                     data={data}
//                     cx={60} cy={60} innerRadius={35} outerRadius={50}
//                     dataKey="value"
//                     label={({ name, value }) => `${name} ${value}`}
//                 >
//                     {data.map((entry, index) =>
//                         <Cell key={index} fill={colors[index % colors.length]} />
//                     )}
//                 </Pie>
//                 <Tooltip />
//             </PieChart>
//         </DashboardCard>
//     );
// }


const DashboardCard = ({ title, stat, children, barColor = "#005fbe" }) => (
    <div className="rounded-md shadow border border-blue-800 flex flex-col w-full h-full bg-white overflow-hidden">
        {/* Colored Title Bar */}
        <div
            style={{ background: barColor }}
            className="px-3 py-2 flex items-center justify-between"
        >
            <h3 className="text-base font-bold text-white tracking-tight">
                {title}
            </h3>
            {stat && (
                <span className="text-sm font-semibold text-white opacity-90">
                    {stat}
                </span>
            )}
        </div>

        {/* Chart/Content Area */}
        <div className="flex-1 flex items-center justify-center w-full h-full min-h-[150px]">
            <div className="w-full h-full flex items-center justify-center">
                {children}
            </div>
        </div>
    </div>
);



function PieCard({ title, data, colors, stat }) {
    return (
        <DashboardCard title={title} stat={stat}>
            <div style={{ width: "100%", height: "130%", padding: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius="45%"
                            label={({ name, value }) => `${name} (${value})`}
                            labelLine={true}
                        >
                            {data.map((entry, index) => (
                                <Cell key={index} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </DashboardCard>
    );
}

function MultiPieCard({ title, data, colors, stat }) {
    return (
        <DashboardCard title={title} stat={stat}>
            <div className="flex flex-col items-center w-full h-full p-4">
                <div style={{ width: "100%", height: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                cx="50%"
                                cy="50%"
                                innerRadius={0}
                                outerRadius={40}
                                paddingAngle={2}
                                label={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={index} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs">
                    {data.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span>{`${entry.name} (${entry.value})`}</span>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardCard>
    );
}



// Bar chart card
function BarCard({ title, data, colors = ["#005fbe"], stat }) {
    return (
        <DashboardCard title={title} stat={stat}>
            <div style={{ width: "100%", height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 0, bottom: 10, left: 0 }}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value">
                            {data.map((entry, index) => (
                                <Cell key={index} fill={colors[index % colors.length]} />
                            ))}
                            <LabelList dataKey="value" position="top" className="text-xs fill-foreground" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </DashboardCard>
    );
}


function HorizontalBarCard({ title, data, colors = ["#005fbe"], stat }) {
    return (
        <DashboardCard title={title} stat={stat}>
            <div className="flex flex-col items-center w-full h-full p-4">
                <div style={{ width: "100%", height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                            barCategoryGap={15}
                        >
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis dataKey="name" type="category" width={0} tick={false} axisLine={false} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={28}>
                                {data.map((entry, index) => (
                                    <Cell key={index} fill={colors[index % colors.length]} />
                                ))}
                                <LabelList dataKey="value" position="insideRight" className="text-xs fill-white" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Labels */}
                <div className="flex flex-wrap justify-center gap-3 mt-3 text-sm">
                    {data.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1">
                            <span
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span className="text-[10px]">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardCard>
    );
}



function LineCard({ title, data, stat }) {
    return (
        <DashboardCard title={title} stat={stat}>
            <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        {/* <Legend /> */}
                        {/* Single line for your value */}
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 4, stroke: "#3b82f6", strokeWidth: 2, fill: "#fff" }}
                            activeDot={{ r: 6 }}
                        >
                            <LabelList
                                dataKey="value"
                                position="top"
                                className="text-xs fill-foreground"
                            />
                        </Line>
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </DashboardCard>
    );
}



function MarkerClusterLayer({ points }) {
    const map = useMap();

    React.useEffect(() => {
        const markerCluster = L.markerClusterGroup({
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                const size = 20 + Math.log(count) * 10;
                return L.divIcon({
                    html: `<div style="
                        background: rgba(255,78,46,0.6);
                        border: 2px solid #fff;
                        border-radius: 50%;
                        width:${size}px;
                        height:${size}px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#fff;
                        font-size:12px;
                        font-weight:bold;
                    ">${count}</div>`,
                    className: "custom-cluster-icon",
                    iconSize: [size, size],
                });
            },
        });

        points.forEach((pt) => {
            const radius = 4 + Math.log(Math.max(Number(pt.age) || 1, 1));
            const circleMarker = L.circleMarker([pt.lat, pt.lng], {
                radius,
                fillColor: "#ff4e2e",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.6,
            });

            // Add popup with details (table style)
            circleMarker.bindPopup(getPopupContent(pt));

            markerCluster.addLayer(circleMarker);
        });

        map.addLayer(markerCluster);

        return () => {
            map.removeLayer(markerCluster);
        };
    }, [map, points]);

    return null;
}


function PatientMap({ points }) {
    return (
        <MapContainer
            center={[23.75, 90.36]}
            zoom={7}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; OpenStreetMap contributors & CartoDB'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MarkerClusterLayer points={points} />
        </MapContainer>
    );
}

function getPopupContent(pt) {
    return `
    <div style="
      font-size:13px;
      min-width:220px;
      max-width:300px;
      max-height:200px; /* limit height */
      overflow-y:auto;  /* enable scroll */
      font-family: 'Segoe UI', Arial, sans-serif;
      color:#2b3e50;
    ">
      <table style="
        width:100%;
        border-collapse:collapse;
        border:1px solid #e0e6ed;
      ">
        <tbody>
          ${[
            ["Submission Date", pt.day || ""],
            ["Name", pt.name_of_the_person_with_suspected_case || "-"],
            ["Age", pt.age || "-"],
            ["Sex", pt.sex || "-"],
            ["Phone", pt.mobile_number || "-"],
            ["Disease(s)", Array.isArray(pt.disease) ? pt.disease.join(", ") : (pt.disease || "-")],
            ["Suspected", pt.suspected_in_the_disease || "-"],
            ["Division", pt.division || "-"],
            ["District", pt.district || "-"],
            ["Upazila", pt.upazila || "-"],
            ["Union", pt.union || "-"],
            ["Ward", pt.ward || "-"],
            ["Area", pt.area || "-"],
            ["Referral", pt.referred || "-"],
            ["Facility", pt.referral_place || "-"],
            ["Organization", pt.organization || "-"],
        ]
            .map(
                ([label, value], i) => `
                <tr style="background:${i % 2 === 0 ? "#f9fbfd" : "#ffffff"};">
                  <td style="
                    padding:6px 8px;
                    font-weight:600;
                    color:#4a6572;
                    border-bottom:1px solid #e0e6ed;
                    width:40%;
                  ">${label}:</td>
                  <td style="
                    padding:6px 8px;
                    border-bottom:1px solid #e0e6ed;
                    word-wrap:break-word;
                  ">${value}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}


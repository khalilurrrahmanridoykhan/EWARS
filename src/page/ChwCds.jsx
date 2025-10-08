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
import { FiFilter } from "react-icons/fi";

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
    const [collapsed, setCollapsed] = useState(true);

    const [showFilter, setShowFilter] = useState(false);
    const [mapFilterState, setMapFilterState] = useState({});

    const [fetching, setFetching] = useState(false);



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


    console.log("all data :", h)


    // On data load, select everything by default
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
    }, [h]);


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

    console.log("slected diease 😒😒😍", selectedDiseases)

    useEffect(() => {
        if (!h || !h.allRows) {
            setFilteredSubmissions([]);
            return;
        }
        const [start, end] = dateRange;
        let filtered = h.allRows.filter(row =>
            (selectedDivisions.length === 0 || selectedDivisions.includes(row.division)) &&
            (selectedDistricts.length === 0 || selectedDistricts.includes(row.district)) &&
            (selectedUpazilas.length === 0 || selectedUpazilas.includes(row.upazila)) &&
            (selectedUnions.length === 0 || selectedUnions.includes(row.union)) &&
            (selectedWards.length === 0 || selectedWards.includes(row.ward)) &&
            (selectedAreas.length === 0 || selectedAreas.includes(row.area)) &&
            (selectedOrganizations.length === 0 || selectedOrganizations.some(o =>
                row.organization && o.trim().toLowerCase() === row.organization.trim().toLowerCase()
            )) &&
            (!start || row.day >= start) &&
            (!end || row.day <= end)
        );

        console.log("ssssssssssssssssss🙌🙌", filtered)

        if (selectedDiseases.length > 0) {
            filtered = filtered.filter(row => {
                if (Array.isArray(row.disease)) {
                    return row.disease.some(d =>
                        selectedDiseases.some(s =>
                            d && s && d.trim().toLowerCase() === s.trim().toLowerCase()
                        )
                    );
                } else {
                    return selectedDiseases.some(s =>
                        row.disease && s && row.disease.trim().toLowerCase() === s.trim().toLowerCase()
                    );
                }
            });
        }

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

        function formatLabel(label) {
            return label
                .replace(/_/g, " ")                // replace underscores with spaces
                .replace(/\b\w/g, c => c.toUpperCase()); // capitalize each word
        }

        // Submissions Over Time (Line Chart)
        const submissionsPerDay = {};
        submissions.forEach(row => {
            const day = row.day || row.date;
            if (!day) return;
            submissionsPerDay[day] = (submissionsPerDay[day] || 0) + 1;
        });
        const submissionsOverTime = Object.keys(submissionsPerDay)
            .sort()
            .map(day => ({ name: day, value: submissionsPerDay[day] }));

        // Suspected Ratio Pie
        let suspected = 0, notSuspected = 0, suspectedOther = 0;
        submissions.forEach(x => {
            if (x.suspectedinthedisease === "yes") suspected++;
            else if (x.suspectedinthedisease === "no") notSuspected++;
            else suspectedOther++;
        });
        const suspectedRatioPieBackend = [
            { name: "Suspected", value: suspected },
            { name: "Not Suspected", value: notSuspected },
            { name: "Other", value: suspectedOther }
        ];
        const suspectedRatioPie = suspectedRatioPieBackend.filter(d => d.name !== "Other");

        // Suspected Disease Count Bar
        const diseaseCounts = {};
        submissions.forEach(x => {
            if (Array.isArray(x.disease)) x.disease.forEach(d => {
                diseaseCounts[d] = (diseaseCounts[d] || 0) + 1;
            });
            else if (x.disease) diseaseCounts[x.disease] = (diseaseCounts[x.disease] || 0) + 1;
        });
        const suspectedDiseaseBar = Object.entries(diseaseCounts)
            .map(([disease, count]) => ({
                name: formatLabel(disease),
                value: count
            }));

        // Referral Rate Pie
        let referredYes = 0, referredNo = 0, referredOther = 0;
        submissions.forEach(x => {
            if (x.referred === "yes") referredYes++;
            else if (x.referred === "no") referredNo++;
            else referredOther++;
        });
        const referralRatePieBackend = [
            { name: "Yes", value: referredYes },
            { name: "No", value: referredNo },
            { name: "Other", value: referredOther }
        ];
        const referralRatePie = referralRatePieBackend.filter(d => d.name !== "Other");

        // Facility Type Pie: combine web ('referralplace'/'referral_place') and mobile ('organization')
        const facilityTypeCounts = {};
        submissions.forEach(x => {
            let refPlace = x.referralplace || x.referral_place || "";
            let org = (x.organization || "").toLowerCase();
            if (!refPlace && org) { // mobile
                refPlace = org === "govt" ? "Govt" : (org === "brac" ? "BRAC" : org);
            }
            refPlace = normalizeFacility(refPlace);
            if (refPlace === "Govt" || refPlace === "BRAC" || refPlace === "Private") {
                facilityTypeCounts[refPlace] = (facilityTypeCounts[refPlace] || 0) + 1;
            }
        });
        const facilityTypePie = Object.entries(facilityTypeCounts).map(([name, value]) => ({ name, value }));

        // Gender Pie
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
            { name: "Pregnant", value: pregnant }
        ];

        // Bednet Pie
        let bednetYes = 0, bednetNo = 0, bednetOther = 0;
        submissions.forEach(x => {
            if (x.bednetusepracticeduringsleep === "yes") bednetYes++;
            else if (x.bednetusepracticeduringsleep === "no") bednetNo++;
            else bednetOther++;
        });
        const bednetPieBackend = [
            { name: "Yes", value: bednetYes },
            { name: "No", value: bednetNo },
            { name: "Other", value: bednetOther }
        ];
        const bednetPie = bednetPieBackend.filter(d => d.name !== "Other");

        // Handwashing Pie
        let washYes = 0, washNo = 0, washOther = 0;
        submissions.forEach(x => {
            if (x.handwashingpracticewithsoapwater === "yes") washYes++;
            else if (x.handwashingpracticewithsoapwater === "no") washNo++;
            else washOther++;
        });
        const washPieBackend = [
            { name: "Yes", value: washYes },
            { name: "No", value: washNo },
            { name: "Other", value: washOther }
        ];
        const washPie = washPieBackend.filter(d => d.name !== "Other");

        // Mosquito Breeding Pie
        let breedYes = 0, breedNo = 0, breedOther = 0;
        submissions.forEach(x => {
            if (x.presenceofstagnantwatermosquitobreedingsites === "yes") breedYes++;
            else if (x.presenceofstagnantwatermosquitobreedingsites === "no") breedNo++;
            else breedOther++;
        });
        const mosquitoBreedPieBackend = [
            { name: "Yes", value: breedYes },
            { name: "No", value: breedNo },
            { name: "Other", value: breedOther }
        ];
        const mosquitoBreedPie = mosquitoBreedPieBackend.filter(d => d.name !== "Other");

        // Mosquito Larvae Pie
        let larvaeYes = 0, larvaeNo = 0, larvaeOther = 0;
        submissions.forEach(x => {
            if (x.presenceofmosquitolarvae === "yes" || x.presenceofmosquitolarvae === "aedes" || x.presenceofmosquitolarvae === "others") larvaeYes++;
            else if (x.presenceofmosquitolarvae === "no") larvaeNo++;
            else larvaeOther++;
        });
        const mosquitoLarvaePieBackend = [
            { name: "Yes", value: larvaeYes },
            { name: "No", value: larvaeNo },
            { name: "Other", value: larvaeOther }
        ];
        const mosquitoLarvaePie = mosquitoLarvaePieBackend.filter(d => d.name !== "Other");

        // Disaster in Last Week Pie
        let disasterYes = 0, disasterNo = 0, disasterOther = 0;
        submissions.forEach(x => {
            if (x.didanydisasteroccurinlast7days === "yes") disasterYes++;
            else if (x.didanydisasteroccurinlast7days === "no") disasterNo++;
            else disasterOther++;
        });
        const disasterWeekPieBackend = [
            { name: "Yes", value: disasterYes },
            { name: "No", value: disasterNo },
            { name: "Other", value: disasterOther }
        ];
        const disasterWeekPie = disasterWeekPieBackend.filter(d => d.name !== "Other");

        // Latrine Type Bar
        const latrineTypes = {};
        submissions.forEach(x => {
            if (x.typelatrineuse) latrineTypes[x.typelatrineuse] = (latrineTypes[x.typelatrineuse] || 0) + 1;
        });
        const latrineBar = Object.entries(latrineTypes).map(([name, value]) => ({
            name: formatLabel(name),
            value
        }));

        // Disaster Type Bar
        const disasterTypes = {};
        submissions.forEach(x => {
            const types = Array.isArray(x.whattypes)
                ? x.whattypes
                : (typeof x.whattypes === "string" ? x.whattypes.split(" ").filter(Boolean) : []);
            types.forEach(type => {
                if (type) disasterTypes[type] = (disasterTypes[type] || 0) + 1;
            });
        });
        const disasterTypeBar = Object.entries(disasterTypes).map(([name, value]) => ({
            name: formatLabel(name),
            value
        }));

        // NEW: Referral to Govt Facility (horizontal bar)
        const govtFacilityTypes = {};
        submissions.forEach(x => {
            let isGovt = false;
            // Mobile (organization), Web (referralplace/referral_place)
            if ((x.organization && x.organization.toLowerCase() === "govt") || normalizeFacility(x.referralplace || x.referral_place) === "Govt") {
                isGovt = true;
            }
            if (isGovt && x.ifreferredtogovt && typeof x.ifreferredtogovt === "string") {
                govtFacilityTypes[x.ifreferredtogovt] = (govtFacilityTypes[x.ifreferredtogovt] || 0) + 1;
            }
        });
        const govtFacilityBar = Object.entries(govtFacilityTypes).map(([name, value]) => ({ name, value }));

        // MAP data fix
        const mapMarkers = submissions
            .filter(x => typeof x.latitude === "number" && typeof x.longitude === "number")
            .map(x => ({
                lat: x.latitude,
                lng: x.longitude,
                info: x
            }));

        return {
            submissionsOverTime,
            suspectedRatioPie,
            suspectedRatioPieBackend,
            referralRatePie,
            referralRatePieBackend,
            genderPie,
            facilityTypePie,
            bednetPie,
            bednetPieBackend,
            washPie,
            washPieBackend,
            mosquitoBreedPie,
            mosquitoBreedPieBackend,
            mosquitoLarvaePie,
            mosquitoLarvaePieBackend,
            disasterWeekPie,
            disasterWeekPieBackend,
            suspectedDiseaseBar,
            latrineBar,
            disasterTypeBar,
            govtFacilityBar,
            totalSubmissions: submissions.length,
            percentSuspected: Math.round(100 * suspected / ((suspected + notSuspected) || 1)),
            referralRate: Math.round(100 * referredYes / ((referredYes + referredNo) || 1)),
            bednetPercent: Math.round(100 * bednetYes / ((bednetYes + bednetNo) || 1)),
            handwashPercent: Math.round(100 * washYes / ((washYes + washNo) || 1)),
            mosquitoBreedPercent: Math.round(100 * breedYes / ((breedYes + breedNo) || 1)),
            mosquitoLarvaePercent: Math.round(100 * larvaeYes / ((larvaeYes + larvaeNo) || 1)),
            disasterWeekPercent: Math.round(100 * disasterYes / ((disasterYes + disasterNo) || 1)),
            mapMarkers
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


    const mapPoints = filteredSubmissions
        .filter(row => isValidLatLng(row.latitude, row.longitude));

    useEffect(() => {
        setSelectedDiseases(prev => {
            // if there was no previous selection, select all options
            if (!prev.length && diseaseOptions.length) return diseaseOptions;
            // otherwise, add any new options that appeared
            const addedOptions = diseaseOptions.filter(option => !prev.includes(option));
            return [...prev, ...addedOptions];
        });
    }, [diseaseOptions]);


    const filterFields = [
        { key: "organization", label: "Organization" },
        { key: "bednetusepracticeduringsleep", label: "Bednet Use" },
        { key: "didanydisasteroccurinlast7days", label: "Disaster Last 7 Days" },
        { key: "presenceofmosquitolarvae", label: "Mosquito Larvae" },
        { key: "sex", label: "Gender" },
        { key: "preg", label: "Pregnant" },
        { key: "disease", label: "Disease" }
    ];

    // ---- Filtered Map Points ----
    const filteredMapPoints = useMemo(() =>
        filteredSubmissions.filter(row =>
            filterFields.every(
                f =>
                    !mapFilterState[f.key] ||
                    (Array.isArray(row[f.key])
                        ? row[f.key].includes(mapFilterState[f.key])
                        : row[f.key] === mapFilterState[f.key])
            ) &&
            isValidLatLng(row.latitude, row.longitude)
        ),
        [filteredSubmissions, mapFilterState, filterFields]
    );

    console.log("filteredMapPoints", filteredMapPoints);

    // Helper function
    function isValidLatLng(lat, lng) {
        return (
            typeof lat === "number" &&
            typeof lng === "number" &&
            !isNaN(lat) && !isNaN(lng) &&
            isFinite(lat) && isFinite(lng) &&
            Math.abs(lat) <= 90 && Math.abs(lng) <= 180
        );
    }



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

    console.log("Filtered data count:", filteredSubmissions.length);

    async function handleGenerateReport() {
        setFetching(true)
        try {
            const response = await axios.post(
                'https://ewars-mails.onrender.com/generate-chw-xlsx',
                {
                    chwName: "Community Disease Surveillance",
                    ward: (selectedWards || []).join(', '),
                    union: (selectedUnions || []).join(', '),
                    upazila: (selectedUpazilas || []).join(', '),
                    district: (selectedDistricts || []).join(', '),
                    submissions: filteredSubmissions
                },
                { responseType: 'blob' }
            );

            const href = URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = href;

            const now = new Date();
            const month = new Intl.DateTimeFormat('en', { month: 'long' }).format(now).toLowerCase();
            const day = now.getDate();           // e.g., 22  (no leading zero)
            const year = now.getFullYear();      // e.g., 2025
            const stamp = `${day}_${month}_${year}`;

            a.download = `CHW_Disease_Surveillance_Report_${stamp}.xlsx`;

            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(href);
        } catch (err) {
            const msg = err?.response
                ? await err.response.data?.text?.() || err.response.statusText
                : String(err);
            console.error('Failed to download XLSX report:', msg);
            alert('Failed to generate/download XLSX file.');
        }
        finally { setFetching(false) }
    }


    return (
        <div className='md:mx-2 mb-8'>
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
                        <p className="font-medium text-gray-700 text-[14px]">Date range</p>
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

                    <button
                        disabled={fetching}
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
                        {fetching ? (
                            <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span>Download report</span>
                        )}
                    </button>

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

                <HorizontalBarCard
                    title="Suspected Disease Count"
                    data={metrics.suspectedDiseaseBar.filter(d => d.name !== "Not Suspected")}
                    colors={["#FF6361", "#3296FA", "#60B76D"]}
                    stat={metrics.suspectedDiseaseBar
                        .filter(d => d.name !== "Not Suspected")
                        .reduce((sum, d) => sum + d.value, 0)}
                />


                <PieCard
                    title="Referral Rate"
                    data={metrics.referralRatePie}
                    colors={["#005fbe", "#FF6361"]}
                    stat={`${metrics.referralRate}%`}
                />




                <div className="row-span-2 md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2">
                    <DashboardCard title="Map">
                        <div className="relative w-full h-full min-h-[350px]">
                            {/* Floating filter button */}
                            <button
                                onClick={() => setShowFilter(prev => !prev)}
                                className="absolute cursor-pointer bottom-4 left-4 z-[1200] bg-white border border-gray-200 rounded-lg px-3 py-1.5 
                   text-xs font-medium shadow-md hover:shadow-lg transition flex items-center gap-1"
                            >
                                <FiFilter className="text-gray-600 text-sm" />
                                Filter Map
                            </button>

                            {/* The actual map */}
                            <PatientMap points={filteredMapPoints} />

                            {/* Layer control filter modal */}
                            {showFilter && (
                                <div
                                    className="absolute bottom-16 left-6 z-[1500] bg-white rounded-lg shadow-xl 
                     p-3 w-[200px] max-h-[60%] overflow-y-auto border border-gray-100"
                                >
                                    <h3 className="flex items-center gap-1 font-medium text-xs text-gray-700 mb-2">
                                        <FiFilter className="text-gray-500 text-sm" />
                                        Questions Filter
                                    </h3>

                                    {filterFields.map((f) => (
                                        <div className="mb-2" key={f.key}>
                                            <label className="text-[11px] font-medium text-gray-600">{f.label}</label>
                                            {f.key === "facility" ? (
                                                <select
                                                    className="mt-0.5 block w-full rounded-md border border-gray-300 bg-gray-50 text-[11px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                    value={mapFilterState.facility || ""}
                                                    onChange={e => setMapFilterState(prev => ({ ...prev, facility: e.target.value }))}
                                                >
                                                    <option value="">All</option>
                                                    {getFacilityFilterOptions(filteredSubmissions).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <select
                                                    className="mt-0.5 block w-full rounded-md border border-gray-300 bg-gray-50 text-[11px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                    value={mapFilterState[f.key] || ""}
                                                    onChange={e => setMapFilterState(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                >
                                                    <option value="">All</option>
                                                    {getOptions(filteredSubmissions, f.key).map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    ))}


                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={() => setShowFilter(false)}
                                            className="bg-red-500 hover:bg-red-600 text-white text-[11px] font-medium 
                         px-2 py-1 rounded-md transition"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DashboardCard>
                </div>

                <MultiPieCard
                    title="Gender Distribution"
                    data={metrics.genderPie}
                    colors={["#3296FA", "#FF6361", "#C50080"]}
                    stat={metrics.genderPie.reduce((sum, d) => sum + d.value, 0)}
                />

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


                <PieCard
                    title="Handwashing Facilities"
                    data={metrics.washPie}
                    colors={["#FF6361", "#005fbe", "#d9534f"]}
                    stat={`${metrics.handwashPercent}%`}
                />
                <div className="row-span-1 md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1">
                    <HorizontalBarCard
                        title="Latrine Type"
                        data={metrics.latrineBar}
                        colors={["#3296FA", "#60B76D", "#FFB300", "#FF6361", "#9B59B6"]}
                        stat={metrics.latrineBar.reduce((sum, d) => sum + d.value, 0)}
                    />
                </div>




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


                <div className="row-span-1 md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1">
                    <HorizontalBarCard
                        title="Disaster Types"
                        data={metrics.disasterTypeBar}
                        colors={["#FFB300", "#FF6361", "#3296FA", "#60B76D", "#9B59B6", "#E67E22"]}
                        stat={metrics.disasterTypeBar.reduce((sum, d) => sum + d.value, 0)}
                    />
                </div>

                <PieCard
                    title="Disaster Occurance "
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

    // Detect mobile-style submission (flat)
    const isMobileSubmission = direct.hasOwnProperty('_id') && direct._id === 'form_1079';

    if (isMobileSubmission) {
        // Parse latitude/longitude from location string
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
            mobilenumber: direct.mobile_number || '',
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
            day: direct.end ? direct.end.slice(0, 10) : direct.date || null,
            remarks: direct.remarks || '',
            location: direct.location || '',
            latitude,
            longitude
        };
    } else {
        // Enketo web (nested)
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
            day: direct.end ? direct.end.slice(0, 10) : direct.date || null,
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
        if (
            row.suspectedinthedisease === "no" ||
            row.suspected_in_the_disease === "no"
        ) {
            row.disease = "Not Suspected";
        }
        allRows.push(row);

    }

    console.log("All data count: ✔✔✔✔✔✔✔✔✔✔✔✔✔", allRows.length);

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
                            <span className="text-[12px]">{entry.name}</span>
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

function isValidLatLng(lat, lng) {
    return (
        typeof lat === "number" &&
        typeof lng === "number" &&
        !isNaN(lat) && !isNaN(lng) &&
        isFinite(lat) && isFinite(lng) &&
        Math.abs(lat) <= 90 && Math.abs(lng) <= 180
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

        points
            .filter(pt => isValidLatLng(pt.latitude, pt.longitude))
            .forEach((pt) => {
                const radius = 4 + Math.log(Math.max(Number(pt.age) || 1, 1));
                const circleMarker = L.circleMarker([pt.latitude, pt.longitude], {
                    radius,
                    fillColor: "#ff4e2e",
                    color: "#fff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.6,
                });
                circleMarker.bindPopup(getPopupContent(pt));
                markerCluster.addLayer(circleMarker);
            });

        map.addLayer(markerCluster);
        return () => { map.removeLayer(markerCluster); }
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
      max-width:350px;
      max-height:230px;
      overflow-y:auto;
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
            ["Submission Date", pt.day || "-"],
            ["Name (Suspected Case)", pt.nameofthepersonwithsuspectedcase || "-"],
            ["Age", pt.age || "-"],
            ["Sex", pt.sex || "-"],
            ["Pregnant?", pt.preg || "-"],
            ["Phone", pt.mobilenumber || "-"],
            ["Disease(s)", Array.isArray(pt.disease) ? pt.disease.join(", ") : (pt.disease || "-")],
            ["Suspected Disease?", pt.suspectedinthedisease || "-"],

            ["Division", pt.division || "-"],
            ["District", pt.district || "-"],
            ["Upazila", pt.upazila || "-"],
            ["Union", pt.union || "-"],
            ["Ward", pt.ward || "-"],
            ["Area", pt.area || "-"],

            ["Household ID", pt.hhid || "-"],
            ["Household Head", pt.hhheadname || "-"],
            ["Patient ID Type", pt.patientidtype || "-"],

            ["Referred?", pt.referred || "-"],
            ["Referral Place", normalizeFacility(pt.referralplace)],
            ["If referred to govt", pt.ifreferredtogovt || "-"],

            ["Organization", pt.organization || "-"],
            ["Designation", pt.designation || "-"],
            ["Staff Name", pt.nameofstaff || "-"],

            ["Bednet Use During Sleep?", pt.bednetusepracticeduringsleep || "-"],
            ["Handwashing Practice?", pt.handwashingpracticewithsoapwater || "-"],
            ["Latrine Type", pt.typelatrineuse || "-"],
            ["Mosquito Larvae", pt.presenceofmosquitolarvae || "-"],
            ["Stagnant Water Breeding?", pt.presenceofstagnantwatermosquitobreedingsites || "-"],

            ["Disaster Last 7 Days?", pt.didanydisasteroccurinlast7days || "-"],
            ["Disaster Type(s)", Array.isArray(pt.whattypes) ? pt.whattypes.join(", ") : (pt.whattypes || "-")],

            // ["Diagnosed Dengue", pt.noofalreadydiagnosedcasesofdengueinthehh ?? "-"],
            // ["Diagnosed Malaria", pt.noofalreadydiagnosedcasesofmalariainthehh ?? "-"],
            // ["Diagnosed AWD", pt.noofalreadydiagnosedcasesofawdinthehh ?? "-"],
            ["Date", pt.date || "-"],
            ["Remarks", pt.remarks || "-"],
        ].map(
            ([label, value], i) => `
                <tr style="background:${i % 2 === 0 ? "#f9fbfd" : "#ffffff"};">
                  <td style="
                    padding:6px 8px;
                    font-weight:600;
                    color:#4a6572;
                    border-bottom:1px solid #e0e6ed;
                    width:44%;
                  ">${label}:</td>
                  <td style="
                    padding:6px 8px;
                    border-bottom:1px solid #e0e6ed;
                    word-wrap:break-word;
                  ">${value}</td>
                </tr>`
        ).join("")}
        </tbody>
      </table>
    </div>
    `;
}


function normalizeFacility(raw) {
    if (!raw) return "-";
    const v = raw.toLowerCase();
    if (
        [
            "govt",
            "government",
            "community_clinic",
            "upazila_health_complex",
            "union_sub-centre",
            "district_hospital",
            "medical_college_hospital"
        ].some(x => v.includes(x))
    ) return "Govt";
    if (v.includes("brac")) return "BRAC";
    if (v.includes("priv") || v.includes("private")) return "Private";
    return raw;
}


function getFacilityFilterOptions(rows) {
    const found = new Set();
    rows.forEach(row => {
        // Mobile submission: organization field
        if (row.organization) {
            const val = row.organization.toLowerCase();
            if (val === "govt" || val === "government") found.add("Govt");
            if (val === "brac") found.add("BRAC");
            if (val.includes("priv")) found.add("Private");
        }
        // Enketo/web: referralplace field
        if (row.referralplace) {
            const val = row.referralplace.toLowerCase();
            if (val === "govt" || val === "government") found.add("Govt");
            if (val === "brac") found.add("BRAC");
            if (val.includes("priv")) found.add("Private");
        }
    });
    return Array.from(found);
}


function getOptions(rows, field) {
    const opts = new Set();
    rows.forEach(row => {
        const val = row[field];
        if (Array.isArray(val)) val.forEach(v => v && opts.add(v));
        else if (val) opts.add(val);
    });
    return Array.from(opts);
}

function MapFilterModal({ allRows, filterFields, filterState, setFilterState, onClose }) {
    const filterOptions = useMemo(() => {
        const opts = {};
        filterFields.forEach(f => {
            opts[f.key] = getOptions(allRows, f.key);
        });
        return opts;
    }, [allRows, filterFields]);

    function handleChange(field, value) {
        setFilterState(prev => ({ ...prev, [field]: value }));
    }

    return (
        <div style={{
            position: "fixed",
            bottom: 60,
            left: 30,
            zIndex: 1500,
            background: "white",
            padding: "18px",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            minWidth: "240px"
        }}>
            <strong>Map Filter</strong>
            {filterFields.map(f => (
                <div style={{ margin: "8px 0" }} key={f.key}>
                    <label style={{ fontSize: "14px" }}>{f.label}</label>
                    <select
                        style={{ width: "100%", marginTop: "3px", fontSize: "13.5px", background: "#F3F6F9" }}
                        value={filterState[f.key] || ""}
                        onChange={e => handleChange(f.key, e.target.value)}
                    >
                        <option value="">All</option>
                        {filterOptions[f.key].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            ))}
            <div style={{ textAlign: "right", marginTop: "16px" }}>
                <button onClick={onClose}
                    style={{
                        background: "#ff4e2e", color: "#fff", border: 0, borderRadius: "4px",
                        padding: "4px 12px", fontWeight: "bold"
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
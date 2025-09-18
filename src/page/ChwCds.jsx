import HierarchicalMultiSelect from "@/components/HierarchicalMultiSelect";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  CartesianGrid,
  Brush,
} from "recharts";

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

  console.log("alldata", allData);
  console.log("filteredSubmissions", filteredSubmissions);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = "99ec6798774163378a643c723acfa31bb3415220";
        const response = await axios.get(
          "https://admin2.commicplan.com/api/api/forms/1079/",
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
        setAllData(response.data);
        console.log("fetched data", response.data);
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
      autoChainSelect(
        selectedDivisions,
        h.divisionToDistricts,
        selectedDistricts
      )
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
      districtOptions.filter((dis) =>
        next.some((div) => h.divisionToDistricts[div]?.includes(dis))
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
      upazilaOptions.filter((upa) =>
        next.some((dis) => h.districtToUpazilas[dis]?.includes(upa))
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
      unionOptions.filter((uni) =>
        next.some((upa) => h.upazilaToUnions[upa]?.includes(uni))
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
      wardOptions.filter((war) =>
        next.some((uni) => h.unionToWards[uni]?.includes(war))
      )
    );
    setSelectedAreas([]);
    setSelectedOrganizations([]);
    setSelectedDiseases([]);
  }

  function handleWardChange(next) {
    setSelectedWards(next);
    setSelectedAreas(
      areaOptions.filter((area) =>
        next.some((war) => h.wardToAreas[war]?.includes(area))
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

  const divisionOptions = useMemo(
    () =>
      h && h.allRows ? filterOptions(h.allRows, ["division"], filterState) : [],
    [h, filterState]
  );

  const districtOptions = useMemo(
    () =>
      h && h.allRows
        ? filterOptions(h.allRows, ["division", "district"], filterState)
        : [],
    [h, filterState]
  );

  const upazilaOptions = useMemo(
    () =>
      h && h.allRows
        ? filterOptions(
            h.allRows,
            ["division", "district", "upazila"],
            filterState
          )
        : [],
    [h, filterState]
  );

  const unionOptions = useMemo(
    () =>
      h && h.allRows
        ? filterOptions(
            h.allRows,
            ["division", "district", "upazila", "union"],
            filterState
          )
        : [],
    [h, filterState]
  );

  const wardOptions = useMemo(
    () =>
      h && h.allRows
        ? filterOptions(
            h.allRows,
            ["division", "district", "upazila", "union", "ward"],
            filterState
          )
        : [],
    [h, filterState]
  );

  const areaOptions = useMemo(
    () =>
      h && h.allRows
        ? filterOptions(
            h.allRows,
            ["division", "district", "upazila", "union", "ward", "area"],
            filterState
          )
        : [],
    [h, filterState]
  );

  const filteredRows = useMemo(
    () =>
      h && h.allRows
        ? // Only show rows for which ALL NOT-EMPTY filters match
          h.allRows.filter(
            (row) =>
              (!selectedDivisions.length ||
                !row.division ||
                selectedDivisions.includes(row.division)) &&
              (!selectedDistricts.length ||
                !row.district ||
                selectedDistricts.includes(row.district)) &&
              (!selectedUpazilas.length ||
                !row.upazila ||
                selectedUpazilas.includes(row.upazila)) &&
              (!selectedUnions.length ||
                !row.union ||
                selectedUnions.includes(row.union)) &&
              (!selectedWards.length ||
                !row.ward ||
                selectedWards.includes(row.ward)) &&
              (!selectedAreas.length ||
                !row.area ||
                selectedAreas.includes(row.area))
          )
        : [],
    [
      h,
      selectedDivisions,
      selectedDistricts,
      selectedUpazilas,
      selectedUnions,
      selectedWards,
      selectedAreas,
    ]
  );

  const organizationOptions = useMemo(
    () =>
      filteredRows.length > 0
        ? getUnique(filteredRows.map((row) => row.organization).filter(Boolean))
        : [],
    [filteredRows]
  );

  const diseaseOptions = useMemo(
    () =>
      filteredRows.length > 0
        ? getUnique(filteredRows.flatMap((row) => row.disease).filter(Boolean))
        : [],
    [filteredRows]
  );

  useEffect(() => {
    // Only auto-select if the options list actually changed (new options)
    setSelectedOrganizations((prev) =>
      organizationOptions.length && !prev.length
        ? organizationOptions
        : prev.filter((v) => organizationOptions.includes(v))
    );
  }, [organizationOptions]);

  // Auto-select all visible disease options
  useEffect(() => {
    setSelectedDiseases((prev) =>
      diseaseOptions.length && !prev.length
        ? diseaseOptions
        : prev.filter((v) => diseaseOptions.includes(v))
    );
  }, [diseaseOptions]);

  useEffect(() => {
    if (!h || !h.allRows) {
      setFilteredSubmissions([]);
      return;
    }
    const [start, end] = dateRange;
    const filtered = h.allRows.filter((row) => {
      const diseases = Array.isArray(row.disease)
        ? row.disease
        : row.disease
        ? [row.disease]
        : [];
      return (
        (!selectedDivisions.length ||
          !row.division ||
          selectedDivisions.includes(row.division)) &&
        (!selectedDistricts.length ||
          !row.district ||
          selectedDistricts.includes(row.district)) &&
        (!selectedUpazilas.length ||
          !row.upazila ||
          selectedUpazilas.includes(row.upazila)) &&
        (!selectedUnions.length ||
          !row.union ||
          selectedUnions.includes(row.union)) &&
        (!selectedWards.length ||
          !row.ward ||
          selectedWards.includes(row.ward)) &&
        (!selectedAreas.length ||
          !row.area ||
          selectedAreas.includes(row.area)) &&
        (!selectedOrganizations.length ||
          !row.organization ||
          selectedOrganizations.includes(row.organization)) &&
        (!selectedDiseases.length ||
          !diseases.length ||
          diseases.some((d) => selectedDiseases.includes(d))) &&
        (!start || !row.day || row.day >= start) &&
        (!end || !row.day || row.day <= end)
      );
    });
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
    dateRange,
  ]);

  // // Find available min/max dates from raw data
  // const minDay = useMemo(() => {
  //     if (!h || !h.allRows || !h.allRows.length) return null;
  //     return h.allRows
  //         .map(x => x.date)
  //         .filter(Boolean)
  //         .sort()[0];
  // }, [h]);

  // const maxDay = useMemo(() => {
  //     if (!h || !h.allRows || !h.allRows.length) return null;
  //     return h.allRows
  //         .map(x => x.date)
  //         .filter(Boolean)
  //         .sort()
  //         .slice(-1)[0];
  // }, [h]);

  const allDays = useMemo(
    () =>
      h && h.allRows
        ? getUnique(h.allRows.map((x) => x.day).filter(Boolean)).sort()
        : [],
    [h]
  );

  const minDay = allDays[0];
  const maxDay = allDays[allDays.length - 1];

  // Enforce clamping on setDateRange
  const clampDate = (d, minD, maxD) => (d < minD ? minD : d > maxD ? maxD : d);

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
    const normalize = (value) =>
      typeof value === "string" ? value.trim().toLowerCase() : value;

    // Line chart: submissions over time
    const submissionsPerDay = {};
    submissions.forEach((row) => {
      const dayKey = row.day;
      if (!dayKey) return;
      submissionsPerDay[dayKey] = (submissionsPerDay[dayKey] || 0) + 1;
    });
    const submissionsOverTime = Object.keys(submissionsPerDay)
      .sort()
      .map((day) => ({ name: day, value: submissionsPerDay[day] }));

    // Suspected Ratio: Pie and Count
    let suspected = 0,
      notSuspected = 0;
    submissions.forEach((x) => {
      const suspectedVal = normalize(
        x.suspected_in_the_disease ||
          x.suspected_in_the_disease_yn ||
          x.suspected_in_the_disease_yn_new
      );
      if (suspectedVal === "yes") suspected++;
      else if (suspectedVal === "no") notSuspected++;
    });

    // Suspected disease counts (bar)
    const diseaseCounts = {};
    submissions.forEach((x) => {
      const diseases = Array.isArray(x.disease)
        ? x.disease
        : toArray(x.disease);
      diseases
        .map((d) => (typeof d === "string" ? d.trim() : d))
        .filter(Boolean)
        .forEach((d) => {
          diseaseCounts[d] = (diseaseCounts[d] || 0) + 1;
        });
    });
    const suspectedDiseaseBar = Object.entries(diseaseCounts).map(
      ([disease, count]) => ({ name: disease, value: count })
    );

    // Referral Rate (pie)
    let referredYes = 0,
      referredNo = 0;
    submissions.forEach((x) => {
      const referredVal = normalize(x.referred || x.referral || x.referred_new);
      if (referredVal === "yes") referredYes++;
      else if (referredVal === "no") referredNo++;
    });

    // Referral facility type (pie)
    const facilityTypeCounts = {};
    submissions.forEach((x) => {
      const facility =
        typeof x.referral_place === "string"
          ? x.referral_place.trim()
          : x.referral_place;
      if (facility)
        facilityTypeCounts[facility] = (facilityTypeCounts[facility] || 0) + 1;
    });
    const facilityTypePie = Object.entries(facilityTypeCounts).map(
      ([name, value]) => ({ name, value })
    );

    // Gender counts (pie)
    let male = 0,
      female = 0,
      other = 0,
      pregnant = 0;
    submissions.forEach((x) => {
      const sex = normalize(x.sex);
      if (sex === "male") male++;
      else if (sex === "female") female++;
      else if (sex) other++;

      const pregVal = normalize(x.pregnent || x.pregnant);
      if (pregVal === "yes") pregnant++;
    });

    // Bednet use (pie)
    let bednetYes = 0,
      bednetNo = 0;
    submissions.forEach((x) => {
      const val = normalize(x.bed_net_use_practice_during_sleep);
      if (val === "yes") bednetYes++;
      else if (val === "no") bednetNo++;
    });

    // Handwashing (pie)
    let washYes = 0,
      washNo = 0;
    submissions.forEach((x) => {
      const val = normalize(x.handwashing_practice_with_soap__water);
      if (val === "yes") washYes++;
      else if (val === "no") washNo++;
    });

    // Latrine type (bar)
    const latrineTypes = {};
    submissions.forEach((x) => {
      const latrine =
        typeof x.type_latrine_use === "string"
          ? x.type_latrine_use.trim()
          : x.type_latrine_use;
      if (latrine) latrineTypes[latrine] = (latrineTypes[latrine] || 0) + 1;
    });
    const latrineBar = Object.entries(latrineTypes).map(([name, value]) => ({
      name,
      value,
    }));

    // Mosquito breeding (pie)
    let breedYes = 0,
      breedNo = 0;
    submissions.forEach((x) => {
      const val = normalize(
        x.presence_of_stagnant_water_mosquito_breeding_sites
      );
      if (val === "yes") breedYes++;
      else if (val === "no") breedNo++;
    });

    // Mosquito larvae (pie)
    let larvaeYes = 0,
      larvaeNo = 0;
    submissions.forEach((x) => {
      const val = normalize(x.presence_of_mosquito_larvae);
      if (!val) return;
      if (val === "no") larvaeNo++;
      else larvaeYes++;
    });

    // Disaster in last week (pie)
    let disasterYes = 0,
      disasterNo = 0;
    submissions.forEach((x) => {
      const val = normalize(x.did_any_disaster_occur_in_last_7_days_);
      if (val === "yes") disasterYes++;
      else if (val === "no") disasterNo++;
    });

    // Disaster type (bar)
    const disasterTypes = {};
    submissions.forEach((x) => {
      const types = Array.isArray(x.what_types)
        ? x.what_types
        : toArray(x.what_types);
      types
        .map((type) => (typeof type === "string" ? type.trim() : type))
        .filter(Boolean)
        .forEach((type) => {
          disasterTypes[type] = (disasterTypes[type] || 0) + 1;
        });
    });
    const disasterTypeBar = Object.entries(disasterTypes).map(
      ([name, value]) => ({ name, value })
    );

    return {
      // Line
      submissionsOverTime,
      // Pie
      suspectedRatioPie: [
        { name: "Suspected", value: suspected },
        { name: "Not Suspected", value: notSuspected },
      ],
      referralRatePie: [
        { name: "Yes", value: referredYes },
        { name: "No", value: referredNo },
      ],
      genderPie: [
        { name: "Male", value: male },
        { name: "Female", value: female },
        { name: "Pregnant", value: pregnant },
        ...(other ? [{ name: "Other", value: other }] : []),
      ],
      facilityTypePie,
      bednetPie: [
        { name: "Yes", value: bednetYes },
        { name: "No", value: bednetNo },
      ],
      washPie: [
        { name: "Yes", value: washYes },
        { name: "No", value: washNo },
      ],
      mosquitoBreedPie: [
        { name: "Yes", value: breedYes },
        { name: "No", value: breedNo },
      ],
      mosquitoLarvaePie: [
        { name: "Yes", value: larvaeYes },
        { name: "No", value: larvaeNo },
      ],
      disasterWeekPie: [
        { name: "Yes", value: disasterYes },
        { name: "No", value: disasterNo },
      ],
      // Bars
      suspectedDiseaseBar,
      latrineBar,
      disasterTypeBar,
      // Totals, ratios etc
      totalSubmissions: submissions.length,
      percentSuspected: Math.round(
        (100 * suspected) / (suspected + notSuspected || 1)
      ),
      referralRate: Math.round(
        (100 * referredYes) / (referredYes + referredNo || 1)
      ),
      bednetPercent: Math.round(
        (100 * bednetYes) / (bednetYes + bednetNo || 1)
      ),
      handwashPercent: Math.round((100 * washYes) / (washYes + washNo || 1)),
      mosquitoBreedPercent: Math.round(
        (100 * breedYes) / (breedYes + breedNo || 1)
      ),
      mosquitoLarvaePercent: Math.round(
        (100 * larvaeYes) / (larvaeYes + larvaeNo || 1)
      ),
      disasterWeekPercent: Math.round(
        (100 * disasterYes) / (disasterYes + disasterNo || 1)
      ),
    };
  }

  const metrics = useMemo(
    () => calculateMetrics(filteredSubmissions),
    [filteredSubmissions]
  );
  console.log("metrics", metrics);

  const points = useMemo(
    () =>
      filteredSubmissions
        .filter((x) => x.latitude && x.longitude)
        .map((x) => ({
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
        <div className="grid grid-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
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
                      range.to ? range.to.toISOString().split("T")[0] : maxDay,
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
        </div>
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
          colors={["#3296FA", "#FF6361", "#C50080", "#11A579"]}
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
          stat={metrics.suspectedDiseaseBar.reduce(
            (sum, d) => sum + d.value,
            0
          )}
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
  );
}

export default ChwCds;

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
  valueList.forEach((val) => {
    if (mapping[val]) out.push(...mapping[val]);
  });
  return getUnique([...allSelected, ...out]);
}

// Chained option generator
function filterOptions(rows, keys, parentSelected) {
  return getUnique(
    rows
      .filter((row) =>
        keys
          .slice(0, -1)
          .every(
            (k, i) =>
              !parentSelected[k]?.length || parentSelected[k].includes(row[k])
          )
      )
      .map((row) => row[keys[keys.length - 1]])
      .filter(Boolean)
  );
}
function autoChainDeselect(deselected, mapping, childSelected) {
  // Remove any child keys that are children of *any* deselected parent
  const toRemove = deselected.flatMap((val) => mapping[val] || []);
  return childSelected.filter((x) => !toRemove.includes(x));
}

function getUnique(arr) {
  return Array.from(new Set(arr)).filter(Boolean);
}

function coalesce(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      if (value.length) return value;
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === "string" ? item.split(/[\s,]+/) : item
      )
      .map((item) => (typeof item === "string" ? item.trim() : item))
      .filter((item) => item !== undefined && item !== null && item !== "");
  }
  if (typeof value === "string") {
    return value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function flattenSubmission(x) {
  const direct = x.data || {};
  // Only use modern group names
  const referralInfo = direct["referral-related_information"] || {};
  const healthWorkerInfo = direct["health_worker_s_information"] || {};
  const healthBehaviour = direct["health_behaviour"] || {};
  const disasterInfo = direct["disaster-related_information"] || {};
  const environmentInfo = direct["environmental_related_information_"] || {};
  const suspectedPatientInfo =
    direct["suspected_patient-related_information"] || {};
  // Already diagnosed cases, only used for non-suspected
  const alreadyDiagnosed =
    direct["information_of_already_identified_patient_s_"] || {};

  const locationStr = coalesce(suspectedPatientInfo.location, direct.location);
  let latitude = null,
    longitude = null;
  if (locationStr && typeof locationStr === "string") {
    // Accepts "lat lng ..." or "lng lat ..."
    // Try "lat lng" order first
    const [a, b] = locationStr.split(/\s+/);
    if (!isNaN(Number(a)) && !isNaN(Number(b))) {
      // Most probable: first is lat, second is lng
      latitude = Number(a);
      longitude = Number(b);
      // If out-of-range, try swap
      if (Math.abs(latitude) > 90 && Math.abs(longitude) <= 90) {
        [latitude, longitude] = [longitude, latitude];
      }
    }
  }

  const division = coalesce(suspectedPatientInfo.division, direct.division);
  const district = coalesce(suspectedPatientInfo.district, direct.district);
  const upazila = coalesce(suspectedPatientInfo.upazila, direct.upazila);
  const union = coalesce(suspectedPatientInfo.union, direct.union);
  const ward = coalesce(suspectedPatientInfo.ward, direct.ward);
  const area = coalesce(suspectedPatientInfo.area, direct.area);
  const age = coalesce(suspectedPatientInfo.age, direct.age);
  const sex = coalesce(suspectedPatientInfo.sex, direct.sex);
  const preg = coalesce(
    suspectedPatientInfo.pregnent,
    suspectedPatientInfo.pregnant,
    direct.pregnent,
    direct.pregnant
  );
  const hh_id = coalesce(suspectedPatientInfo.hh_id, direct.hh_id);
  const hh_head_name = coalesce(
    suspectedPatientInfo.hh_head_name,
    direct.hh_head_name
  );
  const mobile_number = coalesce(
    suspectedPatientInfo.mobile_number,
    direct.mobile_number
  );
  const patient_id_type = coalesce(
    suspectedPatientInfo.patient_id_type,
    direct.patient_id_type
  );
  const suspected_in_the_disease = coalesce(
    suspectedPatientInfo.suspected_in_the_disease,
    direct.suspected_in_the_disease
  );
  const suspectedDiseaseRaw = coalesce(
    suspectedPatientInfo.suspected_disease,
    direct.suspected_disease
  );
  const suspected_disease = Array.isArray(suspectedDiseaseRaw)
    ? suspectedDiseaseRaw.join(" ")
    : suspectedDiseaseRaw;
  const disease = toArray(suspectedDiseaseRaw);
  const name_of_the_person_with_suspected_case = coalesce(
    suspectedPatientInfo.name_of_the_person_with_suspected_case,
    direct.name_of_the_person_with_suspected_case
  );
  const user_identification_11_9943_01976848561 = coalesce(
    suspectedPatientInfo.user_identification_11_9943_01976848561,
    direct.user_identification_11_9943_01976848561
  );

  const organization = coalesce(
    healthWorkerInfo.organization,
    direct.organization
  );
  const designation = coalesce(
    healthWorkerInfo.designation_1,
    healthWorkerInfo.designation,
    direct.designation_1,
    direct.designation
  );
  const name_of_staff = coalesce(
    healthWorkerInfo.name_of_staff,
    direct.name_of_staff
  );

  const referred = coalesce(referralInfo.referred, direct.referred);
  const referral_place = coalesce(
    referralInfo.referral_place,
    direct.referral_place
  );
  const if_referred_to_govt = coalesce(
    referralInfo.if_referred_to_govt,
    direct.if_referred_to_govt
  );

  const bed_net_use_practice_during_sleep = coalesce(
    healthBehaviour.bed_net_use_practice_during_sleep,
    direct.bed_net_use_practice_during_sleep
  );
  const handwashing_practice_with_soap__water = coalesce(
    healthBehaviour.handwashing_practice_with_soap__water,
    direct.handwashing_practice_with_soap__water
  );
  const type_latrine_use = coalesce(
    healthBehaviour.type_latrine_use,
    direct.type_latrine_use
  );

  const presence_of_mosquito_larvae = coalesce(
    environmentInfo.presence_of_mosquito_larvae,
    direct.presence_of_mosquito_larvae
  );
  const presence_of_stagnant_water_mosquito_breeding_sites = coalesce(
    environmentInfo.presence_of_stagnant_water_mosquito_breeding_sites,
    direct.presence_of_stagnant_water_mosquito_breeding_sites
  );

  const did_any_disaster_occur_in_last_7_days_ = coalesce(
    disasterInfo.did_any_disaster_occur_in_last_7_days_,
    direct.did_any_disaster_occur_in_last_7_days_
  );
  const what_types = toArray(
    coalesce(disasterInfo.what_types, direct.what_types)
  );

  const no_of_already_diagnosed_cases_of_dengue_in_the_hh = coalesce(
    alreadyDiagnosed.no_of_already_diagnosed_cases_of_dengue_in_the_hh_1,
    direct.no_of_already_diagnosed_cases_of_dengue_in_the_hh,
    direct["no._of_already_diagnosed_cases_of_dengue_in_the_hh_1"],
    direct["no._of_already_diagnosed_cases_of_dengue_in_the_hh"]
  );
  const no_of_already_diagnosed_cases_of_malaria_in_the_hh = coalesce(
    alreadyDiagnosed.no_of_already_diagnosed_cases_of_malaria_in_the_hh,
    direct.no_of_already_diagnosed_cases_of_malaria_in_the_hh,
    direct["no._of_already_diagnosed_cases_of_malaria_in_the_hh"]
  );
  const no_of_already_diagnosed_cases_of_awd_in_the_hh = coalesce(
    alreadyDiagnosed.no_of_already_diagnosed_cases_of_awd_in_the_hh,
    direct.no_of_already_diagnosed_cases_of_awd_in_the_hh,
    direct["no._of_already_diagnosed_cases_of_awd_in_the_hh"]
  );

  const day =
    direct.end && typeof direct.end === "string"
      ? direct.end.slice(0, 10)
      : coalesce(healthWorkerInfo.date, direct.date) || null;
  const date = coalesce(direct.date, healthWorkerInfo.date) || null;
  const remarks = coalesce(
    direct.remarks,
    healthWorkerInfo.remarks,
    suspectedPatientInfo.remarks
  );

  return {
    division,
    district,
    upazila,
    union,
    ward,
    area,
    age,
    sex,
    preg,
    hh_id,
    hh_head_name,
    mobile_number,
    patient_id_type,
    suspected_in_the_disease,
    suspected_disease,
    disease,
    name_of_the_person_with_suspected_case,
    user_identification_11_9943_01976848561,
    organization,
    designation,
    name_of_staff,
    referred,
    referral_place,
    if_referred_to_govt,
    bed_net_use_practice_during_sleep,
    handwashing_practice_with_soap__water,
    type_latrine_use,
    presence_of_mosquito_larvae,
    presence_of_stagnant_water_mosquito_breeding_sites,
    did_any_disaster_occur_in_last_7_days_,
    what_types,
    no_of_already_diagnosed_cases_of_dengue_in_the_hh,
    no_of_already_diagnosed_cases_of_malaria_in_the_hh,
    no_of_already_diagnosed_cases_of_awd_in_the_hh,
    day,
    date,
    remarks,
    location: typeof locationStr === "string" ? locationStr : null,
    latitude,
    longitude,
  };
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
    const {
      division,
      district,
      upazila,
      union,
      ward,
      area,
      organization,
      disease,
    } = row;

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
      Object.entries(divisionToDistricts).map(([k, v]) => [k, getUnique(v)])
    ),
    districtToUpazilas: Object.fromEntries(
      Object.entries(districtToUpazilas).map(([k, v]) => [k, getUnique(v)])
    ),
    upazilaToUnions: Object.fromEntries(
      Object.entries(upazilaToUnions).map(([k, v]) => [k, getUnique(v)])
    ),
    unionToWards: Object.fromEntries(
      Object.entries(unionToWards).map(([k, v]) => [k, getUnique(v)])
    ),
    wardToAreas: Object.fromEntries(
      Object.entries(wardToAreas).map(([k, v]) => [k, getUnique(v)])
    ),
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
      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
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
      <div style={{ width: "100%", height: 250, padding: 10 }}>
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
        <div style={{ width: "100%", height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={50}
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
          <BarChart
            data={data}
            margin={{ top: 20, right: 0, bottom: 10, left: 0 }}
          >
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value">
              {data.map((entry, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                className="text-xs fill-foreground"
              />
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
              <YAxis
                dataKey="name"
                type="category"
                width={0}
                tick={false}
                axisLine={false}
              />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={28}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
                <LabelList
                  dataKey="value"
                  position="insideRight"
                  className="text-xs fill-white"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Labels */}
        <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-[8px]">{entry.name}</span>
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
          <LineChart
            data={data}
            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
          >
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
        attribution="&copy; OpenStreetMap contributors & CartoDB"
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
            [
              "Disease(s)",
              Array.isArray(pt.disease)
                ? pt.disease.join(", ")
                : pt.disease || "-",
            ],
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

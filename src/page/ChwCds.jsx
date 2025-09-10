import HierarchicalMultiSelect from '@/components/HierarchicalMultiSelect';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react'

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = "6d7a12ff7d2252aab5622eaddd6fb5c8798706ba";
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

    const organizationOptions = useMemo(() =>
        h && h.allRows ? filterOptions(h.allRows, ['division', 'district', 'upazila', 'union', 'ward', 'area', 'organization'], filterState) : [],
        [h, filterState]
    );

    const diseaseOptions = useMemo(() =>
        h && h.allRows ? getUnique(
            h.allRows
                .filter(row =>
                    (!selectedDivisions.length || selectedDivisions.includes(row.division)) &&
                    (!selectedDistricts.length || selectedDistricts.includes(row.district)) &&
                    (!selectedUpazilas.length || selectedUpazilas.includes(row.upazila)) &&
                    (!selectedUnions.length || selectedUnions.includes(row.union)) &&
                    (!selectedWards.length || selectedWards.includes(row.ward)) &&
                    (!selectedAreas.length || selectedAreas.includes(row.area))
                )
                .flatMap(row => row.disease)
        ) : [], [h, selectedDivisions, selectedDistricts, selectedUpazilas, selectedUnions, selectedWards, selectedAreas]);


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
                    <div className="flex flex-col min-w-[120px]">
                        <label className="mb-1 font-medium text-gray-700">Date range</label>
                        <input type="text" className="border rounded-md px-2 py-1" placeholder="Select Date Range" disabled />
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

                {/* Example small cards */}
                <DashboardCard title="Total submissions">
                    <div>Chart here</div>
                </DashboardCard>

                <DashboardCard title="Completion Rate">
                    <div>Pie chart</div>
                </DashboardCard>

                <DashboardCard title="Suspected Ratio">
                    <div>Bar chart</div>
                </DashboardCard>

                <DashboardCard title="Referral Rate">
                    <div>Pie chart</div>
                </DashboardCard>

                {/* Map spanning 2 cols and 2 rows */}
                <div className="row-span-2 md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2">
                    <DashboardCard title="Map">
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            Map goes here
                        </div>
                    </DashboardCard>
                </div>

                {/* More cards filling up the grid */}
                <DashboardCard title="Referred Facility type">
                    <div>Pie chart</div>
                </DashboardCard>

                <DashboardCard title="Bednet use">
                    <div>Pie chart</div>
                </DashboardCard>

                <DashboardCard title="Hand wash practice">
                    <div>Pie chart</div>
                </DashboardCard>

                <DashboardCard title="Latrine type">
                    <div>Bar chart</div>
                </DashboardCard>
            </div>
        </div>

    )
}

export default ChwCds

const DashboardCard = ({ title, children }) => {
    return (
        <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col w-full h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
            <div className="flex-1 flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};


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

function extractHierarchy(submissions) {
    // All levels
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

    for (const x of submissions) {
        if (!x.data) continue;
        const addr = x.data.address || {};
        const div = addr.division;
        const dis = addr.district;
        const upa = addr.upazila;
        const uni = addr.union;
        const war = addr.ward;
        const area = addr.area;
        if (div) {
            divisions.push(div);
            divisionToDistricts[div] = divisionToDistricts[div] || [];
            if (dis) divisionToDistricts[div].push(dis);
        }
        if (dis) {
            allDistricts.push(dis);
            districtToUpazilas[dis] = districtToUpazilas[dis] || [];
            if (upa) districtToUpazilas[dis].push(upa);
        }
        if (upa) {
            allUpazilas.push(upa);
            upazilaToUnions[upa] = upazilaToUnions[upa] || [];
            if (uni) upazilaToUnions[upa].push(uni);
        }
        if (uni) {
            allUnions.push(uni);
            unionToWards[uni] = unionToWards[uni] || [];
            if (war) unionToWards[uni].push(war);
        }
        if (war) {
            allWards.push(war);
            wardToAreas[war] = wardToAreas[war] || [];
            if (area) wardToAreas[war].push(area);
        }
        if (area) {
            allAreas.push(area);
        }
        // Robust extraction for org + suspected_disease everywhere
        let org = x.data._ && x.data._._3 && x.data._._3.organization;
        if (org) organizations.push(org);
        let sd = x.data._ && x.data._._2 && x.data._._2.suspected_disease;
        if (sd) diseases.push(...String(sd).split(' ').filter(Boolean));
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
        // All raw links for filtering below
        allRows: submissions.map(x => ({
            division: x.data?.address?.division,
            district: x.data?.address?.district,
            upazila: x.data?.address?.upazila,
            union: x.data?.address?.union,
            ward: x.data?.address?.ward,
            area: x.data?.address?.area,
            organization: x.data?._?._3?.organization,
            disease: (x.data?._?._2?.suspected_disease || "")
                .split(" ").filter(Boolean)
        }))
    };
}


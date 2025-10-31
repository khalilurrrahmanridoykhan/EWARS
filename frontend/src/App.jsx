import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./Admin/AdminLayout";
import PageNotFound from "./page/PagenotFound";
import DataPage from "./page/avator-menu/Datapage";
import Malaria from "./page/malaria/Malaria";
import ChwCds from "./page/monitoring/ChwCds";
import MalariaRiskTracker from "./page/malaria/prediction/MalariaUpazilaPredict";
import Alert from "./page/malaria/alert/Alert";
import OurModel from "./page/avator-menu/OurModel";
import MalariaSpecies from "./page/malaria/prediction/MalariaSpecis";
import MalariaPredictionChanges from "./page/malaria/prediction/MalariaPredictionChange";
import ModelPerformance from "./page/avator-menu/ModelPerformace";
import MalariaRiskDistrict from "./page/malaria/risk/DistrictMalariaRisk";
import MalariaRiskUpazila from "./page/malaria/risk/UpazilaMalariaRiskMap";



function App() {
  // Default role = 1 (admin)
  const userRole = 1;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/malaria/predict/species/upazila" replace />} />


        {/* Admin Routes (open for everyone for now) */}
        {userRole === 1 && (
          <Route path="/" element={<AdminLayout />}>
            <Route path="/data" element={<DataPage />} />
            <Route path="/diseases/malaria" element={<Malaria />} />
            <Route path="/malaria/predict/upazila" element={<MalariaRiskTracker />} />
            <Route path="/malaria/predict/species/upazila" element={<MalariaSpecies />} />
            <Route path="/malaria/predict/change/upazila" element={<MalariaPredictionChanges />} />
            <Route path="/malaria/risk-map/district" element={<MalariaRiskDistrict />} />
            <Route path="/malaria/risk-map/upazila" element={<MalariaRiskUpazila />} />

            <Route path="*" element={<PageNotFound />} />
            <Route path="/chw_cds" element={<ChwCds />} />
            <Route path="/model" element={<OurModel />} />
            <Route path="/model-performance" element={<ModelPerformance />} />
            <Route path="/alert/malaria" element={<Alert />} />



          </Route>
        )}
      </Routes>
    </Router>
  );
}

export default App;

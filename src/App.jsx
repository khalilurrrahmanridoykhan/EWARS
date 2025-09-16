import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./Admin/AdminLayout";
import PageNotFound from "./page/PagenotFound";
import DataPage from "./page/Datapage";
import Malaria from "./page/Malaria";
import ChwCds from "./page/ChwCds";
import MalariaRiskTracker from "./page/MalariaUpazilaPredict";
import Alert from "./page/Alert";
import OurModel from "./page/OurModel";



function App() {
  // Default role = 1 (admin)
  const userRole = 1;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/data" replace />} />


        {/* Admin Routes (open for everyone for now) */}
        {userRole === 1 && (
          <Route path="/" element={<AdminLayout />}>
            <Route path="/data" element={<DataPage />} />
            <Route path="/diseases/malaria" element={<Malaria />} />
            <Route path="/diseases/predict/malaria" element={<MalariaRiskTracker />} />
            <Route path="*" element={<PageNotFound />} />
            <Route path="/chw_cds" element={<ChwCds />} />
            <Route path="/model" element={<OurModel />} />
            <Route path="/alert/malaria" element={<Alert />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
}

export default App;

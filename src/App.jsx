import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./Admin/AdminLayout";
import PageNotFound from "./Page/PageNotFound";
import DataPage from "./page/Datapage";



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
            <Route path="*" element={<PageNotFound />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
}

export default App;

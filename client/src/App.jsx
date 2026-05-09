import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Monitoring from "./pages/Monitoring.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/monitoring" element={<Monitoring />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

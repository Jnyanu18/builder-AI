import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Monitoring from "./pages/Monitoring.jsx";
import WorkSession from "./pages/WorkSession.jsx";
import IntentGraph from "./pages/IntentGraph.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/monitoring" element={<Monitoring />} />
      <Route path="/work-session" element={<WorkSession />} />
      <Route path="/intent-graph" element={<IntentGraph />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import RapportForm from './pages/RapportForm'
import RapportDetails from './pages/RapportDetails'
import { MesRapports } from './pages/MesRapports'
import Home from './pages/Home'

function App() {
    return (
        <Routes>
            <Route path="/" element={<RapportForm />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/nouveau" element={<RapportForm />} />
            <Route path="/rapport/nouveau" element={<RapportForm />} />
            <Route path="/rapport/:id" element={<RapportForm />} />
            <Route path="/rapport/:id/view" element={<RapportDetails />} />
            <Route path="/mes-rapports" element={<MesRapports />} />
        </Routes>
    )
}

export default App

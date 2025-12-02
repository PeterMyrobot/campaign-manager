import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Dashboard from './pages/Dashboard';


function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path='campaigns' element={<Campaigns />} />
          <Route path='campaigns/:id' element={<CampaignDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

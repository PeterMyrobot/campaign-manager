import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Dashboard from './pages/Dashboard';
import LineItems from './pages/LineItems';
import Invoices from './pages/Invoices';


function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path='campaigns' element={<Campaigns />} />
          <Route path='campaigns/:id' element={<CampaignDetail />} />
          <Route path='line-items' element={<LineItems />} />
          <Route path='invoices' element={<Invoices />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

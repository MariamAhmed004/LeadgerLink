//import { useEffect, useState } from 'react';
import './App.css';
import Layout from './components/Layout/Layout.jsx';
import Landing from './pages/Landing.jsx';
import AppRoutes from './components/AppRoutes';

function App() {

    return (
        <Layout>
            {/*Currently displaying the landing page only */}
            <AppRoutes/>
        </Layout>
    );

}

export default App;
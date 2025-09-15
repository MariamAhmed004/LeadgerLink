//import { useEffect, useState } from 'react';
import './App.css';
import Layout from './components/Layout/Layout.jsx';
import Landing from './pages/Landing.jsx';

function App() {

    return (
        <Layout>
            {/*Currently displaying the landing page only */}
            <Landing /> 
        </Layout>
    );

}

export default App;
//import { useEffect, useState } from 'react';
import './App.css';
import Layout from './components/Layout/Layout.jsx';
import { AuthProvider } from "./Context/AuthContext";
import AppRoutes from './components/AppRoutes';

function App() {

    return (
        <AuthProvider>
        <Layout>
            {/*Currently displaying the landing page only */}
            <AppRoutes/>
            </Layout>
        </AuthProvider>
    );

}

export default App;
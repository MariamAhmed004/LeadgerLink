import './App.css';
import Layout from './components/Layout/Layout.jsx';
import { AuthProvider } from "./Context/AuthProvider";
import AppRoutes from './components/AppRoutes';
import { useLocation } from "react-router-dom";

function App() {
  const location = useLocation();

  // Edit this array to add pages that should NOT use the Layout
    const noLayoutPaths = ["/login", "/reset-password"];

  const useLayout = !noLayoutPaths.includes(location.pathname);

  return (
    <AuthProvider>
      {useLayout ? (
        <Layout>
          <AppRoutes />
        </Layout>
      ) : (
        <AppRoutes />
      )}
    </AuthProvider>
  );
}

export default App;
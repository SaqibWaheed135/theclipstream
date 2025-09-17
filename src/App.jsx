import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation, useNavigate
} from "react-router-dom";


import { Home, Search, Plus, User } from "lucide-react";

// Import your screen components
import HomeScreen from "./components/HomeScreen.jsx"
import SearchScreen from "./components/SearchScreen";
import UploadScreen from "./components/UploadScreen";
import LiveScreen from "./components/LiveStream.jsx";
import ProfileScreen from "./components/ProfileScreen";

// Import Login and Signup pages
import Login from "./pages/Login.jsx"
import Signup from "./pages/SignUp.jsx"

const BottomNavigation = ({ currentScreen, navigate }) => {
  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/" },
    { id: "search", icon: Search, label: "Discover", path: "/search" },
    { id: "upload", icon: Plus, label: "Create", path: "/upload" },
    { id: "live", icon: () => (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.067 13H2a1 1 0 01-1-1V8a1 1 0 01-1-1h2.067l4.316-3.82z"
            clipRule="evenodd"
          />
          <path d="M14.657 2.757a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.243 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" />
          <path d="M12.828 5.757a1 1 0 011.414 0A5.984 5.984 0 0116 10a5.984 5.984 0 01-1.758 4.243 1 1 0 01-1.414-1.414A3.984 3.984 0 0014 10a3.984 3.984 0 00-1.172-2.829 1 1 0 010-1.414z" />
        </svg>
      ), label: "LIVE", path: "/live" },
    { id: "profile", icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50 safe-area-inset-bottom">
      <div className="flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.path;
          const isUpload = item.id === "upload";

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex-1 py-2 px-1 flex flex-col items-center justify-center min-h-[60px] ${
                isUpload ? "relative" : ""
              }`}
            >
              {isUpload ? (
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-1">
                  <Icon className="w-5 h-5 text-black" />
                </div>
              ) : (
                <Icon
                  className={`w-6 h-6 mb-1 ${
                    isActive ? "text-white" : "text-gray-400"
                  }`}
                />
              )}
              <span
                className={`text-xs ${
                  isActive && !isUpload ? "text-white" : "text-gray-400"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ✅ Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState(location.pathname);

  useEffect(() => {
    setCurrentScreen(location.pathname);
  }, [location]);

  return (
    <div className="bg-black min-h-screen overflow-hidden">
      <main className="pb-[60px]">
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchScreen /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadScreen /></ProtectedRoute>} />
          <Route path="/live" element={<ProtectedRoute><LiveScreen /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* ✅ Show nav only when logged in */}
      {localStorage.getItem("token") && (
        <BottomNavigation
          currentScreen={currentScreen}
          navigate={navigate}
        />
      )}
    </div>
  );
};

export default App;
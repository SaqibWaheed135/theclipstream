import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate
} from "react-router-dom";
import AdBanner from "./components/AdBanner.jsx";

import { Home, Search, Plus, User, CircleDot } from "lucide-react";

// Import your screen components
import HomeScreen from "./components/HomeScreen.jsx";
import SearchScreen from "./components/SearchScreen";
import UploadScreen from "./components/UploadScreen";
import LiveScreen from "./components/LiveStream.jsx";
import ProfileScreen from "./components/ProfileScreen";
import LiveBrowse from "./pages/LiveBrowse.jsx";
import LiveViewer from "./components/LiveViewer";
import EditProfileScreen from "./components/EditProfileScreen.jsx";
import AddFriendsScreen from "./components/AddFriendScreen.jsx";
import PointsTransfer from "./components/PointsTransfer";
import Login from "./pages/Login.jsx";
import Signup from "./pages/SignUp.jsx";
import MessagingScreen from "./components/MessagingScreen.jsx";
import PointsRechargeScreen from "./components/PointsRechargeScreen.jsx";
import NotificationsScreen from "./components/NotificationsScreen.jsx";
import FollowRequestsScreen from "./components/FollowRequestScreen.jsx";
import PointsWithdrawalScreen from "./components/PointsWithdrawalScreen.jsx";

// --------------------
// Bottom Navigation
// --------------------
const BottomNavigation = ({ currentScreen, navigate }) => {
  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/" },
    { id: "search", icon: Search, label: "Discover", path: "/search" },
    { id: "upload", icon: Plus, label: "Create", path: "/upload" },
    { id: "live", icon: CircleDot, label: "LIVE", path: "/live-browse" },
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
                    isActive
                      ? item.id === "live"
                        ? "text-red-500"
                        : "text-white"
                      : "text-gray-400"
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

// --------------------
// Token Check
// --------------------
const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const exp = payload.exp * 1000; // JWT exp is in seconds
    return Date.now() < exp;
  } catch (e) {
    return false;
  }
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const valid = isTokenValid(token);

  if (!valid) {
    localStorage.removeItem("token"); // clean expired token
    return <Navigate to="/login" />;
  }

  return children;
};

// --------------------
// App Component
// --------------------
const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState(location.pathname);

  // 👇 State for install prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    setCurrentScreen(location.pathname);
  }, [location]);

  // 👇 Listen for beforeinstallprompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // 👇 Handle install click
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install");
        } else {
          console.log("User dismissed the install");
        }
        setDeferredPrompt(null);
        setShowInstallButton(false);
      });
    }
  };

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
          <Route path="/profile/:userId" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfileScreen /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
          <Route path="/follow-requests" element={<ProtectedRoute><FollowRequestsScreen /></ProtectedRoute>} />
          <Route path="/add-friends" element={<ProtectedRoute><AddFriendsScreen /></ProtectedRoute>} />
          <Route path="/recharge-points" element={<ProtectedRoute><PointsRechargeScreen /></ProtectedRoute>} />
          <Route path="/withdraw-points" element={<ProtectedRoute><PointsWithdrawalScreen /></ProtectedRoute>} />
          <Route path="/transfer-points" element={<ProtectedRoute><PointsTransfer /></ProtectedRoute>} />
          <Route path="/messaging" element={<ProtectedRoute><MessagingScreen /></ProtectedRoute>} />
          <Route path="/messages/:conversationId" element={<ProtectedRoute><MessagingScreen /></ProtectedRoute>} />
          <Route path="/live-browse" element={<ProtectedRoute><LiveBrowse /></ProtectedRoute>} />
          <Route path="/live/:streamId" element={<LiveViewer />} />
        </Routes>
      </main>

      {/* 👇 Install App button (only shows if browser supports it) */}
      {showInstallButton && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50">
          <button
            onClick={handleInstallClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md"
          >
            Install App
          </button>
        </div>
      )}

      {/* ✅ Show nav only when logged in */}
      {localStorage.getItem("token") && (
        <BottomNavigation currentScreen={currentScreen} navigate={navigate} />
      )}
    </div>
  );
};

export default App;

import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import bgImage from "./assets/bgImage.jpg";
import { Toaster } from "react-hot-toast";
import { AuthContext } from "../Context/AuthContext";
import VideoCallPage from "./pages/VideoCallPage";

const App = () => {
  const { authUser } = useContext(AuthContext);

  return (
    // <div className="bg-[url('./src/assets/bgImage.jpg')] bg-cover min-h-screen">
    <div
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        minHeight: "100vh",
      }}
    >
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route
          path="video-call"
          element={authUser ? <VideoCallPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
};

export default App;

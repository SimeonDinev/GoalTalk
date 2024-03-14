import { Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";
import * as authService from "./services/authService";

import Footer from "./components/footer/Footer";
import Navigation from "./components/navigation/Navigation";

import Home from "./components/home/Home";
import Clubs from "./components/clubs/Clubs";
import FamousPlayers from "./components/famous-players/FamousPlayers";
import News from "./components/news/News";
import Posts from "./components/posts/Posts";
import ClubHistory from "./components/clubs/history-modal/ClubHistory";
import LogIn from "./components/login/LogIn";
import RegistrationForm from "./components/register/RegistrationForm";
import AuthContext from "./contexts/authContext";

function App() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState({});

  const loginSubmitHandler = async (values) => {
    const result = await authService.login(values.email, values.password);

    setAuth(result);
    navigate("/");
  };

  const values = {
    loginSubmitHandler,
    username: auth.username,
    email: auth.email,
    isAuthenticated: !!auth.username,
  };
  return (
    <AuthContext.Provider value={values}>
      <>
        <Navigation />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/famous-players" element={<FamousPlayers />} />
          <Route path="/news" element={<News />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/registration-form" element={<RegistrationForm />} />

          <Route path="/clubDetails/:clubId" element={<ClubHistory />} />
        </Routes>

        <Footer />
      </>
    </AuthContext.Provider>
  );
}

export default App;

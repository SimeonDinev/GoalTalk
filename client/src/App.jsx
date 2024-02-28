import { Routes, Route } from "react-router-dom";
import { useState } from "react";

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

function App() {
  const [auth, setAuth] = useState({});

  const loginSubmitHandler = (values) => {
    console.log(values);
  };
  return (
    <>
      <Navigation />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/famous-players" element={<FamousPlayers />} />
        <Route path="/news" element={<News />} />
        <Route path="/posts" element={<Posts />} />
        <Route
          path="/login"
          element={<LogIn loginSubmitHandler={loginSubmitHandler} />}
        />
        <Route path="/registration-form" element={<RegistrationForm />} />

        <Route path="/clubDetails/:clubId" element={<ClubHistory />} />
      </Routes>

      <Footer />
    </>
  );
}

export default App;

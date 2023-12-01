import { Routes, Route } from "react-router-dom";

import Footer from "./components/footer/Footer";
import Navigation from "./components/Navigation/Navigation";

import Home from "./components/home/Home";
import Clubs from "./components/clubs/Clubs";
import FamousPlayers from "./components/famous-players/FamousPlayers";

function App() {
  return (
    <>
      <Navigation />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/famous-players" element={<FamousPlayers />} />
      </Routes>

      <Footer />
    </>
  );
}

export default App;

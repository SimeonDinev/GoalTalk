import { Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation/Navigation";
import Home from "./components/Home/Home";
import Footer from "./components/Footer/Footer";
import Clubs from "./components/Clubs/Clubs";

function App() {
  return (
    <>
      <Navigation />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clubs" element={<Clubs />} />
      </Routes>

      <Footer />
    </>
  );
}

export default App;

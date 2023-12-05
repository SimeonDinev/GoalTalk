import { Container, Button } from "react-bootstrap";

import React from "react";
import Card from "./card/Card";

import "./Home.css";

const Home = () => {
  return (
    <div className="background-container">
      <Container id="home-register-container" fluid>
        <h1 id="intro-heading">
          <span className="dots"></span>
          <span className="goal-talk"> Goal</span>
          <span className="highlight">Talk </span>
          <span className="dots"></span>
        </h1>

        <p id="intro-text">
          Stay in the game with our football news and history hub. From iconic
          moments to in-depth coverage, dive into the heart of football. Explore
          now for a front-row seat to the beautiful game!
        </p>

        <Button id="home-btn-register" className="align-content-center">
          Register
        </Button>
      </Container>

      <Card />
    </div>
  );
};

export default Home;

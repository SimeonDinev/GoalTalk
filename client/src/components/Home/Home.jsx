import React from "react";
import { Container, Button } from "react-bootstrap";
import "./Home.css";
import Card from "./Card";

const Home = () => {
  return (
    <div className="background-container">
      <Container id="home-register-container" fluid>
        <h1
          style={{
            fontWeight: "bold",
            textAlign: "center",
            letterSpacing: "3px",
            paddingBottom: "20px",
          }}
          className="text-writing-animation"
        >
          <span className="dots"></span>
          <span className="goal-talk"> Goal</span>
          <span className="highlight">Talk </span>
          <span className="dots"></span>
        </h1>
        <p
          style={{
            textAlign: "center",
            padding: "20px 200px",
            fontWeight: "700",
          }}
        >
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

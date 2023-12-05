import { useState } from "react";
import { Link } from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/esm/Button";
import Menu from "./nav-menu/Menu";

import "../navigation/Navigation.css";

const Navigation = () => {
  const [isButtonHovered, setIsButttonHovered] = useState(false);

  return (
    <Row>
      <Navbar expand="lg" id="navbar-wrapper">
        <Container>
          <Col md={2.5}>
            <Navbar.Brand as={Link} to="/">
              <span id="logo-goal">Goal</span>
              <span id="logo-talk">Talk</span>
            </Navbar.Brand>
          </Col>

          <Col md={7}>
            <Menu />
          </Col>

          <Col md={2.5} className="d-flex justify-content-end">
            <Button
              variant="success"
              onMouseOver={() => setIsButttonHovered(true)}
              onMouseOut={() => setIsButttonHovered(false)}
              style={{
                backgroundColor: isButtonHovered ? "#4CAF50" : "#28a745",
                borderColor: "#4CAF50",
                color: "#fff",
                paddingBottom: "8.5px",
              }}
            >
              Log-in
            </Button>
          </Col>
        </Container>
      </Navbar>
    </Row>
  );
};

export default Navigation;

import { useState } from "react";
import { Link } from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/esm/Button";
import Menu from "./nav-menu/Menu";

const Navigation = () => {
  const [isButtonHovered, setIsButttonHovered] = useState(false);

  return (
    <Row>
      <Navbar expand="lg" style={{ backgroundColor: "whitesmoke" }}>
        <Container>
          <Col md={2.5}>
            <Navbar.Brand as={Link} to="/" style={{ fontSize: "25px" }}>
              <span
                style={{
                  color: "#4CAF50",
                  fontWeight: "bold",
                  fontSize: "33px",
                }}
              >
                Goal
              </span>
              <span
                style={{
                  fontWeight: "bold",
                  fontSize: "28px",
                  color: "#404040",
                }}
              >
                Talk
              </span>
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

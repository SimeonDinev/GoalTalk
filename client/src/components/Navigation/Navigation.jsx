import { useState } from "react";
import { Link } from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/esm/Button";
import Menu from "./nav-menu/Menu";

import LogInModal from "../login-modal/LogInModal";
import "../navigation/Navigation.css";

const Navigation = () => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  if (show) {
    var htmlElement = document.documentElement;
    htmlElement.style.overflow = "disable";
  } else {
    var htmlElement = document.documentElement;
    htmlElement.style.overflow = "visible";
  }

  return (
    <>
      {show && <LogInModal show={show} close={handleClose} />}

      <Row style={{ margin: "0" }}>
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
              <Button id="login-btn" onClick={handleShow}>
                Log-In
              </Button>
            </Col>
          </Container>
        </Navbar>
      </Row>
    </>
  );
};

export default Navigation;

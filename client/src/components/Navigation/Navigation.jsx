import { useContext, useState } from "react";
import { Link } from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/esm/Button";
import Menu from "./nav-menu/Menu";

import "../navigation/Navigation.css";
import AuthContext from "../../contexts/authContext";

const Navigation = () => {
  const [show, setShow] = useState(false);
  const { isAuthenticated, username } = useContext(AuthContext);
  console.log(isAuthenticated, username);

  const handleClose = () => setShow(false);

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

            {!isAuthenticated && (
              <Col md={2.5} className="d-flex justify-content-end">
                <Button id="login-btn" as={Link} to="/login">
                  Login
                </Button>
              </Col>
            )}

            {isAuthenticated && (
              <Col md={2.5} className="d-flex justify-content-end">
                <Button id="logout-btn">Log Out</Button>
              </Col>
            )}
          </Container>
        </Navbar>
      </Row>
    </>
  );
};

export default Navigation;

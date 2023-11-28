import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { FaFacebook, FaGithub, FaLinkedin } from "react-icons/fa";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="bg-dark text-white ">
      <Container
        className="p-4"
        style={{
          fontFamily: "Bitter, Times, New Roman Times,serif",
          fontWeight: "600",
        }}
      >
        <Row className="d-flex justify-content-center">
          <Col xs={6} md={3}>
            <h5
              style={{
                fontSize: "25px",
                textAlign: "center",
                paddingBottom: "8px",
              }}
            >
              Connect with Me
            </h5>
            <ul
              className="list-unstyled d-flex justify-content-evenly"
              style={{ marginBottom: "0" }}
            >
              <li>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaFacebook className="icon" size={35} />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/SimeonDinev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaGithub className="icon" size={35} />
                </a>
              </li>
              <li>
                <a
                  href="https://l.facebook.com/l.php?u=http%3A%2F%2Flinkedin.com%2Fin%2Fsimeon-dinev-606b23277%3Ffbclid%3DIwAR3TjXnpIe-Mcd7mMibssDZ3DltDNyVlaFJJlbev3e-IMiY6w2S8O_ULe9k&h=AT18bZxSQg6d2m4U2MNbOjDa5xeK3H2FYcvpfLyISBrfLoISqxzRgcCfGCfCcebjdHHA7HI37zyOneWe9yQcaO7BNUT6G2tOiWB3Ip2NWKaczhNKhnkqJ44HeatjoqV0ejgYzA"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaLinkedin className="icon" size={35} />
                </a>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>
      <div
        className="text-center p-3"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          fontFamily: "Bitter, Times, New Roman Times,serif",
        }}
      >
        © 2023 GoalTalk. All Rights Reserved.
      </div>
    </footer>
  );
};

export default Footer;

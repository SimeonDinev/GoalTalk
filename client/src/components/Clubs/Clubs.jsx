import { useState, useEffect } from "react";

import { Container } from "react-bootstrap";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import "./Clubs.css";

function Clubs() {
  const [club, setClub] = useState([]);

  useEffect(() => {
    fetch;
  }, []);

  return (
    <Container fluid>
      <Row xs={1} md={2} className="g-6" style={{ padding: "40px" }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <Col key={idx} style={{ padding: "15px" }}>
            <Card>
              <Card.Body>
                <Card.Img variant="top" src="holder.js/100px160" />
                <Card.Title>Barcelona</Card.Title>
                <Card.Text>
                  FC Barcelona, founded in 1899, is a football giant based in
                  Catalonia, Spain. Known for its iconic style of play and
                  global success, Barcelona has become synonymous with
                  excellence. From the historic Camp Nou to producing football
                  legends through La Masia, the club's impact extends beyond the
                  pitch, embodying the spirit of "Més que un club" (More than a
                  club).
                </Card.Text>
                <Button variant="primary">Read More...</Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default Clubs;

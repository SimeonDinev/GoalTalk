import { Container } from "react-bootstrap";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import "./Clubs.css";

function Clubs() {
  return (
    <Container fluid>
      <Row xs={1} md={2} className="g-6" style={{ padding: "40px" }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <Col key={idx} style={{ padding: "15px" }}>
            <Card>
              <Card.Img variant="top" src="holder.js/100px160" />
              <Card.Body>
                <Card.Title>Card title</Card.Title>
                <Card.Text>
                  This is a longer card with supporting text below as a natural
                  lead-in to additional content. This content is a little bit
                  longer.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default Clubs;

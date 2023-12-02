import { useState, useEffect } from "react";
import { getClubs } from "../../services/clubService";

import { Container } from "react-bootstrap";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import "./Clubs.css";

function Clubs() {
  const [state, setState] = useState([]);

  useEffect(() => {
    getClubs().then((result) => setState(result));
  }, []);

  console.log(state);

  return (
    <Container fluid>
      <Row xs={1} md={2} className="g-6" style={{ padding: "40px" }}>
        {state.map((x) => (
          <Col key={x._id} style={{ padding: "15px" }}>
            <Card>
              <Card.Body
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexDirection: "column",
                }}
              >
                <Card.Img
                  src={x.imageUrl}
                  style={{
                    height: "100px",
                    width: "100px",
                    alignSelf: "center",
                    marginBottom: "20px",
                  }}
                />
                <Card.Title
                  style={{ textAlign: "center", paddingBottom: "20px" }}
                >
                  {x.clubName}
                </Card.Title>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-evenly",
                    marginBottom: "10px",
                  }}
                >
                  <Card.Text style={{ marginRight: "15px" }}>
                    <span style={{ fontWeight: "bold" }}>Founded</span>:{" "}
                    {x.founded} <br />
                    <span style={{ fontWeight: "bold" }}>League</span>:{" "}
                    {x.league} <br />
                    <span style={{ fontWeight: "bold" }}>Stadium</span>:{" "}
                    {x.stadium} <br />
                  </Card.Text>
                  <Card.Text>
                    <span style={{ fontWeight: "bold" }}>Founded</span>:{" "}
                    {x.founded} <br />
                    <span style={{ fontWeight: "bold" }}>League</span>:{" "}
                    {x.league} <br />
                    <span style={{ fontWeight: "bold" }}>Stadium</span>:{" "}
                    {x.stadium} <br />
                  </Card.Text>
                </div>
                <Button
                  variant="primary"
                  style={{
                    width: "30%",
                    alignSelf: "center",
                  }}
                >
                  Read More...
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default Clubs;
{
  /* <Col key={idx} style={{ padding: "15px" }}>
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
          </Col> */
}

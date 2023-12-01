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
      <Row
        xs={1}
        md={5}
        className="g-4"
        style={{
          padding: "40px",
          display: "flex",
          justifyContent: "center",
          gap: "50px",
          flexWrap: "wrap",
          flex: " 0 0 calc(33.333% - 20px)",
          margin: "10px",
        }}
      >
        {state.map((x) => (
          <Col key={x._id} style={{ padding: "15px" }}>
            <Card style={{ width: "18rem" }}>
              <Card.Img
                src={x.imageUrl}
                style={{
                  height: "115px",
                  width: "115px",
                  alignSelf: "center",
                  margin: "10px",
                }}
              />
              <Card.Body>
                <Card.Title
                  style={{ textAlign: "center", paddingBottom: "20px" }}
                >
                  {x.clubName}
                </Card.Title>
                <Card.Text>
                  <span style={{ fontWeight: "bold" }}>Founded</span>:{" "}
                  {x.founded} <br />
                  <span style={{ fontWeight: "bold" }}>League</span>: {x.league}{" "}
                  <br />
                  <span style={{ fontWeight: "bold" }}>Stadium</span>:{" "}
                  {x.stadium} <br />
                </Card.Text>
                <Button variant="primary" style={{ textAlign: "center" }}>
                  Go somewhere
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

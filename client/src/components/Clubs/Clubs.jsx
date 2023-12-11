import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import * as service from "../../services/clubService";

import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import "./Clubs.css";

function Clubs() {
  const [clubList, setClubList] = useState([]);

  useEffect(() => {
    service.getAll().then((result) => setClubList(result));
  }, []);

  return (
    <>
      <Container fluid id="cards-container">
        <Row sm={1} lg={2} className="g-6 p-4">
          {clubList.map((x) => (
            <Col key={x._id} className="p-4">
              <Card id="club-card-container">
                <Card.Body id="club-card-body">
                  <Card.Img src={x.imageUrl} id="club-logo-img" />

                  <Card.Title id="club-card-title">{x.clubName}</Card.Title>

                  <div id="club-card-text-container">
                    <Card.Text style={{ marginRight: "15px" }}>
                      <span style={{ fontWeight: "bold" }}>Founded</span>:{" "}
                      {x.founded} <br />
                      <span style={{ fontWeight: "bold" }}>League</span>:{" "}
                      {x.league} <br />
                      <span style={{ fontWeight: "bold" }}>Stadium</span>:{" "}
                      {x.stadium} <br />
                    </Card.Text>
                    <Card.Text style={{ marginRight: "15px" }}>
                      <span style={{ fontWeight: "bold" }}>Nickname</span>:{" "}
                      {x.nickname} <br />
                      <span style={{ fontWeight: "bold" }}>Manager</span>:{" "}
                      {x.manager} <br />
                      <span style={{ fontWeight: "bold" }}>Website</span>:{" "}
                      <a href={x.website}>Club website</a> <br />
                    </Card.Text>
                  </div>

                  <Link
                    to={`/clubs/${x._id}`}
                    id="card-read-more-btn-container"
                  >
                    <Button variant="primary" id="card-read-more-btn">
                      Read More...
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </>
  );
}

export default Clubs;

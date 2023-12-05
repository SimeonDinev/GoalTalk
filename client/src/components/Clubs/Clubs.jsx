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
      <Container fluid>
        <Row sm={1} lg={2} className="g-6" style={{ padding: "40px" }}>
          {clubList.map((x) => (
            <Col key={x._id} style={{ padding: "15px" }}>
              <Card style={{ height: "100%", width: "100%" }}>
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
                    style={{ alignSelf: "center", width: "30%" }}
                  >
                    <Button variant="primary" style={{ width: "100%" }}>
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

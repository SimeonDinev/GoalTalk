import { useState, useEffect } from "react";
import * as service from "../../services/playerService";
import PlayersModal from "./players-modal/PlayersModal";

import { Container } from "react-bootstrap";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import "./FamousPlayers.css";

const FamousPlayers = () => {
  const [players, setPlayers] = useState([]);
  const [readMore, setReadMore] = useState(false);

  useEffect(() => {
    service.getAll().then((res) => setPlayers(res));
  }, []);

  const openReadMoreHandler = () => {
    setReadMore(true);
  };

  if (readMore === true) {
  }

  return (
    <>
      {readMore && (
        <PlayersModal
          show={openReadMoreHandler}
          onHide={() => setReadMore(false)}
        />
      )}
      <Container fluid id="famous-players-background-container">
        <h1 id="heading-of-famous-players">Legendary football players</h1>

        <Row xs={1} sm={2} md={3} xl={4} className="g-5 p-4">
          {players.map((res) => (
            <Col key={res._id}>
              <Card id="famous-players-card">
                <Card.Body id="famous-players-card-body">
                  <Card.Img
                    variant="top"
                    src={res.imgUrl}
                    style={{
                      height: "330px",
                      flexShrink: "0",
                      borderRadius: "0px",
                    }}
                  />

                  <Card.Title
                    style={{
                      marginTop: "20px",
                      alignSelf: "center",
                      fontWeight: "600",
                      padding: "10px",
                    }}
                  >
                    {res.name}
                  </Card.Title>

                  <Card.Text
                    style={{
                      marginRight: "10x",
                      paddingLeft: "10px",
                      margin: "10px",
                      padding: "10px",
                      lineHeight: "30px",
                      height: "110%",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>Nationality:</span>{" "}
                    {res.nationality} <br />
                    <span style={{ fontWeight: "bold" }}>Height:</span>{" "}
                    {res.height} <br />
                    <span style={{ fontWeight: "bold" }}>
                      Position(s):
                    </span>{" "}
                    {res.positions} <br />
                    <span style={{ fontWeight: "bold" }}>Goals:</span>{" "}
                    {res.goals} <br />
                    <span style={{ fontWeight: "bold" }}>Trophies:</span>{" "}
                    {res.trophies} <br />
                  </Card.Text>

                  <Button
                    variant="primary"
                    style={{ alignSelf: "center", marginBottom: "20px" }}
                    onClick={openReadMoreHandler}
                  >
                    Read More...
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </>
  );
};

export default FamousPlayers;

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
  const [playerDetails, setPlayerDetails] = useState([]);
  const [readMore, setReadMore] = useState(false);

  useEffect(() => {
    service.getAll().then((res) => setPlayers(res));
  }, []);

  const showDetails = (id) => {
    setReadMore(true);
    setPlayerDetails(players.find((element) => element._id === id));
  };

  if (readMore) {
    var htmlElement = document.documentElement;
    htmlElement.style.overflow = "disable";
  } else {
    var htmlElement = document.documentElement;
    htmlElement.style.overflow = "visible";
  }

  return (
    <>
      {readMore && (
        <PlayersModal
          show={showDetails}
          onHide={() => setReadMore(false)}
          details={{ playerDetails }}
        />
      )}

      <Container fluid id="famous-players-background-container">
        <h1 id="heading-of-famous-players">Legendary football players</h1>

        <Row xs={1} sm={2} md={3} xl={4} className="g-5 p-4">
          {players.map((res) => (
            <Col key={res._id}>
              <Card id="famous-players-card">
                <Card.Body id="famous-players-card-body">
                  <Card.Img variant="top" src={res.imgUrl} />
                  <Card.Title>{res.name}</Card.Title>
                  <Card.Text>
                    <span>Nationality:</span> {res.nationality} <br />
                    <span>Height:</span> {res.height} <br />
                    <span>Position(s):</span> {res.positions} <br />
                    <span>Goals:</span> {res.goals} <br />
                    <span>Trophies:</span> {res.trophies} <br />
                  </Card.Text>
                  <Button
                    variant="primary"
                    onClick={() => showDetails(res._id)}
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
